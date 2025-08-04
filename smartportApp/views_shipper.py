from datetime import datetime
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo, CargoDelivery

from django.utils.timezone import make_aware, is_naive
from django.db.models import F, Q
from django.db import transaction
import logging
from django.core.paginator import Paginator

logger = logging.getLogger(__name__)

import json

def enforce_shipper_access(request):
  ''' Check if the user is authenticated and has the shipper role. '''
  if not request.user.is_authenticated:
    return HttpResponseForbidden("401 You are not authorized to view this page.")
  
  role = request.user.userprofile.role

  if role != "shipper":
    if role == "admin":
      return render(request, "smartportApp/unauthorized.html", {"text": "Admins cannot access shipper pages.", "link": "admin-dashboard"})
    elif role == "custom":
      return render(request, "smartportApp/unauthorized.html", {"text": "Customs officers cannot access shipper pages.", "link": "customs-dashboard"})
    elif role == "employee":
      return render(request, "smartportApp/unauthorized.html", {"text": "Employees cannot access shipper pages.", "link": "employee-dashboard"})  
    return render(request, "smartportApp/unauthorized.html", {"text": "Only shippers can access this page."})
  
  return None

# --------------------------------- SHIPPER ---------------------------------
# -------------------- TEMPLATES --------------------
@login_required
def shipper_dashboard(request):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check


  return render(request, "smartportApp/shipper/dashboard.html")

def shipper_vessel_info_view(request):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check
  
  vessels = Vessel.objects.all().order_by('name')
  context = {
    'vessels': vessels,
  }
  return render(request, "smartportApp/shipper/vessel-info.html", context)

def shipper_deliveries_view(request):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check

  shipper = request.user.userprofile

  vessel_type = request.GET.get("vessel_type", "all")
  origin = request.GET.get("origin_port", "all")
  destination = request.GET.get("destination_port", "all")
  date = request.GET.get("date", "")
  parsed_date = None

  submanifests = SubManifest.objects.select_related(
    "voyage__vessel",
    "voyage__departure_port",
    "voyage__arrival_port",
    "custom_clearance",
    ).filter(created_by=shipper)
  
  # TODO: apply filters

  # APPLY FILTERS:
  if vessel_type != "all":
    submanifests = submanifests.filter(voyage__vessel__vessel_type=vessel_type)
  
  if origin != "all":
    submanifests = submanifests.filter(voyage__departure_port__port_id=origin)

  if destination != "all":
    submanifests = submanifests.filter(voyage__arrival_port__port_id=destination) 

  if date:
    try:
      parsed_date = datetime.strptime(date, "%Y-%m-%d").date()

    except ValueError:
      logger.warning(f"Invalid date: {date}")
  
  if parsed_date:
    submanifests = submanifests.filter(
      Q(voyage__departure_date__date=parsed_date) |
      Q(voyage__arrival_date__date=parsed_date) 
    )

  # Order results by departure date descending
  submanifests = submanifests.order_by("-voyage__departure_date")
  print("PARSED DATE: ", parsed_date)
  print(f"Submanifests count after filters: {submanifests.count()}")
  logger.debug(f"Final queryset count after date filter: {submanifests.count()}")

  # TODO: ordering by departure date

  # TODO: pagination
  paginator = Paginator(submanifests, 1)
  page_number = request.GET.get("page", 1)

  try:
    page_number = int(page_number)
  except (TypeError, ValueError):
    page_number = 1

  page_obj = paginator.get_page(page_number)

  # Convert to display-friendly format (adjust or customize this)
  parsed_results = parse_manifest_page(page_obj)  

  logger.debug(f"Total filtered submanifests for shipper: {submanifests.count()}")

  context = {
    "page_obj": page_obj,
    "submanifests": parsed_results,
    "paginator": paginator,
    "current_page": page_obj.number,
    "has_next": page_obj.has_next(),
    "has_prev": page_obj.has_previous(),
    "filters": {
      "vessel_type": vessel_type,
      "origin": origin,
      "destination": destination,
      "date": date,
    },
  }

  return render(request, "smartportApp/shipper/deliveries.html", context)

# pull 2
def shipper_submit_shipment_view(request):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check
  
  voyages = Voyage.objects.select_related("departure_port", "arrival_port", "vessel") \
  .filter(status=Voyage.VoyageStatus.ASSIGNED) \
  .order_by("departure_date")

  context = {
    "voyages": voyages
  }
  return render(request, "smartportApp/shipper/submit-shipment.html", context)

# --------------------  END OF TEMPLATES --------------------

# -------------------- LOGIC --------------------
# HELPER FOR THE SHIPPER VESSEL INFO VIEW:
def get_vessel_details(request, vessel_id):
  try:
    vessel = Vessel.objects.get(pk=vessel_id)
    latest_voyage = vessel.voyages.filter(status='assigned').order_by('-departure_date').first()

    created_by = f"{vessel.created_by.first_name} {vessel.created_by.last_name}" 

    data = {
      "name": vessel.name,
      "type": vessel.get_vessel_type_display(),
      "imo": vessel.imo,
      "status": vessel.get_status_display(),
      "capacity": vessel.capacity,
      "created_by": created_by,
    }

    if latest_voyage:
      data.update({
        "departure_port": latest_voyage.departure_port.port_name if latest_voyage.departure_port else "N/A",
        "arrival_port": latest_voyage.arrival_port.port_name if latest_voyage.arrival_port else "N/A",
        "departure_date": latest_voyage.departure_date.strptime("%Y-%m-%d %H:%M"),
        "eta": latest_voyage.eta.strftime("%Y-%m-%d %H:%M") if latest_voyage.eta else "N/A"
      })

    return JsonResponse(data)

  except ObjectDoesNotExist:
    return JsonResponse({"error": "Vessel not found"}, status=404)

# HELPER FOR THE SHIPPER DELIVERIES VIEW:
def parse_manifest_page(page_obj):
  parsed = []
  for index, sm in enumerate(page_obj.object_list):
    entry = {
      "submanifest_id": sm.submanifest_id,
      "submanifest_number": sm.submanifest_number,
      "status": sm.status,
      "status_display": sm.get_status_display(),
      "created_at": sm.created_at.strftime("%b %d, %Y @ %I:%M %p"),
      "container_no": sm.container_no,
      "seal_no": sm.seal_no,
      "bill_of_lading_no": sm.bill_of_lading_no,
      "consignee": sm.consignee_name,
      "consignor": sm.consignor_name,
      "vessel_name": sm.voyage.vessel.name,
      "vessel_type": sm.voyage.vessel.vessel_type,
      "origin_port": sm.voyage.departure_port.port_name,
      "destination_port": sm.voyage.arrival_port.port_name,
      "departure_date": sm.voyage.departure_date.strftime("%b %d, %Y @ %I:%M %p"),
      "arrival_date": sm.voyage.arrival_date.strftime("%b %d, %Y @ %I:%M %p") if sm.voyage.arrival_date else "",
      "eta": sm.voyage.eta.strftime("%b %d, %Y @ %I:%M %p") if sm.voyage.eta else "",
      "has_clearance": hasattr(sm, "custom_clearance"),
      "clearance_status": sm.custom_clearance.clearance_status if hasattr(sm, "custom_clearance") else "pending",
      # "clearance_date": sm.custom_clearance.inspection_date.strftime("%b %d, %Y @ %I:%M %p") if hasattr(sm, "custom_clearance") and sm.custom_clearance.clearance_date else "",
    }

    # Only include cargo details for the first card (initial render)
    if index == 0:
      cargo_items = sm.cargo_items.all()  # assuming related name is `cargoitem_set`
      cargo_items = sm.cargo_items.select_related("delivery").all()
      entry["cargo"] = [
        {
          "id": c.cargo_id,  # ensure you have this field
          "item_number": c.item_number,
          "description": c.description,
          "quantity": c.quantity,
          "value": format_currency(c.value),
          "delivered": hasattr(c, "delivery")
        }
        for c in cargo_items
      ]

    parsed.append(entry)
  return parsed

# helper function to format currency values
from django.contrib.humanize.templatetags.humanize import intcomma

def format_currency(value):
  return f"₱{intcomma(value)}" if value == int(value) else f"₱{intcomma(value):s}"

from django.views.decorators.http import require_POST, require_GET
# HELPER ENDPOINT TO PREFILL THE CARGO TABLE ONCE CLICKED:
@require_GET
def get_cargo_items(request, submanifest_id):
  try:
    sm = SubManifest.objects.select_related(
      'voyage__vessel'  # Optimize DB access
    ).get(pk=submanifest_id)

    vessel_name = sm.voyage.vessel.name if sm.voyage.vessel else "N/A"
    cargo_items = sm.cargo_items.all()
    data = [
      {
        "id": c.cargo_id,
        "item_number": c.item_number,
        "description": c.description,
        "quantity": c.quantity,
        "value": format_currency(c.value),
        "vessel": vessel_name,
        "delivered": hasattr(c, "delivery")
      }
      for c in cargo_items
    ]
    return JsonResponse({"cargo": data})
  except SubManifest.DoesNotExist:
    return JsonResponse({"error": "SubManifest not found"}, status=404)

# ENDPOINT TO CONFIRM DELIVERY:
@login_required
@require_POST
def confirm_delivery_view(request, cargo_id):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check
  
  try:
    data = json.loads(request.body)
    remarks = data.get("remarks", "")

    cargo = Cargo.objects.get(pk=cargo_id)

    # Check if already delivered
    if hasattr(cargo, "delivery"):
      return JsonResponse({"error": "Cargo already marked as delivered."}, status=400)

    CargoDelivery.objects.create(
      cargo=cargo,
      confirmed_by=request.user.userprofile,
      remarks=remarks
    )

    return JsonResponse({"message": "Delivery confirmed."})
  
  except Cargo.DoesNotExist:
    return JsonResponse({"error": "Cargo not found."}, status=404)
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
  

# ENDPOINT TO SUBMIT THE SHIPMENT(SUBMANIFEST DETAIL)
@require_POST
def submit_shipment(request):
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check
  
  if request.method != "POST":
    return JsonResponse({"error":"Invalid request method"}, status=400)
  
  try:
    payload = request.POST
    files = request.FILES

    user = request.user.userprofile

    # validate required fields
    required_fields = [
      'voyage_id', 'consignee_name', 'consignee_email', 'consignee_address',
      'consignor_name', 'consignor_email', 'consignor_address',
      'container_no', 'seal_no', 'bill_of_lading_no'
    ]
    for field in required_fields:
      if not payload.get(field):
        return JsonResponse({'error': f"Missing field: {field}"}, status=400)
      
    # transaction safe block
    with transaction.atomic():
      voyage = Voyage.objects.get(pk=payload.get("voyage_id"))

      # Create SubManifest (shipment)
      submanifest = SubManifest.objects.create(
        voyage=voyage,
        created_by=user,
        consignee_name=payload.get("consignee_name"),
        consignee_email=payload.get("consignee_email"),
        consignee_address=payload.get("consignee_address"),
        consignor_name=payload.get("consignor_name"),
        consignor_email=payload.get("consignor_email"),
        consignor_address=payload.get("consignor_address"),
        container_no=payload.get("container_no"),
        seal_no=payload.get("seal_no"),
        bill_of_lading_no=payload.get("bill_of_lading_no"),
        handling_instruction=payload.get("handling_instruction", "")
      )

      # parse cargo items
      cargo_json = payload.get("cargo_items")
      if not cargo_json:
        raise ValueError("No cargo items provided.")

      cargo_items = json.loads(cargo_json)
      for index, item in enumerate(cargo_items, start=1):
        Cargo.objects.create(
          submanifest=submanifest,
          item_number=index,
          description=item.get("description", ""),
          quantity=item.get("quantity", 0),
          value=item.get("value", 0),
          weight=item.get("weight", 0),
          additional_info=item.get("additional_info", ""),
          hs_code=item.get("hs_code", "")
        )
      
      # handle file uploads
      for key in files:
        file = files[key]
        doc_type = payload.get(f"{key}_type") or "other"
        custom_name = payload.get(f"{key}_name") or ""

        Document.objects.create(
          submanifest=submanifest,
          file=file,
          document_type=doc_type,
          custom_filename=custom_name,
          uploaded_by=user
        )

    return JsonResponse({"message": "Shipment submitted successfully."}, status=201)
  
  except Voyage.DoesNotExist:
    return JsonResponse({'error': 'Voyage not found.'}, status=404)
  
  except ValueError as ve:
    return JsonResponse({'error': str(ve)}, status=400)

  except Exception as e:
    return JsonResponse({'error': f"Unexpected error: {str(e)}"}, status=500)
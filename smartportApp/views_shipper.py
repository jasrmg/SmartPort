from datetime import datetime
import os
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo, CargoDelivery, CustomClearance, UserProfile

from django.utils.timezone import make_aware, is_naive
from django.db.models import F, Q
from django.db import transaction
import logging
from django.core.paginator import Paginator

logger = logging.getLogger(__name__)

import json

from smartportApp.utils.utils import with_approval_priority, serialize_incident, create_notification_bulk



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

  context = {
    'show_logo_text': True,
  }


  return render(request, "smartportApp/shipper/dashboard.html", context)

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

def handle_get_request(request, submanifest_id):
  """Handle GET request - display the edit form"""
  submanifest = get_object_or_404(SubManifest, pk=submanifest_id)
  cargos = Cargo.objects.filter(submanifest=submanifest)
  voyages = Voyage.objects.select_related("departure_port", "arrival_port", "vessel") \
  .filter(status=Voyage.VoyageStatus.ASSIGNED) \
  .order_by("departure_date")

  documents = submanifest.documents.all()  # fetch related docs
  
  documents_by_type = {}

  for doc in documents:
    doc_type = doc.document_type
    documents_by_type.setdefault(doc_type, []).append(doc)

  # Define document types with merged docs
  document_data = []

  # Normal single-card types
  for key, title, icon, desc in [
    ("bill_of_lading", "Bill of Lading", "fas fa-file-alt",
      "Transport document that serves as a receipt of goods, evidence of the contract of carriage, and a document of title"),
    ("invoice", "Commercial Invoice", "fas fa-file-invoice-dollar",
      "Document containing details of the sale transaction including item, quantity, and value"),
    ("packing_list", "Packing List", "fas fa-list-ol",
      "Document detailing the contents of a shipment, including item counts, dimensions, and weights"),
    ("certificate_of_origin", "Certificate Of Origin", "fas fa-certificate",
      "Document certifying the country of origin of the goods being shipped"),
  ]:
    document_data.append({
      "key": key,
      "title": title,
      "icon": icon,
      "desc": desc,
      "docs": documents_by_type.get(key, [])
    })

  # For "other" → one card per document
  for idx, doc in enumerate(documents_by_type.get("other", []), start=1):
    document_data.append({
      "key": f"other_{idx}",  # unique key per card
      "title": f"Other Document",
      "icon": "fas fa-ellipsis-h",
      "desc": "Supporting document for shipment.",
      "docs": [doc]  # single doc per card
    })

  # pick rejection reason depending on status
  reject_reason = None
  if submanifest.status == "rejected_by_admin":
    reject_reason = submanifest.admin_note
  elif submanifest.status == "rejected_by_customs":
    reject_reason = submanifest.customs_note

  context = {
    "submanifest": submanifest,
    "status_display": submanifest.get_status_display(),
    "cargos": cargos,
    "voyages": voyages,
    "document_data": document_data,
    "reject_reason": reject_reason,
  }
  return render(request, "smartportApp/shipper/edit-shipment.html", context)

def handle_post_request(request, submanifest_id):
  """Handle POST request - update the submanifest"""
  try: 
    submanifest = get_object_or_404(SubManifest, pk=submanifest_id)
    
    # validate required fields
    required_fields = [
      'voyage_id', 'container_number', 'seal_number',
      'consignor_name', 'consignor_email', 'consignor_address',
      'consignee_name', 'consignee_email', 'consignee_address',
      'bill_of_lading_number'
    ]

    errors = {}
    for field in required_fields:
      if not request.POST.get(field, '').strip():
        errors[field] = [f'{field.replace("_", " ").title()} is required']

    # validate voyage exists
    try:
      voyage = Voyage.objects.get(pk=request.POST.get('voyage_id'))
    except Voyage.DoesNotExist:
      errors['voyage_id'] = ['Selected voyage does not exist']

    # validate container number format (basic validation)
    container_number = request.POST.get('container_number', '').strip().upper()
    if container_number and len(container_number) != 11:
      errors['container_number'] = ['Container number must be exactly 11 characters']

    # validate cargo data
    cargo_descriptions = request.POST.getlist('cargo_description[]')
    quantities = request.POST.getlist('quantity[]')
    weights = request.POST.getlist('weight[]')
    values = request.POST.getlist('value[]')
    hscodes = request.POST.getlist('hscode[]')
    additional_infos = request.POST.getlist('additional_info[]')

    if not cargo_descriptions or len(cargo_descriptions) == 0:
      errors['cargo_description'] = ['At least one cargo entry is required']
    
    # validate each cargo entry
    for i, desc in enumerate(cargo_descriptions):
      if not desc.strip():
        errors[f'cargo_description[{i}]'] = ['Cargo description is required']
      
      try:
        qty = int(quantities[i]) if i < len(quantities) else 0
        if qty <= 0:
          errors[f'quantity[{i}]'] = ['Quantity must be greater than 0']
      except (ValueError, IndexError):
        errors[f'quantity[{i}]'] = ['Invalid quantity value']
      
      try:
        weight = float(weights[i]) if i < len(weights) else 0
        if weight <= 0:
          errors[f'weight[{i}]'] = ['Weight must be greater than 0']
      except (ValueError, IndexError):
        errors[f'weight[{i}]'] = ['Invalid weight value']

      try:
        value = float(values[i]) if i < len(values) else 0
        if value <= 0:
          errors[f'value[{i}]'] = ['Value must be greater than 0']
      except (ValueError, IndexError):
        errors[f'value[{i}]'] = ['Invalid value amount']
    
    if errors:
      return JsonResponse({'success': False, 'error': 'Please fix the validation errors', 'errors': errors}, status=400)
    
    # update submanifest fields:
    submanifest.voyage_id = voyage.pk
    submanifest.container_no = container_number
    submanifest.seal_no = request.POST.get('seal_number', '').strip()
    submanifest.consignor_name = request.POST.get('consignor_name', '').strip()
    submanifest.consignor_email = request.POST.get('consignor_email', '').strip()
    submanifest.consignor_address = request.POST.get('consignor_address', '').strip()
    submanifest.consignee_name = request.POST.get('consignee_name', '').strip()
    submanifest.consignee_email = request.POST.get('consignee_email', '').strip()
    submanifest.consignee_address = request.POST.get('consignee_address', '').strip()
    submanifest.bill_of_lading_no = request.POST.get('bill_of_lading_number', '').strip()
    submanifest.handling_instruction = request.POST.get('handling_instructions', '').strip()

    # update status to pending admin
    submanifest.status = 'pending_admin'
    submanifest.updated_at = timezone.now()
    submanifest.save()

    # update cargo entry
    existing_cargos = list(Cargo.objects.filter(submanifest=submanifest).order_by('cargo_id'))
    updated_cargo_ids = []
    next_item_number = 1

    for i, desc in enumerate(cargo_descriptions):
      cargo_data = {
        'description': desc.strip(),
        'quantity': int(quantities[i]) if i < len(quantities) else 0,
        'weight': float(weights[i]) if i < len(weights) else 0,
        'value': float(values[i]) if i < len(values) else 0,
        'hs_code': hscodes[i].strip() if i < len(hscodes) else '',
        'additional_info': additional_infos[i].strip() if i < len(additional_infos) else '',
        'item_number': next_item_number,
      }
      next_item_number += 1
        
      if i < len(existing_cargos):
        # Update existing cargo
        cargo = existing_cargos[i]
        for key, value in cargo_data.items():
          setattr(cargo, key, value)
        cargo.save()
        updated_cargo_ids.append(cargo.cargo_id)
      else:
        # Create new cargo
        cargo = Cargo.objects.create(
          submanifest=submanifest,
          **cargo_data
        )
        updated_cargo_ids.append(cargo.cargo_id)

        # delete cargo entries that were removed
        # Cargo.objects.filter(
        #   submanifest=submanifest
        # ).exclude(
        #   cargo_id__in=updated_cargo_ids
        # ).delete()

    # Handle file uploads
    user = request.user.userprofile
    handle_document_uploads(request, submanifest, user)
    
    # notify admins
    try:
      print("USERRRRRRRRR: ", user)
      print("USERRRRRRRRR FIRSTNAME: ", user.first_name)
      # get all admin users
      admin_users = UserProfile.objects.filter(role='admin')
      print("ADMIN USERS: ", admin_users)
      if admin_users.exists():
        # get the user who made the update
        triggered_by = None
        if hasattr(request, 'user') and hasattr(request.user, 'userprofile'):
          triggered_by = user
          title = "Submanifest Updated"
          message = f"{user.first_name} {user.last_name} resubmitted submanifest {submanifest.submanifest_number} for review"
          link_url = f"/submanifest/{submanifest.submanifest_id}/"

          # Send notifications to all admins
          create_notification_bulk(
            recipients=admin_users,
            title=title,
            message=message,
            link_url=link_url,
            triggered_by=triggered_by
          )
    except Exception as e:
      print(f"Failed to send admin notifications: {str(e)}")


    return JsonResponse({
      "success": True, 
      "message": "Submanifest updated and resubmitted successfully", 
      "status": submanifest.status, 
      "redirect_url": ""
    })
  except Exception as e:
    return JsonResponse({
      'success': False,
      'error': f'Error updating submanifest: {str(e)}'
    }, status=500)

def handle_document_uploads(request, submanifest, user_profile):
  """Handle document file uploads"""
  document_field_mapping = {
    'bill_of_lading': 'bill_of_lading',
    'commercial_invoice': 'invoice',  # Note: your template uses 'invoice', not 'commercial_invoice'
    'packing_list': 'packing_list',
    'certificate_origin': 'certificate_of_origin',
  }

  # Handle standard document types
  for frontend_field, doc_type in document_field_mapping.items():
    if frontend_field in request.FILES:
      file = request.FILES[frontend_field]
      # Delete existing document of this type
      Document.objects.filter(
        submanifest=submanifest,
        document_type=doc_type
      ).delete()

      # Create new document
      Document.objects.create(
        submanifest=submanifest,
        document_type=doc_type,
        file=file,
        uploaded_by=user_profile,
        original_filename=file.name,
        uploaded_at=timezone.now(),
      )

      # Handle "other" documents (can be multiple)
      if 'other_documents' in request.FILES:
        files = request.FILES.getlist('other_documents')
        for file in files:
          Document.objects.create(
            submanifest=submanifest,
            document_type='other',
            file=file,
            uploaded_by=user_profile,
            original_filename=file.name,
            custom_filename=file.name,
            uploaded_at=timezone.now() # updates when the file was uploaded
          )




def edit_submit_shipment(request, submanifest_id):
  """
  POST: Process all updates for the shipment
  GET: Display the form with the existing data
  """
  if request.method == "GET":
    return handle_get_request(request, submanifest_id)
  elif request.method == "POST":
    return handle_post_request(request, submanifest_id)




# reused admin logic for the incident feed view:
from django.db.models import F, Q
from django.db.models import Case, When, IntegerField
from django.core.paginator import Paginator, EmptyPage



def shipper_incident_feed_view(request):
  sort = request.GET.get("sort", "newest")
  incidents = IncidentReport.objects.filter(is_approved=True)


  # prioritize not approve first by the admin
  if sort == "newest":
    incidents = with_approval_priority(incidents).order_by('approval_priority', '-incident_datetime')
  elif sort == "oldest":
    incidents = with_approval_priority(incidents).order_by('approval_priority', 'incident_datetime')
  elif sort == "vessel":
    # Only incidents that are linked to a vessel
    incidents = with_approval_priority(
        incidents.filter(vessel__isnull=False)
      ).order_by('approval_priority', 'vessel__name')
  elif sort == "impact":
    impact_order = Case(
      When(impact_level="high", then=0),
      When(impact_level="medium", then=1),
      When(impact_level="low", then=2),
      default=3,
      output_field=IntegerField()
    )
    incidents = with_approval_priority(incidents).annotate(
      impact_order=impact_order
    ).order_by('approval_priority', 'impact_order')

  elif sort == "status_resolved":
    incidents = with_approval_priority(incidents).order_by(
      'approval_priority', '-status'
    )
  
  elif sort == "status_pending":
    incidents = with_approval_priority(incidents).order_by(
      'approval_priority', 'status'
    )
  paginator = Paginator(incidents, 2)  # ilisanan ug 5 ig deploy
  page_number = int(request.GET.get("page", 1))

  try:
    page_obj = paginator.page(page_number)

  except EmptyPage:
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
      return JsonResponse({"incidents": [], "has_more": False})
    return render(request, "smartportApp/admin/incident-report-feed.html", {"page_obj": paginator.page(paginator.num_pages)})
  

  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    # print(f"Page {page_number} of {paginator.num_pages}, has_next: {page_obj.has_next()}")
    data = [serialize_incident(incident) for incident in page_obj]
    return JsonResponse({"incidents": data, "has_more": page_obj.has_next()})
  
  # return render(request, "smartportApp/admin/incident-report-feed.html", {"page_obj": page_obj})

  return render(request, "smartportApp/shipper/incident-report-feed.html", {"page_obj": page_obj})

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
      "created_at": sm.created_at,
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
      'custom_clearance',
      'voyage__vessel'  # Optimize DB access
    ).get(pk=submanifest_id)

    vessel_name = sm.voyage.vessel.name if sm.voyage.vessel else "N/A"
    cargo_items = sm.cargo_items.all()

    cargo_data = []
    for item in cargo_items:
      cargo_data.append({
        'id': item.cargo_id,
        'item_number': item.item_number,
        'description': item.description,
        'quantity': item.quantity,
        'value': format_currency(item.value),
        "delivered": hasattr(item, "delivery")
      })

    # clearance info
    has_clearance = hasattr(sm, 'custom_clearance')
    clearance_status = "pending"

    if has_clearance:
      clearance_status = sm.custom_clearance.clearance_status

    response_data = {
      'cargo': cargo_data,
      'has_clearance': has_clearance,
      'clearance_status': clearance_status,
      'submanifest_id': submanifest_id,
      'status': sm.status
    }
    return JsonResponse(response_data)
  except SubManifest.DoesNotExist:
    return JsonResponse({"error": "SubManifest not found"}, status=404)
  except Exception as e:
    return JsonResponse({'error': str(e)}, status=500)

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
  
# ENDPOINT TO VIEW THE CUSTOM CLEARANCE
from django.shortcuts import render, get_object_or_404
@login_required
def custom_clearance_view(request, submanifest_id):
  # view to display the custom clearance
  user = request.user.userprofile
  print("TANGANG USER: ", user)

  # get submanifest with its related data:
  submanifest = get_object_or_404(
    SubManifest.objects.select_related(
      'voyage__vessel',
      'voyage__departure_port',
      'voyage__arrival_port',
      'custom_clearance__created_by',
      'custom_clearance__reviewed_by'
    ).prefetch_related('documents'),
    submanifest_id=submanifest_id,
    # created_by=1
  )

  # check if clearance exists
  try:
    clearance = submanifest.custom_clearance
  except CustomClearance.DoesNotExist:
    clearance = None

  # prepare documents data
  documents_data = []
  if submanifest.documents.exists():
    for doc in submanifest.documents.all():
      documents_data.append({
        'type': doc.get_document_type_display(),
        'filename': doc.get_download_filename(),
        'uploaded_at': doc.uploaded_at,
        'file_url': doc.file.url if doc.file else None
      })
  
  # prepare clearance data:
  clearance_data = {
    'exists': clearance is not None,
    'clearance_number': clearance.clearance_number if clearance else 'Error Clearance Number',
    'created_at': clearance.created_at if clearance else 'Error Created At',
    'inspection_data': clearance.inspection_date if clearance else 'Error Inspection Date',
    'status': clearance.get_clearance_status_display() if clearance else 'Error Status',
    'remarks': clearance.remarks if clearance else 'Error Remarks',
    'cleared_by': clearance.reviewed_by if clearance else 'No remarks available',
    'clearance_file': clearance.clearance_file if clearance else None,
    'created_by': clearance.created_by if clearance else None,
  }

  # Prepare submanifest data
  # submanifest_data = {
  #   'id': submanifest.submanifest_id,
  #   'number': submanifest.submanifest_number,
  #   'created_at': submanifest.created_at,
  #   'vessel_name': submanifest.voyage.vessel.name,
  #   'voyage_number': submanifest.voyage.voyage_number,
  #   'departure_port': submanifest.voyage.departure_port.port_name,
  #   'arrival_port': submanifest.voyage.arrival_port.port_name,
  #   'departure_date': submanifest.voyage.departure_date,
  #   'eta': submanifest.voyage.eta,
  #   'arrival_date': submanifest.voyage.arrival_date,
  #   'status': submanifest.get_status_display(),
  #   'status_raw': submanifest.status,
  #   'container_no': submanifest.container_no,
  #   'seal_no': submanifest.seal_no,
  #   'bill_of_lading_no': submanifest.bill_of_lading_no,
  #   'consignee_name': submanifest.consignee_name,
  #   'consignor_name': submanifest.consignor_name,
  # }

  context = {
    # 'submanifest': submanifest_data,
    'clearance': clearance_data,
    'documents': documents_data,
    'has_documents': len(documents_data) > 0,
  }
  
  return render(request, 'smartportApp/custom-clearance.html', context)

# ENDPOINT TO SUBMIT THE SHIPMENT(SUBMANIFEST DETAIL)
@login_required
@require_POST
def submit_shipment(request):
  """
    handle shipment submission form
    POST: Process and save the shipment data 
  """
  # check if authenticated and role is shipper
  auth_check = enforce_shipper_access(request)
  if auth_check:
    return auth_check
  
  if request.method == "POST":
    return process_shipment_submission(request)


# ========== HELPER FUNCTION FOR THE SUBMIT SHIPMENT: ==========
import logging
from django.core.exceptions import ValidationError
from decimal import Decimal, InvalidOperation



logger = logging.getLogger(__name__)

# Process the submission and save shipment data
def process_shipment_submission(request):
  # get user profile
  user = request.user.userprofile

  try:
    # validate required fields
    validation_result = validate_shipment_data(request)
    if validation_result['has_errors']:
      return JsonResponse({
        'error':validation_result['error_message']
      }, status=400)
    
    # process submission in database transaction
    with transaction.atomic():
      submanifest = create_submanifest(request, user)
      create_cargo_items(request, submanifest)
      create_documents(request, submanifest, user)

      # TODO: notify the admin
      # bulk creation of notification 1 per admin
      admin_users = UserProfile.objects.filter(role="admin")
      create_notification_bulk(
        recipients=admin_users,
        title="Submanifest Submitted",
        message=f"{user.first_name} {user.last_name} submitted shipment {submanifest.submanifest_number}",
        link_url=f"/submanifest/{submanifest.submanifest_id}/",
        triggered_by=user
      )


      logger.info(f"Sumanifest {submanifest.submanifest_number} created successfully by user {user.first_name}")

      return JsonResponse({
        'success': True,
        'message': 'Shipment submitted successfully!',
        'submanifest_id': submanifest.submanifest_id,
        'submanifest_number': submanifest.submanifest_number
      })
  except ValidationError as e:
    logger.error(f"Validation error in shipment submission: {str(e)}")
    return JsonResponse({
      'error': f"Validation error: {str(e)}"
    }, status=400)
  
  except Exception as e:
    logger.error(f"Unexpected error in shipment submission: {str(e)}")
    return JsonResponse({
      'error': 'An unexpected error occurred. Please try again.'
    }, status=500)

def validate_shipment_data(request):
    """Validate the incoming shipment data"""
    errors = []
    
    # Required fields validation
    required_fields = [
      'voyage_id', 'consignee_name', 'consignee_email', 'consignee_address',
      'consignor_name', 'consignor_email', 'consignor_address',
      'container_number', 'seal_number', 'bill_of_lading_number'
    ]
    
    for field in required_fields:
      value = request.POST.get(field, '').strip()
      if not value:
        errors.append(f'{field.replace("_", " ").title()} is required')
    
    # Validate voyage exists
    voyage_id = request.POST.get('voyage_id')
    if voyage_id:
      try:
        voyage = Voyage.objects.get(voyage_id=voyage_id)
      except Voyage.DoesNotExist:
        errors.append('Selected voyage does not exist')
    
    # Validate container number format (ISO 6346)
    container_number = request.POST.get('container_number', '').strip().upper()
    if container_number and not validate_container_number(container_number):
      errors.append('Container number must follow ISO 6346 format (4 letters + 7 digits)')
    
    # Validate seal number (6-10 digits)
    seal_number = request.POST.get('seal_number', '').strip()
    if seal_number and (not seal_number.isdigit() or len(seal_number) < 6 or len(seal_number) > 10):
      errors.append('Seal number must be 6-10 digits')
    
    # Validate bill of lading format
    bol_number = request.POST.get('bill_of_lading_number', '').strip().upper()
    if bol_number and not validate_bill_of_lading(bol_number):
      errors.append('Bill of Lading number must be 10-17 alphanumeric characters')
    
    # Validate cargo items
    cargo_validation = validate_cargo_items(request)
    if cargo_validation['has_errors']:
      errors.extend(cargo_validation['errors'])
    
    return {
      'has_errors': len(errors) > 0,
      'errors': errors,
      'error_message': '; '.join(errors) if errors else None
    }


def validate_container_number(container_number):
  """Validate container number format (ISO 6346)"""
  import re
  pattern = r'^[A-Z]{4}\d{7}$'
  return bool(re.match(pattern, container_number))


def validate_bill_of_lading(bol_number):
  """Validate bill of lading number format"""
  import re
  pattern = r'^[A-Z0-9]{10,17}$'
  return bool(re.match(pattern, bol_number))


def validate_cargo_items(request):
  """Validate cargo items from JSON data"""
  errors = []
  
  try:
    cargo_items_json = request.POST.get('cargo_items', '[]')
    cargo_items = json.loads(cargo_items_json)
    
    if not cargo_items:
      errors.append('At least one cargo item is required')
      return {'has_errors': True, 'errors': errors}
    
    for i, item in enumerate(cargo_items, 1):
      # Required fields
      if not item.get('description', '').strip():
        errors.append(f'Cargo #{i}: Description is required')
      
      # Validate numeric fields
      try:
        quantity = int(item.get('quantity', 0))
        if quantity <= 0:
          errors.append(f'Cargo #{i}: Quantity must be at least 1')
      except (ValueError, TypeError):
        errors.append(f'Cargo #{i}: Invalid quantity')
      
      try:
        weight = float(item.get('weight', 0))
        if weight < 0:
          errors.append(f'Cargo #{i}: Weight cannot be negative')
      except (ValueError, TypeError):
        errors.append(f'Cargo #{i}: Invalid weight')
      
      try:
        value = float(item.get('value', 0))
        if value < 0:
          errors.append(f'Cargo #{i}: Value cannot be negative')
      except (ValueError, TypeError):
        errors.append(f'Cargo #{i}: Invalid value')
            
  except json.JSONDecodeError:
    errors.append('Invalid cargo data format')
  
  return {
    'has_errors': len(errors) > 0,
    'errors': errors
  }


def create_submanifest(request, user_profile):
  """Create the main SubManifest record"""
  
  # Get voyage
  voyage = Voyage.objects.get(voyage_id=request.POST.get('voyage_id'))
  
  # Create submanifest
  submanifest = SubManifest.objects.create(
    voyage=voyage,
    created_by=user_profile,
    
    # Consignee details  
    consignee_name=request.POST.get('consignee_name', '').strip(),
    consignee_email=request.POST.get('consignee_email', '').strip(),
    consignee_address=request.POST.get('consignee_address', '').strip(),
    
    # Consignor details
    consignor_name=request.POST.get('consignor_name', '').strip(),
    consignor_email=request.POST.get('consignor_email', '').strip(), 
    consignor_address=request.POST.get('consignor_address', '').strip(),
    
    # Shipment details
    container_no=request.POST.get('container_number', '').strip().upper(),
    seal_no=request.POST.get('seal_number', '').strip(),
    bill_of_lading_no=request.POST.get('bill_of_lading_number', '').strip().upper(),
    handling_instruction=request.POST.get('handling_instructions', '').strip(),
    
    # Default status
    status='pending_admin'
  )
  
  return submanifest


def create_cargo_items(request, submanifest):
  """Create cargo items from JSON data"""
  
  cargo_items_json = request.POST.get('cargo_items', '[]')
  cargo_items = json.loads(cargo_items_json)
  
  cargo_objects = []
  for i, item in enumerate(cargo_items, 1):
    cargo = Cargo(
        submanifest=submanifest,
      item_number=i,
      description=item.get('description', '').strip(),
      quantity=int(item.get('quantity', 0)),
      weight=Decimal(str(item.get('weight', 0))),
      value=Decimal(str(item.get('value', 0))),
      additional_info=item.get('additional_info', '').strip() or None,
      hs_code=item.get('hs_code', '').strip() or None
    )
    cargo_objects.append(cargo)
  
  # Bulk create for efficiency
  Cargo.objects.bulk_create(cargo_objects)


def create_documents(request, submanifest, user_profile):
  """Create document records from uploaded files"""
  
  # Document type mappings from form to model
  document_mappings = {
    'bill_of_lading': 'bill_of_lading',
    'commercial_invoice': 'invoice', 
    'packing_list': 'packing_list',
    'certificate_origin': 'certificate_of_origin',
    # 'other': 'other',
  }
  
  documents_created = []
  
  # Process standard document types
  for form_field, doc_type in document_mappings.items():
    file = request.FILES.get(form_field)
    if file:
      document = Document.objects.create(
        submanifest=submanifest,
        document_type=doc_type,
        file=file,
        uploaded_by=user_profile,
        original_filename=file.name,
        custom_filename=''
      )
      documents_created.append(document)
  
  # Process "other" documents (multiple files possible)
  other_files = request.FILES.getlist('other_documents')
  for file in other_files:
    if file:
      document = Document.objects.create(
        submanifest=submanifest,
        document_type='other',
        file=file,
        uploaded_by=user_profile,
        original_filename=file.name,
        custom_filename=file.name
      )
      documents_created.append(document)
  
  logger.info(f"Created {len(documents_created)} documents for submanifest {submanifest.submanifest_number}")
  
  return documents_created


from django.utils import timezone

# Handling multiple files of same type on same date
def handle_duplicate_filenames(filepath):
  """
  Handle duplicate filenames by adding a counter
  Example: 42_others_20250210.pdf -> 42_others_20250210_2.pdf
  """
  from django.core.files.storage import default_storage
  
  if not default_storage.exists(filepath):
    return filepath
  
  # Split filename and extension
  base_path = filepath.rsplit('.', 1)[0]
  ext = filepath.rsplit('.', 1)[1] if '.' in filepath else ''
  
  counter = 2
  while True:
    new_filepath = f"{base_path}_{counter}.{ext}" if ext else f"{base_path}_{counter}"
    if not default_storage.exists(new_filepath):
      return new_filepath
    counter += 1

# Alternative implementation with duplicate handling
def document_upload_path_with_duplicates(instance, filename):
  """
  Alternative implementation that handles duplicate filenames
  Format: <submanifest_id>_<document_type>_<yrmonthdate>.ext
  If duplicate exists, adds counter: <submanifest_id>_<document_type>_<yrmonthdate>_2.ext
  """
  # Get file extension
  ext = filename.split('.')[-1].lower()
  
  # Generate date in YYYYMMDD format
  date_str = timezone.now().strftime('%Y%m%d')
  
  # Map document types to shorter names
  doc_type_map = {
    'bill_of_lading': 'bol',
    'invoice': 'invoice', 
    'packing_list': 'packing',
    'certificate_of_origin': 'certificate',
    'other': 'others'
  }
  
  doc_type = doc_type_map.get(instance.document_type, instance.document_type)
  custom_filename = f"{instance.submanifest.submanifest_id}_{doc_type}_{date_str}.{ext}"
  base_path = os.path.join('documents', timezone.now().strftime('%Y/%m'), custom_filename)
  
  # Handle duplicates
  return handle_duplicate_filenames(base_path)

# --------------- EDIT SUBMITTED SHIPMENT ---------------
def delete_document(request, document_id):
  try:
    document = Document.objects.get(pk=document_id)

    if document.submanifest.created_by != request.user.userprofile:
      return JsonResponse({"error": "Unauthorized"}, status=403)
    
    # delete file from storage
    document.file.delete(save=False)

    # delete database record
    document.delete()

    return JsonResponse({"success": True})
  except Document.DoesNotExist:
    return JsonResponse({"error": "Document not found"}, status=404)

def delete_cargo(request, cargo_id):
  try:
    cargo = Cargo.objects.get(cargo_id=cargo_id, submanifest__created_by__user=request.user)
    cargo.delete()
    return JsonResponse({'success': True, 'message': 'Cargo deleted successfully'})
  except Cargo.DoesNotExist:
    return JsonResponse({'success': False, 'error': 'Cargo not found'}, status=404)
  except Exception as e:
    return JsonResponse({'success': False, 'error': str(e)}, status=500)



# --------------- INCIDENT FEED ---------------
# giusa ra ug logic sa admin side


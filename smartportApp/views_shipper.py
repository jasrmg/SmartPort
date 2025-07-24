from datetime import datetime
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo

from django.utils.timezone import make_aware, is_naive
from django.db.models import F, Q
import logging
from django.core.paginator import Paginator

logger = logging.getLogger(__name__)

def enforce_shipper_access(request):
  ''' Check if the user is authenticated and has the shipper role. '''
  if not request.user.is_authenticated:
    return HttpResponseForbidden("You are not authorized to view this page.")
  
  if request.user.userprofile.role != "shipper":
    return HttpResponseForbidden("You are not a shipper and authorized to view this page.")
  
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
  departure_date = request.GET.get("departure_date", "")

  submanifests = SubManifest.objects.select_related(
    "voyage__vessel",
    "voyage__departure_port",
    "voyage__arrival_port"
    ).filter(created_by=shipper)
  
  # TODO: apply filters

  # APPLY FILTERS:
  if vessel_type != "all":
    submanifests = submanifests.filter(voyage__vessel__vessel_type=vessel_type)
  
  if origin != "all":
    submanifests = submanifests.filter(voyage__departure_port__port_name=origin)

  if destination != "all":
    submanifests = submanifests.filter(voyage__arrival_port__port_name=destination) 

  if departure_date:
    try:
      parsed_date = datetime.strptime(departure_date, "%Y-%m-%d").date()
      start = make_aware(datetime.combine(parsed_date, datetime.min.time()))
      end = make_aware(datetime.combine(parsed_date, datetime.max.time()))

      submanifests = submanifests.filter(
        Q(voyage__departure_date__range=(start, end)) |
        Q(voyage__arrival_date__range=(start, end))
      )
    except ValueError:
      logger.warning(f"Invalid departure_date: {departure_date}")

  # Order results by departure date descending
  submanifests = submanifests.order_by("-voyage__departure_date")


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
  parsed_results = parse_manifest_page(page_obj)  # You can customize this per shipper

  logger.debug(f"Total filtered submanifests for shipper: {submanifests.count()}")

  context = {
    "page_obj": parsed_results,
    "paginator": paginator,
    "current_page": page_obj.number,
    "has_next": page_obj.has_next(),
    "has_prev": page_obj.has_previous(),
    "filters": {
      "vessel_type": vessel_type,
      "origin": origin,
      "destination": destination,
      "departure_date": departure_date,
    },
  }

  return render(request, "smartportApp/shipper/deliveries.html", context)

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

  for sm in page_obj.object_list:
    parsed.append({
      "submanifest_id": sm.submanifest_id,
      "submanifest_number": sm.submanifest_number,
      "status": sm.status,
      "status_display": sm.get_status_display(),
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
    })
  return parsed

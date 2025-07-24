from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo

def is_shipper_is_authenticated(request):
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
  auth_check = is_shipper_is_authenticated(request)
  if auth_check:
    return auth_check


  return render(request, "smartportApp/shipper/dashboard.html")

def shipper_vessel_info_view(request):
  # check if authenticated and role is shipper
  auth_check = is_shipper_is_authenticated(request)
  if auth_check:
    return auth_check
  
  vessels = Vessel.objects.all().order_by('name')
  context = {
    'vessels': vessels,
  }
  return render(request, "smartportApp/shipper/vessel-info.html", context)

def shipper_deliveries_view(request):
  # check if authenticated and role is shipper
  auth_check = is_shipper_is_authenticated(request)
  if auth_check:
    return auth_check


  return render(request, "smartportApp/shipper/deliveries.html")

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
        "departure_date": latest_voyage.departure_date.strftime("%Y-%m-%d %H:%M"),
        "eta": latest_voyage.eta.strftime("%Y-%m-%d %H:%M") if latest_voyage.eta else "N/A"
      })

    return JsonResponse(data)

  except ObjectDoesNotExist:
    return JsonResponse({"error": "Vessel not found"}, status=404)

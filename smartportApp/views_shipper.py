from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden
from django.core.exceptions import ObjectDoesNotExist

from accounts.firebase import verify_firebase_token
from accounts . models import UserProfile
from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo

def shipper(request):
  try:
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
      return HttpResponseForbidden("Missing auth token")

    decoded_token = verify_firebase_token(token)
    firebase_uid = decoded_token["uid"]

    user_profile = UserProfile.objects.get(firebase_uid=firebase_uid)

    if user_profile.role != UserProfile.Role.SHIPPER:
      return HttpResponseForbidden("You are not allowed to access this page")

    # proceed with view logic
    return render(request, "your_template.html", {"user": user_profile})

  except UserProfile.DoesNotExist:
    return HttpResponseForbidden("User does not exist")
  except Exception as e:
    return HttpResponseForbidden(f"Error: {str(e)}")

# --------------------------------- SHIPPER ---------------------------------
# -------------------- TEMPLATES --------------------
@login_required
def shipper_dashboard(request):
  return render(request, "smartportApp/shipper/dashboard.html")

def shipper_vessel_info_view(request):
  vessels = Vessel.objects.all().order_by('name')
  context = {
    'vessels': vessels,
  }
  return render(request, "smartportApp/shipper/vessel-info.html", context)

def shipper_deliveries_view(request):

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

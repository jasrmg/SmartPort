import json
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from firebase_admin import auth
from accounts.models import UserProfile

from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
import json
from smartportApp.models import Vessel



# Create your views here.
@login_required
def role_redirect_view(request):
  user_profile = getattr(request.user, "userprofile", None)
  print("USER PROFILE: ")
  if not user_profile:
    return redirect("/")
  
  role = user_profile.role.lower()
  
  if role == "admin":
    return redirect("admin_dashboard")
  elif role == "custom":
    return redirect("custom_dashboard")
  elif role == "shipper":
    return redirect("shipper_dashboard")
  elif role == "employee":
    return redirect("employee_dashboard")
  else:
    return HttpResponse("Unauuthorized role", status=403)


def auth_view(request):
  return render(request, "smartportApp/auth.html")

# def verify_view(request):
#   return render(request, "smartportApp/verify.html")

# --------------------------------- ADMIN ---------------------------------
def admin_dashboard(request):
  if not request.user.is_authenticated:
    return redirect("/")
  return render(request, "smartportApp/admin/dashboard.html")

def admin_users_view(request):
  return render(request, "smartportApp/admin/admin-users.html")

def admin_all_vessels_view(request):
  vessels = get_vessels_data()
  context = {
    "vessels": vessels,
  }
  return render(request, "smartportApp/admin/admin-vessels.html", context)

def assign_route_view(request):
  return render(request, "smartportApp/admin/assign-route.html")


from . models import Vessel, Voyage, Port

# FUNCTION FOR GETTING PORT LOCATION TO FILL THE LEAFLET MAP
def get_ports(request):
  try:
    ports = Port.objects.all()
    data = [{
      'port_id': port.port_id,
      'name': port.port_name,
      'code': port.port_code,
      'latitude': port.latitude,
      'longitude': port.longitude,
      'description': port.port_description,
    } for port in ports]

    return JsonResponse({'ports': data})
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

@require_GET
def get_vessels(request):
  try:
    available_vessels_qs = Vessel.objects.filter(status=Vessel.VesselStatus.AVAILABLE)
    
    # Convert to JSON response
    vessels_data = [
      {
        "vessel_id": vessel.vessel_id,
        "name": vessel.name,
      }
      for vessel in available_vessels_qs
    ]

    return JsonResponse({"vessels": vessels_data})
  
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

# HELPER FUNCTION FOR GETTING THE VESSEL LIST
def get_vessels_data():
  vessels = Vessel.objects.all()
  vessel_data = []

  for vessel in vessels:
    vessel_data.append({
      "vessel_id": vessel.vessel_id,
      "name": vessel.name,
      "imo": vessel.imo,
      "type": vessel.get_vessel_type_display(),
      "capacity": vessel.capacity,
      "status": vessel.get_status_display(),
    })

  return vessel_data

# API ENDPOINT FOR THE LIST OF PORTS(NAME AND ID ONLY) FOR PRE FILLING DROPDOWNS
@require_GET
def get_port_options(request):
  try:
    ports = Port.objects.all()
    data = [{
      "id": port.port_id,
      "name": port.port_name
    } for port in ports]
    return JsonResponse({"ports": data})
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

# API ENDPOINT FOR UPDATING THE VESSELS TABLE IN THE ALL VESSELS
@csrf_exempt
def update_vessel_status(request):
  if request.method != "POST":
    return JsonResponse({'success': False, 'message': 'Invalid method'}, status=405)

  try:
    data = json.loads(request.body)
    imo = data.get('imo')
    new_status = data.get('status')

    if not imo or not new_status:
      return JsonResponse({'success': False, 'message': 'Missing fields'}, status=400)

    vessel = Vessel.objects.get(imo=imo)
    vessel.status = new_status
    vessel.save()

    return JsonResponse({'success': True})
  except Vessel.DoesNotExist:
    return JsonResponse({'success': False, 'message': 'Vessel not found'}, status=404)
  except Exception as e:
    return JsonResponse({'success': False, 'message': str(e)}, status=500)

# NAME EDIT FOR THE VESSELS:
@csrf_exempt
def update_vessel_name(request):
  if request.method != "POST":
    return JsonResponse({"success": False, "message": "Invalid request method"}, status=400)

  try:
    data = json.loads(request.body)
    imo = data.get("imo")
    new_name = data.get("name")

    if not imo or not new_name:
      return JsonResponse({"success": False, "message": "Missing data"}, status=400)

    vessel = Vessel.objects.get(imo=imo)
    vessel.name = new_name
    vessel.save()

    return JsonResponse({"success": True, "message": "Vessel name updated"})

  except Vessel.DoesNotExist:
    return JsonResponse({"success": False, "message": "Vessel not found"}, status=404)

  except Exception as e:
    return JsonResponse({"success": False, "message": str(e)}, status=500)



# DELETE VESSEL:
@require_POST
def delete_vessel(request):
  try:
    data = json.loads(request.body)
    imo = data.get("imo")

    if not imo:
      return JsonResponse({"success": False, "message": "IMO is required."}, status=400)

    vessel = Vessel.objects.filter(imo=imo).first()
    if not vessel:
      return JsonResponse({"success": False, "message": "Vessel not found."}, status=404)

    vessel.delete()
    return JsonResponse({"success": True})

  except Exception as e:
    return JsonResponse({"success": False, "message": str(e)}, status=500)


from django.views.decorators.csrf import csrf_exempt
# ADD VESSEL 
@csrf_exempt
def add_vessel(request):
  if request.method != "POST":
    return JsonResponse({"error": "Invalid request method"}, status=405)

  try:
    if not hasattr(request, "user_profile"):
      return JsonResponse({"erorr": "Unauthorized"}, status=403)        
    
    data = json.loads(request.body)
    name = data.get("name", "").strip().title()
    imo = data.get("imo", "").strip().upper()
    vessel_type = data.get("vessel_type", "").strip()
    capacity = int(data.get("capacity", 0))
    
    if not name or not imo or not vessel_type or capacity <= 0:
      return JsonResponse({"error": "All fields are required."}, status=400)
    
    if Vessel.objects.filter(imo=imo).exists():
      return JsonResponse({"error": "Vessel with this IMO already exists."}, status=409)
    
    vessel = Vessel.objects.create(
      name=name,
      imo=imo,
      vessel_type=vessel_type,
      capacity=capacity,
      created_by=request.user_profile
    )

    return JsonResponse({
      "message": "Vessel added successfully",
      "vessel": {
        "id": vessel.vessel_id,
        "name": vessel.name,
        "imo": vessel.imo,
        "type": vessel.get_vessel_type_display(),
        "capacity": vessel.capacity
      }
    })
  
  except Exception as e:
    import traceback
    traceback.print_exc()
    return JsonResponse({"error": str(e)}, status=500)


# ASSIGN ROUTE:
from django.utils.timezone import now
# helper function to generate the voyage number:
def generate_voyage_number(vessel_id):
  timestamp = now().strftime("%Y%m%d-%H%M")
  return f"VOY-{timestamp}-{vessel_id}"


from datetime import datetime
from django.utils import timezone

# ASSIGN ROUTE MAIN LOGIC:
@require_POST
def assign_route(request):
  print("[DEBUG] assign_route view was called")
  try:
    data = json.loads(request.body)

    vessel_id = data.get("vessel_id")
    departure_str = data.get("departure")
    eta_str = data.get("eta")
    origin_id = data.get("origin_id")
    destination_id = data.get("destination_id")


    # Validate required fields
    if not all([vessel_id, departure_str, eta_str, origin_id, destination_id]):
      return JsonResponse({"error": "All fields are required."}, status=400)

    # Parse datetime fields
    try:
      departure_dt = datetime.strptime(departure_str, "%Y-%m-%d %H:%M")
      eta_dt = datetime.strptime(eta_str, "%Y-%m-%d %H:%M")

      # Make them timezone-aware using Django's timezone helper
      departure_dt = timezone.make_aware(departure_dt)
      eta_dt = timezone.make_aware(eta_dt)
    except ValueError:
      return JsonResponse({"error": "Invalid date format."}, status=400)

    if departure_dt < now():
      return JsonResponse({"error": "Departure must be in the future."}, status=400)

    if eta_dt <= departure_dt:
      return JsonResponse({"error": "ETA must be after departure."}, status=400)

    # Fetch related models
    try:
      vessel = Vessel.objects.get(pk=vessel_id)
    except Vessel.DoesNotExist:
      return JsonResponse({"error": "Vessel not found."}, status=404)

    if vessel.status != Vessel.VesselStatus.AVAILABLE:
      return JsonResponse({"error": "Selected vessel is not available."}, status=400)

    try:
      origin = Port.objects.get(pk=origin_id)
      destination = Port.objects.get(pk=destination_id)
    except Port.DoesNotExist:
      return JsonResponse({"error": "Origin or destination port not found."}, status=404)

    # Generate voyage number
    voyage_number = generate_voyage_number(vessel_id)


    print("✅ assign_route view reached")
    print("Departure:", departure_str)
    print("ETA:", eta_str)
    print("Parsed departure:", departure_dt)
    print("Parsed eta:", eta_dt)
    print("Vessel ID:", vessel_id)
    print("Origin ID:", origin_id)
    print("Destination ID:", destination_id)


    # Create voyage
    voyage = Voyage.objects.create(
      vessel=vessel,
      departure_port=origin,
      arrival_port=destination,
      departure_date=departure_dt,
      eta=eta_dt,
      voyage_number=voyage_number
    )

    print(f"✅ Voyage #{voyage_number} assigned successfully to vessel ID {vessel_id}")

    # Update vessel status
    vessel.status = Vessel.VesselStatus.ASSIGNED
    vessel.save()
    print(f"✅ VESSEL ID {vessel_id} UPDATED TO ASSIGNED")

    return JsonResponse({"message": "Voyage assigned successfully.", "voyage_number": voyage_number})

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
  
  

# --------------------------------- CUSTOM ---------------------------------
@login_required
def customs_dashboard(request):
  return render(request, "smartportApp/custom/dashboard.html")




# --------------------------------- SHIPPER ---------------------------------
@login_required
def shipper_dashboard(request):
  return render(request, "smartportApp/shipper/dashboard.html")




# --------------------------------- EMPLOYEE ---------------------------------
@login_required
def employee_dashboard(request):
  return render(request, "smartportApp/employee/dashboard.html")
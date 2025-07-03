import json
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from firebase_admin import auth
from accounts.models import UserProfile




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


from . models import Vessel, Voyage, Port

# HELPER FUNCTION FOR GETTING THE VESSEL LIST
def get_vessels_data():
  vessels = Vessel.objects.all()
  vessel_data = []

  for vessel in vessels:
    latest_voyage = Voyage.objects.filter(vessel=vessel).order_by("-arrival_date").first()

    vessel_data.append({
      "name": vessel.name,
      "imo": vessel.imo,
      "type": vessel.get_vessel_type_display(),
      "capacity": vessel.capacity,
      "status": vessel.get_status_display(),
    })

  return vessel_data

# API ENDPOINT FOR THE LIST OF PORTS
def get_port_options(request):
  ports = Port.objects.all().values("port_name")
  port_list = [port["port_name"] for port in ports]
  return JsonResponse({"ports": port_list})

# API ENDPOINT FOR UPDATING THE VESSELS TABLE IN THE ALL VESSELS
@csrf_exempt
def update_vessel_cell(request):
  if request.method == "POST":
    try:
      data = json.loads(request.body)
      imo = data.get("imo")
      field = data.get("field")
      value = data.get("value")

      vessel = Vessel.objects.get(imo=imo)
      voyage = Voyage.objects.filter(vessel=vessel).order_by("-arrival_date").first()
      if not voyage:
        return JsonResponse({"success": False, "mesage": "No voyage found."})
      
      if field == "status":
        voyage.status = value.lower().replace(" ", "_")
      elif field == "origin":
        port = Port.objects.get(port_name=value)
        voyage.departure_port = port
      elif field == "destination":
        port = Port.objects.get(port_name=value)
        voyage.arrival_port = port
      else:
        return JsonResponse({"success": False, "message": "Invalid field"})
      
      voyage.save()
      return JsonResponse({"success": True})
    
    except Exception as e:
      return JsonResponse({"success": False, "message": str(e)})
  return JsonResponse({"success": False, "message": "Invalid request"})


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
        "type": vessel.vessel_type,
        "capacity": vessel.capacity
      }
    })
  
  except Exception as e:
    import traceback
    traceback.print_exc()
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
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
from django.core.paginator import Paginator


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

from datetime import timedelta

# HELPER TO FORMAT THE DATE TIME TO BE DISPLAYED IN THE FRONTEND
def format_duration_string(duration_str):
  try:
    if duration_str.startswith("-"):
      return "—"

    parts = duration_str.strip().split(", ")

    # Case: "2 days, 5:10:00"
    if len(parts) == 2:
      days = int(parts[0].split()[0])
      time_parts = list(map(int, parts[1].split(":")))
    else:  # Case: "5:10:00"
      days = 0
      time_parts = list(map(int, parts[0].split(":")))

    hours, minutes = time_parts[0], time_parts[1]
    duration_display = ""

    if days > 0:
      duration_display += f"{days} day{'s' if days > 1 else ''}, "
    if hours > 0:
      duration_display += f"{hours} hour{'s' if hours > 1 else ''}"
    if minutes > 0:
      if hours > 0:
        duration_display += f" {minutes} min{'s' if minutes > 1 else ''}"
      else:
        duration_display += f"{minutes} min{'s' if minutes > 1 else ''}"

    return duration_display.strip(", ") or "—"

  except Exception:
    return "—"


# --------------------------------- ADMIN ---------------------------------
# -------------------- TEMPLATES --------------------
def admin_dashboard(request):
  if not request.user.is_authenticated:
    return redirect("/")
  return render(request, "smartportApp/admin/dashboard.html")


def admin_all_vessels_view(request):
  vessels = get_vessels_data()
  context = {
    "vessels": vessels,
  }
  return render(request, "smartportApp/admin/admin-vessels.html", context)

def assign_route_view(request):
  return render(request, "smartportApp/admin/assign-route.html")

def manage_voyage_view(request):
  voyages = get_active_voyages()
  context = {
    "voyages": voyages
  }
  # print("VOYAGES: ")
  # for v in voyages:
  #   print(f"{v.voyage_number}: {v.departure_port} -> {v.arrival_port}")
  
  return render(request, "smartportApp/admin/manage-voyage.html", context)

def voyage_report_view(request):
  reports = VoyageReport.objects.select_related('voyage__vessel', 'created_by').order_by('-created_at')
  paginator = Paginator(reports, 2)
  page_number = request.GET.get('page')
  if not str(page_number).isdigit():
    page_number = 1

  page_obj = paginator.get_page(page_number)
  parsed_reports = parse_voyage_report_page(page_obj)

  context = {
    'page_obj': parsed_reports,
    'paginator': paginator,
    'current_page': page_obj.number,
    'has_next': page_obj.has_next(),
    'has_prev': page_obj.has_previous(),
  }
  return render(request, "smartportApp/admin/voyage-report.html", context)
def admin_users_view(request):
  return render(request, "smartportApp/admin/admin-users.html")


# -------------------- END OF ADMIN TEMPLATES --------------------

# -------------------- TEMPLATES LOGIC --------------------

from . models import Vessel, Voyage, Port, VoyageReport

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
  
  


# helper function to fetch the active voyage
def get_active_voyages():
  """
  Returns a queryset of voyages that are currently active (not yet arrived).
  """
  return Voyage.objects.select_related(
    'vessel', 
    'departure_port', 
    'arrival_port'
    ).filter(
      status__in=['in_transit', 'delayed']
    ).order_by('-departure_date')



# UPDATE VOYAGE STATUS
# MANAGE VOYAGE
@require_POST
@login_required
def update_voyage_status(request):
  try:
    data = json.loads(request.body)
    voyage_id = data.get("voyage_id")
    new_status = data.get("status")
    reason = data.get("reason", "").strip()

    print("🚢 Voyage ID:", voyage_id)
    print("✅ New Status:", new_status)
    print("📝 Reason:", reason)


    if not voyage_id or not new_status:
      return JsonResponse({"error": "Missing required data."}, status=400)

    try:
      voyage = Voyage.objects.select_related("vessel", "departure_port", "arrival_port").get(voyage_id=voyage_id)
    except Voyage.DoesNotExist:
      return JsonResponse({"error": "Voyage not found."}, status=404)

    # Block updates if already arrived
    if voyage.status == "arrived":
      return JsonResponse({"error": "Voyage is already marked as 'arrived'."}, status=403)

    # Fetch the admin (you may be using Firebase, adjust this block as needed)
    user_email = request.user.email
    print("👤 User Email:", user_email)
    
    try:
      user = UserProfile.objects.get(email=user_email)
    except UserProfile.DoesNotExist:
      return JsonResponse({"error": "Authenticated user not found."}, status=403)


    # checks if the update of the status is earlier that the time of departure
    if new_status == "arrived" and voyage.arrival_date and voyage.departure_date:
      if voyage.arrival_date < voyage.departure_date:
        return JsonResponse({"error": "Arrival cannot be earlier than departure"}, status=400)
    # Update voyage status
    voyage.status = new_status
    if new_status == "arrived":
      voyage.arrival_date = now()
      voyage.save()

      # set the vessel status to available
      voyage.vessel.status = "available"
      voyage.vessel.save()
    else:
      voyage.save()

    # Handle VoyageReport logic
    report, created = VoyageReport.objects.get_or_create(
      voyage=voyage,
      defaults={
        "created_by": user,
        "created_at": now()
      }
    )

    if new_status == "delayed":
      if not reason:
        return JsonResponse({"error": "Reason is required for delayed status."}, status=400)
      report.delayed_reason = reason
      report.save()

    elif new_status == "arrived":
      # Compose report summary (you'll display this in frontend, so save data only)
      duration = ""
      if voyage.arrival_date and voyage.departure_date:
        delta = voyage.arrival_date - voyage.departure_date
        duration = str(delta)

      report.voyage_report = json.dumps({
        "vessel": {
          "name": voyage.vessel.name,
          "imo": voyage.vessel.imo,
          "type": voyage.vessel.vessel_type
        },
        "voyage_summary": {
          "voyage_number": voyage.voyage_number,
          "departure_port": voyage.departure_port.port_name,
          "departure_date": voyage.departure_date.isoformat(),
          "arrival_port": voyage.arrival_port.port_name,
          "arrival_date": voyage.arrival_date.isoformat(),
          "duration": duration,
          "status": "Arrived",
          "generated_by": f"{user.first_name} {user.last_name}",
          "delayed_reason": report.delayed_reason or "No delay occurred"
        }
      })
      report.save()

    return JsonResponse({"message": f"Voyage status updated to {new_status}."})

  except json.JSONDecodeError:
    return JsonResponse({"error": "Invalid JSON payload."}, status=400)

  except Exception as e:
    print("🔥 Exception:", str(e)) 
    return JsonResponse({"error": str(e)}, status=500)
  
# ENDPOINT FOR THE PAGINATION OF VOYAGE REPORT
# def voyage_report_paginated(request):
#   page_number = request.GET.get('page', 1)

#   reports = VoyageReport.objects.select_related('voyage__vessel').order_by('-created_at')
#   paginator = Paginator(reports, 20)

#   try:
#     page_obj = paginator.page(page_number)
#   except:
#     return JsonResponse({"error": "Invalid page"}, status=400)
  
#   results = []
#   for report in page_obj:
#     try:
#       parsed = json.loads(report.voyage_report or "{}")
#     except:
#       parsed = {}

#     summary = parsed.get("voyage_summary", {})
#     vessel = parsed.get("vessel", {})

#     results.append({
#       "id": report.voyage_report_id,
#       "voyage_number": summary.get("voyage_number", "-"),
#       "vessel_name": summary.get("name", "Unknown Vessel"),
#       "departure_port": summary.get("departure_port", "-"),
#       "arrival_port": summary.get("arrival_port", "-"),
#       "arrival_date": summary.get("arrival_date", "")[10],
#       "duration": summary.get("duration", "-"),
#     })

#     return JsonResponse({
#       "voyages": results,
#       "current_page": page_obj.number,
#       "num_pages": paginator.num_pages,
#       "has_next": page_obj.has_next(),
#       "has_prev": page_obj.has_previous(),
#     })

# ENDPOINT FOR THE FILTER LOGIC IN VOYAGE REPORT:
def voyage_report_filtered(request):
  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    vessel_type = request.GET.get("vessel_type", "all")
    origin = request.GET.get("origin", "all")
    destination = request.GET.get("destination", "all")
    page = int(request.GET.get("page", 1))

    reports = VoyageReport.objects.select_related("voyage__vessel")

    if vessel_type != "all":
      reports = reports.filter(voyage__vessel__vessel_type=vessel_type)

    if origin != "all":
      reports = reports.filter(voyage__departure_port_id=origin)

    if destination != "all":
      reports = reports.filter(voyage__arrival_port_id=destination)


    paginator = Paginator(reports.order_by("-created_at"), 2)
    page_obj = paginator.get_page(page)
    parsed_reports = parse_voyage_report_page(page_obj)

    return render(request, "smartportApp/admin/voyage-report.html", {
      "page_obj": parsed_reports,
      "paginator": paginator,
      "current_page": page,
      "has_next": page_obj.has_next(),
      "has_prev": page_obj.has_previous(),
    })

  return JsonResponse({ "error": "Invalid request" }, status=400)

# ENDPOINT TO SERVE VOYAGE REPORT DETAIL VIEW:
def voyage_report_detail(request, report_id):
  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    try:
      report = VoyageReport.objects.select_related("voyage__vessel").get(voyage_report_id=report_id)

      parsed = json.loads(report.voyage_report)

      # Update vessel type with display version
      vessel = report.voyage.vessel
      if vessel:
        parsed["vessel"]["type"] = vessel.get_vessel_type_display()

      # Update voyage status with display version (optional)
      voyage = report.voyage
      if voyage:
        parsed["voyage_summary"]["status"] = voyage.get_status_display()

      return JsonResponse({ "data": parsed })

    except VoyageReport.DoesNotExist:
      return JsonResponse({ "error": "Report not found" }, status=404)

  return JsonResponse({ "error": "Invalid Request" }, status=400)

# HELPER FOR VOYAGE REPORT
def parse_voyage_report_page(page_obj):
  parsed_reports = []

  for report in page_obj:
    try:
      data = json.loads(report.voyage_report or '{}')
      raw_duration = data.get("voyage_summary", {}).get("duration", "")
      data["voyage_summary"]["clean_duration"] = format_duration_string(raw_duration)
    except Exception:
      data = {}

    parsed_reports.append({
      "report": report,
      "parsed": data
    })

  return parsed_reports
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
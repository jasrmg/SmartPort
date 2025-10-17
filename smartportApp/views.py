import json
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponse, HttpResponseForbidden, Http404
from firebase_admin import auth
from accounts.models import UserProfile

from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Case, When, IntegerField

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo

# import the helper functions
from smartportApp.utils.utils import serialize_incident, create_notification, determine_impact_level, with_approval_priority, enforce_access, log_vessel_activity



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
    return redirect("customs-dashboard")
  elif role == "shipper":
    return redirect("shipper_dashboard")
  elif role == "employee":
    return redirect("incident-feed-view")
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
    if not duration_str or duration_str.startswith("-"):
      return "—"

    parts = duration_str.strip().split(", ")

    # Extract days and time
    if len(parts) == 2:
      days = int(parts[0].split()[0])
      time_str = parts[1].split(".")[0]  # Remove microseconds if present
    else:
      days = 0
      time_str = parts[0].split(".")[0]

    time_parts = list(map(int, time_str.split(":")))
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

from django.db.models.functions import TruncMonth
from django.db.models import Sum, Count
from dateutil.relativedelta import relativedelta
# ========================== END POINT FOR THE CHARTS ==========================
def aware(dt):
  return make_aware(dt) if is_naive(dt) else dt

def cargo_shipment_volume_data(request):
  filter_option = request.GET.get("filter", "this_month")
  today = now().date()
  current_year = today.year

  if filter_option == "this_month":
    start_date = aware(datetime(today.year, today.month, 1))
    end_date = now()
    compare_start = aware((start_date - relativedelta(months=1)).replace(day=1))
    compare_end = start_date - timedelta(days=1)
    label = "vs last month"

  elif filter_option == "last_3_months":
    start_date = aware(datetime.today() - relativedelta(months=3))
    end_date = now()
    compare_start = aware(datetime.today() - relativedelta(months=6))
    compare_end = start_date - timedelta(days=1)
    label = "vs previous 3 months"

  elif filter_option == "last_6_months":
    start_date = aware(datetime.today() - relativedelta(months=6))
    end_date = now()
    compare_start = aware(datetime.today() - relativedelta(months=12))
    compare_end = start_date - timedelta(days=1)
    label = "vs previous 6 months"

  elif filter_option == "ytd":
    start_date = aware(datetime(current_year, 1, 1))
    end_date = now()
    compare_start = aware(datetime(current_year - 1, 1, 1))
    compare_end = aware(datetime(current_year - 1, today.month, today.day))
    label = "vs YTD last year"

  elif filter_option == "last_year":
    start_date = aware(datetime(current_year - 1, 1, 1))
    end_date = aware(datetime(current_year - 1, 12, 31))
    compare_start = aware(datetime(current_year - 2, 1, 1))
    compare_end = aware(datetime(current_year - 2, 12, 31))
    label = "vs year before"

  else:
    return JsonResponse({"error": "Invalid filter"}, status=400)

  current_data = Cargo.objects.filter(
    submanifest__created_at__range=(start_date, end_date)
  ).annotate(
    month=TruncMonth("submanifest__created_at")
  ).values("month").annotate(
    total_quantity=Sum("quantity")
  ).order_by("month")

  current_total = sum(item["total_quantity"] or 0 for item in current_data)
  previous_total = Cargo.objects.filter(
    submanifest__created_at__range=(compare_start, compare_end)
  ).aggregate(total_quantity=Sum("quantity"))["total_quantity"] or 0

  percent_change = (
    ((current_total - previous_total) / previous_total) * 100
    if previous_total > 0 else 0
  )

  response = {
    "labels": [entry["month"].strftime("%b") for entry in current_data],
    "data": [entry["total_quantity"] or 0 for entry in current_data],
    "comparison_stat": {
      "percent_change": round(percent_change, 1),
      "comparison_label": label,
    }
  }

  return JsonResponse(response)

def vessel_status_distribution(request):
  operational_count = Vessel.objects.filter(status__in=["available", "assigned"]).count()
  maintenance_count = Vessel.objects.filter(status="maintenance").count()
  total = operational_count + maintenance_count

  # Handle division by zero
  if total == 0:
    return JsonResponse({
      "labels": ["Operational", "Under Maintenance"],
      "data": [0, 0],
      "colors": ["#2d9c5a", "#fcddb0"]
    })

  operational_percent = round((operational_count / total) * 100)
  maintenance_percent = round((maintenance_count / total) * 100)

  return JsonResponse({
    "labels": ["Operational", "Under Maintenance"],
    "data": [operational_percent, maintenance_percent],
    "colors": ["#2d9c5a", "#fcddb0"]
  })

def incident_chart_data(request):
  filter_range = request.GET.get("filter", "last_6_months")
  now = timezone.now()

  if filter_range == "this_month":
    start_date = now.replace(day=1)
  elif filter_range == "last_3_months":
    start_date = (now - relativedelta(months=2)).replace(day=1)
  elif filter_range == "last_6_months":
    start_date = (now - relativedelta(months=5)).replace(day=1)
  elif filter_range == "ytd":
    start_date = now.replace(month=1, day=1)
  elif filter_range == "last_year":
    start_date = (now - relativedelta(years=1)).replace(month=1, day=1)
  elif filter_range == "all_time":
    earliest = IncidentReport.objects.order_by("incident_datetime").first()
    start_date = earliest.incident_datetime.replace(day=1) if earliest else now.replace(day=1)
  else:
    start_date = (now - relativedelta(months=5)).replace(day=1)  # fallback

  end_date = now.replace(day=1)

  queryset = (
    IncidentReport.objects.filter(incident_datetime__gte=start_date, incident_datetime__lte=now)
    .annotate(month=TruncMonth("incident_datetime"))
    .values("month")
    .annotate(count=Count("incident_id"))
    .order_by("month")
  )

  data = {}
  current = start_date
  while current <= end_date:
    data[current.strftime("%b %Y")] = 0
    current += relativedelta(months=1)

  for item in queryset:
    label = item["month"].strftime("%b %Y")
    data[label] = item["count"]

  this_month_label = now.strftime("%b %Y")
  this_month_count = data.get(this_month_label, 0)

  return JsonResponse({
    "labels": list(data.keys()),
    "counts": list(data.values()),
    "this_month_count": this_month_count
  })


# ENDPOINT TO FILL THE VESSEL ON THE DASHBOARD MAP
def get_vessels_for_map(request):
  voyages = Voyage.objects.select_related('vessel', 'departure_port', 'arrival_port').filter(
    status__in=[Voyage.VoyageStatus.ASSIGNED, Voyage.VoyageStatus.IN_TRANSIT]
  )

  data = []
  for v in voyages:
    data.append({
      "voyage_number": v.voyage_number,
      "vessel_name": v.vessel.name,
      "status": v.status,
      "departure": {
        "lat": v.departure_port.latitude,
        "lng": v.departure_port.longitude
      },
      "arrival": {
        "lat": v.arrival_port.latitude,
        "lng": v.arrival_port.longitude
      }
    })

  return JsonResponse(data, safe=False)


# --------------------------------- ADMIN ---------------------------------
# -------------------- TEMPLATES --------------------
def admin_dashboard(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check

  # 1. count active vessels
  active_vessel_count = Vessel.objects.exclude(status=Vessel.VesselStatus.UNDER_MAINTENANCE).count()
  # 2. count pending submanifests
  pending_submanifest_count = SubManifest.objects.filter(status="pending_admin").count()
  # 3. count incidents in the last 30 days
  thirty_days_ago = timezone.localdate() - timedelta(days=30)
  # get the incidents reported 30 days ago
  recent_incident_count = IncidentReport.objects.filter(created_at__gte=thirty_days_ago).count();
  print("RECENT INCIDENTS: ", recent_incident_count)
  # 4. get 5 active voyages (in transit) for table
  active_voyages = (
    Voyage.objects
    .filter(Q(status=Voyage.VoyageStatus.IN_TRANSIT) | Q(status=Voyage.VoyageStatus.ASSIGNED))
    .select_related("vessel", "departure_port", "arrival_port")
    .order_by("eta")[:5]
  )



  today = timezone.localdate()
  arrivals_today_count = Voyage.objects.filter(arrival_date__date=today).count()

  # Incident reports created today
  incidents_today_count = IncidentReport.objects.filter(created_at__date=today).count()
  print("INCIDENT: ", incidents_today_count)
  context = {
    "active_vessel_count": active_vessel_count,
    "pending_submanifest_count": pending_submanifest_count,
    "recent_incident_count": recent_incident_count,
    "active_voyages": active_voyages,
    "arrivals_today_count": arrivals_today_count,
    "incidents_today_count": incidents_today_count,
    # flag for the topbar wether to show the searchbar or the text:
    "show_logo_text": True,
  }

  return render(request, "smartportApp/admin/dashboard.html", context)

def admin_all_vessels_view(request):
  vessels = get_vessels_data()
  context = {
    "vessels": vessels,
    "placeholder": "Search vessels",
    "search_id": "vesselSearchInput",
  }
  return render(request, "smartportApp/admin/admin-vessels.html", context)

def assign_route_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  context = {
    "show_logo_text": True,
  }
  return render(request, "smartportApp/admin/assign-route.html", context)

def manage_voyage_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  voyages = get_active_voyages()
  context = {
    "voyages": voyages,
    "placeholder": "Search voyages",
    "search_id": "voyageSearchInput",
  }
  # print("VOYAGES: ")
  # for v in voyages:
  #   print(f"{v.voyage_number}: {v.departure_port} -> {v.arrival_port}")
  
  return render(request, "smartportApp/admin/manage-voyage.html", context)

def voyage_report_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check

  reports = VoyageReport.objects.select_related('voyage__vessel', 'created_by').filter(voyage__status="arrived").order_by('-created_at')
  paginator = Paginator(reports, 25)
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
    'placeholder': "Search voyages",
    'search_id': 'voyageSearchInput',
  }
  return render(request, "smartportApp/admin/voyage-report.html", context)

def activity_log_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  vessels = Vessel.objects.all()

  context = {
    "vessels": vessels,
    "show_logo_text": True,
    "test": 9
  }
  return render(request, "smartportApp/admin/vessel-activity-log.html", context)

def admin_users_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  context = {
    "placeholder": "Search users",
    "search_id": "userSearchInput"
  }

  return render(request, "smartportApp/admin/admin-users.html", context)

from django.utils.timezone import make_aware, is_naive
def admin_manifest_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  vessel_type = request.GET.get("vessel_type", "all")
  origin = request.GET.get("origin_port", "all")
  destination = request.GET.get("destination_port", "all")
  departure_date = request.GET.get("departure_date", "")


  voyages = Voyage.objects.select_related(
    "vessel", "departure_port", "arrival_port"
  )

  # Apply filters
  if vessel_type != "all":
    voyages = voyages.filter(vessel__vessel_type=vessel_type)
  
  if origin != "all":
    voyages = voyages.filter(departure_port_id=origin)

  if destination != "all":
    voyages = voyages.filter(arrival_port_id=destination)

  if departure_date:
    try:
      parsed_date = datetime.strptime(departure_date, "%Y-%m-%d")
      start = make_aware(datetime.combine(parsed_date, datetime.min.time()))
      end = make_aware(datetime.combine(parsed_date, datetime.max.time()))

      print("Start of day:", start)
      print("End of day:", end)

      voyages = voyages.filter(
        Q(departure_date__range=(start, end)) |
        Q(arrival_date__range=(start, end))
      )
    except ValueError:
      print("Invalid date input:", departure_date)
  voyages = voyages.order_by("-departure_date")

  paginator = Paginator(voyages, 25)  # Adjust page size as needed
  page_number = request.GET.get("page", 1)

  try:
    page_number = int(page_number)
  except (TypeError, ValueError):
    page_number = 1

  page_obj = paginator.get_page(page_number)
  parsed_voyages = parse_manifest_page(page_obj)

  logger.debug(f"Final voyage count after filters: {voyages.count()}")

  context = {
    "page_obj": parsed_voyages,
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
    "placeholder": "Search voyages",
    "search_id": "voyageSearchInput",
  }

  return render(request, "smartportApp/admin/manifest.html", context)

def submanifest_view(request, submanifest_id):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  submanifest = get_object_or_404(SubManifest.objects.select_related(
    "voyage", "voyage__vessel", "created_by", "master_manifest"
  ).prefetch_related("cargo_items", "documents"), pk=submanifest_id)

  context = {
    "submanifest": submanifest,
    "show_button": ["pending_admin"],
    "can_edit": "custom",
  }
  return render(request, "smartportApp/submanifest.html", context)


def master_manifest_detail_view(request, mastermanifest_id):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  master_manifest = get_object_or_404(MasterManifest, pk=mastermanifest_id)
  submanifests = SubManifest.objects.filter(master_manifest=master_manifest)

  total_cargo_count = Cargo.objects.filter(submanifest__in=submanifests).count()

  context = {
    "manifest": master_manifest,
    "submanifests": submanifests,
    "total_cargo_count": total_cargo_count,
  }
  return render(request, "smartportApp/admin/mastermanifest.html", context)

from django.db.models import F, Q, Value
def report_feed_view(request):
  auth_check = enforce_access(request, 'admin')
  if auth_check:
    return auth_check
  
  sort = request.GET.get("sort", "newest")
  incidents = IncidentReport.objects.all()

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
  
  context = {
    "page_obj": page_obj,
    "placeholder": "Search Incident"
  }
  return render(request, "smartportApp/admin/incident-report-feed.html", context)




# -------------------- END OF ADMIN TEMPLATES --------------------

# -------------------- TEMPLATES LOGIC --------------------

# =========== VESSELS ===========
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
@require_GET
def get_all_vessels(request):
  try:
    available_vessels_qs = Vessel.objects.all()
    
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

    if vessel.status == new_status:
      return JsonResponse({"success": False, "message": "No change detected"})
    
    vessel.status = new_status
    vessel.save()

    # log to the activity log
    user_profile = getattr(request.user,'userprofile', None);
    print("USER IN UPDATE VESSEL STATUS: ", user_profile)
    if not user_profile:
      return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)  
    
    log_vessel_activity(
      vessel=vessel,
      action_type=ActivityLog.ActionType.STATUS_UPDATE,
      description=f"Vessel status updated to {new_status}.",
      user_profile=user_profile
    )

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

    if vessel.name == new_name:
      return JsonResponse({"success": True, "message": "No change detected."})

    old_name = vessel.name
    vessel.name = new_name
    vessel.save()

    # log to the activity log
    user_profile = getattr(request.user, "userprofile", None)
    if not user_profile:
      return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)

    log_vessel_activity(
      vessel=vessel,
      action_type=ActivityLog.ActionType.NOTE, 
      description=f"Vessel renamed from '{old_name}' to '{new_name}'.",
      user_profile=user_profile
    )

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
    
    user_email = request.user.email
    print("👤 User Email:", user_email)
    
    try:
      user = UserProfile.objects.get(email=user_email)
    except UserProfile.DoesNotExist:
      return JsonResponse({"error": "Authenticated user not found."}, status=403)


    vessel = Vessel.objects.create(
      name=name,
      imo=imo,
      vessel_type=vessel_type,
      capacity=capacity,
      created_by=user
    )
    print("USER IN ADD VESSEL: ", user)
    
    log_vessel_activity(
      vessel=vessel,
      action_type=ActivityLog.ActionType.CREATED,
      description=f"Vessel '{vessel.name}' (IMO {vessel.imo}) was added to the fleet by {user.first_name} {user.last_name}.",
      user_profile=user
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
      departure_dt = datetime.strptime(departure_str, "%Y-%m-%d %I:%M %p")
      eta_dt = datetime.strptime(eta_str, "%Y-%m-%d %I:%M %p")

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

    # Create voyage
    voyage = Voyage.objects.create(
      vessel=vessel,
      departure_port=origin,
      arrival_port=destination,
      departure_date=departure_dt,
      eta=eta_dt,
      voyage_number=voyage_number
    )

    # print(f"✅ Voyage #{voyage_number} assigned successfully to vessel ID {vessel_id}")

    # Update vessel status
    vessel.status = Vessel.VesselStatus.ASSIGNED
    vessel.save()
    # print(f"✅ VESSEL ID {vessel_id} UPDATED TO ASSIGNED")

    # CREATE AN ACTIVITY LOG INSTANCE
    user_profile = getattr(request.user, "userprofile", None)
    print("USER: ", user_profile)
    log_vessel_activity(
      vessel=vessel,
      action_type=ActivityLog.ActionType.ASSIGNED,
      description=f"Voyage #{voyage_number} assigned successfully: departing from {origin.port_name} to {destination.port_name}.",
      user_profile=user_profile
    )

    return JsonResponse({"message": "Voyage assigned successfully.", "voyage_number": voyage_number})

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

# helper function to get the last vessel destination to be used in assign route view
@require_GET
def get_vessel_last_destination(request):
  vessel_id = request.GET.get("vessel_id")

  if not vessel_id:
    return JsonResponse({"error": "Vessel ID is required"}, status=400)
  
  try:
    latest_voyage = (
      Voyage.objects.filter(vessel_id=vessel_id).order_by("-departure_date").first()
    )

    if not latest_voyage:
      return JsonResponse({"has_voyage": False})
    
    return JsonResponse({
      "has_voyage": True,
      "last_destination_id": latest_voyage.arrival_port.port_id,
      "last_destination_name": latest_voyage.arrival_port.port_name
    })
  
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
      status__in=['in_transit', 'delayed', 'assigned']
    ).order_by('-departure_date')



# ======================== UPDATE VOYAGE STATUS ========================

# ==================== TESTING ZONE ====================
def generate_master_manifest_logic(voyage, user):
  """
  Reusable logic to generate a master manifest for a voyage.
  Returns (success: bool, message: str, master_manifest: MasterManifest or None)
  """
  # Only approved submanifests
  approved_submanifests = SubManifest.objects.filter(voyage=voyage, status="approved")

  # Must have at least 1 approved submanifest
  if not approved_submanifests.exists():
      return False, "No approved submanifests available for this voyage.", None
  
  # Check if master manifest already exists
  if MasterManifest.objects.filter(voyage=voyage).exists():
      return False, "Master Manifest already exists for this voyage.", None

  try:
    with transaction.atomic():
      master_manifest = MasterManifest.objects.create(
        voyage=voyage,
        vessel=voyage.vessel,
        created_by=user,
        status="generated",
        created_at=now(),
      )

      # Format for mastermanifest_number: MASM-YYYYMMDD-ID
      today_str = now().strftime("%Y%m%d")
      manifest_number = f"MASM-{today_str}-{master_manifest.mastermanifest_id}"

      # Update the instance with the generated number
      master_manifest.mastermanifest_number = manifest_number
      master_manifest.save(update_fields=["mastermanifest_number"])

      # Link approved submanifests to the master manifest
      approved_submanifests.update(master_manifest=master_manifest)

      return True, "Master Manifest generated successfully.", master_manifest
  except Exception as e:
    return False, str(e), None


def generate_master_manifest(request, voyage_id):
  """
  API endpoint to manually generate master manifest
  """
  if request.method != "POST":
      return JsonResponse({"error": "Invalid method"}, status=405)
  
  try:
    voyage = Voyage.objects.get(voyage_id=voyage_id)
    user = request.user.userprofile
    
    success, message, master_manifest = generate_master_manifest_logic(voyage, user)
    
    if not success:
      return JsonResponse({"error": message}, status=400)
    
    return JsonResponse({
      "message": message,
      "manifest_id": master_manifest.pk
    })

  except Voyage.DoesNotExist:
    return JsonResponse({"error": "Voyage not found"}, status=404)
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)


# ============================================================
from accounts.firebase import firestore_client
from google.cloud import firestore

# MANAGE VOYAGE
@require_POST
@login_required
def update_voyage_status(request):
  try:
    data = json.loads(request.body)
    voyage_id = data.get("voyage_id")
    new_status = data.get("status")
    reason = data.get("reason", "").strip()

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


    # Auto-generate master manifest when status changes to in_transit
    master_manifest_generated = False
    master_manifest_message = ""

    if new_status == "in_transit":
      # Check if master manifest doesn't exist yet
      if not MasterManifest.objects.filter(voyage=voyage).exists():
        success, message, master_manifest = generate_master_manifest_logic(voyage, user)

        if success:
          master_manifest_generated = True
          master_manifest_message = f"Master Manifest {master_manifest.mastermanifest_number} auto-generated."
          print(f"✅ Master Manifest auto-generated: {master_manifest.mastermanifest_number}")
          # Log the auto-generation
          log_vessel_activity(
            vessel=voyage.vessel,
            action_type=ActivityLog.ActionType.STATUS_UPDATE,
            description=f"Voyage {voyage.voyage_number} status changed to In Transit. Master Manifest {master_manifest.mastermanifest_number} auto-generated.",
            user_profile=user
          )
        else:
          master_manifest_generated = False
          master_manifest_message = message
          # Log that manifest generation was skipped
          print(f"⚠️ Master Manifest not generated: {message}")
      
      else:
        master_manifest_generated = "already_exists" 
        master_manifest_message = "Master Manifest already exists."
        print(f"ℹ️ Master Manifest already exists for voyage {voyage.voyage_number}")

      voyage.save()
        
    elif new_status == "arrived":
      voyage.arrival_date = now()
      voyage.save()

      # set the vessel status to available
      voyage.vessel.status = "available"
      voyage.vessel.save()


      # Push cargo + delivery data to Firestore
      submanifests = SubManifest.objects.filter(voyage=voyage)
      cargos = Cargo.objects.filter(submanifest__in=submanifests)

      for cargo in cargos:
        # Save cargo data in Firestore
        cargo_ref = firestore_client.collection("Cargo").document(str(cargo.cargo_id)) # use b's naming

        cargo_data = {
          "cargo_id": cargo.cargo_id,
          "submanifest_id": cargo.submanifest.submanifest_id,
          "item_number": cargo.item_number,
          "description": cargo.description,
          "quantity": cargo.quantity,
          "value": float(cargo.value),
          "weight": float(cargo.weight),
          "additional_info": cargo.additional_info or "",
          "hs_code": cargo.hs_code or "",
          "origin": cargo.submanifest.consignor_address if cargo.submanifest.consignor_address else "",
          "destination": cargo.submanifest.consignee_address if cargo.submanifest.consignee_address else "",
          "created_at": cargo.submanifest.created_at,
        }
        cargo_ref.set(cargo_data, merge=True) # change cargo_data to the collection name sa ila ka kiro

        
      print(f"✅ Synced {cargos.count()} cargos to Firestore for voyage {voyage.voyage_number}")
    else:
      voyage.save()

    if new_status == "delayed":
      if not reason:
        return JsonResponse({"error": "Reason is required for delayed status."}, status=400)
      
      report, _ = VoyageReport.objects.get_or_create(
        voyage=voyage,
        defaults={
          "created_by": user,
          "created_at": now()
        }
      )

      report.delayed_reason = reason
      report.save()

      # activity log instance if the voyage is delayed
      log_vessel_activity(
        vessel=voyage.vessel,
        action_type=ActivityLog.ActionType.DELAYED,
        description=f"Voyage {voyage.voyage_number} was marked as delayed. Reason: {reason}",
        user_profile=user
      )

    elif new_status == "arrived":
      # Compose report summary 
      duration = ""
      if voyage.arrival_date and voyage.departure_date:
        delta = voyage.arrival_date - voyage.departure_date
        duration = str(delta)

      # Handle VoyageReport logic
      report, created = VoyageReport.objects.get_or_create(
        voyage=voyage,
        defaults={
          "created_by": user,
          "created_at": now()
        }
      )

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

      # activity log entry if arrived:
      log_vessel_activity(
        vessel=voyage.vessel,
        action_type=ActivityLog.ActionType.ARRIVED,
        description=f"Voyage {voyage.voyage_number} successfully completed. Vessel arrived at {voyage.arrival_port.port_name}.",
        user_profile=user
      )

        # Get unique shipper IDs who have submanifests in this voyage
      shipper_ids = SubManifest.objects.filter(
        voyage=voyage,
        created_by__role=UserProfile.Role.SHIPPER,
        created_by__isnull=False
      ).values_list('created_by_id', flat=True).distinct()

      if shipper_ids:
        # Get the actual UserProfile objects
        shippers = UserProfile.objects.filter(user_id__in=shipper_ids)

        # Create notification
        notification_title = f"Voyage {voyage.voyage_number} Has Arrived"
        notification_message = f"Your shipment has arrived at {voyage.arrival_port.port_name}. Vessel: {voyage.vessel.name}"
        link_url = ""  # none since this will only inform the user

        try:
          create_notification_bulk(
            recipients=shippers,
            title=notification_title,
            message=notification_message,
            link_url=link_url,
            triggered_by=user
          )
          print(f"📧 Sent arrival notifications to {len(shippers)} shippers for voyage {voyage.voyage_number}")
        except Exception as notify_error:
          print(f"❌ Failed to send notifications: {str(notify_error)}")
    
    else:
      if new_status != "in_transit":
        log_vessel_activity(
          vessel=voyage.vessel,
          action_type=ActivityLog.ActionType.STATUS_UPDATE,
          description=f"Voyage {voyage.voyage_number} status changed to {new_status}.",
          user_profile=user
        )

    response_data = {"message": f"Voyage status updated to {new_status}."}
    # Add master manifest info if status was changed to in_transit
    if new_status == "in_transit":
      response_data["master_manifest_generated"] = master_manifest_generated
      response_data["master_manifest_message"] = master_manifest_message

    return JsonResponse(response_data)
    

  except json.JSONDecodeError:
    return JsonResponse({"error": "Invalid JSON payload."}, status=400)

  except Exception as e:
    print("🔥 Exception:", str(e)) 
    return JsonResponse({"error": str(e)}, status=500)
  
  
# ENDPOINT FOR THE FILTER LOGIC IN VOYAGE REPORT:
def voyage_report_filtered(request):
  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    vessel_type = request.GET.get("vessel_type", "all")
    origin = request.GET.get("origin", "all")
    destination = request.GET.get("destination", "all")
    page = int(request.GET.get("page", 1))

    reports = VoyageReport.objects.select_related("voyage__vessel").filter(
      voyage__status="arrived"
    )

    if vessel_type != "all":
      reports = reports.filter(voyage__vessel__vessel_type=vessel_type)

    if origin != "all":
      reports = reports.filter(voyage__departure_port_id=origin)

    if destination != "all":
      reports = reports.filter(voyage__arrival_port_id=destination)


    paginator = Paginator(reports.order_by("-created_at"), 25) # CHANGE 25 
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
      voyage_summary = data.get("voyage_summary") or {}
      raw_duration = voyage_summary.get("duration", "")
      voyage_summary["clean_duration"] = format_duration_string(raw_duration)
      data["voyage_summary"] = voyage_summary
    except Exception:
      data = {}

    parsed_reports.append({
      "report": report,
      "parsed": data
    })

  return parsed_reports

# END POINT TO FILTER THE VESSELS USED IN ACTIVITY LOG
def filter_vessels_by_type(request):
  vessel_type = request.GET.get("type", "all")
  vessel_status = request.GET.get("status", "all")

  try:
    vessels = Vessel.objects.all()

    if vessel_type != "all":
      vessels = vessels.filter(vessel_type=vessel_type)

    if vessel_status != "all":
      vessels = vessels.filter(status=vessel_status)

    data = [{
      "vessel_id": v.vessel_id,
      "name": v.name,
      "imo": v.imo,
      "vessel_type": v.get_vessel_type_display(),
      "status": v.status,
      "status_display": v.get_status_display()
    } for v in vessels]

    return JsonResponse({"vessels": data}, status=200)

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)


from collections import defaultdict
from django.utils.timezone import localtime

import logging
logger = logging.getLogger(__name__)

# ENDPOINT FOR THE DETAIL VIEW OF ACTIVITY LOG

def vessel_detail_view(request, vessel_id):
  try:
    vessel = Vessel.objects.get(pk=vessel_id)
  except Vessel.DoesNotExist:
    raise Http404("Vessel not found")

  # Get most recent voyage
  last_voyage = vessel.voyages.order_by("-departure_date").first()

  # Determine last port (departure of last voyage)
  last_port = (
    last_voyage.departure_port.port_name
    if last_voyage and last_voyage.departure_port
    else "N/A"
  )

  # Determine current port logic
  if last_voyage:
    if last_voyage.status == "arrived":
      current_port = (
        last_voyage.arrival_port.port_name
        if last_voyage.arrival_port else "N/A"
      )
    elif last_voyage.status == "in_transit":
      current_port = (
        f"En route to {last_voyage.arrival_port.port_name}"
        if last_voyage.arrival_port else "N/A"
      )
    else:
      current_port = "N/A"
  else:
    current_port = "N/A"

  # Fetch vessel activity logs (grouped by date if needed on frontend)
  activity_logs = vessel.activity_logs.select_related("created_by").order_by("-created_at")

  logs_data = []
  for log in activity_logs:
    logs_data.append({
      "time": timezone.localtime(log.created_at).strftime("%H:%M"),
      "date": log.created_at.strftime("%Y-%m-%d"),
      "user": f"{log.created_by.first_name} {log.created_by.last_name}" if log.created_by else "System",
      "action_type": log.get_action_type_display(),
      "description": log.description
    })

  data = {
    "name": vessel.name,
    "imo": vessel.imo,
    "vessel_type": vessel.get_vessel_type_display(),
    "gross_tonnage": f"{vessel.capacity:,} GT",
    "current_port": current_port,
    "last_port": last_port,
    "logs": logs_data
  }

  logger.info(f"Returning data for vessel {vessel_id}: {data}")
  return JsonResponse(data)

# ADD VESSEL LOG IN ACTIVITY LOG
# @csrf_exempt
# @login_required
@require_POST
def add_vessel_log_entry(request, vessel_id):
  user = request.user
  try:
    profile = user.userprofile
  except:
    return JsonResponse({"success": False, "error": "Unauthorized."}, status=401)

  try:
    payload = json.loads(request.body)
    description = payload.get("description", "").strip()

    if not description:
      return JsonResponse({"success": False, "error": "Description required."}, status=400)

    vessel = Vessel.objects.get(pk=vessel_id)
    log = ActivityLog.objects.create(
      vessel=vessel,
      action_type=ActivityLog.ActionType.NOTE,
      description=description,
      created_by=profile,
    )

    # Convert UTC time to local timezone (Asia/Manila)
    created_at_local = timezone.localtime(log.created_at)

    created_at = log.created_at
    return JsonResponse({
      "success": True,
      "log": {
        "time": created_at_local.strftime("%I:%M %p"),
        "date": created_at_local.strftime("%Y-%m-%d"),
        "user": f"{profile.first_name} {profile.last_name}",
        "action_type": "Manual Note",
        "description": log.description,
      }
    })

  except Vessel.DoesNotExist:
    return JsonResponse({"success": False, "error": "Vessel not found."}, status=404)
  except Exception as e:
    return JsonResponse({"success": False, "error": str(e)}, status=500)




# =========== MANIFEST ===========:
def get_submanifests_by_voyage(request, voyage_id):
  try:
    # Check if master manifest exists for this voyage
    from django.core.exceptions import ObjectDoesNotExist
    try:
      voyage = Voyage.objects.get(voyage_id=voyage_id)
      has_manifest = hasattr(voyage, 'master_manifest') and voyage.master_manifest is not None
    except ObjectDoesNotExist:
      return JsonResponse({"error": "Voyage not found"}, status=404)
    
    # Filter submanifests based on whether master manifest exists
    if has_manifest:
      # Only show approved submanifests if master manifest exists
      submanifests = SubManifest.objects.filter(
        voyage_id=voyage_id, 
        status='approved'
      )
    else:
      # Show all submanifests if no master manifest
      submanifests = SubManifest.objects.filter(voyage_id=voyage_id)

    data = [
      {
        "id": sm.submanifest_id,
        "status": sm.status,
        "status_label": sm.get_status_display(),
        "submanifest_number": sm.submanifest_number,
        "consignee_name": sm.consignee_name,
        "consignor_name": sm.consignor_name,
        # "item_count": sm.cargo_items.count(),
      }
      for sm in submanifests
    ]

    return JsonResponse({
        "submanifests": data,
        "has_manifest": has_manifest
    })

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

# REJECT SUBMANIFEST: ADMIN BASIN WA NAY GAMIT
@require_POST
def admin_reject_submanifest(request, submanifest_id):
  print("REJECTING")
  if not request.user.userprofile.role == "admin":
    return JsonResponse({"error": "Unauthorized"}, status=403)
  
  try:
    data = json.loads(request.body)
    note = data.get("note", "").strip()
    if not note:
      return JsonResponse({"error": "Rejection reason required"}, status=400)
    
    user = request.user.userprofile

    sub = SubManifest.objects.get(submanifest_id=submanifest_id)
    sub.status = "rejected_by_admin"
    sub.admin_note = note
    sub.updated_by = user
    sub.save()


    link_url = f"/edit/submitted-shipment/{sub.submanifest_id}/"
    # send notification to the shipper
    create_notification(
      user=sub.created_by,
      title="Submanifest Rejected",
      message=f"Your submanifest ({sub.submanifest_number}) was rejected by the admin. Reason: {note}",
      link_url=link_url,
      triggered_by=user
    )

    return JsonResponse({"message": "Rejected"})
  
  except SubManifest.DoesNotExist:
    return JsonResponse({"error": "Submanifest not found"}, status=404)



# APPROVE SUBMANIFEST: ADMIN BASIN WA NAY GAMIT
def admin_approve_submanifest(request, submanifest_id):
  print("APPROVING")
  if not request.user.userprofile.role == "admin":
    return JsonResponse({"error": "Unauthorized"}, status=403)
  
  submanifest = get_object_or_404(SubManifest, pk=submanifest_id)

  if submanifest.status == "pending_customs":
    return JsonResponse({"error": "Submanifest already approved"}, status=400)
  
  submanifest.status = "pending_customs"
  submanifest.save()

  # log activity
  log_vessel_activity(
    vessel=submanifest.voyage.vessel,
    action_type=ActivityLog.ActionType.SUBMANIFEST_APPROVED,
    description=f"Submanifest #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
    user_profile=request.user.userprofile
  )

  # send notification to the shipper without link url
  print("============ NOTIFY SHIPPER ============= ")
  create_notification(
    user=submanifest.created_by,
    title="Submanifest Approved",
    message=f"Submanifestss #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
    link_url="",
    triggered_by=request.user.userprofile
  )

  
  return JsonResponse({"success": True, "message": "Submanifest approved successfully"})

# def generate_master_manifest(request, voyage_id):
#   if request.method != "POST":
#     return JsonResponse({"error": "Invalid method"}, status=405)
  
#   try:
#     voyage = Voyage.objects.get(voyage_id=voyage_id)
#     # only approved submanifest
#     approved_submanifest = SubManifest.objects.filter(voyage=voyage, status="approved")

#     # must have at least 1 submanifest that is approved
#     if not approved_submanifest.exists():
#       return JsonResponse({"error": "No approved submanifests available for this voyage."}, status=400)

#     # if submanifest.filter(status__in=["rejected_by_admin", "rejected_by_customs"]).exists():
#     #   return JsonResponse({"error": "Some submanifests are not approved yet."}, status=400)
    
#     if MasterManifest.objects.filter(voyage=voyage).exists():
#       return JsonResponse({"error": "Master Manifest already exists for this voyage."}, status=400)


#     with transaction.atomic():
#       master_manifest = MasterManifest.objects.create(
#         voyage=voyage,
#         vessel=voyage.vessel,
#         created_by=request.user.userprofile,
#         status="generated",
#         created_at=now(),
#       )

#       # format for mastermanifest_number: MASM-YYYYMMDD-ID
#       today_str = now().strftime("%Y%m%d")
#       manifest_number = f"MASM-{today_str}-{master_manifest.mastermanifest_id}"

#       # update the instance with the generated number:
#       master_manifest.mastermanifest_number = manifest_number
#       master_manifest.save(update_fields=["mastermanifest_number"])

#       # update submanifest to link it to the master manifest
#       approved_submanifest.update(master_manifest=master_manifest)

#   except Voyage.DoesNotExist:
#     return JsonResponse({"error": "Voyage not found"}, status=404)
#   except Exception as e:
#     return JsonResponse({"error": str(e)}, status=500)
  
#   return JsonResponse({"message": "Master Manifest generated successfully.", "manifests_id": master_manifest.pk})


def get_master_manifest_id(request, voyage_id):
  try:
    manifest = MasterManifest.objects.get(voyage_id=voyage_id)
    return JsonResponse({"manifest_id": manifest.mastermanifest_id})
  except MasterManifest.DoesNotExist:
    return JsonResponse({"error": "No master manifest found for this voyage."}, status=404)



# HELPER TO CHECK IF THE MASTER MANIFEST ALREADY EXIST FOR THAT VOYAGE:
def check_master_manifest(request, voyage_id):
  try:
    voyage = Voyage.objects.get(voyage_id=voyage_id)
    has_manifest = MasterManifest.objects.filter(voyage=voyage).exists()
    return JsonResponse({"has_manifest": has_manifest})
  except Voyage.DoesNotExist:
    return JsonResponse({"error": "Voyage not found"}, status=404)

# =========== REPORT ===========
# UPLOAD INCIDENT REPORT(ADMIN, SHIPPER, EMPLOYEE)
from . views_shipper import create_notification_bulk
from django.urls import reverse
def submit_incident_report(request):
  if request.method != "POST":
    return JsonResponse({"error": "Invalid method"}, status=405)
  
  user = request.user.userprofile
  try:
    # === FORM DATA ===
    location = request.POST.get('location', '').strip()
    incident_type = request.POST.get('incident_type', '').strip()
    other_type = request.POST.get('other_incident_type', '').strip()
    description = request.POST.get('description', '').strip()
    vessel_name = request.POST.get('vessel_name', '').strip()

    # === VALIDATION ===
    if not location or not incident_type or not description:
      return JsonResponse({'error': 'Required fields are missing.'}, status=400)

    if incident_type == 'other' and not other_type:
      return JsonResponse({'error': 'Please specify the incident type.'}, status=400)

    # === VESSEL (optional) ===
    vessel = Vessel.objects.filter(name=vessel_name).first() if vessel_name else None

    # === AUTO APPROVE if Admin ===
    is_admin = user.role == 'admin'

    incident = IncidentReport.objects.create(
      location=location,
      description=description,
      incident_datetime=now(),
      impact_level= determine_impact_level(incident_type, description),  
      status='pending',
      incident_type=incident_type,
      other_incident_type=other_type if incident_type == 'other' else '',
      vessel=vessel,
      reporter=user,
      is_approved=is_admin
    )

    # === HANDLE MULTIPLE IMAGES ===
    images = request.FILES.getlist('images')
    for img in images:
      IncidentImage.objects.create(
        incident=incident,
        image=img,
        uploaded_by=user
      )

    # === LOG TO ACTIVITY IF VESSEL IS INVOLVED ===
    if vessel:
      log_vessel_activity(
        vessel=vessel,
        action_type=ActivityLog.ActionType.INCIDENT,
        description=f"Incident reported: {incident.get_incident_type_display()} at {location}.",
        user_profile=user
      )

    # === NOTIFY ADMINS if reporter is not admin ===
    if not is_admin:
      admin_users = UserProfile.objects.filter(role='admin')
      incident_link = reverse('report-feed')
      create_notification_bulk(
        recipients=admin_users,
        title="New Incident Report Submitted",
        message=f"{user.first_name} {user.last_name} reported an incident: {incident.get_incident_type_display()} at {location}.",
        link_url=incident_link,
        triggered_by=user
      )

    # === Build incident response data ===
    image_data = []
    for img in incident.images.all():
      try:
        image_data.append({"url": img.image.url})
      except Exception as e:
        print(f"Skipping image with error: {e}")


    incident_data = {
      "incident_id": incident.incident_id,
      "incident_type_display": incident.get_incident_type_display(),
      "impact_level": incident.impact_level,
      "impact_level_display": incident.get_impact_level_display(),
      "created_at": localtime(incident.incident_datetime).strftime("%Y-%m-%d %H:%M"),
      "reporter_name": f"{user.first_name} {user.last_name}".strip(),
      "vessel_name": vessel.name if vessel else None,
      "location": incident.location,
      "description": incident.description,
      "status": incident.status,
      "is_approved": incident.is_approved,
      "images": image_data
    }

    return JsonResponse({
      'success': True,
      'message': 'Incident report submitted successfully.',
      'approved': is_admin,
      'incident': incident_data  
    })

  except Exception as e:
    import traceback
    traceback.print_exc()
    return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)




# APPROVE INCIDENT(ADMIN)
@require_POST
@login_required
def approve_incident(request, incident_id):
  try:
    incident = IncidentReport.objects.get(pk=incident_id)
    if incident.is_approved:
      return JsonResponse({'success': False, 'error': 'Already approved'})

    incident.is_approved = True
    incident.status = 'pending'
    incident.save()

    if incident.vessel:
      ActivityLog.objects.create(
        vessel=incident.vessel,
        action_type=ActivityLog.ActionType.INCIDENT,
        description=f"Incident report approved: {incident.description[:100]}...",
        created_by=request.user.userprofile
      )

    # Send notification to the reporter
    create_notification(
      user=incident.reporter,
      title="Incident Report Approved",
      message=f"Your incident report at {incident.location} has been approved by the admin.",
      link_url=reverse("shipper-incident-feed"),
      triggered_by=request.user.userprofile
    )

    return JsonResponse({'success': True})
  except IncidentReport.DoesNotExist:
    return JsonResponse({'success': False, 'error': 'Incident not found'})
  except Exception as e:
    return JsonResponse({'success': False, 'error': str(e)})
  
# REJECT INCIDENT(ADMIN)
@require_POST
@login_required
def decline_incident(request, incident_id):
  try:
    incident = IncidentReport.objects.get(pk=incident_id)

    reporter = incident.reporter
    location = incident.location

    incident.delete()
    print("incident deleted")
    # Send notification to the reporter
    create_notification(
      user=reporter,
      title="Incident Report Declined",
      message=f"Your incident report at {location} was declined by the admin.",
      triggered_by=request.user.userprofile
    )

    return JsonResponse({'success': True})
  except IncidentReport.DoesNotExist:
    return JsonResponse({'success': False, 'error': 'Incident not found'})
  except Exception as e:
    return JsonResponse({'success': False, 'error': str(e)})


from django.db import transaction, models
# RESOLVE INCIDENT(ADMIN)
@csrf_exempt
def resolve_incident(request, incident_id):
  if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
    try:
      if not request.user.is_authenticated:
        return JsonResponse({"success": False, "error": "Unauthorized"}, status=401)

      user_profile = getattr(request.user, 'userprofile', None)
      if not user_profile:
        return JsonResponse({"success": False, "error": "User profile not found"}, status=400)

      body = json.loads(request.body)
      resolution_text = body.get("resolution", "").strip()
      if not resolution_text:
        return JsonResponse({"success": False, "error": "Missing resolution"}, status=400)

      # Use select_related for foreign keys that are accessed later
      incident = IncidentReport.objects.select_related('vessel', 'reporter').get(pk=incident_id)

      with transaction.atomic():
        # Create or update resolution
        IncidentResolution.objects.update_or_create(
          incident=incident,
          defaults={
            "resolution_report": resolution_text,
            "resolution_date": timezone.now(),
            "resolved_by": user_profile
          }
        )

        incident.status = "resolved"
        incident.save()

        # Log vessel activity if related
        if incident.vessel:
          incident_type_label = incident.get_incident_type_display()
          location = incident.location or "unspecified location"
          short_description = (incident.description[:100] + "...") if len(incident.description) > 100 else incident.description
          short_description = " ".join(short_description.split())

          description = (
            f"Resolved incident: '{incident_type_label}' at {location}. "
            f"Summary: {short_description}"
          )

          log_vessel_activity(
            vessel=incident.vessel,
            action_type="incident",
            description=description,
            user_profile=user_profile
          )

      return JsonResponse({"success": True, "status": incident.status})

    except IncidentReport.DoesNotExist:
      return JsonResponse({"success": False, "error": "Incident not found"}, status=404)

    except Exception as e:
      print("🔥 Exception occurred during resolution:")
      import traceback
      traceback.print_exc()
      return JsonResponse({"success": False, "error": str(e)}, status=500)

  return JsonResponse({"success": False, "error": "Invalid request"}, status=400)

# HELPER FOR MANIFEST VIEW:
def parse_manifest_page(page_obj):
  parsed_voyages = []

  for voyage in page_obj:
    parsed_voyages.append({
      "voyage": voyage,
      "vessel_name": voyage.vessel.name if voyage.vessel else "Unknown",
      "departure_port": voyage.departure_port.port_name if voyage.departure_port else "N/A",
      "arrival_port": voyage.arrival_port.port_name if voyage.arrival_port else "N/A",
      "departure_date": voyage.departure_date.strftime("%b %d, %Y %H:%M") if voyage.departure_date else "N/A",
      "eta": voyage.eta.strftime("%b %d, %Y %H:%M") if voyage.eta else "Not Set",
      "status": voyage.status,
      "voyage_number": voyage.voyage_number,
    })

  return parsed_voyages






# --------------------------------- CUSTOM ---------------------------------
# TODO: MIGRATE TO A DIFFERENT FILE
# @login_required
# def customs_dashboard(request):
#   return render(request, "smartportApp/custom/dashboard.html")




# --------------------------------- SHIPPER ---------------------------------
# NAA SA views_shippers.py

# --------------------------------- EMPLOYEE ---------------------------------
# TODO: MIGRATE TO A DIFFERENT FILE
# @login_required
# def employee_dashboard(request):
#   return render(request, "smartportApp/employee/dashboard.html")

# view to view the incident resolution
def get_resolution_details(request, incident_id):
  if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
    return JsonResponse({'error': 'Invalid request'}, status=400)

  try:
    incident = IncidentReport.objects.get(incident_id=incident_id)

    print(f"Found incident: {incident.incident_id}")
    print(f"Has resolution: {hasattr(incident, 'resolution')}")

    if not hasattr(incident, 'resolution') or not incident.resolution:
      print("No resolution found!")
      return JsonResponse({'success': False, 'error': 'No resolution found'})
    
    print(f"Resolution found: {incident.resolution}")

    resolution_data = {
      'resolution_report': incident.resolution.resolution_report,
      'resolution_date': incident.resolution.resolution_date.isoformat(),
      'resolved_by_name': incident.resolution.resolved_by.auth_user.get_full_name() if incident.resolution.resolved_by  else 'Unknown'
    }
    return JsonResponse({
      'success': True,
      'resolution': resolution_data
    })
  except IncidentReport.DoesNotExist:
    print(f"Incident {incident_id} not found!")
    return JsonResponse({'success': False, 'error': 'Incident not found'})
  except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    return JsonResponse({'success': False, 'error': str(e)})


# search functionality
from django.views.decorators.http import require_http_methods
from django.db.models.functions import Concat

@login_required
@require_http_methods(["GET"])
def search_incidents(request):
  query = request.GET.get('q', '').strip()
  sort = request.GET.get('sort', 'newest')
  page = int(request.GET.get('page', 10))

  # Determine user type and filter incidents accordingly
  is_admin = request.user.userprofile.role == "admin"
  print(is_admin)

  if is_admin:
    incidents = IncidentReport.objects.all()
  else:
    incidents = IncidentReport.objects.filter(is_approved=True)

  # apply search filter if query exists

  if query:
    incidents = incidents.annotate(
      reporter_full_name=Concat(
        'reporter__first_name', Value(' '), 'reporter__last_name'
      )
    )
    search_filter = (
      Q(incident_type__icontains=query) |
      Q(other_incident_type__icontains=query) |
      Q(vessel__name__icontains=query) |
      Q(reporter__first_name__icontains=query) |
      Q(reporter__last_name__icontains=query) |
      Q(reporter_full_name__icontains=query) |
      Q(location__icontains=query) |
      Q(description__icontains=query)
    )
    incidents = incidents.filter(search_filter)

  # Apply sorting
  if is_admin:
    # For admin, prioritize unapproved incidents first, then apply requested sorting
    if sort == 'newest':
      incidents = incidents.order_by('is_approved', '-created_at')
    elif sort == 'oldest':
      incidents = incidents.order_by('is_approved', 'created_at')
    elif sort == 'vessel':
      incidents = incidents.order_by('is_approved', 'vessel__name')
    elif sort == 'impact':
      incidents = incidents.extra(
        select={
          'impact_order': 'CASE WHEN impact_level="high" THEN 3 WHEN impact_level="medium" THEN 2 ELSE 1 END'
        }
      ).order_by('is_approved', '-impact_order')
    elif sort == 'status_resolved':
      incidents = incidents.order_by('is_approved', '-status', '-created_at')
    elif sort == 'status_pending':
      incidents = incidents.order_by('is_approved', 'status', '-created_at')
  else:
    if sort == 'newest':
      incidents = incidents.order_by('-created_at')
    elif sort == 'oldest':
      incidents = incidents.order_by('created_at')
    elif sort == 'vessel':
      incidents = incidents.order_by('vessel__name')
    elif sort == 'impact':
      incidents = incidents.extra(
        select={'impact_order': 'CASE WHEN impact_level="high" THEN 3 WHEN impact_level="medium" THEN 2 ELSE 1 END'},
        order_by=['-impact_order']
      )
    elif sort == 'status_resolved':
      incidents = incidents.order_by('-status', '-created_at')
    elif sort == 'status_pending':
      incidents = incidents.order_by('status', '-created_at')

  # paginate
  paginator = Paginator(incidents, 1) 
  page_obj = paginator.get_page(page)

  # serialize incidents for JSON response
  incidents_data = []
  for incident in page_obj:
    # get reporter name
    reporter_name = f"{incident.reporter.first_name} {incident.reporter.last_name}"
    # get images
    images = []
    for img in incident.images.all():
      images.append({'url': img.image.url})

    incidents_data.append({
      'incident_id': incident.incident_id,
      'incident_type_display': incident.get_incident_type_display(),
      'impact_level': incident.impact_level,
      'impact_level_display': incident.get_impact_level_display(),
      'created_at': incident.created_at.isoformat(),
      'reporter_name': reporter_name,
      'vessel_name': incident.vessel.name if incident.vessel else None,
      'location': incident.location,
      'description': incident.description,
      'status': incident.status,
      'is_approved': incident.is_approved,
      'images': images
    })

  return JsonResponse({
    'incidents': incidents_data,
    'has_more': page_obj.has_next(),
    'current_page': page,
    'total_pages': paginator.num_pages,
    'total_count': paginator.count
  })
  
# SEARCH FUNCTIONALITY FOR THE VESSEL MANAGEMENT:
@require_http_methods(["POST"])
def search_vessels(request):
  """
    API endpoint for searching vessels by name, IMO, or type
  """
  try:
    data = json.loads(request.body)
    query = data.get('query', '').strip()
    
    if not query:
      return JsonResponse({
        'success': False,
        'message': 'Search query is required'
      }, status=400)
        
    # Perform case-insensitive search across multiple fields
    vessels = Vessel.objects.filter(
      Q(name__icontains=query) |
      Q(imo__icontains=query) |
      Q(vessel_type__icontains=query)
    ).order_by('name')
        
    # Convert to list of dictionaries for JSON response
    vessel_list = []
    for vessel in vessels:
      vessel_list.append({
        'vessel_id': vessel.vessel_id,
        'name': vessel.name,
        'imo': vessel.imo,
        'vessel_type': vessel.vessel_type,
        'type_display': vessel.get_vessel_type_display(),
        'status': vessel.status,
        'status_display': vessel.get_status_display(),
        'capacity': vessel.capacity,
        'created_at': vessel.created_at.isoformat(),
      })
        
    return JsonResponse({
      'success': True,
      'vessels': vessel_list,
      'total_found': len(vessel_list),
      'query': query
    })
        
  except json.JSONDecodeError:
    return JsonResponse({
      'success': False,
      'message': 'Invalid JSON data'
    }, status=400)

  except Exception as e:
    return JsonResponse({
      'success': False,
      'message': f'Server error: {str(e)}'
    }, status=500)


def search_voyages(request):
  """
    API endpoint to search voyages by voyage number, vessel name, or port names.
    Returns JSON response with matching voyages.
    """
  try:
    data = json.loads(request.body)
    query = data.get('query', '').strip()

    if not query:
      return JsonResponse({'voyages': []})
    
    # Only include active voyages (not arrived) as shown in your template
    voyages = Voyage.objects.filter(
      (models.Q(voyage_number__icontains=query) |
        models.Q(vessel__name__icontains=query) |
        models.Q(departure_port__port_name__icontains=query) |
        models.Q(departure_port__port_code__icontains=query) |
        models.Q(arrival_port__port_name__icontains=query) |
        models.Q(arrival_port__port_code__icontains=query)) &
      ~models.Q(status=Voyage.VoyageStatus.ARRIVED)  # Exclude arrived voyages
    ).select_related('vessel', 'departure_port', 'arrival_port').order_by('-created_at')[:50]  # Limit results

    voyage_data = []
    for voyage in voyages:
      # Format dates
      departure_formatted = voyage.departure_date.strftime("%b %d, %Y - %I:%M %p") if voyage.departure_date else "N/A"
      eta_formatted = voyage.eta.strftime("%b %d, %Y - %I:%M %p") if voyage.eta else "N/A"

      voyage_data.append({
        'voyage_id': voyage.voyage_id,
        'voyage_number': voyage.voyage_number,
        'vessel_name': voyage.vessel.name if voyage.vessel else "N/A",
        'origin_port': voyage.departure_port.port_name if voyage.departure_port else "N/A",
        'destination_port': voyage.arrival_port.port_name if voyage.arrival_port else "N/A",
        'departure_date': departure_formatted,
        'eta': eta_formatted,
        'status': voyage.status,
        'status_display': voyage.get_status_display(),
      })

    return JsonResponse({'voyages': voyage_data})
  
  except json.JSONDecodeError:
    return JsonResponse({'error': 'Invalid JSON data'}, status=400)
  except Exception as e:
    return JsonResponse({'error': f'Search failed: {str(e)}'}, status=500)

# @require_http_methods(["GET"])
# def voyage_report_search(request):
#   query = request.GET.get('q', '').strip()

#   if len(query) < 2:
#     return JsonResponse({'results': []})
  


#   # Search across multiple fields
#   search_filter = Q()
#   search_filter |= Q(voyage__vessel__name__icontains=query)
#   search_filter |= Q(voyage__voyage_number__icontains=query)
#   search_filter |= Q(voyage__departure_port__port_name__icontains=query)
#   search_filter |= Q(voyage__arrival_port__port_name__icontains=query)
#   search_filter |= Q(voyage__departure_port__port_code__icontains=query)
#   search_filter |= Q(voyage__arrival_port__port_code__icontains=query)

#   # Filter completed voyages only (assuming you want reports for completed voyages)
#   reports = VoyageReport.objects.filter(
#     search_filter,
#     voyage__status='arrived'  # or whatever status indicates completion
#   ).select_related(
#     'voyage__vessel',
#     'voyage__departure_port',
#     'voyage__arrival_port'
#   ).order_by('-created_at')[:25]  # CHANGE TO 25 IN PROD

#   parsed_reports = parse_voyage_report_page(reports)

#   # Convert to JSON-serializable format
#   results = []
#   for item in parsed_reports:
#     report = item['report']
#     parsed = item['parsed']
    
#     # Convert the report model to a dictionary
#     report_dict = {
#       'voyage_report_id': report.voyage_report_id,
#       'created_at': report.created_at.isoformat() if report.created_at else None,
#       'delayed_reason': report.delayed_reason,
#       # Add other fields you need from the report model
#     }
    
#     results.append({
#       'report': report_dict,
#       'parsed': parsed  # This should already be a dict from your parser
#     })
    
#   return JsonResponse({
#     'results': results,
#     'count': len(results)
#   })


# ======================= SEARCH AND FILTER VOYAGE REPORT PART =======================
@require_http_methods(["GET"])
def voyage_report_search(request):
  query = request.GET.get('q', '').strip()

  if len(query) < 2:
    return JsonResponse({'results': []})

  # Get filter parameters
  vessel_type = request.GET.get('vessel_type', 'all')
  origin_port = request.GET.get('origin', 'all')
  destination_port = request.GET.get('destination', 'all')

  # Search across multiple fields
  search_filter = Q()
  search_filter |= Q(voyage__vessel__name__icontains=query)
  search_filter |= Q(voyage__voyage_number__icontains=query)
  search_filter |= Q(voyage__departure_port__port_name__icontains=query)
  search_filter |= Q(voyage__arrival_port__port_name__icontains=query)
  search_filter |= Q(voyage__departure_port__port_code__icontains=query)
  search_filter |= Q(voyage__arrival_port__port_code__icontains=query)

  # Build the base queryset with search filter
  reports = VoyageReport.objects.filter(
    search_filter,
    voyage__status='arrived'
  ).select_related(
    'voyage__vessel',
    'voyage__departure_port',
    'voyage__arrival_port'
  )

  # Apply additional filters
  if vessel_type != 'all':
    reports = reports.filter(voyage__vessel__vessel_type=vessel_type)
  
  if origin_port != 'all':
    reports = reports.filter(voyage__departure_port__port_id=origin_port)
  
  if destination_port != 'all':
    reports = reports.filter(voyage__arrival_port__port_id=destination_port)

  # Order and limit results
  reports = reports.order_by('-created_at')[:25]

  parsed_reports = parse_voyage_report_page(reports)

  # Convert to JSON-serializable format
  results = []
  for item in parsed_reports:
    report = item['report']
    parsed = item['parsed']
    
    # Convert the report model to a dictionary
    report_dict = {
      'voyage_report_id': report.voyage_report_id,
      'created_at': report.created_at.isoformat() if report.created_at else None,
      'delayed_reason': report.delayed_reason,
    }
    
    results.append({
      'report': report_dict,
      'parsed': parsed
    })
      
  return JsonResponse({
    'results': results,
    'count': len(results)
  })


@require_http_methods(["GET"])
def voyage_report_filter(request):
  # Get parameters
  page_number = request.GET.get('page', 1)
  vessel_type = request.GET.get('vessel_type', 'all')
  origin_port = request.GET.get('origin', 'all')
  destination_port = request.GET.get('destination', 'all')
  search_query = request.GET.get('q', '').strip()  # Add search query parameter

  # Start with base queryset
  reports = VoyageReport.objects.select_related(
    'voyage__vessel', 
    'created_by', 
    'voyage__departure_port', 
    'voyage__arrival_port'
  ).filter(voyage__status="arrived")

  # Apply search filter if search query exists
  if search_query and len(search_query) >= 2:
    search_filter = Q()
    search_filter |= Q(voyage__vessel__name__icontains=search_query)
    search_filter |= Q(voyage__voyage_number__icontains=search_query)
    search_filter |= Q(voyage__departure_port__port_name__icontains=search_query)
    search_filter |= Q(voyage__arrival_port__port_name__icontains=search_query)
    search_filter |= Q(voyage__departure_port__port_code__icontains=search_query)
    search_filter |= Q(voyage__arrival_port__port_code__icontains=search_query)
    reports = reports.filter(search_filter)

  # Apply additional filters
  if vessel_type != 'all':
    reports = reports.filter(voyage__vessel__vessel_type=vessel_type)
  
  if origin_port != 'all':
    reports = reports.filter(voyage__departure_port__port_id=origin_port)
  
  if destination_port != 'all':
    reports = reports.filter(voyage__arrival_port__port_id=destination_port)

  reports = reports.order_by('-created_at')
  
  # Paginate
  paginator = Paginator(reports, 25)
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


def search_users(request):
  query = request.GET.get("query", "").strip()

  if not query:
    return JsonResponse({"error": "Missing query parameter"}, status=400)
  
  if len(query) < 2:
    return JsonResponse({"error": "Query must be at least 2 characters"}, status=400)
    
  users = UserProfile.objects.filter(
    Q(first_name__icontains=query) |
    Q(last_name__icontains=query) |
    Q(email__icontains=query) |
    Q(role__icontains=query)
  ).order_by('role', 'first_name', 'last_name')

  # Group results by role
  results_by_role = {}
  total_results = 0
  
  for user in users:
    role = user.role
    if role not in results_by_role:
      results_by_role[role] = []
    
    results_by_role[role].append({
      'first_name': user.first_name,
      'last_name': user.last_name,
      'role': user.role,
      'avatar': user.avatar or "",
      'is_online': user.is_online,
      'email': user.email,
    })
    total_results += 1

  return JsonResponse({
    "query": query,
    "total_results": total_results,
    "results_by_role": results_by_role
  })


def voyage_search_api(request):
  """API endpoint for searching voyages"""
  query = request.GET.get('q', '').strip()
  
  if not query or len(query) < 2:
    return JsonResponse({'voyages': []})
  
  # Get filter parameters
  vessel_type = request.GET.get('vessel_type', '')
  origin_port = request.GET.get('origin_port', '')
  destination_port = request.GET.get('destination_port', '')
  date = request.GET.get('date', '')
  
  # Build search query
  search_q = Q()
  
  # Search in voyage number, vessel name, and port names
  search_q |= Q(voyage_number__icontains=query)
  search_q |= Q(vessel__name__icontains=query)
  search_q |= Q(departure_port__port_name__icontains=query)
  search_q |= Q(arrival_port__port_name__icontains=query)
  
  # Start with base queryset
  voyages = Voyage.objects.select_related(
    'vessel', 'departure_port', 'arrival_port'
  ).filter(search_q)
  
  # Apply filters
  if vessel_type and vessel_type != 'all':
    voyages = voyages.filter(vessel__vessel_type=vessel_type)
  
  if origin_port and origin_port != 'all':
    voyages = voyages.filter(departure_port_id=origin_port)
      
  if destination_port and destination_port != 'all':
    voyages = voyages.filter(arrival_port_id=destination_port)
      
  if date:
    try:
      from datetime import datetime
      search_date = datetime.strptime(date, '%Y-%m-%d').date()
      voyages = voyages.filter(departure_date__date=search_date)
    except ValueError:
      pass
  
  # Order by departure date (newest first)
  voyages = voyages.order_by('-departure_date')[:50]  # Limit results
  
  # Serialize the data
  voyage_data = []
  for voyage in voyages:
    voyage_data.append({
      'voyage_id': voyage.voyage_id,
      'voyage_number': voyage.voyage_number,
      'vessel_name': voyage.vessel.name,
      'departure_port_name': voyage.departure_port.port_name if voyage.departure_port else None,
      'arrival_port_name': voyage.arrival_port.port_name if voyage.arrival_port else None,
      'departure_date': voyage.departure_date.isoformat() if voyage.departure_date else None,
      'arrival_date': voyage.arrival_date.isoformat() if voyage.arrival_date else None,
      'eta': voyage.eta.isoformat() if voyage.eta else None,
    })
  
  return JsonResponse({'voyages': voyage_data})
from datetime import datetime
import os
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponseForbidden, HttpResponse
from django.core.exceptions import ObjectDoesNotExist

from . models import Vessel, Voyage, Port, VoyageReport, ActivityLog, IncidentImage, IncidentReport, IncidentResolution, MasterManifest, SubManifest, Document, Notification, Cargo, CargoDelivery, CustomClearance, UserProfile

from django.utils.timezone import make_aware, is_naive
from django.db.models import F, Q
from django.db import transaction
import logging
from django.core.paginator import Paginator

logger = logging.getLogger(__name__)

import json

from smartportApp.utils.utils import with_approval_priority, serialize_incident, create_notification_bulk, enforce_access

# --------------------------------- SHIPPER ---------------------------------
# -------------------- TEMPLATES --------------------
from datetime import timedelta
from django.utils.timezone import now
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
# shows the vessel/s in the dashboard where the shipper has a shipment
def shipper_vessels(request):
  user = request.user.userprofile

  # get voyages where the shipper has submanifests
  voyages = Voyage.objects.filter(
    submanifest__created_by=user
  ).distinct()

  vessels = []
  for voyage in voyages:
    if voyage.vessel:
      vessels.append({
        "vessel_name": voyage.vessel.name,
        "status": voyage.status,
        "departure": {
          "lat": voyage.departure_port.latitude,
          "lng": voyage.departure_port.longitude
        },
        "arrival": {
          "lat": voyage.arrival_port.latitude,
          "lng": voyage.arrival_port.longitude
        },
      })

  return JsonResponse(vessels, safe=False)

def shipper_shipment_volume_chart_api(request):
  """
  API endpoint for monthly shipment volume chart data
  Returns cargo counts grouped by month
  """
  auth_check = enforce_access(request, 'shipper')
  if auth_check:
    return JsonResponse({'error': 'Unauthorized'}, status=403)
  
  user = request.user.userprofile
  period = request.GET.get('period', 'thismonth')

  # Calculate date range based on period
  now = timezone.now()
  if period == 'thismonth':
    start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = 1
  elif period == '3months':
    # Use exact 3 months back instead of 90 days
    start_date = (now - timedelta(days=90)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = 3
  elif period == '6months':
    start_date = (now - timedelta(days=180)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = 6
  elif period == 'ytd':
    start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = now.month
  elif period == 'lastyear':
    start_date = (now - timedelta(days=365)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = 12
  else:
    start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months_back = 1
  
  # DEBUG: Check if we have any SubManifest records at all
  total_records = SubManifest.objects.filter(created_by=user).count()
  records_in_range = SubManifest.objects.filter(
    created_by=user,
    created_at__gte=start_date
  ).count()
  
  # print(f"DEBUG - Total SubManifest records for user: {total_records}")
  # print(f"DEBUG - Records in date range ({start_date} to {now}): {records_in_range}")
  # print(f"DEBUG - Date range: {start_date} to {now}")
  
  # Check the cargo_items relationship
  sample_manifest = SubManifest.objects.filter(created_by=user).first()
  if sample_manifest:
    cargo_count = sample_manifest.cargo_items.count()
    # print(f"DEBUG - Sample manifest cargo items count: {cargo_count}")
    if cargo_count > 0:
      sample_cargo = sample_manifest.cargo_items.first()
      # print(f"DEBUG - Sample cargo quantity: {sample_cargo.quantity}")

  # Get shipment data grouped by month with debugging
  shipment_data = SubManifest.objects.filter(
    created_by=user,
    created_at__gte=start_date
  ).annotate(
    month=TruncMonth('created_at')
  ).values('month').annotate(
    shipment_count=Count('submanifest_id'),
    total_cargo=Sum('cargo_items__quantity')
  ).order_by('month')
  
  # print(f"DEBUG - Shipment data query result: {list(shipment_data)}")
  
  # Alternative query - try without the cargo_items relationship first
  simple_shipment_data = SubManifest.objects.filter(
    created_by=user,
    created_at__gte=start_date
  ).annotate(
    month=TruncMonth('created_at')
  ).values('month').annotate(
    shipment_count=Count('submanifest_id')
  ).order_by('month')
  
  # print(f"DEBUG - Simple shipment data (no cargo): {list(simple_shipment_data)}")

  # Create a complete list of time periods for the chart
  labels = []
  current_period_data = []

  if period == 'thismonth':
    # Show daily data for current month
    current_date = start_date
    while current_date <= now:
      day_start = current_date
      day_end = current_date.replace(hour=23, minute=59, second=59)
      
      day_data = SubManifest.objects.filter(
        created_by=user,
        created_at__gte=day_start,
        created_at__lte=day_end
      ).aggregate(
        total_cargo=Sum('cargo_items__quantity'),
        shipment_count=Count('submanifest_id')
      )
      
      labels.append(current_date.strftime('%b %d'))
      # Use shipment count as fallback if cargo quantity is 0
      cargo_value = day_data['total_cargo'] or day_data['shipment_count'] or 0
      current_period_data.append(cargo_value)
      
      current_date += timedelta(days=1)
  else:
    # Show monthly data for other periods
    months_list = []
    current_month = start_date.replace(day=1)

    while current_month <= now:
      months_list.append(current_month)
      if current_month.month == 12:
        current_month = current_month.replace(year=current_month.year + 1, month=1)
      else:
        current_month = current_month.replace(month=current_month.month + 1)

    # Convert query results to dictionary for easy lookup
    # Normalize the keys to avoid timezone/day mismatch issues
    data_dict = {}
    for item in shipment_data:
      # Create a normalized key (year, month) for matching
      key = (item['month'].year, item['month'].month)
      data_dict[key] = item
      print(f"DEBUG - Data dict key created: {key} -> cargo={item['total_cargo']}, shipments={item['shipment_count']}")
    
    # Build the response data
    for month in months_list:
      labels.append(month.strftime('%b %Y'))
      
      # Create matching key for lookup
      lookup_key = (month.year, month.month)
      print(f"DEBUG - Looking up key: {lookup_key}")
      
      if lookup_key in data_dict:
        cargo_value = data_dict[lookup_key]['total_cargo'] or data_dict[lookup_key]['shipment_count'] or 0
        current_period_data.append(cargo_value)
        print(f"DEBUG - Month {month.strftime('%b %Y')}: FOUND cargo={data_dict[lookup_key]['total_cargo']}, shipments={data_dict[lookup_key]['shipment_count']}")
      else:
        current_period_data.append(0)
        print(f"DEBUG - Month {month.strftime('%b %Y')}: No data found for key {lookup_key}")
  
  # Calculate previous period data for comparison
  if period == 'thismonth':
    if now.month == 1:
      previous_start = now.replace(year=now.year-1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
      previous_start = now.replace(month=now.month-1, day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_end = start_date
  elif period == 'ytd':
    previous_start = now.replace(year=now.year-1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_end = now.replace(year=now.year-1, month=now.month, day=now.day, hour=0, minute=0, second=0, microsecond=0)
  else:
    days_diff = (now - start_date).days
    previous_start = start_date - timedelta(days=days_diff)
    previous_end = start_date

  previous_data = SubManifest.objects.filter(
    created_by=user,
    created_at__gte=previous_start,
    created_at__lt=previous_end
  ).aggregate(
    total_cargo=Sum('cargo_items__quantity'),
    shipment_count=Count('submanifest_id')
  )

  # Calculate percentage change
  current_total = sum(current_period_data)
  previous_total = previous_data['total_cargo'] or previous_data['shipment_count'] or 0
  
  if previous_total > 0:
    percentage_change = ((current_total - previous_total) / previous_total) * 100
  else:
    percentage_change = 100 if current_total > 0 else 0

  # Add debugging info to response
  # debug_info = {
  #   'total_user_records': total_records,
  #   'records_in_range': records_in_range,
  #   'date_range': f"{start_date} to {now}",
  #   'raw_shipment_data': list(shipment_data),
  #   'simple_shipment_data': list(simple_shipment_data)
  # }

  return JsonResponse({
    'labels': labels,
    'datasets': [
      {
        'label': 'Current Period',
        'data': current_period_data,
        'backgroundColor': '#1e3a8a',
        'borderColor': '#1e3a8a',
        'borderWidth': 2,
        'fill': False
      }
    ],
    'stats': {
      'percentage_change': round(percentage_change, 1),
      'current_total': current_total,
      'previous_total': previous_total
    },
    # 'debug': debug_info  # Remove this in production
  })

@login_required
def shipper_dashboard(request):
  # check if authenticated and role is shipper
  auth_check = enforce_access(request, 'shipper')
  if auth_check:
    return auth_check

  # getting the logged user
  user = request.user.userprofile
  print("BOBONG USER: ", user.first_name)
  print("BOBONG USER: ", user.role)

  # data for the table
  # active shipments with select_related to avoid N+1 queries
  active_shipments = SubManifest.objects.filter(
    created_by=user,
    voyage__status__in=[
      Voyage.VoyageStatus.IN_TRANSIT,
      Voyage.VoyageStatus.ASSIGNED,
      Voyage.VoyageStatus.DELAYED
    ]
  ).select_related(
    "voyage", "voyage__vessel", "voyage__departure_port", "voyage__arrival_port"
  ).annotate(
    cargo_count=Count('cargo_items')
  )
  active_shipments_count = active_shipments.count()

  # new arrivals today
  today = now().date()
  new_arrivals_today_count = Voyage.objects.filter(
    arrival_date=today,
    status=Voyage.VoyageStatus.ARRIVED
  ).count()


  # pending clearance card count
  pending_clearance = SubManifest.objects.filter(
    created_by=user
  ).filter(
    Q(custom_clearance__isnull=True) |
    Q(custom_clearance__clearance_status=CustomClearance.ClearanceStatus.PENDING)
  ).count()

  # recent incident card count
  recent_incidents_count = IncidentReport.objects.filter(
    is_approved=True,
    created_at__date=today
  ).count()

  context = {
    'show_logo_text': True,
    'active_shipments': active_shipments,
    'active_shipments_count': active_shipments_count,
    'new_arrivals_today_count': new_arrivals_today_count,
    'pending_clearance': pending_clearance,
    'recent_incidents_count': recent_incidents_count,
  }


  return render(request, "smartportApp/shipper/dashboard.html", context)

def shipper_vessel_info_view(request):
  # check if authenticated and role is shipper
  auth_check = enforce_access(request, 'shipper')
  if auth_check:
    return auth_check
  
  vessels = Vessel.objects.all().order_by('name')
  context = {
    'vessels': vessels,
  }
  return render(request, "smartportApp/shipper/vessel-info.html", context)

def shipper_deliveries_view(request):
  # check if authenticated and role is shipper
  auth_check = enforce_access(request, 'shipper')
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
  # filter only on voyage departure and arrival date, does not include filtering in creation date.
  if parsed_date:
    submanifests = submanifests.filter(
      Q(voyage__departure_date__date=parsed_date) |
      Q(voyage__arrival_date__date=parsed_date) 
    )

  # Order results by newest voyages, edited/updated recently, creation date
  # submanifests = submanifests.order_by("-voyage__departure_date", "-updated_at", "-created_at") 
  submanifests = submanifests.order_by("-created_at", "-voyage__departure_date", "-updated_at") # created at - departure date - updated at

  print("PARSED DATE: ", parsed_date)
  print(f"Submanifests count after filters: {submanifests.count()}")
  logger.debug(f"Final queryset count after date filter: {submanifests.count()}")

  paginator = Paginator(submanifests, 25)
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
  auth_check = enforce_access(request, 'shipper')
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
  auth_check = enforce_access(request, 'shipper')
  if auth_check:
    return auth_check
  
  # check if the submanifest exists
  submanifest = get_object_or_404(SubManifest, pk=submanifest_id)
  
  # check if voyage is no longer accepting submission. e.g. status != assigned
  if submanifest.voyage.status != Voyage.VoyageStatus.ASSIGNED:
    context = {
      'link': 'shipper-dashboard',
      'text': 'This <strong>voyage</strong> is no longer accepting submanifest submissions. Please prepare your documents for the next available voyage.'
    }
    return render(request, "smartportApp/403-forbidden-page.html", context)


  # check if the submanifest status is rejected by admin or rejected by customs
  allowed_statuses = ["rejected_by_admin", "rejected_by_customs"]
  submanifest = get_object_or_404(SubManifest, pk=submanifest_id)
  if submanifest.status not in allowed_statuses:
    context = {
      'link': 'shipper-dashboard',
      'text': 'This <strong>shipment</strong> cannot be edited due to its current status.'
    }
    return render(request, "smartportApp/403-forbidden-page.html", context)

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
  auth_check = enforce_access(request, 'shipper')
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
# def custom_clearance_view(request, submanifest_id):
#   # view to display the custom clearance
#   user = request.user.userprofile
#   print("TANGANG USER: ", user)

#   # get submanifest with its related data:
#   submanifest = get_object_or_404(
#     SubManifest.objects.select_related(
#       'voyage__vessel',
#       'voyage__departure_port',
#       'voyage__arrival_port',
#       'custom_clearance__created_by',
#       'custom_clearance__reviewed_by'
#     ).prefetch_related('documents'),
#     submanifest_id=submanifest_id,
#     # created_by=1
#   )

#   # check if clearance exists
#   try:
#     clearance = submanifest.custom_clearance
#   except CustomClearance.DoesNotExist:
#     clearance = None

#   # prepare documents data
#   documents_data = []
#   if submanifest.documents.exists():
#     for doc in submanifest.documents.all():
#       documents_data.append({
#         'type': doc.get_document_type_display(),
#         'filename': doc.get_download_filename(),
#         'uploaded_at': doc.uploaded_at,
#         'file_url': doc.file.url if doc.file else None
#       })
  
#   # prepare clearance data:
#   clearance_data = {
#     'exists': clearance is not None,
#     'clearance_number': clearance.clearance_number if clearance else 'Error Clearance Number',
#     'created_at': clearance.created_at if clearance else 'Error Created At',
#     'inspection_data': clearance.inspection_date if clearance else 'Error Inspection Date',
#     'status': clearance.get_clearance_status_display() if clearance else 'Error Status',
#     'remarks': clearance.remarks if clearance else 'Error Remarks',
#     'cleared_by': clearance.reviewed_by if clearance else 'No remarks available',
#     'clearance_file': clearance.clearance_file if clearance else None,
#     'created_by': clearance.created_by if clearance else None,
#   }

#   # Prepare submanifest data
#   # submanifest_data = {
#   #   'id': submanifest.submanifest_id,
#   #   'number': submanifest.submanifest_number,
#   #   'created_at': submanifest.created_at,
#   #   'vessel_name': submanifest.voyage.vessel.name,
#   #   'voyage_number': submanifest.voyage.voyage_number,
#   #   'departure_port': submanifest.voyage.departure_port.port_name,
#   #   'arrival_port': submanifest.voyage.arrival_port.port_name,
#   #   'departure_date': submanifest.voyage.departure_date,
#   #   'eta': submanifest.voyage.eta,
#   #   'arrival_date': submanifest.voyage.arrival_date,
#   #   'status': submanifest.get_status_display(),
#   #   'status_raw': submanifest.status,
#   #   'container_no': submanifest.container_no,
#   #   'seal_no': submanifest.seal_no,
#   #   'bill_of_lading_no': submanifest.bill_of_lading_no,
#   #   'consignee_name': submanifest.consignee_name,
#   #   'consignor_name': submanifest.consignor_name,
#   # }

#   context = {
#     # 'submanifest': submanifest_data,
#     'clearance': clearance_data,
#     'documents': documents_data,
#     'has_documents': len(documents_data) > 0,
#   }
  
#   return render(request, 'smartportApp/custom-clearance.html', context)

def custom_clearance_view(request, submanifest_id):
  """
  Access rules:
    - admin: allowed
    - custom: allowed
    - shipper: allowed ONLY if the shipper is the creator of the submanifest

  AND a CustomClearance exists for that submanifest.
  Any other role -> 403 PermissionDenied.
  """

  # safe access to user's profile
  user_profile = getattr(request.user, "userprofile", None)
  print("TANGANG USER: ", user_profile)

  auth_check = enforce_access(request, 'shipper')
  if auth_check:
    return auth_check


  # get submanifest with its related data:
  submanifest = get_object_or_404(
    SubManifest.objects.select_related(
      'created_by',
      'voyage__vessel',
      'voyage__departure_port',
      'voyage__arrival_port',
      'custom_clearance__created_by',
      'custom_clearance__reviewed_by'
    ).prefetch_related('documents', 'cargo_items'),
    submanifest_id=submanifest_id,
  )

  # role-based gating
  allowed_roles = ("admin", "custom", "shipper")
  if user_profile.role not in allowed_roles:
    context = {
      "text": "Youre not allowed to view this page, please contact the admin.",
      "link": "incident-feed-view"
    }
    return render(request, "smartportApp/403-forbidden-page.html", context)
  

  # check if clearance exists
  try:
    clearance = submanifest.custom_clearance
  except CustomClearance.DoesNotExist:
    # return HttpResponse("404", status=404);
    clearance = None

  # Extra constraint for shippers: must be the creator of the submanifest and requires to have a custom clearance to view this page
  if user_profile.role == "shipper":
    if submanifest.created_by_id != user_profile.pk:
      context = {
        "text": "You can only view your own shipments.",
        "link": "shipper-dashboard"
      }
      return render(request, "smartportApp/403-forbidden-page.html", context)
    if clearance is None:
      # dapat 404 ni
      context = {
        "text": "This shipment has no clearance record yet.",
        "link": "shipper-dashboard"
      }
      return render(request, "smartportApp/403-forbidden-page.html", context)

  # Prepare documents list efficiently (avoid double .exists() query)
  documents_qs = list(submanifest.documents.all())
  documents_data = []
  for doc in documents_qs:
    documents_data.append({
      "type": doc.get_document_type_display(),
      "filename": doc.get_download_filename(),
      "uploaded_at": doc.uploaded_at,
      "file_url": doc.file.url if doc.file else None,
    })
  
  # Prepare cargo summary using Decimal for accuracy
  cargo_items = list(submanifest.cargo_items.all())
  total_quantity = sum(cargo.quantity for cargo in cargo_items)
  total_weight = sum((cargo.weight for cargo in cargo_items), Decimal("0"))
  total_value = sum((cargo.value for cargo in cargo_items), Decimal("0"))
  
  # prepare clearance data:
  clearance_data = {
    'exists': clearance is not None,
    'clearance_number': clearance.clearance_number if clearance else 'Pending',
    'created_at': clearance.created_at if clearance else None,
    'inspection_date': clearance.inspection_date if clearance else None,
    'status': clearance.get_clearance_status_display() if clearance else 'Pending Review',
    'remarks': clearance.remarks if clearance else None,
    'cleared_by': clearance.reviewed_by if clearance else None,
    'clearance_file': clearance.clearance_file if clearance else None,
    'created_by': clearance.created_by if clearance else None,
  }

  context = {
    'submanifest': submanifest,
    'clearance': clearance_data,
    'documents': documents_data,
    'cargo_items': cargo_items,
    'total_quantity': total_quantity,
    'total_weight': total_weight,
    'total_value': total_value,
    'has_documents': len(documents_data) > 0,
    'has_cargo': len(cargo_items) > 0
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
  auth_check = enforce_access(request, 'shipper')
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


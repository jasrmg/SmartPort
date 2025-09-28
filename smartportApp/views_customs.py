from django.shortcuts import render
from . models import SubManifest, CustomClearance, UserProfile, Cargo, ActivityLog
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseForbidden

from django.utils.timezone import now
from django.db import transaction

from django.core.paginator import Paginator
from django.db.models import Count, Q

from smartportApp.utils.utils import enforce_access, log_vessel_activity

  

# ====================== TEMPLATES ======================
def dashboard_view(request):
  auth_check = enforce_access(request, 'custom')
  if auth_check:
    return auth_check
  
  submanifest_stats = SubManifest.objects.aggregate(
    pending_count=Count('submanifest_id', filter=Q(status='pending_customs')),
    rejected_count=Count('submanifest_id', filter=Q(status='rejected_by_customs')),
    cleared_count=Count('submanifest_id', filter=Q(status='approved')),
  )

  recent_pending_request = SubManifest.objects.filter(
    status='pending_customs',
  ).order_by('-created_at')[:5]

  # print("PENDINGGGG: ", recent_pending_request)

  context = {
    'pending_count': submanifest_stats['pending_count'],
    'rejected_count': submanifest_stats['rejected_count'],
    'cleared_count': submanifest_stats['cleared_count'],
    'recent_pending_request': recent_pending_request,
    'show_logo_text': True,
  }
  return render(request, "smartportApp/custom/dashboard.html", context)

def submanifest_review_view(request):

  auth_check = enforce_access(request, 'custom')
  if auth_check:
    return auth_check
  
  # user = request.user.userprofile
  # print("LOGGED USER: ", request.user)
  pending_submanifests = SubManifest.objects.filter(
    status="pending_customs"
  ).select_related("created_by", "voyage").order_by("-created_at")

  # print("CUSTOM: ", user.role)

  context = {
    'submanifests': pending_submanifests,
    "placeholder": "Search submanifest",
    "search_id": "search-input",
    # 'profile': user,
    # 'role': user.role
  }
  return render(request, "smartportApp/custom/submanifest-review.html", context)

def review_history_view(request):
  """Main view for review history page - only handles initial page load"""

  auth_check = enforce_access(request, 'custom')
  if auth_check:
    return auth_check
  
  # fetch reviewed submanifest(approved or rejected by customs)
  submanifest = SubManifest.objects.filter(
    status__in=["approved", "rejected_by_customs"]
  ).order_by("-updated_at")

  # pagination 10 per page
  paginator = Paginator(submanifest, 25)
  page_number = request.GET.get("page")
  page_obj = paginator.get_page(page_number)

  context = {
    "page_obj": page_obj,
    "paginator": paginator,
    "current_page": page_obj.number,
    "search_id": "search-input",
    "placeholder": "Search submanifest"
  }
  
  return render(request, "smartportApp/custom/review-history.html", context)
  
# ====================== END OF TEMPLATES ======================

# def review_history_api(request):
#   '''
#   endpoint for the search functionality of the review history
#   '''
#   auth_check = enforce_access(request, 'custom')
#   if auth_check:
#     return auth_check
  
#   if request.method != 'GET':
#     return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
  
#   try:
#     # Get query parameters
#     page = int(request.GET.get('page', 1))
#     sort_by = request.GET.get('sort_by', 'updated_at')
#     sort_order = request.GET.get('sort_order', 'desc')
#     search_query = request.GET.get('search', '').strip()
    
#     # Base queryset - only reviewed submanifests
#     submanifests = SubManifest.objects.filter(
#       status__in=["approved", "rejected_by_customs"]
#     )
#     # Apply search filter if query provided and >= 2 characters
#     if search_query and len(search_query) >= 2:
#       submanifests = submanifests.filter(
#         Q(submanifest_number__icontains=search_query) |
#         Q(consignee_name__icontains=search_query)
#       )
    
#     # Apply sorting
#     valid_sort_fields = {
#       'submanifest_number': 'submanifest_number',
#       'consignee_name': 'consignee_name', 
#       'created_at': 'created_at',
#       'status': 'status',
#       'updated_at': 'updated_at'
#     }

#     if sort_by in valid_sort_fields:
#       order_field = valid_sort_fields[sort_by]
#       if sort_order == 'desc':
#         order_field = f'-{order_field}'
#       submanifests = submanifests.order_by(order_field)
#     else:
#       submanifests = submanifests.order_by('-updated_at')

#     # Pagination
#     paginator = Paginator(submanifests, 25)
#     page_obj = paginator.get_page(page)

#     # Format data for JSON response
#     data = []
#     for sm in page_obj:
#       data.append({
#         'id': sm.submanifest_id,
#         'submanifest_number': sm.submanifest_number,
#         'consignee_name': sm.consignee_name,
#         'created_at': sm.created_at.strftime('%b %d, %Y'),
#         'updated_at': sm.updated_at.strftime('%b %d, %Y'),
#         'status': sm.status
#       })

#     response_data = {
#       'success': True,
#       'data': data,
#       'pagination': {
#         'current_page': page_obj.number,
#         'total_pages': paginator.num_pages,
#         'has_previous': page_obj.has_previous(),
#         'has_next': page_obj.has_next(),
#         'total_items': paginator.count
#       },
#       'sorting': {
#         'sort_by': sort_by,
#         'sort_order': sort_order
#       },
#       'search': {
#         'query': search_query,
#         'has_search': bool(search_query and len(search_query) >= 2)
#       }
#     }

#     return JsonResponse(response_data)
  
#   except Exception as e:
#     return JsonResponse({
#       'success': False, 
#       'error': f'Server error: {str(e)}'
#     }, status=500)


def submanifest_review(request, submanifest_id):
  """
  render the detail page for the submanifest review 
  """
  user = request.user.userprofile
  submanifest = get_object_or_404(
    SubManifest.objects.select_related(
      'created_by__user',
      'voyage__vessel',
      'voyage__departure_port',
      'voyage__arrival_port',
      'updated_by__user'
    ).prefetch_related(
      'cargo_items'
    ),
    submanifest_id=submanifest_id
  )

  context = {
    'submanifest': submanifest,
    'show_button': ["pending_customs"],
    'can_edit': "custom",
    'user': user,
    'role': user.role
  }

  return render(request, "smartportApp/submanifest.html", context)
  

# -----
from accounts.firebase import firestore_client
from google.cloud import firestore

from smartportApp.utils.utils import create_notification, create_notification_bulk
import json
def handle_clerance_action(request, submanifest_id, action):
  """
  approve or reject the clearance of the submanifest
  """
  if request.method != "POST":
    return JsonResponse({"error": "Invalid request method"}, status=405)
  
  try:
    submanifest = SubManifest.objects.get(pk=submanifest_id)
    user = request.user.userprofile

    with transaction.atomic():
      # ADMIN REVIEW
      if submanifest.status == "pending_admin":
        if action == "approve":
          submanifest.status = "pending_customs"
          submanifest.updated_by = user
          submanifest.save(update_fields=["status", "updated_by", "updated_at"])
          # UPDATE ACTIVITY LOG
          # log_vessel_activity(
          #   vessel=submanifest.voyage.vessel,
          #   action_type=ActivityLog.ActionType.SUBMANIFEST_APPROVED,
          #   description=f"Submanifest #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
          #   user_profile=request.user.userprofile
          # )
          # SEND NOTIF TO SHIPPER 
          create_notification(
            user=submanifest.created_by,
            title="Submanifest Approved",
            message=f"Submanifest #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
            link_url="", # dont have a link because its used only to notify the shipper
            triggered_by=request.user.userprofile
          )
          # SEND NOTIF TO CUSTOMS 
          custom_users = UserProfile.objects.filter(role="custom")
          if custom_users.exists():
            if hasattr(request, 'user') and hasattr(request.user, 'userprofile'):
              create_notification_bulk(
                recipients=custom_users,
                title="Submanifest Approved",
                message=f"Submanifest #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
                link_url=f"/customs/submanifest/review/{submanifest.submanifest_id}/",
                triggered_by=user
              )
          return JsonResponse({
            "message": "Submanifest approved by Admin. Now pending Customs.",
            "new_status": "pending_customs"
            })
        
        elif action == "reject":
          data = json.loads(request.body.decode("utf-8"))
          note = data.get("note", "").strip()
          
          if not note:
            return JsonResponse({"error": "Rejection reason is required."}, status=400)
          
          submanifest.status = "rejected_by_admin"
          submanifest.admin_note = note
          submanifest.admin_rejection_count += 1
          submanifest.updated_by = user
          submanifest.save(update_fields=["status", "admin_note", "admin_rejection_count", "updated_by", "updated_at"])
          # SEND NOTIF TO SHIPPER Your submanifest (SUBM-20250805-6) was rejected by the admin. Reason: sample reject

          create_notification(
            user=submanifest.created_by,
            title="Submanifest Rejected",
            message=f"Your submanifest ({submanifest.submanifest_number}) was rejected by the admin. Reason: {note}",
            link_url=f"/edit/submitted-shipment/{submanifest.submanifest_id}/",
            triggered_by=user
          )
          return JsonResponse({
            "message": "Submanifest rejected by Admin",
            "new_status": "rejected_by_admin"
            })
      
      # CUSTOMS REVIEW
      elif submanifest.status == "pending_customs":
        clearance, created = CustomClearance.objects.get_or_create(
          submanifest=submanifest,
          defaults={
            "created_by": user,
            "inspection_date": now(),
          },
        )

        if action == "approve":
          submanifest.status = "approved"
          submanifest.updated_by = user
          submanifest.save(update_fields=["status", "updated_by", "updated_at"])

          clearance.clearance_status = CustomClearance.ClearanceStatus.CLEARED
          if not clearance.clearance_number:
            clearance.clearance_number = f"CC-{now().strftime('%Y%m%d')}-{clearance.clearance_id}"
          clearance.reviewed_by = user
          clearance.save()
          # notify the shipper
          try:
            shipper = submanifest.created_by
            
            # create notification
            if shipper:
              create_notification(
                user=shipper,
                title="Submanifest Approved",
                message=f"Your submanifest {submanifest.submanifest_number} has been approved.",
                link_url=f"searcg handle clearance action", # ilisan ni sa path na mo open sa clearance
                triggered_by=user
              )

            # put it in firebase
            # Push cargo + delivery info to Firestore
            cargos = Cargo.objects.filter(submanifest=submanifest)
            for cargo in cargos:
              cargo_ref = firestore_client.collection("cargo").document()

              # cargo base data
              cargo_data = {
                "cargo_id": cargo.cargo_id,
                "submanifest_id": cargo.submanifest.submanifest_id,
                "item_number": cargo.item_number,
                "description": cargo.description,
                "quantity": cargo.quantity,
                "value": float(cargo.value),   # Firestore likes float, not Decimal
                "weight": float(cargo.weight),
                "additional_info": cargo.additional_info or "",
                "hs_code": cargo.hs_code or "",
              }

              cargo_ref.set(cargo_data)

              # add delivery subcollection
              delivery_ref = cargo_ref.collection("delivery").document()  # auto-ID
              delivery_data = {
                "cargo_delivery_id": cargo.cargo_id,   # 🔹 suggestion: reuse cargo_id, Firestore can’t auto-increment safely
                "confirmed_at": firestore.SERVER_TIMESTAMP,
                "confirmed_by": "ilaha na ning boss chan2",  # assuming userprofile has firebase_uid
                "remarks": "ilaha na ning boss chan2",        # default message
              }
              delivery_ref.set(delivery_data)
          except ValueError as e:
            print(f"Notification creation failed. {e}")

          return JsonResponse({
              "message": "Submanifest approved by Customs. Clearance generated!",
              "new_status": "approved",
            })
        
        elif action == "reject":
          data = json.loads(request.body.decode("utf-8"))
          note = data.get("note", "").strip()
          
          if not note:
            return JsonResponse({"error": "Rejection reason is required."}, status=400)

          submanifest.status = "rejected_by_customs"
          submanifest.customs_rejection_count += 1
          submanifest.customs_note = note
          submanifest.updated_by = user
          submanifest.save(update_fields=["status", "customs_note", "customs_rejection_count", "updated_by", "updated_at"])

          # NOTIFY SHIPPER THAT THE SUBMANIFEST WAS REJECTED BY THE CUSTOM
          # f"/edit/submitted-shipment/{sub.submanifest_id}/"
          try:
            shipper = submanifest.created_by
            
            # create notification
            if shipper:
              create_notification(
                user=shipper,
                title="Submanifest Rejected",
                message=f"Your submanifest ({submanifest.submanifest_number}) was rejected by the customs. Reason: {note}",
                link_url=f"/edit/submitted-shipment/{submanifest.submanifest_id}/", 
                triggered_by=user
              )
          except ValueError as e:
            print(f"Notification creation failed. {e}")

          return JsonResponse({
              "message": "Submanifest rejected by Customs.",
              "new_status": "rejected_by_customs"
            })
  except SubManifest.DoesNotExist:
    return JsonResponse({
        "error": "Submanifest not found",
      }, status=404)
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
  
def update_cargo_hs_code(request, cargo_id):

  if request.method != "POST":
    return JsonResponse({"error": "Invalid request method"}, status=405)
  
  # check if user is custom
  try:
    user = request.user.userprofile
    if user.role != "custom":
      return JsonResponse({"error": "Unauthorized"}, status=403)
  except UserProfile.DoesNotExist:
    return JsonResponse({"error": "User profile not found."}, status=404)
  
  try:
    data = json.loads(request.body.decode("utf-8"))
    hs_code = data.get("hs_code", "").strip()

    # validate hs code format
    if hs_code and len(hs_code) > 20:
      return JsonResponse({"error": "HS Code cannot exceed 20 characters"}, status=400)
    
    cargo = Cargo.objects.get(cargo_id=cargo_id)

    # update hs code
    cargo.hs_code = hs_code if hs_code else None
    cargo.save(update_fields=["hs_code"])

    return JsonResponse({
      "message": "HS code updated successfully",
      "hs_code": cargo.hs_code
    })
  except Cargo.DoesNotExist:
    return JsonResponse({"error": "Cargo item not found"}, status=404)
  except json.JSONDecodeError:
    return JsonResponse({"error": "Invalid JSON data"}, status=400)
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
  
# REVIEW HISTORY
from django.views.decorators.http import require_http_methods
@require_http_methods(["GET"])
def review_history_api(request):
  """API endpoint for AJAX pagination of review history"""

  print(f"API called with page: {request.GET.get('page')}")  

  try:
    sort_by = request.GET.get('sort_by', 'updated_at')
    sort_order = request.GET.get('sort_order', 'desc')
    search_query = request.GET.get('search', '').strip()

    sort_fields = {
      'submanifest_number': 'submanifest_number',
      'consignee_name': 'consignee_name', 
      'created_at': 'created_at',
      'status': 'status',
      'updated_at': 'updated_at'
    }

    # Base queryset
    submanifest = SubManifest.objects.filter(
      status__in=["approved", "rejected_by_customs"]
    )

    if search_query and len(search_query) >= 2:
      submanifest = submanifest.filter(
        Q(submanifest_number__icontains=search_query) |
        Q(consignee_name__icontains=search_query)
      )
      print(f"Applied search filter for: '{search_query}'")

    # Handle sorting - validate sort field and apply ordering
    if sort_by in sort_fields:
      order_field = sort_fields[sort_by]
      if sort_order == 'desc':
        order_field = f'-{order_field}'
      submanifest = submanifest.order_by(order_field)
    else:
      # Fallback to default sorting
      submanifest = submanifest.order_by('-updated_at')
    
    print(f"Found {submanifest.count()} submanifests")

    paginator = Paginator(submanifest, 25)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    print(f"Page object created: page {page_obj.number} of {paginator.num_pages}")

    # serialize the data
    data = []
    for sm in page_obj:
      data.append({
        'id': sm.submanifest_id,
        'submanifest_number': sm.submanifest_number,
        'consignee_name': sm.consignee_name,
        'created_at': sm.created_at.strftime('%b %d, %Y'),
        'status': sm.status,
        'updated_at': sm.updated_at.strftime('%b %d, %Y'),
      })
    
    return JsonResponse({
      'success': True,
      'data': data,
      'pagination': {
        'current_page': page_obj.number,
        'total_pages': paginator.num_pages,
        'has_previous': page_obj.has_previous(),
        'has_next': page_obj.has_next(),
        'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
        'total_count': paginator.count,
      },
      'sorting': {
        'sort_by': sort_by,
        'sort_order': sort_order,
      },
      'search': {
        'query': search_query,
        'has_search': bool(search_query and len(search_query) >= 2)
      }
    })
  
  except Exception as e:
    print(f"API Error: {str(e)}")  
    import traceback
    traceback.print_exc()
    return JsonResponse({
      'success': False,
      'error': 'Failed to load data'
    }, status=500)
  

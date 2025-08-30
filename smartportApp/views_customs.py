from django.shortcuts import render
from . models import SubManifest, CustomClearance, UserProfile
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse

from django.utils.timezone import now
from django.db import transaction

# ====================== TEMPLATES ======================
def dashboard_view(request):
  context = {
    'show_logo_text': True,
  }
  return render(request, "smartportApp/custom/dashboard.html", context)

def submanifest_review_view(request):
  pending_submanifests = SubManifest.objects.filter(
    status="pending_customs"
  ).select_related("created_by", "voyage").order_by("-created_at")

  context = {
    'submanifests': pending_submanifests,
  }
  return render(request, "smartportApp/custom/submanifest-review.html", context)

def review_history_view(request):
  context = {

  }
  
  return render(request, "smartportApp/custom/review-history.html", context)
  
# ====================== END OF TEMPLATES ======================

def submanifest_review(request, submanifest_id):
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
    "show_button": ["pending_customs"],
  }

  return render(request, "smartportApp/submanifest.html", context)
  


from smartportApp.utils.utils import create_notification, create_notification_bulk
import json
def handle_clerance_action(request, submanifest_id, action):
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
          # SEND NOTIF TO SHIPPER 
          create_notification(
            user=submanifest.created_by,
            title="Submanifest Approved",
            message=f"Submanifest #{submanifest.submanifest_number} was approved by the admin and is now pending for customs approval.",
            link_url=f"/submanifest/{submanifest.submanifest_id}/",
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
                link_url=f"/submanifest/{submanifest.submanifest_id}/",
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
            "message": "Submanifest rejected by Admin kekw",
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
  
  
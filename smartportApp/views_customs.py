from django.shortcuts import render
from . models import SubManifest, CustomClearance
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
  }

  return render(request, "smartportApp/submanifest.html", context)
  


from smartportApp.utils.utils import create_notification
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
          return JsonResponse({"message": "Submanifest approved by Admin. Now pending Customs."})
        
        elif action == "reject":
          submanifest.status = "rejected_by_admin"
          submanifest.admin_rejection_count += 1
          submanifest.updated_by = user
          submanifest.save(updated_fields=["status", "admin_rejection_count", "updated_by", "updated_at"])
          return JsonResponse({"message": "Submanifest rejected by Admin"})
      
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

          return JsonResponse({"message": "Submanifest approved by Customs. Clearance generated!"})
        
        elif action == "reject":
          submanifest.status = "rejected_by_customs"
          submanifest.customs_rejection_count += 1
          submanifest.updated_by = user
          submanifest.save(update_fields=["status", "customs_rejection_count", "updated_by", "updated_at"])

          clearance.clearance_status = CustomClearance.ClearanceStatus.CLEARED
          clearance.reviewed_by = user
          clearance.save()

          return JsonResponse({"message": "Submanifest rejected by Customs."})
  except SubManifest.DoesNotExist:
    return JsonResponse({"error": "Submanifest not found"}, status=404)
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
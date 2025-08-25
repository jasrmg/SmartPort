from django.shortcuts import render
from . models import SubManifest
from django.shortcuts import render, get_object_or_404

# ====================== TEMPLATES ======================
def dashboard_view(request):
  context = {
    'show_logo_text': True,
  }
  return render(request, "smartportApp/custom/dashboard.html", context)

def submanifest_review_view(request):
  pending_submanifests = SubManifest.objects.filter(
    status="pending_admin"
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
  
from django.shortcuts import render
from . models import SubManifest

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
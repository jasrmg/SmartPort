from django.shortcuts import render
def dashboard_view(request):
  context = {
    'show_logo_text': True,
  }
  return render(request, "smartportApp/custom/dashboard.html", context)

def submanifest_review_view(request):
  context = {

  }
  return render(request, "smartportApp/custom/submanifest-review.html", context)

def review_history_view(request):
  context = {

  }
  
  return render(request, "smartportApp/custom/review-history.html", context)
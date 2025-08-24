from django.shortcuts import render
def dashboard_view(request):
  context = {
    'show_logo_text': True,
  }
  return render(request, "smartportApp/custom/dashboard.html", context)
import json
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from firebase_admin import auth
from accounts.models import UserProfile




# Create your views here.
def auth_view(request):
  return render(request, "smartportApp/auth.html")

# def verify_view(request):
#   return render(request, "smartportApp/verify.html")

# --------------------------------- ADMIN ---------------------------------
def admin_view(request):
  if not request.user_profile:
    # return HttpResponseForbidden("You are not authorized to access this page.")
    return render(request, "smartportApp/403error.html", status=403)
  return render(request, "smartportApp/dummy.html")




# --------------------------------- SHIPPER ---------------------------------





# --------------------------------- CUSTOM ---------------------------------





# --------------------------------- EMPLOYEE ---------------------------------
import json
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from firebase_admin import auth
from accounts.models import UserProfile




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
    return redirect("custom_dashboard")
  elif role == "shipper":
    return redirect("shipper_dashboard")
  elif role == "employee":
    return redirect("employee_dashboard")
  else:
    return HttpResponse("Unauuthorized role", status=403)


def auth_view(request):
  return render(request, "smartportApp/auth.html")

# def verify_view(request):
#   return render(request, "smartportApp/verify.html")

# --------------------------------- ADMIN ---------------------------------
def admin_dashboard(request):
  if not request.user.is_authenticated:
    return redirect("/")
  return render(request, "smartportApp/admin/dashboard.html")




# --------------------------------- SHIPPER ---------------------------------
@login_required
def customs_dashboard(request):
  return render(request, "smartportApp/customs/dashboard.html")




# --------------------------------- CUSTOM ---------------------------------
@login_required
def shipper_dashboard(request):
  return render(request, "smartportApp/shipper/dashboard.html")




# --------------------------------- EMPLOYEE ---------------------------------
@login_required
def employee_dashboard(request):
  return render(request, "smartportApp/employee/dashboard.html")
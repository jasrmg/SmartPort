import json
from django.shortcuts import render, redirect
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
  if not request.user.is_authenticated:
    return redirect("/")
  return render(request, "smartportApp/dummy.html")




# --------------------------------- SHIPPER ---------------------------------





# --------------------------------- CUSTOM ---------------------------------





# --------------------------------- EMPLOYEE ---------------------------------
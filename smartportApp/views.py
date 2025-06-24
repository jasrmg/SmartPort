import json
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from django.http import JsonResponse, HttpResponse
from firebase_admin import auth
from accounts.models import UserProfile




# Create your views here.
def auth_view(request):
  return render(request, "smartportApp/auth.html")

# def verify_view(request):
#   return render(request, "smartportApp/verify.html")

def admin_view(request):
  return HttpResponse("<h1>HELLO WORLD YAWA MO</h1>")
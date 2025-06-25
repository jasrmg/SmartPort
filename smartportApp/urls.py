from django.urls import path
from . import views

urlpatterns = [
  path("", views.auth_view, name="auth_view"),
  path("admin-dashboard/", views.admin_view, name="admin-view"),
]
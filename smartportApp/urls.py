from django.urls import path
from . import views

urlpatterns = [
  path("", views.auth_view, name="auth_view"),

  # ROLE REDIRECT
  # path("role-redirect/", views.role_redirect_view, name="role-redirect"),

  # ADMIN
  path("admin-dashboard/", views.admin_dashboard, name="admin-dashboard"),

  # CUSTOM
  path("custom-dashboard/", views.customs_dashboard, name="custom-dashboard"),

  # SHIPPER
  path("shipper-dashboard/", views.shipper_dashboard, name="shipper-dashboard"),

  # EMPLOYEE
  path("employee-dashboard/", views.employee_dashboard, name="employee-dashboard"),
]
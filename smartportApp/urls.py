from django.urls import path
from . import views

urlpatterns = [
  path("", views.auth_view, name="auth_view"),

  # ROLE REDIRECT
  # path("role-redirect/", views.role_redirect_view, name="role-redirect"),

  # ADMIN TEMPLATES LOAD
  path("admin-dashboard/", views.admin_dashboard, name="admin-dashboard"),
  path("user-management/", views.admin_users_view, name="user-management"),
  path("all-vessels/", views.admin_all_vessels_view, name="all-vessels"),
  path("assign-route/", views.assign_route_view, name="assign-route"),
  path("manage-voyage/", views.manage_voyage_view, name="manage-voyage"),

  # PORTS ENDPOINT FOR THE LEAFLET MAP COMPLETE PORT DETAILS
  path('get-ports/', views.get_ports, name='get_ports'),
  # PORTS ENDPOINT FOR NAME AND ID ONLY
  path('get-port-options/', views.get_port_options, name="get_port_options"),
  # VESSEL LIST
  path("get-vessels/", views.get_vessels, name="get_vessels"),

  # ADD VESSEL
  path("api/vessels/add/", views.add_vessel, name="add-vessel"),

  # API ENDPOINT FOR GETTING THE PORT LIST FOR DROPDOWNS
  path("api/ports/", views.get_port_options, name="get_port_options"),
  
  # API ENDPOINT FOR UPDATING THE TABLE IN THE VIEW ALL VESSELS
  path("update-vessel-status/", views.update_vessel_status, name="update_vessel_status"),
  path("api/vessels/update-name/", views.update_vessel_name, name="update_vessel_name"),
  # API ENDPOT TO DELETE VESSEL
  path('api/vessels/delete/', views.delete_vessel, name='delete_vessel'),
  # ASSIGN ROUTE CREATION
  path("assign-route/submit/", views.assign_route, name="assign_route_ajax"),
  # UPDATE STATUS
  path('update-voyage-status/', views.update_voyage_status, name='update_voyage_status'),

  # CUSTOM
  path("custom-dashboard/", views.customs_dashboard, name="custom-dashboard"),

  # SHIPPER
  path("shipper-dashboard/", views.shipper_dashboard, name="shipper-dashboard"),

  # EMPLOYEE
  path("employee-dashboard/", views.employee_dashboard, name="employee-dashboard"),
]
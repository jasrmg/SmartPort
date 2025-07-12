from django.urls import path
from . import views

urlpatterns = [
  path("", views.auth_view, name="auth_view"),

  # ROLE REDIRECT
  # path("role-redirect/", views.role_redirect_view, name="role-redirect"),

  # -------------------------------- ADMIN TEMPLATES LOAD --------------------------------
  path("admin-dashboard/", views.admin_dashboard, name="admin-dashboard"),

  path("all-vessels/", views.admin_all_vessels_view, name="all-vessels"),
  path("assign-route/", views.assign_route_view, name="assign-route"),
  path("manage-voyage/", views.manage_voyage_view, name="manage-voyage"),
  path("voyage-report/", views.voyage_report_view, name="voyage-report"), 
  path("activity-log/", views.activity_log_view, name="activity-log"),
  path("incident-report-feed/", views.report_feed_view, name="report-feed"),
  

  path("user-management/", views.admin_users_view, name="user-management"),

  # PORTS ENDPOINT FOR THE LEAFLET MAP COMPLETE PORT DETAILS
  path('get-ports/', views.get_ports, name='get_ports'),
  # PORTS ENDPOINT FOR NAME AND ID ONLY (assign route)
  path('get-port-options/', views.get_port_options, name="get_port_options"),
  # VESSEL LIST
  path("get-vessels/", views.get_vessels, name="get_vessels"),

  # ADD VESSEL
  path("api/vessels/add/", views.add_vessel, name="add-vessel"),

  
  # API ENDPOINT FOR UPDATING THE TABLE IN THE VIEW ALL VESSELS
  path("update-vessel-status/", views.update_vessel_status, name="update_vessel_status"),
  path("api/vessels/update-name/", views.update_vessel_name, name="update_vessel_name"),
  # API ENDPOT TO DELETE VESSEL
  path('api/vessels/delete/', views.delete_vessel, name='delete_vessel'),
  # ASSIGN ROUTE CREATION
  path("assign-route/submit/", views.assign_route, name="assign_route_ajax"),
  # UPDATE STATUS
  path('update-voyage-status/', views.update_voyage_status, name='update_voyage_status'),
  # API ENDPOINT FOR THE VOYAGE REPORT PAGINATOR:
  # path("voyage-report/page/", views.voyage_report_paginated, name="voyage_report_paginated"),
  # ENDPOINT TO SERVE THE VOYAGE REPORT DETAIL:
  path("voyage-report/detail/<int:report_id>", views.voyage_report_detail, name="voyage_report_detail"),
  # ENDPOINT FOR FILTERING THE REPORTS
  path("voyage-report/filter/", views.voyage_report_filtered, name="voyage_report_filtered"),
  # ENDPOINT TO FILTER THE VESSELS (USED IN ACTIVITY LOG) 
  path("filter-vessels/", views.filter_vessels_by_type, name="filter-vessels"),
  # VESSEL DETAIL VIEW:
  path('vessel-detail/<int:vessel_id>/', views.vessel_detail_view, name='vessel-detail'),
  path("vessel-log/add/<int:vessel_id>/", views.add_vessel_log_entry, name="add_vessel_log_entry"),
  path('submit-incident/', views.submit_incident_report, name='submit_incident_report'),
  # APPROVE OR REJECT INCIDENT REPORT
  path('incident/approve/<int:incident_id>/', views.approve_incident, name='approve_incident'),
  path('incident/decline/<int:incident_id>/', views.decline_incident, name='decline_incident'),
  # RESOLVE INCIDENT REPORT
  path("incident/resolve/<int:incident_id>/", views.resolve_incident, name="resolve_incident"),


  # -------------------------------- CUSTOM --------------------------------
  path("custom-dashboard/", views.customs_dashboard, name="custom-dashboard"),

  # -------------------------------- SHIPPER --------------------------------
  path("shipper-dashboard/", views.shipper_dashboard, name="shipper-dashboard"),

  # -------------------------------- EMPLOYEE --------------------------------
  path("employee-dashboard/", views.employee_dashboard, name="employee-dashboard"),
]
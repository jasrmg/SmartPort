from django.urls import path
from . import views
from . import views_shipper
from . import notification 

urlpatterns = [
  path("", views.auth_view, name="auth_view"),
  # NOTIFICATION POLLING
  path('poll-notifications/', notification.poll_recent_notifications, name='poll-notifications'),
  # ENDPOINT FOR NOTIFICATION ICON ON THE TOPBAR
  path('notifications/', notification.get_user_notifications, name="get-user-notifications"),
  path('notifications/mark-read/', notification.mark_notifications_read, name='mark_notifications_read'),

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
  path("manifest/", views.admin_manifest_view, name="manifest"),

  path("user-management/", views.admin_users_view, name="user-management"),
  # -------------------------------- END ADMIN TEMPLATES LOAD --------------------------------
  # PORTS ENDPOINT FOR THE LEAFLET MAP COMPLETE PORT DETAILS
  path('get-ports/', views.get_ports, name='get_ports'),
  path("api/vessels-on-map/", views.get_vessels_for_map, name="vessels-map-api"),
  # ENDPOINT FOR THE CHARTS
  path('api/chart/shipment-data/', views.cargo_shipment_volume_data, name='shipment_volume_data'),
  path('api/vessel-status-chart/', views.vessel_status_distribution, name='vessel_status_chart'),
  path("api/chart/incident-data/", views.incident_chart_data, name="incident_chart_data"),


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
  # LAST DESTINATION OF THE VESSEL
  path("get-vessel-last-destination/", views.get_vessel_last_destination, name="get_vessel_last_destination"),

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
  # MANIFEST VIEW PART:
  # DISPLAY SUBMANIFEST IN TABLE
  path("api/submanifests/<int:voyage_id>/", views.get_submanifests_by_voyage, name="api-submanifests"),
  # GENERATE MASTERMANIFEST
  path("generate-master-manifest/<int:voyage_id>/", views.generate_master_manifest, name="generate_master_manifest"),
  # GET MASTER MANIFEST ID
  path("get-master-manifest-id/<int:voyage_id>/", views.get_master_manifest_id, name="get_master_manifest_id"),
  # CHECK IF THE MASTER MANIFEST ALREADY EXIST FOR THAT VOYAGE:
  path("api/voyage/<int:voyage_id>/has-master-manifest/", views.check_master_manifest, name="check_master_manifest"),
  # VIEW MASTERMANIFEST
  path("master-manifest/<int:mastermanifest_id>/", views.master_manifest_detail_view, name="master_manifest_detail"),
  # VIEW SUBMANIFEST
  path("submanifest/<int:submanifest_id>/", views.submanifest_view, name="submanifest-view"),
  # APPROVE SUBMANIFEST
  path("submanifest/<int:submanifest_id>/approve/", views.admin_approve_submanifest, name="approve-submanifest"),
  # REJECT SUBMANIFEST
  path("submanifest/<int:submanifest_id>/reject/", views.admin_reject_submanifest, name="reject-submanifest"),

  # INCIDENT REPORT PART:
  path('submit-incident/', views.submit_incident_report, name='submit_incident_report'),
  # APPROVE OR REJECT INCIDENT REPORT
  path('incident/approve/<int:incident_id>/', views.approve_incident, name='approve_incident'),
  path('incident/decline/<int:incident_id>/', views.decline_incident, name='decline_incident'),
  # RESOLVE INCIDENT REPORT
  path("incident/resolve/<int:incident_id>/", views.resolve_incident, name="resolve_incident"),


  # -------------------------------- CUSTOM USING DIFFERENT VIEW --------------------------------
  path("custom-dashboard/", views.customs_dashboard, name="custom-dashboard"),

  # -------------------------------- SHIPPER USING DIFFERENT VIEW --------------------------------
  # -------------------------------- SHIPPER TEMPLATES LOAD --------------------------------
  path("shipper-dashboard/", views_shipper.shipper_dashboard, name="shipper-dashboard"),
  path("vessel-info/", views_shipper.shipper_vessel_info_view, name="vessel-info"),
  path("deliveries/", views_shipper.shipper_deliveries_view, name="deliveries"),
  path("submit-shipment-view/", views_shipper.shipper_submit_shipment_view, name="submit-shipment-view"),
  path("incident-feed/", views_shipper.shipper_incident_feed_view, name="shipper-incident-feed"),
  # -------------------------------- END OF SHIPPER TEMPLATES LOAD --------------------------------
  # HELPER FOR THE VESSEL INFO VIEW:
  path("shipper/vessel/<int:vessel_id>/details/", views_shipper.get_vessel_details, name="vessel-details"),
  path("get-cargo-items/<int:submanifest_id>/", views_shipper.get_cargo_items, name="get-cargo-items"),
  path("shipper/confirm-delivery/<int:cargo_id>/", views_shipper.confirm_delivery_view, name="confirm-delivery"),
  # VIEW CUSTOM CLEARANCE
  path('clearance/<int:submanifest_id>/', views_shipper.custom_clearance_view, name='custom_clearance'),
  # SUBMIT SHIPMENT
  path("submit-shipment/", views_shipper.submit_shipment, name="submit-shipment"),


  # -------------------------------- EMPLOYEE USING DIFFERENT VIEW --------------------------------
  path("employee-dashboard/", views.employee_dashboard, name="employee-dashboard"),
]
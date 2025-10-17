from accounts.models import UserProfile
from ..models import Notification, ActivityLog

from django.db.models import Case, When, IntegerField

from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import render

def enforce_access(request, required_role):
  ''' Check if the user is authenticated and has the provided role. '''
  if not request.user.is_authenticated:
    return render(request, "smartportApp/401-unauthorized.html", {"link": "auth_view"})
    # return render(request, "smartportApp/unauthorized.html", {"link": "auth_view"})
  
  role = request.user.userprofile.role
  text = ""
  if required_role == "shipper":
    text = "Only shipper accounts can access this page."
  elif required_role == "employee":
    text = "Only employee accounts can access this page."
  elif required_role == "custom":
    text = "Only custom accounts can access this page."
  elif required_role == "admin":
    text = "Only admin accounts can access this page."

  if role != required_role:
    if role == "admin":
      return render(request, "smartportApp/403-forbidden-page.html", {"text": text, "link": "admin-dashboard"})
    elif role == "shipper":
      return render(request, "smartportapp/403-forbidden-page.html", {"text": text, "link": "shipper-dashboard"})
    elif role == "custom":
      return render(request, "smartportApp/403-forbidden-page.html", {"text": text, "link": "customs-dashboard"})
    elif role == "employee":
      return render(request, "smartportApp/403-forbidden-page.html", {"text": text, "link": "incident-feed-view"})  
    return render(request, "smartportApp/403-forbidden-page.html", {"text": "Only shippers can access this page."})
  
  return None

# helper for the filter annotation:
def with_approval_priority(queryset):
  return queryset.annotate(
    approval_priority=Case(
      When(is_approved=False, then=0),
      default=1,
      output_field=IntegerField()
    )
  )


# HELPER FUNCTION FOR THE INCIDENT REPORT VIEW:
def serialize_incident(incident):
  return {
    "incident_id": incident.incident_id,
    "incident_type_display": incident.get_incident_type_display(),
    "impact_level": incident.impact_level,
    "impact_level_display": incident.get_impact_level_display(),
    "created_at": incident.created_at.strftime("%B %d, %Y"),
    "reporter_name": f"{incident.reporter.first_name} {incident.reporter.last_name}",
    "vessel_name": incident.vessel.name if incident.vessel else None,
    "location": incident.location,
    "description": incident.description,
    "is_approved": incident.is_approved,
    "status": incident.status,
    "images": [{"url": img.image.url} for img in incident.images.all()],
  }

# HELPER FUNCTION FOR THE SYSTEM GENERATED IMPACT LEVEL:
def determine_impact_level(incident_type, description=""):
  high_impact = {"collision", "fire", "capsizing", "grounding", "oil_spill"}
  medium_impact = {"human_error", "slip_trip_fall"}

  if incident_type in high_impact:
    return "high"
  elif incident_type in medium_impact:
    return "medium"
  return "low"

# HELPER FUNCTION TO CALL TO CREATE ACTIVITY LOG:
def log_vessel_activity(vessel, action_type, description, user_profile):
  """
  creates an activity log for a vessel
  args:
    vessel: the vessel instance
    action_type (str): the action type choice from the model
    description (str): log message to display
    user (UserProfile): to log who performed the action(admin)
  """

  if not all([vessel, action_type, description, user_profile]):
    raise ValueError("Missing required fields for logging the activity")
  
  ActivityLog.objects.create(
    vessel=vessel,
    action_type=action_type,
    description=description,
    created_by=user_profile
  )

# NOTIFICATION HELPER:
def create_notification(user, title, message, link_url=None, triggered_by=None):
  """
  Creates a new in-app notification.
  
  Parameters:
  - user: UserProfile instance (recipient)
  - title: Short title for the notification
  - message: Detailed message content
  - link_url: Optional frontend route (e.g., /submanifest/123/)
  - triggered_by: Optional UserProfile (admin, shipper, etc. who triggered it)
  """
  if not isinstance(user, UserProfile):
    raise ValueError("Expected `user` to be an instance of UserProfile")
  print("============== CREATING NOTIFICATION ==============")
  print("LINK: ", link_url)
  Notification.objects.create(
    user=user,
    title=title,
    message=message,
    link_url=link_url or "",
    triggered_by=triggered_by
  )

# helper method for bulk creation of notification
def create_notification_bulk(recipients, title, message, link_url="", triggered_by=None):
  """
  Creates notifications for multiple recipients efficiently using bulk_create.

  Parameters:
  - recipients: iterable of UserProfile objects
  - title: notification title
  - message: body message
  - link_url: frontend URL to redirect to
  - triggered_by: UserProfile who triggered the notification
  """
  if not all(isinstance(user, UserProfile) for user in recipients):
    raise ValueError("All recipients must be instances of UserProfile")
  
  notifications = [
    Notification(
      user=user,
      title=title,
      message=message,
      link_url=link_url or "",
      triggered_by=triggered_by
    )
    for user in recipients
  ]
  Notification.objects.bulk_create(notifications)

from datetime import datetime
def get_timestamp_value(doc):
    """Extract a comparable timestamp value from a document"""
    data = doc.to_dict()
    updated_at = data.get('updated_at')
    
    if not updated_at:
        return 0
    
    # If it's a Firestore timestamp object
    if hasattr(updated_at, 'timestamp'):
        return updated_at.timestamp()
    
    # If it's already a number (Unix timestamp)
    if isinstance(updated_at, (int, float)):
        return updated_at
    
    # If it's a datetime object
    if isinstance(updated_at, datetime):
        return updated_at.timestamp()
    
    # Default fallback
    return 0
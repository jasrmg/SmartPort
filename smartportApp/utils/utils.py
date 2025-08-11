from accounts.models import UserProfile
from ..models import Notification 

from django.db.models import Case, When, IntegerField

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
  
  Notification.objects.create(
    user=user,
    title=title,
    message=message,
    link_url=link_url or "",
    triggered_by=triggered_by
  )

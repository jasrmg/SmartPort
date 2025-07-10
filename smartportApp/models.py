from django.db import models
from accounts.models import UserProfile

# Create your models here.
class Port(models.Model):
  port_id = models.AutoField(primary_key=True)
  port_name = models.CharField(max_length=100)
  port_code = models.CharField(max_length=10, unique=True)
  latitude = models.FloatField()
  longitude = models.FloatField()
  port_description = models.TextField(blank=True)

  def __str__(self):
    return f"{self.port_name} ({self.port_code})" 
  
class Vessel(models.Model):
  vessel_id = models.AutoField(primary_key=True)
  
  class VesselStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    ASSIGNED = "assigned", "Assigned"
    UNDER_MAINTENANCE = "maintenance", "Under Maintenance"

  class VesselType(models.TextChoices):
    CONTAINER = "container", "Container"
    RO_RO = "ro_ro", "Ro-Ro"
    GENERAL_CARGO = "general_cargo", "General Cargo"

  name = models.CharField(max_length=100)
  imo = models.CharField(max_length=20, unique=True)
  vessel_type = models.CharField(
    max_length=30,
    choices=VesselType.choices,
    default=VesselType.GENERAL_CARGO
  )
  status = models.CharField(
    max_length=20,
    choices=VesselStatus.choices,
    default=VesselStatus.AVAILABLE
  )
  capacity = models.PositiveIntegerField()
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  created_by = models.ForeignKey(
    UserProfile,
    on_delete=models.SET_NULL,
    null=True,
    related_name="created_vessels"
  )

  def __str__(self):
    return f"{self.name} (IMO {self.imo })"
  
class Voyage(models.Model):

  class VoyageStatus(models.TextChoices):
    ARRIVED = "arrived", "Arrived" 
    IN_TRANSIT = "in_transit", "In Transit"
    ASSIGNED = "assigned", "Assigned"
    DELAYED = "delayed", "Delayed"

  voyage_id = models.AutoField(primary_key=True)
  vessel = models.ForeignKey(Vessel, on_delete=models.CASCADE, related_name='voyages')

  departure_port = models.ForeignKey(Port, on_delete=models.SET_NULL, null=True, related_name="departures")
  arrival_port = models.ForeignKey(Port, on_delete=models.SET_NULL, null=True, related_name="arrivals")

  departure_date = models.DateTimeField()
  eta = models.DateTimeField(blank=True, null=True)
  arrival_date = models.DateTimeField(null=True, blank=True)

  status = models.CharField(
    max_length=20,
    choices=VoyageStatus.choices,
    default=VoyageStatus.ASSIGNED
  )

  voyage_number = models.CharField(max_length=50, unique=True)

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.vessel.name} Voyage {self.voyage_number}"

class VoyageReport(models.Model):
  voyage_report_id = models.AutoField(primary_key=True)
  voyage = models.ForeignKey(Voyage, on_delete=models.CASCADE, related_name="reports", null=True)

  voyage_report = models.TextField()
  # voyage_number = models.CharField(max_length=50)
  created_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, related_name="voyage_reports")
  delayed_reason = models.TextField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)

  def __str__(self):
    return f"Report for {self.voyage.voyage_number}"
  

class ActivityLog(models.Model):
  class ActionType(models.TextChoices):
    ASSIGNED = "assigned", "Assigned"
    STATUS_UPDATE = "status_update", "Status Update"
    DELAYED = "delayed", "Delayed"
    ARRIVED = "arrived", "Arrived"
    NOTE = "note", "Manual Note"
    CREATED = "created", "Created"

  activity_log_id = models.AutoField(primary_key=True)
  vessel = models.ForeignKey('Vessel', on_delete=models.CASCADE, related_name='activity_logs')
  action_type = models.CharField(max_length=20, choices=ActionType.choices)
  description = models.TextField()
  created_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ['-created_at']

  def __str__(self):
    return f"[{self.created_at}] {self.vessel} - {self.action_type}"


class IncidentReport(models.Model):
  class ImpactLevel(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'

  class Status(models.TextChoices):
    PENDING = 'pending', 'Pending'
    RESOLVED = 'resolved', 'Resolved'

  class IncidentTypeChoices(models.TextChoices):
    COLLISION = 'collision', 'Collision'
    FIRE = 'fire', 'Fire'
    OTHER = 'other', 'Other (Specify)'

  incident_id = models.AutoField(primary_key=True)
  description = models.TextField()
  location = models.CharField(max_length=255)
  incident_datetime = models.DateTimeField()
  impact_level = models.CharField(max_length=10, choices=ImpactLevel.choices)
  status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
  incident_type = models.CharField(max_length=20, choices=IncidentTypeChoices.choices)
  other_incident_type = models.CharField(max_length=100, null=True, blank=True)
  reporter = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
  vessel = models.ForeignKey(Vessel, on_delete=models.SET_NULL, null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)


class IncidentImage(models.Model):
  image_id = models.AutoField(primary_key=True)
  incident = models.ForeignKey('IncidentReport', on_delete=models.CASCADE, related_name='images')
  image = models.ImageField(upload_to='incident_images/')
  uploaded_at = models.DateTimeField(auto_now_add=True)
  uploaded_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)

  

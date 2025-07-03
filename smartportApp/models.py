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
    default=VoyageStatus.IN_TRANSIT
  )

  voyage_number = models.CharField(max_length=50, unique=True)

  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.vessel.name} Voyage {self.voyage_number}"
  
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
  # TODO: Add `flag_state` (country of vessel registration) if required for customs documentation.

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
    INCIDENT = "incident", "Incident"

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
    OIL_SPILL = 'oil_spill', 'Oil Spill'
    COLLISION = 'collision', 'Collision'
    GROUNDING = 'grounding', 'Grounding'
    FIRE = 'fire', 'Fire'
    CAPSIZING = 'capsizing', 'Capsizing'
    SLIP_TRIP_FALL = 'slip_trip_fall', 'Slip, Trip, or Fall'
    HUMAN_ERROR = 'human_error', 'Human Error'
    OTHER = 'other', 'Other'

  incident_id = models.AutoField(primary_key=True)
  description = models.TextField()
  location = models.CharField(max_length=255)
  incident_datetime = models.DateTimeField()
  impact_level = models.CharField(max_length=10, choices=ImpactLevel.choices)
  status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
  incident_type = models.CharField(max_length=30, choices=IncidentTypeChoices.choices)
  other_incident_type = models.CharField(max_length=100, null=True, blank=True)
  reporter = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
  vessel = models.ForeignKey(Vessel, on_delete=models.SET_NULL, null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  is_approved = models.BooleanField(default=False)

class IncidentImage(models.Model):
  image_id = models.AutoField(primary_key=True)
  incident = models.ForeignKey('IncidentReport', on_delete=models.CASCADE, related_name='images')
  image = models.ImageField(upload_to='incident_images/')
  uploaded_at = models.DateTimeField(auto_now_add=True)
  uploaded_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)

  
class IncidentResolution(models.Model):
  resolution_id = models.AutoField(primary_key=True)
  incident = models.OneToOneField(IncidentReport, on_delete=models.CASCADE, related_name='resolution')
  resolution_report = models.TextField()
  resolution_date = models.DateTimeField()
  resolved_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)

class MasterManifest(models.Model):
  mastermanifest_id = models.AutoField(primary_key=True)
  vessel = models.ForeignKey(Vessel, on_delete=models.CASCADE)
  voyage = models.OneToOneField(Voyage, on_delete=models.CASCADE, related_name='master_manifest')
  created_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)
  created_at = models.DateTimeField(auto_now_add=True)

  STATUS_CHOICES = [
    ('generated', 'Generated'),
    ('finalized', 'Finalized'),
  ]
  status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generated')

  def __str__(self):
    return f"Master Manifest {self.mastermanifest_id} - Voyage {self.voyage.voyage_number}"
  
  class Meta:
    ordering = ['-created_at']


from django.utils import timezone

class SubManifest(models.Model):
  submanifest_id = models.AutoField(primary_key=True)
  submanifest_number = models.CharField(max_length=50, unique=True, blank=True)

  voyage = models.ForeignKey(Voyage, on_delete=models.CASCADE)

  # Created by Shipper
  created_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)

  # Consignee / Consignor
  consignee_name = models.CharField(max_length=255)
  consignee_email = models.EmailField()
  consignee_address = models.TextField()

  consignor_name = models.CharField(max_length=255)
  consignor_email = models.EmailField()
  consignor_address = models.TextField()

  # Shipment Details
  container_no = models.CharField(max_length=11) # 4 LETTERS 6 DIGITS 1 CHECK DIGIT (ex. MSKU1234567)
  seal_no = models.CharField(max_length=15) #
  bill_of_lading_no = models.CharField(max_length=17)
  handling_instruction = models.TextField(blank=True)

  # Review Processs
  STATUS_CHOICES = [
    ('pending_admin', 'Pending Admin Review'),
    ('rejected_by_admin', 'Rejected by Admin'),
    ('pending_customs', 'Pending Customs Review'),
    ('rejected_by_customs', 'Rejected by Customs'),
    ('approved', 'Approved'),
  ]
  status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending_admin')

  admin_note = models.TextField(blank=True, null=True)
  customs_note = models.TextField(blank=True, null=True)
  master_manifest = models.ForeignKey(MasterManifest, on_delete=models.SET_NULL, null=True, blank=True)

  updated_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, related_name='updated_submanifests')
  updated_at = models.DateTimeField(auto_now=True)
  created_at = models.DateTimeField(auto_now_add=True)


  def get_documents(self):
    return self.documents.all()
  
  @property
  def item_count(self):
    return self.cargo_items.count()
  
  def save(self, *args, **kwargs):
    is_new = self.pk is None 
    super().save(*args, **kwargs) #save first to get id

    if is_new and not self.submanifest_number:
      today_str = timezone.now().strftime('%Y%m%d')
      self.submanifest_number = f"SUBM-{today_str}-{self.submanifest_id}"
      # save again to update the number
      SubManifest.objects.filter(pk=self.pk).update(submanifest_number=self.submanifest_number)

class Cargo(models.Model):
  cargo_id = models.AutoField(primary_key=True)
  submanifest = models.ForeignKey(
    SubManifest,
    on_delete=models.CASCADE,
    related_name="cargo_items"
  )

  item_number = models.PositiveIntegerField()
  description = models.TextField()
  quantity = models.PositiveIntegerField()
  value = models.DecimalField(max_digits=12, decimal_places=2)
  weight = models.DecimalField(max_digits=10, decimal_places=2)
  additional_info = models.TextField(blank=True, null=True)
  hs_code = models.CharField(max_length=20, blank=True, null=True) 
  class Meta:
    unique_together = ("submanifest", "item_number")
    ordering = ["item_number"]

  def __str__(self):
    return f"Item {self.item_number} in {self.submanifest.submanifest_number}"


class Document(models.Model):
  DOCUMENT_TYPE_CHOICES = [
    ('bill_of_lading', 'Bill of Lading'),
    ('invoice', 'Invoice'),
    ('packing_list', 'Packing List'),
    ('other', 'Other'),
  ]

  document_id = models.AutoField(primary_key=True)
  submanifest = models.ForeignKey('SubManifest', on_delete=models.CASCADE, related_name='documents')

  document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
  file = models.FileField(upload_to='documents/')
  uploaded_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)
  uploaded_at = models.DateTimeField(auto_now_add=True)

  # Optional: if `document_type == "other"`
  custom_filename = models.CharField(max_length=255, blank=True)

  def __str__(self):
    return f"{self.get_document_type_display()} - {self.submanifest_id}"

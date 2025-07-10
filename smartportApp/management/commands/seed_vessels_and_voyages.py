from django.core.management.base import BaseCommand
from smartportApp.models import Vessel, Voyage, Port
from accounts.models import UserProfile
from django.utils import timezone
import random

class Command(BaseCommand):
  help = "Seed 10 vessels and 8 voyages for testing (with ETA)"

  def handle(self, *args, **options):
    creator = UserProfile.objects.filter(role='admin').first()
    if not creator:
      self.stdout.write(self.style.ERROR("❌ No admin user found to assign as creator."))
      return

    vessel_types = [v[0] for v in Vessel.VesselType.choices]
    vessel_statuses = [s[0] for s in Vessel.VesselStatus.choices]
    voyage_statuses = [s[0] for s in Voyage.VoyageStatus.choices]
    port_ids = list(Port.objects.values_list('port_id', flat=True))

    if len(port_ids) < 2:
      self.stdout.write(self.style.ERROR("❌ You need at least 2 ports in the Port table."))
      return

    # CREATE VESSELS
    vessels = []
    for i in range(1, 11):
      vessel = Vessel.objects.create(
        name=f"Vessel {i}",
        imo=f"IMO{random.randint(1000000, 9999999)}",
        vessel_type=random.choice(vessel_types),
        status=random.choice(vessel_statuses),
        capacity=random.randint(5000, 30000),
        created_by=creator
      )
      vessels.append(vessel)

    self.stdout.write(self.style.SUCCESS("✅ 10 vessels created."))

    # CREATE VOYAGES
    # for i in range(8):
    #   vessel = vessels[i]
    #   departure_id, arrival_id = random.sample(port_ids, 2)

    #   departure_date = timezone.now() - timezone.timedelta(days=random.randint(2, 6))
    #   eta = departure_date + timezone.timedelta(hours=random.randint(24, 72))
    #   arrival_date = eta + timezone.timedelta(hours=random.randint(-4, 6))  # simulate delays/early arrivals

    #   Voyage.objects.create(
    #     vessel=vessel,
    #     departure_port_id=departure_id,
    #     arrival_port_id=arrival_id,
    #     departure_date=departure_date,
    #     eta=eta,
    #     arrival_date=arrival_date,
    #     status=random.choice(voyage_statuses),
    #     voyage_number=f"VOY-{1000 + i}"
    #   )

    # self.stdout.write(self.style.SUCCESS("✅ 8 voyages created with ETA and updated statuses."))

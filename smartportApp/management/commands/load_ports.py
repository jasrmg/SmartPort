from django.core.management.base import BaseCommand
from smartportApp.models import Port

class Command(BaseCommand):
  help = "Load 10 government/common ports into the database"

  def handle(self, *args, **kwargs):
    ports = [
      {
        "port_name": "Port of Manila",
        "port_code": "POM",
        "latitude": 14.5833,
        "longitude": 120.9667,
        "port_description": "Main international gateway in the Philippines."
      },
      {
        "port_name": "Port of Cebu",
        "port_code": "POC",
        "latitude": 10.3093,
        "longitude": 123.8932,
        "port_description": "Major port in the Visayas region."
      },
      {
        "port_name": "Port of Davao",
        "port_code": "POD",
        "latitude": 7.0796,
        "longitude": 125.6000,
        "port_description": "Southern Mindanao’s key international port."
      },
      {
        "port_name": "Port of Batangas",
        "port_code": "POB",
        "latitude": 13.7586,
        "longitude": 121.0583,
        "port_description": "Handles oil and passenger traffic."
      },
      {
        "port_name": "Port of Subic",
        "port_code": "POS",
        "latitude": 14.7955,
        "longitude": 120.2725,
        "port_description": "Freeport zone and logistics hub."
      },
      {
        "port_name": "Port of Cagayan de Oro",
        "port_code": "POCDO",
        "latitude": 8.4822,
        "longitude": 124.6472,
        "port_description": "Main port in Northern Mindanao."
      },
      {
        "port_name": "Port of Iloilo",
        "port_code": "POI",
        "latitude": 10.7202,
        "longitude": 122.5621,
        "port_description": "Gateway to Panay and Western Visayas."
      },
      {
        "port_name": "Port of Zamboanga",
        "port_code": "POZ",
        "latitude": 6.9103,
        "longitude": 122.0739,
        "port_description": "Busy commercial port in Western Mindanao."
      },
      {
        "port_name": "Port of Legazpi",
        "port_code": "POL",
        "latitude": 13.1376,
        "longitude": 123.7411,
        "port_description": "Port serving the Bicol region."
      },
      {
        "port_name": "Port of Puerto Princesa",
        "port_code": "POPP",
        "latitude": 9.7392,
        "longitude": 118.7353,
        "port_description": "Main port in Palawan."
      },
    ]

    for port_data in ports:
      port, created = Port.objects.get_or_create(
        port_code=port_data["port_code"],
        defaults=port_data
      )
      if created:
        self.stdout.write(self.style.SUCCESS(f"Created: {port.port_name}"))
      else:
        self.stdout.write(self.style.WARNING(f"Already exists: {port.port_name}"))

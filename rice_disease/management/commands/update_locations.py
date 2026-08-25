from django.core.management.base import BaseCommand
from rice_disease.models import PredictionRecord
import json
from geopy.geocoders import Nominatim


class Command(BaseCommand):
    help = "Update PredictionRecord.location_name with address + lat/lon"

    def handle(self, *args, **kwargs):
        geolocator = Nominatim(user_agent="rice_disease_app (your_email@example.com)")

        records = PredictionRecord.objects.all()
        updated = 0

        for record in records:
            if record.location and not record.location_name:
                try:
                    location_data = json.loads(record.location)
                    latitude = location_data.get("latitude")
                    longitude = location_data.get("longitude")

                    if latitude and longitude:
                        location = geolocator.reverse((latitude, longitude), language="en")

                        if location:
                            addr = location.raw.get("address", {})

                            # broader fallback priority
                            address = (
                                addr.get("road")
                                or addr.get("suburb")
                                or addr.get("village")
                                or addr.get("town")
                                or addr.get("municipality")
                                or addr.get("county")
                                or addr.get("city")
                                or addr.get("state")
                                or addr.get("country")
                                or location.address  # fallback: full string
                                or "Unknown Address"
                            )
                        else:
                            address = "Unknown Address"

                        record.location_name = f"{address} (Lat: {latitude}, Lon: {longitude})"
                        record.save(update_fields=["location_name"])
                        updated += 1

                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Error with record {record.id}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"✅ Updated {updated} records"))

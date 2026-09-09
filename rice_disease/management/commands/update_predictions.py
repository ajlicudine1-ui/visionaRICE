from django.core.management.base import BaseCommand
from rice_disease.utils import update_highest_predicted_disease

class Command(BaseCommand):
    help = "Run scheduled prediction update"

    def handle(self, *args, **kwargs):
        self.stdout.write("Running scheduled prediction update...")
        result = update_highest_predicted_disease()
        if result:
            self.stdout.write(f"Result: {result}")
        else:
            self.stdout.write("No predictions found.")

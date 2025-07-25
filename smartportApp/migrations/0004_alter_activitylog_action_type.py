# Generated by Django 5.2.3 on 2025-07-17 05:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('smartportApp', '0003_alter_submanifest_bill_of_lading_no_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='activitylog',
            name='action_type',
            field=models.CharField(choices=[('assigned', 'Assigned'), ('status_update', 'Status Update'), ('delayed', 'Delayed'), ('arrived', 'Arrived'), ('note', 'Manual Note'), ('created', 'Created'), ('incident', 'Incident'), ('submanifest_approved', 'Submanifest Approved')], max_length=20),
        ),
    ]

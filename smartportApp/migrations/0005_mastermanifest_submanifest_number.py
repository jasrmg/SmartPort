# Generated by Django 5.2.3 on 2025-07-21 00:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('smartportApp', '0004_alter_activitylog_action_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='mastermanifest',
            name='submanifest_number',
            field=models.CharField(blank=True, max_length=50, unique=True),
        ),
    ]

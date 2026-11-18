from django.db import models

from .building_types import BUILDING_TYPES
from .campuses import DEFAULT_CAMPUS


class Building(models.Model):
    # Which campus the building belongs to (a slug from campuses.py). The
    # database keeps the default too, so rows written by code that predates
    # campuses still land on UMD.
    campus = models.CharField(max_length=20, default=DEFAULT_CAMPUS, db_default=DEFAULT_CAMPUS)
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=50, choices=BUILDING_TYPES, blank=True)
    department = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    hours = models.CharField(max_length=200, blank=True)
    image_url = models.URLField(max_length=500, blank=True)

    class Meta:
        constraints = [
            # Two campuses may use the same code (both could have an "LA").
            models.UniqueConstraint(fields=['campus', 'code'], name='building_campus_code_uniq'),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class ParkingLot(models.Model):
    campus = models.CharField(max_length=20, default=DEFAULT_CAMPUS, db_default=DEFAULT_CAMPUS)
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    kind = models.CharField(max_length=20, default='lot')  # 'lot' or 'garage'
    latitude = models.FloatField()
    longitude = models.FloatField()
    note = models.CharField(max_length=300, blank=True)
    free_after_hours = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['campus', 'code'], name='parkinglot_campus_code_uniq'),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Comment(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='comments')
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    helpful = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.building.code}: {self.text[:50]}"

from django.db import models

class Building(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    number = models.CharField(max_length=20, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    department = models.CharField(max_length=200, blank=True)
    address = models.CharField(max_length=300, blank=True)
    hours = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"
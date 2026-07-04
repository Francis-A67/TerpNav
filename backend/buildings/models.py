from django.db import models

class Building(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    department = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=300, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    hours = models.CharField(max_length=200, blank=True)
    image_url = models.URLField(max_length=500, blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class Comment(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='comments')
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    helpful = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.building.code}: {self.text[:50]}"
from rest_framework import serializers

class BuildingSerializer(serializers.Serializer):
    acronym = serializers.CharField()
    full_name = serializers.CharField()
    department = serializers.CharField()
    description = serializers.CharField()
    address = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    hours = serializers.CharField()
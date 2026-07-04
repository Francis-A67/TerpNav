from rest_framework import serializers
from .models import Building, Comment


class BuildingSerializer(serializers.ModelSerializer):
    # Map DB field names → JSON names the frontend expects
    acronym = serializers.CharField(source='code')
    full_name = serializers.CharField(source='name')

    class Meta:
        model = Building
        fields = ['acronym', 'full_name', 'department', 'description', 'address', 'latitude', 'longitude', 'hours', 'image_url']


class TipSerializer(serializers.Serializer):
    building = serializers.CharField()
    text = serializers.CharField()
    helpful = serializers.IntegerField()


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'text', 'helpful', 'created_at']
        read_only_fields = ['id', 'helpful', 'created_at']
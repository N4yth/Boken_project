from django.db import models
from .base_model import BaseModel
from .release import Release
from .user import User

class UserRelease(BaseModel):
    STATUS_CHOICES = (
        ("finish", "Finish"),
        ("reading", "Reading"),
        ("to read", "To read"),
    )
    personal_total_chapter = models.IntegerField(default=0)
    chapter_read = models.IntegerField(default=0)
    note = models.TextField(null=True, blank=True)
    rating = models.FloatField(default=0.0)
    reading_status = models.CharField(choices=STATUS_CHOICES, null=False, blank=False)
    release_id = models.ForeignKey(
        Release,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
        related_name='userrelease',
    )
    user_id = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=False,
        blank=False,
        related_name='userrelease'
    )

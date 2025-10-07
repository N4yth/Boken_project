from django.db import models
from .base_model import BaseModel
from .user import User


class Webtoon(BaseModel):
    title = models.CharField(max_length=255, unique=True, null=False, blank=False)
    authors = models.CharField(max_length=255, null=False, blank=False)
    release_date = models.DateField(default='2000-01-01', null=False, blank=False)
    status = models.CharField(max_length=64, null=False, blank=False)
    is_public = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0)
    add_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webtoons'
    )
    waiting_review = models.BooleanField(default=False)

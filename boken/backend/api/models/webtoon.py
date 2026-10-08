from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from .base_model import BaseModel
from .user import User


class Webtoon(BaseModel):
    STATUS_CHOICES = (
        ("finish", "Finish"),
        ("in progress", "In progress"),
        ("pause", "Pause"),
        ("cancel", "Cancel"),
    )

    title = models.CharField(max_length=255, unique=True, null=False, blank=False)
    authors = models.ManyToManyField('Author', related_name='webtoons', blank=True)
    release_date = models.DateField(default='2000-01-01', null=False, blank=False)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, null=False, blank=False)
    is_public = models.BooleanField(default=False)
    # average of the readers' ratings and number of readers who rated (see api/ratings.py)
    rating = models.FloatField(default=0.0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    rating_count = models.PositiveIntegerField(default=0)
    add_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_webtoons'
    )
    waiting_review = models.BooleanField(default=False)
    # optimised WebP file in MEDIA_ROOT/covers/ (see api/covers.py), only the path is in the database
    cover = models.ImageField(upload_to='covers/', null=True, blank=True)
    # ids in the external sources of the import (api/external_api.py, api/sources/)
    anilist_id = models.PositiveIntegerField(null=True, blank=True, unique=True)
    mangaupdates_id = models.BigIntegerField(null=True, blank=True)
    genres = models.ManyToManyField('Genre', related_name='webtoon', blank=False)

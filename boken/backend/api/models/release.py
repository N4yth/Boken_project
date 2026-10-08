from django.core.validators import MinValueValidator
from django.db import models
from .base_model import BaseModel
from .webtoon import Webtoon
from .user import User


class Release(BaseModel):
    # ISO 639-1 codes
    LANGUAGE_CHOICES = (
        ("ko", "Korean"),
        ("zh", "Chinese"),
        ("ja", "Japanese"),
        ("en", "English"),
        ("fr", "French"),
        ("es", "Spanish"),
    )

    alt_title = models.CharField(max_length=255, null=False, blank=False)
    description = models.TextField(null=False, blank=False)
    language = models.CharField(max_length=12, choices=LANGUAGE_CHOICES, default='ko', null=False, blank=False)
    total_chapter = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    # official platform where this language can be read legally (WEBTOON, Tapas...), from the import
    platform = models.CharField(max_length=100, blank=True, default="")
    url = models.URLField(max_length=500, blank=True, default="")
    webtoon_id = models.ForeignKey(
        Webtoon,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='release'
    )
    # releases submitted by readers wait for an admin before being shown to everyone
    waiting_review = models.BooleanField(default=False)
    add_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_releases'
    )

    class Meta:
        ordering = ['create_at']
        constraints = [
            models.UniqueConstraint(fields=['webtoon_id', 'language'], name='unique_release_language_per_webtoon'),
        ]

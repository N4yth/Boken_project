from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from .base_model import BaseModel
from .release import Release
from .user import User

def validate_user_rating(value):
    """0 means "not rated" (the frontend sends 0 to clear a rating), a real rating goes from 0.5 to 5."""
    if value != 0 and not 0.5 <= value <= 5:
        raise ValidationError("Rating must be 0 (no rating) or between 0.5 and 5.")


class UserRelease(BaseModel):
    STATUS_CHOICES = (
        ("finish", "Finish"),
        ("reading", "Reading"),
        ("to read", "To read"),
    )
    personal_total_chapter = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    chapter_read = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    note = models.TextField(null=True, blank=True)
    rating = models.FloatField(default=0.0, validators=[validate_user_rating])
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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user_id', 'release_id'], name='unique_userrelease_per_user'),
        ]

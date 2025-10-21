from django.db import models
import uuid
from django import utils

class BaseModel(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    create_at = models.DateTimeField(default = utils.timezone.now, editable = False)
    update_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
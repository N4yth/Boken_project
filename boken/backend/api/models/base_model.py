from django.db import models
import uuid
from django import utils

class BaseModel(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    create_at = models.DateTimeField(default = utils.timezone.now, editable = False)
    update_at = models.DateTimeField(default = utils.timezone.now)

    def SaveDate(self):
        """Update the updated_at timestamp whenever the object is modified"""
        self.updated_at = utils.timezone.now()

    def update(self, data):
        """Update the attributes of the object based on the provided dictionary"""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.SaveDate()

    class Meta:
        abstract = True
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from .base_model import BaseModel


class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        if not username:
            raise ValueError("Le nom d'utilisateur est obligatoire")

        email = self.normalize_email(email)
        user = self.model(email=email, username=username)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_admin(self, email, username, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        if not username:
            raise ValueError("Le nom d'utilisateur est obligatoire")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        email = self.normalize_email(email)
        admin = self.model(email=email, username=username, role="admin")
        admin.set_password(password)
        admin.save(using=self._db)
        return admin


class User(AbstractBaseUser, PermissionsMixin, BaseModel):

    username = models.CharField(max_length=255, unique=True, null=False, blank=False)
    email = models.EmailField(unique=True, null=False, blank=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    # === GETTERS ===
    def get_full_name(self):
        return self.username

    def get_short_name(self):
        return self.username

    def get_role(self):
        return self.role

    # === SETTERS ===
    def set_role(self, role: str):
        self.role = role

    def Validate_password(self, password):
        return self.check_password(password)


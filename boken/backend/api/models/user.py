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
        user = self.model(email=email, username=username, role="user")
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_admin(self, email, username, password, created_by=None):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        if not username:
            raise ValueError("Le nom d'utilisateur est obligatoire")

        admin_count = self.model.objects.filter(role="admin").count()

        if admin_count > 0:
            if not created_by or not getattr(created_by, "is_authenticated", False):
                raise PermissionError("Authentification requise pour créer un compte admin")
            if created_by.role != "admin":
                raise PermissionError("Seuls les administrateurs peuvent créer un compte admin")

        email = self.normalize_email(email)
        admin = self.model(email=email, username=username, role="admin", is_staff=True)
        admin.set_password(password)
        admin.save(using=self._db)
        return admin


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    ROLE_CHOICES = (
        ("user", "User"),
        ("admin", "Admin"),
    )

    username = models.CharField(max_length=255, unique=True, null=False, blank=False)
    email = models.EmailField(unique=True, null=False, blank=False)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="user")
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

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
        if role not in dict(self.ROLE_CHOICES):
            raise ValueError("Role invalide")
        self.role = role

"""Production-ready Django settings for Vercel and Supabase."""

import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


# -----------------------------------------------------------------------------
# Security
# -----------------------------------------------------------------------------

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY environment variable is required.")

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    ".vercel.app",
]

for configured_host in os.getenv("ALLOWED_HOSTS", "").split(","):
    configured_host = configured_host.strip()
    if configured_host and configured_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(configured_host)

vercel_host = os.getenv("VERCEL_URL")
if vercel_host:
    ALLOWED_HOSTS.append(vercel_host)

custom_host = os.getenv("CUSTOM_DOMAIN")
if custom_host:
    ALLOWED_HOSTS.append(custom_host)

CSRF_TRUSTED_ORIGINS = ["https://*.vercel.app"]

if custom_host:
    CSRF_TRUSTED_ORIGINS.append(f"https://{custom_host}")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG


# -----------------------------------------------------------------------------
# Applications
# -----------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rice_disease",
    "accounts",
    "widget_tweaks",
    "django_q",
]

AUTH_USER_MODEL = "accounts.CustomUser"


# -----------------------------------------------------------------------------
# Middleware
# -----------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "disease_detection_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "disease_detection_project.wsgi.application"


# -----------------------------------------------------------------------------
# Supabase PostgreSQL
# Use a Supabase pooler connection string supplied through DATABASE_URL.
# -----------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required.")

DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=0,
        ssl_require=True,
    )
}

# Required when using a transaction-pooling connection.
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True


# -----------------------------------------------------------------------------
# Password validation
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        )
    },
]


# -----------------------------------------------------------------------------
# Internationalization
# -----------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True


# -----------------------------------------------------------------------------
# Static files and uploaded media
# -----------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

local_static_directory = BASE_DIR / "static"
if local_static_directory.exists():
    STATICFILES_DIRS = [local_static_directory]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

cloudinary_is_configured = all(
    [
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET,
    ]
)

if cloudinary_is_configured:
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "API_KEY": CLOUDINARY_API_KEY,
        "API_SECRET": CLOUDINARY_API_SECRET,
    }
    media_storage_backend = (
        "cloudinary_storage.storage.MediaCloudinaryStorage"
    )
else:
    # Local development fallback. Vercel must use Cloudinary because its
    # filesystem is temporary and uploaded files would otherwise disappear.
    media_storage_backend = "django.core.files.storage.FileSystemStorage"

# Prediction metadata is always saved to Supabase. Image retention is disabled
# until STORE_PREDICTION_IMAGES=True is explicitly configured.
STORE_PREDICTION_IMAGES = (
    os.getenv("STORE_PREDICTION_IMAGES", "False").lower() == "true"
)

STORAGES = {
    "default": {
        "BACKEND": media_storage_backend,
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}
# -----------------------------------------------------------------------------
# Email
# -----------------------------------------------------------------------------

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)


# -----------------------------------------------------------------------------
# Django-Q
# A persistent Django-Q worker will not run inside Vercel. Keep this
# configuration only for local commands until scheduled work is moved to a
# secured Vercel Cron endpoint.
# -----------------------------------------------------------------------------

Q_CLUSTER = {
    "name": "DjangoQ",
    "workers": 2,
    "recycle": 500,
    "timeout": 60,
    "retry": 120,
    "queue_limit": 50,
    "bulk": 10,
    "orm": "default",
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

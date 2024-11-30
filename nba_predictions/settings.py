"""
Django settings for nba_predictions project.

Generated by 'django-admin startproject' using Django 4.2.6.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

from pathlib import Path
# from dotenv import load_dotenv
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
# load_dotenv(os.path.join(BASE_DIR, '.env'))
IS_DEVELOPMENT = os.getenv('DJANGO_DEVELOPMENT', 'False').lower() == 'true'
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
if IS_DEVELOPMENT:
    # Development settings (for local environment)
    DEBUG = True
    SECRET_KEY = os.getenv("SECRET_KEY", 'default_secret_key')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DATABASE_NAME'),
            'USER': os.getenv('DATABASE_USER'),
            'PASSWORD': os.getenv('DATABASE_PASSWORD'),
            'HOST': os.getenv('DATABASE_HOST', '134.209.213.185'),
            'PORT': os.getenv('DATABASE_PORT', '5432'),
        }
    }

    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'predictnetwork', '134.209.213.185']
# else:
#     # Production settings (default)
#     DEBUG = False
#     SECRET_KEY = 'django-insecure-vz_05dx#kxb^&(95ltkswn%b56hbq4c6y&+opawn%qt7dda$4h'
#
#     DATABASES = {
#         'default': {
#             'ENGINE': 'django.db.backends.postgresql',
#             'NAME': os.getenv('DATABASE_NAME', 'mydb'),
#             'USER': os.getenv('DATABASE_USER', 'myuser'),
#             'PASSWORD': os.getenv('DATABASE_PASSWORD', 'mypassword'),
#             'HOST': os.getenv('DATABASE_HOST', '134.209.213.185'),
#             'PORT': os.getenv('DATABASE_PORT', '5432'),
#         }
#     }
#
#     ALLOWED_HOSTS = ['134.209.213.185', 'propspredictions.com', 'localhost', '127.0.0.1',]

else:
    # Production settings (default)
    DEBUG = False
    SECRET_KEY = 'django-insecure-vz_05dx#kxb^&(95ltkswn%b56hbq4c6y&+opawn%qt7dda$4h'

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': 'persist_db/db.sqlite3',  # Use the correct path for the server's SQLite file
        }
    }

    ALLOWED_HOSTS = ['134.209.213.185', 'propspredictions.com']

# SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = True

# ALLOWED_HOSTS = ["0.0.0.0", "127.0.0.1", 'localhost', '134.209.213.185', 'propspredictions.com']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_extensions',
    'predictions',
    'accounts',
    'allauth',
    'allauth.account',
]

AUTHENTICATION_BACKENDS = [
    # Needed to login by username in Django admin, regardless of `allauth`
    'django.contrib.auth.backends.ModelBackend',

    # `allauth` specific authentication methods, such as login by email
    'allauth.account.auth_backends.AuthenticationBackend',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = 'nba_predictions.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'predictions/templates/predictions'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.template.context_processors.static',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nba_predictions.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),  # Where Webpack outputs bundled files
]
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

SELECT2_CSS = 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css'
SELECT2_JS = 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js'

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_AUTHENTICATION_REQUIRED = False
ACCOUNT_SIGNUP_FORM_CLASS = 'accounts.custom_forms.CustomSignupForm'

LOGIN_REDIRECT_URL = '/'

# Redirect after signup
ACCOUNT_SIGNUP_REDIRECT_URL = '/'

# Redirect after logout
LOGOUT_REDIRECT_URL = '/'

EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'

CSRF_TRUSTED_ORIGINS = [
    'https://propspredictions.com',
    'https://www.propspredictions.com',  # Include both with and without 'www' if necessary
]
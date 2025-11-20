# 11 - Security Best Practices

**Part of:** AI Assistant Documentation
**Load when:** Implementing security features, handling authentication, or reviewing security concerns

## Table of Contents
- [Authentication & Authorization](#authentication--authorization)
- [CSRF Protection](#csrf-protection)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [XSS Prevention](#xss-prevention)
- [Security Headers](#security-headers)
- [Secrets Management](#secrets-management)

## Authentication & Authorization

### Django Authentication

Uses `django-allauth` for authentication.

**Check if user is authenticated:**
```python
# In views
if request.user.is_authenticated:
    # User is logged in
    pass

# Require authentication
from django.contrib.auth.decorators import login_required

@login_required
def my_view(request):
    # Only accessible to logged-in users
    pass
```

**API v2 authentication:**
```python
from ninja.security import django_auth

@router.get("/profile", auth=django_auth)
def get_profile(request):
    user = request.user  # Guaranteed to exist
    return {"username": user.username}
```

### Authorization

**Check permissions:**
```python
# Check if user is staff
if request.user.is_staff:
    # Admin operations
    pass

# Check if user is superuser
if request.user.is_superuser:
    # Superuser operations
    pass

# Custom permission check
from django.core.exceptions import PermissionDenied

def admin_only_view(request):
    if not request.user.is_staff:
        raise PermissionDenied("Admin access required")
    # Admin operations
```

**API v2 authorization:**
```python
from django.http import HttpResponseForbidden

@router.post("/admin/questions", auth=django_auth)
def create_question(request, payload: QuestionCreateSchema):
    if not request.user.is_staff:
        return 403, {"message": "Admin access required"}

    # Create question
```

### OAuth (Google Login)

Configuration in `backend/nba_predictions/settings.py`:

```python
INSTALLED_APPS = [
    ...
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
]

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    }
}
```

**Environment variables (never commit!):**
```bash
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-secret
```

## CSRF Protection

Django provides CSRF protection by default.

### Backend

**Views automatically protected:**
```python
# Django views with POST/PUT/DELETE
# CSRF token required automatically
def my_view(request):
    if request.method == 'POST':
        # CSRF token checked automatically
        pass
```

**Exempt specific views (use sparingly!):**
```python
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def webhook(request):
    # External webhook, can't provide CSRF token
    pass
```

### Frontend

**Include CSRF token in requests:**
```javascript
// Get CSRF token from cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Include in fetch requests
fetch('/api/v2/answers/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken'),
  },
  body: JSON.stringify(data),
});
```

**Or use meta tag:**
```html
<!-- In Django template -->
<meta name="csrf-token" content="{{ csrf_token }}">
```

```javascript
// In React
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
```

## Input Validation

### Backend Validation (Django)

**Django Ninja (Pydantic schemas):**
```python
from ninja import Schema
from typing import Optional
from datetime import date

class QuestionCreateSchema(Schema):
    season_id: int
    text: str  # Required, non-empty
    point_value: float = 0.5  # Default value

    class Config:
        # Custom validation
        @validator('text')
        def text_not_empty(cls, v):
            if not v.strip():
                raise ValueError('Text cannot be empty')
            return v

        @validator('point_value')
        def point_value_positive(cls, v):
            if v < 0:
                raise ValueError('Point value must be positive')
            return v
```

**Django models:**
```python
from django.core.validators import MinValueValidator, MaxValueValidator

class Question(models.Model):
    text = models.TextField(blank=False)  # Required
    point_value = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(10.0)]
    )
```

**Django forms:**
```python
from django import forms

class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['text', 'point_value']

    def clean_text(self):
        text = self.cleaned_data['text']
        if len(text) < 10:
            raise forms.ValidationError("Text too short")
        return text
```

### Frontend Validation (React)

```javascript
function AnswerForm({ questionId, onSubmit }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    if (!answer.trim()) {
      setError('Answer cannot be empty');
      return;
    }

    if (answer.length > 500) {
      setError('Answer too long (max 500 characters)');
      return;
    }

    // Submit
    onSubmit({ questionId, answer });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={500}
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## SQL Injection Prevention

**Django ORM is safe by default:**

```python
# SAFE - Parameterized query
User.objects.filter(username=user_input)

# SAFE - Django ORM
Question.objects.filter(text__icontains=search_term)
```

**Raw SQL (avoid, but if needed):**
```python
# UNSAFE - Never do this!
cursor.execute(f"SELECT * FROM users WHERE username = '{user_input}'")

# SAFE - Use parameterized queries
cursor.execute("SELECT * FROM users WHERE username = %s", [user_input])
```

## XSS Prevention

### Backend (Django Templates)

**Auto-escaping enabled by default:**
```html
<!-- SAFE - Django auto-escapes -->
<p>{{ user_input }}</p>

<!-- UNSAFE - Disables escaping -->
<p>{{ user_input|safe }}</p>

<!-- Use |safe only for trusted content -->
<div>{{ admin_content|safe }}</div>
```

### Frontend (React)

**React auto-escapes by default:**
```javascript
// SAFE - React escapes
function Component({ userInput }) {
  return <div>{userInput}</div>;
}

// UNSAFE - dangerouslySetInnerHTML
function Component({ htmlContent }) {
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

// Only use dangerouslySetInnerHTML for sanitized content
import DOMPurify from 'dompurify';

function Component({ htmlContent }) {
  const sanitized = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

## Security Headers

Configure in `backend/nba_predictions/settings.py`:

```python
# HTTPS
SECURE_SSL_REDIRECT = not DEBUG  # Redirect HTTP to HTTPS in production

# Cookies
SESSION_COOKIE_SECURE = not DEBUG  # Send cookies only over HTTPS
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# X-Frame-Options
X_FRAME_OPTIONS = 'DENY'  # Prevent clickjacking

# Content-Type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# XSS Protection
SECURE_BROWSER_XSS_FILTER = True
```

## Secrets Management

### DO NOT Commit Secrets

```bash
# .gitignore includes
.env
.env.*
*.pem
*.key
secrets/
```

### Use Environment Variables

```python
# backend/nba_predictions/settings.py
import os

SECRET_KEY = os.environ.get('SECRET_KEY')
DATABASE_URL = os.environ.get('DATABASE_URL')
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID')

# Fail if critical secrets missing
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable not set")
```

### Generate Strong Secrets

```python
# Generate SECRET_KEY
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

```bash
# Or use openssl
openssl rand -base64 32
```

### CI/CD Secrets

**GitHub Secrets:**
1. Go to repository Settings
2. Secrets and variables → Actions
3. New repository secret
4. Add secrets (DATABASE_URL, SECRET_KEY, etc.)

**Use in workflows:**
```yaml
# .github/workflows/ci-cd.yml
env:
  SECRET_KEY: ${{ secrets.SECRET_KEY }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Security Checklist

**Authentication:**
- [ ] User authentication required for sensitive operations
- [ ] Admin/staff checks for privileged operations
- [ ] Session timeout configured appropriately
- [ ] OAuth credentials not in code

**Data Protection:**
- [ ] CSRF protection enabled
- [ ] Input validation on backend and frontend
- [ ] SQL injection prevented (use ORM)
- [ ] XSS prevented (auto-escaping enabled)

**Transport Security:**
- [ ] HTTPS in production
- [ ] Secure cookies enabled
- [ ] HSTS configured
- [ ] Security headers set

**Secrets:**
- [ ] No secrets in code or version control
- [ ] Environment variables used
- [ ] CI/CD secrets configured
- [ ] .env files in .gitignore

**Dependencies:**
- [ ] Dependencies up to date
- [ ] Security advisories checked
- [ ] `pip-audit` or `safety` run regularly

## Common Vulnerabilities to Avoid

### 1. Mass Assignment

```python
# UNSAFE - User can set any field
user = User.objects.create(**request.data)

# SAFE - Explicitly specify allowed fields
user = User.objects.create(
    username=request.data['username'],
    email=request.data['email']
)
```

### 2. Insecure Direct Object References

```python
# UNSAFE - User can access any question
question_id = request.GET['id']
question = Question.objects.get(id=question_id)

# SAFE - Check ownership
question = Question.objects.get(id=question_id)
if question.user != request.user and not request.user.is_staff:
    raise PermissionDenied()
```

### 3. Unvalidated Redirects

```python
# UNSAFE - Open redirect
next_url = request.GET['next']
return redirect(next_url)

# SAFE - Validate redirect URL
from django.utils.http import url_has_allowed_host_and_scheme

next_url = request.GET.get('next', '/')
if url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
    return redirect(next_url)
return redirect('/')
```

## Related Documentation

- **Authentication setup**: See `docs/GOOGLE_OAUTH_SETUP.md`
- **Deployment security**: Load `10-deployment.md`
- **API development**: Load `05-backend-api.md`

---

**Key Takeaways:**
1. Django provides security features by default - use them
2. Always validate input on backend
3. Never trust client-side validation alone
4. Use Django ORM to prevent SQL injection
5. Keep secrets out of code
6. Enable HTTPS and security headers in production
7. Require authentication for sensitive operations

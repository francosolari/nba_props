# Spam Prevention & Cleanup Guide

## Overview

Your NBA Predictions site had 456 registered users, but **436 had zero predictions** - clear spam accounts. I've implemented multiple layers of protection and cleanup tools.

## ✅ What's Been Fixed

### 1. **Email Verification Now Required**
**Location:** `/backend/nba_predictions/settings.py:174-176`

```python
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'  # Require email verification before login
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True  # Auto-login after email confirmation
```

**How it works:**
- New users must verify their email before they can log in
- Verification emails are sent automatically upon signup
- This stops bots from creating accounts without valid emails
- Google OAuth users skip this (Google already verifies emails)

### 2. **Email Backend Configured**
**Location:** `/backend/nba_predictions/settings.py:187-200`

**Development Mode:**
- Emails print to console when you run the dev server
- No actual emails sent (no SMTP needed)
- Perfect for testing

**Production Mode:**
- Uses SMTP (Gmail or other provider)
- Requires configuration in `.env` file

### 3. **Spam Cleanup Command**
**Location:** `/backend/predictions/management/commands/clean_spam_users.py`

Identifies and deletes spam users (users with zero predictions).

## 🧹 How to Clean Up Existing Spam

### Step 1: Preview Spam Users (Dry Run)

```bash
venv/bin/python backend/manage.py clean_spam_users
```

This shows you:
- How many spam users were found
- Sample usernames and emails
- Their join dates
- **Does NOT delete anything** (safe to run)

### Step 2: Actually Delete Spam Users

```bash
venv/bin/python backend/manage.py clean_spam_users --delete
```

- Shows the same preview
- Asks for confirmation (`yes`/`no`)
- Deletes all spam users in bulk (fast)
- **Protects users who signed in with Google OAuth**

### Advanced Options

```bash
# Only delete users older than 30 days
venv/bin/python backend/manage.py clean_spam_users --delete --min-age-days=30

# Preview users older than 14 days
venv/bin/python backend/manage.py clean_spam_users --min-age-days=14
```

## 📧 Email Configuration

### Development (Current Setup)

Emails print to your console - **no configuration needed!**

When you run `npm run dev`, you'll see emails like:

```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
From: noreply@nba-predictions.local
To: user@example.com
Subject: [NBA Predictions] Please Confirm Your Email Address

Hello franco,

You're receiving this email because you registered for NBA Predictions...
```

### Production Setup

You'll need to configure SMTP in your `.env` file:

#### Option 1: Gmail (Easiest)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password

3. **Add to `.env`**:
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-16-char-app-password
   DEFAULT_FROM_EMAIL=noreply@propspredictions.com
   ```

#### Option 2: SendGrid (Free Tier)

SendGrid offers 100 emails/day for free:

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Add to `.env`:
   ```bash
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=apikey
   EMAIL_HOST_PASSWORD=your-sendgrid-api-key
   DEFAULT_FROM_EMAIL=noreply@propspredictions.com
   ```

#### Option 3: Mailgun (Free Tier)

Mailgun offers 5,000 emails/month for free:

1. Sign up at https://www.mailgun.com/
2. Verify your domain (or use their sandbox domain for testing)
3. Get your SMTP credentials
4. Add to `.env`:
   ```bash
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-mailgun-username
   EMAIL_HOST_PASSWORD=your-mailgun-password
   DEFAULT_FROM_EMAIL=noreply@mg.yourdomain.com
   ```

## 🚨 Current Situation

Based on database analysis:
- **Total users:** 456
- **Users with zero predictions:** 436 (95.6% spam!)
- **Legitimate users:** ~20
- **Google OAuth users:** 1 (you!)

### Recommended Action

Run the cleanup command to delete spam users:

```bash
venv/bin/python backend/manage.py clean_spam_users --delete
```

This will:
- ✅ Delete ~436 spam accounts
- ✅ Keep the ~20 legitimate users who made predictions
- ✅ Protect your Google OAuth account
- ✅ Free up database space
- ✅ Clean up your user lists/leaderboards

## 🛡️ Future Protection

With email verification enabled, spam bots will be blocked because:

1. **They can't verify emails** - Most spam bots use fake/disposable emails
2. **No login without verification** - Account is created but unusable until email is verified
3. **Automatic cleanup** - You can periodically run the cleanup command to remove unverified accounts

### Additional Protection (Future Enhancement)

For even better protection, consider:

1. **reCAPTCHA on signup form** - Blocks automated bots
2. **Rate limiting** - Limits signups per IP address
3. **Email domain blocking** - Block known disposable email providers
4. **Account age requirements** - Require accounts to be N days old before making predictions

## 📝 Testing Email Verification

### Test the Signup Flow

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Go to signup page: `http://127.0.0.1:8000/accounts/signup/`

3. Fill out the form with a test email

4. **Check your terminal** - you'll see the verification email printed:
   ```
   Subject: [NBA Predictions] Please Confirm Your Email Address

   Click this link to verify: http://127.0.0.1:8000/accounts/confirm-email/...
   ```

5. Copy the link and paste it in your browser

6. You'll be automatically logged in!

### Test Google OAuth

1. Go to login page: `http://127.0.0.1:8000/accounts/login/`

2. Click "Sign in with Google"

3. Authorize with Google

4. **No email verification needed** - Google already verified the email!

## 🔍 Monitoring

### Check for New Spam

Run this periodically to see if spam is getting through:

```bash
venv/bin/python backend/manage.py clean_spam_users
```

If you see new spam users appearing, consider:
- Adding reCAPTCHA
- Implementing rate limiting
- Reviewing your signup form security

### Database Stats

Check user activity in Django shell:

```python
venv/bin/python backend/manage.py shell

from django.contrib.auth.models import User
from predictions.models import Answer

# Total users
User.objects.count()

# Users with predictions
User.objects.filter(answer__isnull=False).distinct().count()

# Recent signups
User.objects.order_by('-date_joined')[:10]
```

## 🎯 Summary

**Before:**
- No email verification
- 436 spam accounts (95% of users!)
- Anyone could create accounts
- Database cluttered

**After:**
- ✅ Email verification required
- ✅ Easy spam cleanup command
- ✅ Google OAuth works perfectly
- ✅ Development & production email configs ready
- ✅ Future spam prevention in place

Run the cleanup command when you're ready to remove the spam accounts!

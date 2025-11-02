# Google OAuth Setup Guide

This guide will help you configure Google Sign-In for the NBA Predictions application.

## Prerequisites

- Access to Google Cloud Console
- Your application running on a valid domain or localhost

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown and select "New Project"
3. Name your project (e.g., "NBA Predictions")
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: NBA Predictions
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Add or Remove Scopes"
7. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
8. Click "Save and Continue"
9. Add test users if needed (in development)
10. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Configure the settings:
   - **Name**: NBA Predictions Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:8000` (for development)
     - `http://127.0.0.1:8000` (for development)
     - `https://propspredictions.com` (for production)
     - `https://www.propspredictions.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:8000/accounts/google/login/callback/` (for development)
     - `http://127.0.0.1:8000/accounts/google/login/callback/` (for development)
     - `https://propspredictions.com/accounts/google/login/callback/` (for production)
     - `https://www.propspredictions.com/accounts/google/login/callback/` (for production)
5. Click "Create"
6. **Important**: Copy your Client ID and Client Secret - you'll need these next

## Step 5: Configure Django Settings

1. Copy `.env.example` to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Add your Google OAuth credentials to `.env`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_OAUTH_SECRET=your-client-secret-here
   ```

## Step 6: Configure Site in Django Admin

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to Django admin: `http://localhost:8000/admin/`

3. Navigate to **Sites** > **Sites**

4. Click on the default site (example.com) and edit it:
   - **Domain name**: `localhost:8000` (for development) or `propspredictions.com` (for production)
   - **Display name**: NBA Predictions
   - Click "Save"

## Step 7: Configure Social Application in Django Admin

1. In Django admin, go to **Social applications** > **Social applications**

2. Click "Add Social Application"

3. Fill in the details:
   - **Provider**: Google
   - **Name**: Google OAuth
   - **Client id**: Paste your Google Client ID
   - **Secret key**: Paste your Google Client Secret
   - **Sites**: Select "localhost:8000" (or your domain) from Available sites and move it to Chosen sites
   - Click "Save"

## Step 8: Test Google Sign-In

1. Log out if you're currently logged in

2. Go to the login page: `http://localhost:8000/accounts/login/`

3. You should see a "Sign in with Google" button

4. Click it and authorize with your Google account

5. You should be redirected back to the home page, logged in!

## Troubleshooting

### "redirect_uri_mismatch" Error

This means the redirect URI doesn't match what's configured in Google Cloud Console. Make sure:
- The redirect URI in Google Console exactly matches the one Django is using
- Include the trailing slash: `/accounts/google/login/callback/`
- Match the protocol (http vs https) and domain exactly

### "Error 400: invalid_request"

Check that:
- Your `.env` file has the correct Client ID and Secret
- You've restarted Django after updating `.env`
- The Social Application in Django admin is correctly configured

### Google Sign-In Button Not Showing

Make sure:
- You've run migrations: `python backend/manage.py migrate`
- The socialaccount apps are in INSTALLED_APPS
- Static files are being served correctly

### Users Can't Sign Up with Google

Check:
- `SOCIALACCOUNT_AUTO_SIGNUP = True` is in settings.py
- The OAuth consent screen is published (or the user is added as a test user)

## Production Deployment

When deploying to production:

1. Update your Google Cloud Console OAuth credentials to include production URLs
2. Update `.env` with production credentials
3. Update the Site in Django admin to use your production domain
4. Ensure HTTPS is enabled (required by Google OAuth in production)
5. Update `ALLOWED_HOSTS` in settings.py to include your domain

## Security Notes

- **Never commit** your `.env` file or expose your Client Secret
- Keep your Client Secret secure - treat it like a password
- In production, use HTTPS for all OAuth flows
- Regularly review authorized applications in Google Cloud Console
- Consider using different OAuth credentials for development and production

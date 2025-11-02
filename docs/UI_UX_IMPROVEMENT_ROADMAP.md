# UI/UX Improvement Roadmap

## Current Status

✅ **Completed:**
- Modern base template with Tailwind CSS
- Consistent header/navigation across all pages
- Google OAuth integration with modern button design
- Email verification system
- Spam prevention

## Remaining UI/UX Improvements

This document outlines the user experience improvements you requested. These build on the foundation we've already created.

---

## 1. Redesign Login & Signup Pages

### Current Issues:
- Button placements feel disconnected
- Flow between regular signup and Google OAuth isn't intuitive
- Missing clear call-to-action hierarchy

### Proposed Design:

**Login Page** (`/accounts/login/`)
```
┌─────────────────────────────────────┐
│     Welcome Back to NBA Predictions │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Sign in with Google     [G]  │ │ ← Primary CTA
│  └────────────────────────────────┘ │
│                                      │
│         ── or sign in with email ── │
│                                      │
│  Email:    [_____________________] │
│  Password: [_____________________] │
│                                      │
│  [ ] Remember me   Forgot password? │
│                                      │
│         [Sign In]                   │
│                                      │
│  New user? Create an account        │
└─────────────────────────────────────┘
```

**Signup Page** (`/accounts/signup/`)
```
┌─────────────────────────────────────┐
│     Join NBA Predictions            │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Sign up with Google     [G]  │ │ ← Primary CTA
│  └────────────────────────────────┘ │
│                                      │
│        ── or create an account ──   │
│                                      │
│  Email:      [_____________________]│
│  Username:   [_____________________]│ ← Prompt for username
│  First Name: [_____________________]│
│  Last Name:  [_____________________]│
│  Password:   [_____________________]│
│  Confirm:    [_____________________]│
│                                      │
│         [Create Account]            │
│                                      │
│  Already have an account? Sign in   │
└─────────────────────────────────────┘
```

### Files to Create/Update:
- `/backend/predictions/templates/allauth/account/login.html`
- `/backend/predictions/templates/allauth/account/signup.html`

---

## 2. Onboarding Flow for New Users

### Goals:
- Welcome new users (both Google OAuth and regular)
- Ensure they have a display name/username
- Explain how the game works
- Guide them to make their first predictions

### Proposed Flow:

```
Sign Up (Google or Email)
         ↓
┌─────────────────────────────┐
│  Welcome Screen             │
│  - Thank you for joining!   │
│  - Brief intro to the game  │
│  [Continue]                 │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  Profile Setup              │
│  - Set username (if Google) │
│  - Upload avatar (optional) │
│  - Set display preferences  │
│  [Continue]                 │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  How It Works Tutorial      │
│  - Prediction categories    │
│  - Scoring system explained │
│  - Leaderboard overview     │
│  [Got It]                   │
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  Ready to Play?             │
│  - Submission deadline info │
│  - Current season status    │
│  [Make Predictions] [Later] │
└─────────────────────────────┘
```

### Implementation Approach:

1. **Create Onboarding Model**
```python
# backend/accounts/models.py
class UserOnboarding(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    completed_welcome = models.BooleanField(default=False)
    completed_profile_setup = models.BooleanField(default=False)
    completed_tutorial = models.BooleanField(default=False)
    onboarding_complete = models.BooleanField(default=False)
```

2. **Create Onboarding Views**
```python
# backend/accounts/views.py
class OnboardingWelcomeView(LoginRequiredMixin, View)
class OnboardingProfileSetupView(LoginRequiredMixin, View)
class OnboardingTutorialView(LoginRequiredMixin, View)
```

3. **Redirect Middleware**
```python
# Redirect new users to onboarding if not complete
if not user.useronboarding.onboarding_complete:
    return redirect('onboarding_welcome')
```

---

## 3. Profile Management Redesign

### Current Issues:
- Profile page needs better organization
- Password/email changes feel disconnected
- No clear path to account settings

### Proposed Profile Page:

```
┌──────────────────────────────────────────────┐
│  My Profile                                   │
├──────────────────────────────────────────────┤
│  ┌─────┐  Franco S.                         │
│  │  FS │  @francosolari                     │
│  └─────┘  Joined Oct 2024                   │
│           [Edit Profile Photo]               │
├──────────────────────────────────────────────┤
│  Personal Information                        │
│  Email:     franco@example.com [Change]     │
│  Username:  francosolari       [Change]     │
│  Name:      Franco Solari      [Edit]       │
├──────────────────────────────────────────────┤
│  Account Security                            │
│  Password:  ••••••••••         [Change]     │
│  2FA:       Not enabled        [Enable]     │
├──────────────────────────────────────────────┤
│  Connected Accounts                          │
│  [G] Google  franco@gmail.com  [Connected]  │
├──────────────────────────────────────────────┤
│  Prediction Stats (2024-25 Season)          │
│  Submissions: 1/5 categories                │
│  Rank:        #12 out of 20                 │
│  Points:      45                            │
│  [View Full Stats]                          │
├──────────────────────────────────────────────┤
│  Account Actions                            │
│  [Log Out]  [Delete Account]               │
└──────────────────────────────────────────────┘
```

### Files to Create/Update:
- `/backend/predictions/templates/predictions/account/profile.html` (redesign)
- `/backend/predictions/templates/allauth/account/email.html` (modernize)
- `/backend/predictions/templates/allauth/account/password_change.html` (modernize)

---

## 4. Welcome/Tutorial Page

### Content Structure:

```
┌──────────────────────────────────────────────┐
│  How NBA Predictions Works                   │
├──────────────────────────────────────────────┤
│  📋 Make Your Predictions                    │
│     Before the season starts, predict:       │
│     • Conference standings (1-15 in each)    │
│     • MVP, DPOY, ROY, and other awards      │
│     • NBA Finals matchup                     │
│     • Season stats (points leader, etc.)     │
│                                              │
│  🎯 Earn Points                              │
│     • Correct standing position: X points    │
│     • Correct award winner: Y points         │
│     • Correct Finals prediction: Z points    │
│     • Bonus for perfect categories           │
│                                              │
│  🏆 Compete on the Leaderboard              │
│     • Real-time scoring as season unfolds    │
│     • Track your ranking vs others           │
│     • Season-long competition                │
│                                              │
│  ⏰ Important Dates                          │
│     • Submission deadline: [DATE]            │
│     • Season starts: [DATE]                  │
│     • Scoring updates: Weekly                │
│                                              │
│  [Ready to Make Predictions]                 │
└──────────────────────────────────────────────┘
```

### Files to Create:
- `/backend/predictions/templates/predictions/tutorial.html`
- `/backend/predictions/views.py` - Add `TutorialView`
- `/backend/predictions/routing/view_urls.py` - Add URL pattern

---

## 5. Email Verification Templates

### Current: Default allauth templates (plain)
### Needed: Branded, modern HTML emails

**Email Verification** (`/templates/allauth/account/email/email_confirmation_message.txt`):
```
Subject: Confirm your NBA Predictions account

Hi {{ user.first_name }},

Welcome to NBA Predictions! Click the link below to verify your email and start making predictions:

{{ activate_url }}

This link expires in 24 hours.

Questions? Reply to this email.

Thanks,
The NBA Predictions Team
```

**HTML Version** (`.html` file):
- Branded header with logo
- Clear CTA button
- Modern responsive design

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Clean up spam users (run the command!)
2. ✅ Verify email verification works
3. **Login/Signup page redesign** ← Start here
4. **Profile page improvements**

### Phase 2: User Flow
5. **Onboarding flow implementation**
6. **Tutorial/welcome page**
7. **Username setup for Google OAuth users**

### Phase 3: Polish
8. **Email template branding**
9. **Password reset flow modernization**
10. **Account deletion flow**

---

## Quick Wins (Easy Improvements)

### 1. Add "or" Divider Component

Create `/backend/predictions/templates/allauth/elements/divider.html`:
```html
<div class="flex items-center my-6">
    <div class="flex-grow border-t border-gray-300"></div>
    <span class="px-4 text-sm text-gray-500">{{ text|default:"or" }}</span>
    <div class="flex-grow border-t border-gray-300"></div>
</div>
```

### 2. Improve Google Button Styling

Update `/backend/predictions/templates/allauth/elements/provider.html`:
```html
<a class="w-full flex items-center justify-center gap-3 px-6 py-3
          bg-white border-2 border-gray-300 rounded-lg
          hover:bg-gray-50 hover:border-gray-400
          transition-all duration-200 font-medium text-gray-700 shadow-sm">
    <!-- Google icon SVG -->
    <span>Continue with Google</span>
</a>
```

### 3. Add Social Proof

On login/signup pages, show:
```
"Join 20+ NBA fans making predictions for the 2024-25 season"
```

---

## Technical Implementation Guide

### Step 1: Create Custom Allauth Templates

```bash
mkdir -p backend/predictions/templates/allauth/account
```

Override these templates:
- `login.html` - Full login page
- `signup.html` - Full signup page
- `password_reset.html` - Password reset form
- `email.html` - Email management
- `password_change.html` - Change password form

### Step 2: Update Custom Signup Form

```python
# backend/accounts/custom_forms.py
class CustomSignupForm(forms.Form):
    first_name = forms.CharField(max_length=30, label="First Name")
    last_name = forms.CharField(max_length=30, label="Last Name")
    username = forms.CharField(
        max_length=30,
        label="Username",
        help_text="This will be your display name on leaderboards"
    )

    def signup(self, request, user):
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.username = self.cleaned_data['username']
        user.save()
```

### Step 3: Create Onboarding App

```bash
python manage.py startapp onboarding
```

Add to `INSTALLED_APPS` and create views/templates for the onboarding flow.

---

## Testing Checklist

### Email Verification
- [ ] New signup requires email verification
- [ ] Verification email appears in console (dev mode)
- [ ] Clicking verification link logs user in
- [ ] Google OAuth users bypass email verification

### User Flow
- [ ] Clear path from login to making predictions
- [ ] Google OAuth users can set username
- [ ] Profile page shows all account info
- [ ] Password change works correctly
- [ ] Email change requires verification

### Spam Prevention
- [ ] Cannot login without verifying email
- [ ] Cleanup command works correctly
- [ ] Google OAuth accounts are protected from cleanup

---

## Next Steps

1. **Run the spam cleanup:**
   ```bash
   venv/bin/python backend/manage.py clean_spam_users --delete
   ```

2. **Test email verification:**
   - Create a test account
   - Check console for verification email
   - Click the link and verify it works

3. **Choose your priority:**
   - Want to improve UI first? Start with login/signup templates
   - Want onboarding? Build the UserOnboarding model and views
   - Want both? I can help implement either or both!

Let me know which direction you'd like to go, and I can help implement the specific features you need!

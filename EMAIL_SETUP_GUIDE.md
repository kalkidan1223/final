# Email & Google OAuth Setup Guide

This guide explains how to configure email notifications and Google OAuth ("Continue with Google") for the Children Learning Hub.

## Table of Contents
- [Email Configuration](#email-configuration)
- [Google OAuth Configuration](#google-oauth-configuration)
- [Testing Email Notifications](#testing-email-notifications)
- [Scheduled Tasks](#scheduled-tasks)
- [Troubleshooting](#troubleshooting)

---

## Email Configuration

### 1. Choose an Email Provider

The system uses **nodemailer** which supports various SMTP providers:

#### Option A: Gmail (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app and "Windows Computer" as the device
   - Copy the generated 16-character password

3. **Update `.env` file:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=noreply@learninghub.com
FROM_NAME=Children Learning Hub
APP_NAME=Children Learning Hub
```

#### Option B: Other Providers

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

**Amazon SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the SMTP settings:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your SMTP credentials.

### 3. Run Database Migration

The password reset functionality requires a new database table:

```bash
cd backend
node scripts/run-migration.js 042
```

This creates the `password_reset_tokens` table.

---

## Google OAuth Configuration

### 1. Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing):
   - Click "Select a project" → "New Project"
   - Name: "Children Learning Hub"
   - Click "Create"

3. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Children Learning Hub Web Client"
   
5. **Configure OAuth Consent Screen:**
   - Click "Configure consent screen"
   - User type: "External" (or "Internal" for G Suite)
   - Fill in required fields:
     - App name: "Children Learning Hub"
     - User support email: your-email@domain.com
     - Developer contact: your-email@domain.com
   - Add scopes: `./auth/userinfo.email` and `./auth/userinfo.profile`
   - Save and continue

6. **Set Authorized Redirect URIs:**
   ```
   http://localhost:5000/api/auth/google/callback
   https://your-production-domain.com/api/auth/google/callback
   ```

7. **Copy Credentials:**
   - Copy the **Client ID**
   - Copy the **Client Secret**

### 2. Update Backend Environment Variables

Add to `backend/.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### 3. Update Frontend Environment Variables

Add to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

---

## Testing Email Notifications

### 1. Test Welcome Email

**Register a new parent account:**
```bash
# Frontend should be running on http://localhost:5173
# Navigate to /signup/parent and create an account
# Check the email inbox
```

**Or test with curl:**
```bash
curl -X POST http://localhost:5000/api/auth/register/parent \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test Parent",
    "phone": "123-456-7890"
  }'
```

### 2. Test Password Reset Email

**Request password reset:**
```bash
curl -X POST http://localhost:5000/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

Check the email inbox for the reset link.

### 3. Test Inactivity Reminder

**Run the inactivity check script:**
```bash
cd backend
npm run check:inactive 7
```

This sends reminder emails to users who haven't logged in for 7 days.

---

## Scheduled Tasks

### Setting Up Inactivity Email Reminders

#### On Windows (Task Scheduler)

1. **Open Task Scheduler**
2. **Create Basic Task**
   - Name: "Learning Hub Inactivity Reminder"
   - Trigger: Daily at 9:00 AM
   - Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `src\scripts\check-inactive-users.js 7`
   - Start in: `C:\Users\Administrator\Desktop\final\backend`

#### On Linux (Cron)

Add to crontab:
```bash
crontab -e
```

Add this line (runs daily at 9 AM):
```
0 9 * * * cd /path/to/backend && /usr/bin/node src/scripts/check-inactive-users.js 7 >> /var/log/inactivity-check.log 2>&1
```

---

## Email Templates

The system sends 4 types of emails:

### 1. Welcome Email
- **Trigger:** User registration (parent or student)
- **File:** `backend/src/services/emailService.js`
- **Function:** `sendWelcomeEmail(email, fullName)`

### 2. Password Reset Email
- **Trigger:** User requests password reset
- **File:** `backend/src/services/emailService.js`
- **Function:** `sendPasswordResetEmail(email, fullName, resetToken)`
- **Reset Link:** `CLIENT_ORIGIN/reset-password?token={resetToken}`

### 3. Inactivity Reminder Email
- **Trigger:** Scheduled task (manual or cron)
- **File:** `backend/src/services/emailService.js`
- **Function:** `sendInactivityEmail(email, fullName, daysSinceLogin)`

### 4. Assignment Notification Email (Future Use)
- **Trigger:** Instructor assigns new work
- **File:** `backend/src/services/emailService.js`
- **Function:** `sendAssignmentNotification(email, fullName, assignmentTitle)`

---

## Troubleshooting

### Email Issues

**Problem: Emails not sending**
```bash
# Check SMTP credentials in .env
# Test with a simple script:
cd backend
node -e "require('./src/services/emailService').sendWelcomeEmail('test@example.com', 'Test User').then(() => console.log('Success')).catch(err => console.error(err))"
```

**Problem: Gmail "Less secure app" error**
- Solution: Use App Passwords (2FA required)
- Don't use your regular Gmail password

**Problem: "Connection timeout"**
- Check firewall settings
- Verify SMTP_PORT (587 for TLS, 465 for SSL)
- Try SMTP_SECURE=true with port 465

### Google OAuth Issues

**Problem: "Redirect URI mismatch"**
- Ensure the callback URL in Google Console matches exactly:
  ```
  http://localhost:5000/api/auth/google/callback
  ```
- Check `GOOGLE_CALLBACK_URL` in `.env`

**Problem: "Access blocked: This app's request is invalid"**
- Configure OAuth consent screen in Google Console
- Add test users during development
- Verify scopes: `email` and `profile`

**Problem: User redirected to login with error**
- Check browser console for errors
- Verify `CLIENT_ORIGIN` in backend `.env`
- Ensure frontend has `VITE_API_URL` set correctly

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different SMTP credentials** for development and production
3. **Rotate Google OAuth secrets** periodically
4. **Enable rate limiting** for password reset endpoints
5. **Use HTTPS** in production for OAuth callbacks
6. **Monitor email sending** for abuse (spam prevention)
7. **Set up SPF, DKIM, and DMARC** records for production email domain

---

## Production Deployment Checklist

- [ ] Update `GOOGLE_CALLBACK_URL` to production domain
- [ ] Add production domain to Google Console authorized redirect URIs
- [ ] Use production SMTP credentials (not Gmail)
- [ ] Set `NODE_ENV=production` in backend
- [ ] Enable HTTPS for OAuth callbacks
- [ ] Set up email monitoring/logging
- [ ] Configure cron job for inactivity emails
- [ ] Test all email flows in production
- [ ] Set up email bounce handling
- [ ] Configure email rate limiting

---

## Support

For issues or questions:
1. Check backend logs: `backend/logs/` (if configured)
2. Check browser console for frontend errors
3. Verify database migrations are up to date
4. Review environment variables in `.env`

---

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

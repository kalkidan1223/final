# Quick Reference - New Features

## 🎯 New Features Added

### 1. Google OAuth "Continue with Google"
**User-facing:** Users can now sign in using their Google account
**Location:** Login page → "Continue with Google" button
**Benefits:** 
- Faster registration
- No need to remember another password
- Secure authentication via Google

### 2. Password Reset via Email
**User-facing:** Users can reset forgotten passwords via email
**How to use:**
1. Click "Forgot password?" on login page
2. Enter email address
3. Check email for reset link (valid for 1 hour)
4. Click link and set new password

### 3. Welcome Emails
**Automatic:** Sent when a new user registers
**Contains:**
- Welcome message
- Login link
- Getting started tips

### 4. Inactivity Reminder Emails
**Automatic:** Sent to users who haven't logged in for 7+ days
**Contains:**
- Gentle reminder to continue learning
- Direct login link
- Support contact info

---

## 🔧 For Developers

### Environment Variables Required

```env
# SMTP Email (Required for all email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@learninghub.com
FROM_NAME=Children Learning Hub
APP_NAME=Children Learning Hub

# Google OAuth (Required for "Continue with Google")
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### NPM Scripts

```bash
# Check for inactive users and send reminder emails
npm run check:inactive

# Or specify custom days
npm run check:inactive 14  # Users inactive for 14+ days
```

### API Endpoints

```
POST   /api/password-reset/request          # Request password reset
GET    /api/password-reset/verify/:token    # Verify reset token
POST   /api/password-reset/reset/:token     # Reset password
GET    /api/auth/google                     # Start Google OAuth
GET    /api/auth/google/callback            # Google OAuth callback
```

### Frontend Routes

```
/login                  # Login page (with Google button)
/forgot-password        # Request password reset
/reset-password         # Reset password with token
/auth/callback          # OAuth callback handler
```

---

## 📧 Email Templates

### 1. Welcome Email
**Trigger:** User registration
**Subject:** Welcome to Children Learning Hub!
**Contains:** Welcome message, login link

### 2. Password Reset Email
**Trigger:** User requests password reset
**Subject:** Reset Your Password - Children Learning Hub
**Contains:** Reset link (expires in 1 hour), security notice

### 3. Inactivity Reminder Email
**Trigger:** Scheduled task (7+ days of inactivity)
**Subject:** We Miss You at Children Learning Hub!
**Contains:** Reminder message, login link, support info

### 4. Assignment Notification Email (Future)
**Trigger:** Instructor assigns new work
**Subject:** New Assignment: {title}
**Contains:** Assignment details, due date, access link

---

## 🚀 Quick Start Testing

### Test Email Setup:
```bash
cd backend
node -e "require('./src/services/emailService').sendWelcomeEmail('test@example.com', 'Test User').then(() => console.log('✅ Email sent!')).catch(err => console.error('❌ Error:', err))"
```

### Test Password Reset:
1. Visit: http://localhost:5173/forgot-password
2. Enter: any registered email
3. Check: email inbox for reset link
4. Click: link and set new password

### Test Google OAuth:
1. Visit: http://localhost:5173/login
2. Click: "Continue with Google"
3. Sign in: with Google account
4. Verify: redirected to dashboard

### Test Inactivity Check:
```bash
cd backend
npm run check:inactive 0  # Test with 0 days (sends to all users)
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Contains sensitive credentials
2. **Gmail App Passwords** - Required if using Gmail (2FA must be enabled)
3. **HTTPS in Production** - Use secure connections for OAuth callbacks
4. **Rate Limiting** - Consider adding for password reset endpoints
5. **Token Expiry** - Reset tokens expire after 60 minutes
6. **Single Use** - Reset tokens can only be used once

---

## 🐛 Common Issues & Solutions

### Issue: Emails not sending
**Solutions:**
- Check SMTP credentials in `.env`
- Verify SMTP_PORT (587 for TLS, 465 for SSL)
- For Gmail: Use App Password, not regular password
- Check firewall settings

### Issue: Google OAuth "Redirect URI mismatch"
**Solutions:**
- Verify callback URL in Google Console matches exactly
- Check `GOOGLE_CALLBACK_URL` in `.env`
- Add both dev and prod URLs to Google Console

### Issue: Password reset link expired
**Solutions:**
- Links expire after 60 minutes
- Request a new reset link
- Check system time is correct

### Issue: User gets "Invalid token" error
**Solutions:**
- Token may have been used already (single-use)
- Token may have expired
- Request a new reset link

---

## 📚 Additional Resources

- **Setup Guide:** See `EMAIL_SETUP_GUIDE.md` for detailed instructions
- **Google Console:** https://console.cloud.google.com/
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Nodemailer Docs:** https://nodemailer.com/

---

## 📝 Changelog

**Version 1.0 - Current Release**
- ✅ Google OAuth integration
- ✅ Email notification system
- ✅ Password reset flow
- ✅ Welcome emails
- ✅ Inactivity reminders
- ✅ Scheduled task support

---

## 🎓 User Help

### For Students/Parents:
**Q: How do I reset my password?**
A: Click "Forgot password?" on the login page, enter your email, and check your inbox for a reset link.

**Q: Can I use my Google account to sign in?**
A: Yes! Click "Continue with Google" on the login page.

**Q: I didn't receive the password reset email**
A: Check your spam folder. If still not found, try requesting again or contact support.

### For Instructors:
**Q: Can I send assignment notifications via email?**
A: This feature is ready in the code. Contact your admin to enable it.

**Q: How do I know if a student is inactive?**
A: The system automatically sends reminder emails to inactive students after 7 days.

### For Admins:
**Q: How do I set up email notifications?**
A: See `EMAIL_SETUP_GUIDE.md` for detailed SMTP configuration steps.

**Q: How often do inactivity emails get sent?**
A: Currently manual via `npm run check:inactive`. Set up a scheduled task (cron/Task Scheduler) to automate.

**Q: Can I customize email templates?**
A: Yes! Edit templates in `backend/src/services/emailService.js`.

---

*Last Updated: 2026-10-28*

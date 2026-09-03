# Google OAuth Setup Instructions

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "NEW PROJECT"
4. Enter project name: "Children Learning Hub"
5. Click "CREATE"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "ENABLE"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: Children Learning Hub
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Click "SAVE AND CONTINUE"
   - Add scopes: email, profile
   - Click "SAVE AND CONTINUE"
   - Add test users (your email)
   - Click "SAVE AND CONTINUE"

4. Create OAuth client ID:
   - Application type: Web application
   - Name: Children Learning Hub Web Client
   - Authorized JavaScript origins:
     - http://localhost:5173
     - http://localhost:3001
   - Authorized redirect URIs:
     - http://localhost:3001/api/auth/google/callback
   - Click "CREATE"

5. **Copy your Client ID and Client Secret** - you'll need these!

## Step 4: Configure Backend Environment Variables

Add the following to your `backend/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Frontend URL (for redirects)
CLIENT_ORIGIN=http://localhost:5173
```

Replace `your-google-client-id-here` and `your-google-client-secret-here` with your actual credentials from Step 3.

## Step 5: Run Database Migration

Run the Google OAuth migration to add the google_id column:

```bash
cd backend
psql -U your_username -d your_database -f migrations/008_google_oauth.sql
```

Or if you're using a migration tool, run:
```bash
npm run migrate
```

## Step 6: Restart Backend Server

```bash
cd backend
npm run dev
```

## Step 7: Test Google Sign-In

1. Open http://localhost:5173/login
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected back to the app

## How It Works

1. User clicks "Continue with Google" on login page
2. User is redirected to Google OAuth consent screen
3. After granting permission, Google redirects to: `/api/auth/google/callback`
4. Backend creates/finds user account and generates JWT tokens
5. User is redirected to frontend with tokens
6. Frontend stores tokens and redirects to appropriate dashboard

## Important Notes

### For New Users (First-time Google Sign-In)
- A new parent account is automatically created
- Account status is set to "PENDING" - requires admin approval
- User sees message: "Your account is pending administrator approval"
- Admin must approve the account before user can access the system

### For Existing Users
- If email already exists in database, links Google account to existing user
- User can now sign in with either password or Google

### Security
- JWT tokens are used for authentication
- Google password is never stored
- OAuth 2.0 secure protocol
- HTTPS required in production

## Production Setup

For production, update your environment variables:

```env
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
CLIENT_ORIGIN=https://yourdomain.com
```

And add production URLs to Google Cloud Console:
- Authorized JavaScript origins: https://yourdomain.com
- Authorized redirect URIs: https://yourdomain.com/api/auth/google/callback

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure your callback URL matches exactly in Google Console
- Check for trailing slashes
- Verify http vs https

### Error: "Access blocked: This app's request is invalid"
- Configure OAuth consent screen properly
- Add your email as a test user
- Make sure app is not in production mode during development

### Error: "Authentication failed"
- Check your Client ID and Client Secret
- Verify environment variables are loaded
- Check backend logs for detailed error messages

### User stuck on "pending approval"
- Admin needs to approve the account in Admin Portal
- Go to Admin Dashboard > Approvals
- Find the user and click "Approve"

## Support

For issues, check:
1. Backend console logs
2. Frontend browser console
3. Google Cloud Console error logs
4. Database logs

Need help? Contact support@childrenlearninghub.com

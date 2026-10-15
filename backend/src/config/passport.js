/**
 * passport.js
 * Google OAuth 2.0 configuration using Passport
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');
const bcrypt = require('bcrypt');

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const full_name = profile.displayName;
        const google_id = profile.id;

        // Check if user exists
        const userResult = await query(
          `SELECT u.*, 
            (SELECT id FROM parents WHERE user_id = u.id) as parent_id,
            (SELECT id FROM students WHERE user_id = u.id) as student_id,
            (SELECT id FROM instructors WHERE user_id = u.id) as instructor_id
           FROM users u WHERE email = $1`,
          [email]
        );

        let user;

        if (userResult.rows.length > 0) {
          // User exists - update google_id if not set
          user = userResult.rows[0];
          
          if (!user.google_id) {
            await query(
              `UPDATE users SET google_id = $1, updated_at = now() WHERE id = $2`,
              [google_id, user.id]
            );
            user.google_id = google_id;
          }
        } else {
          // New user - create temporary user with 'pending' role
          // User will choose role (Instructor or Parent) after Google auth
          
          // Generate a random password (user won't need it for Google sign-in)
          const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          // Create user with 'pending' role
          const newUserResult = await query(
            `INSERT INTO users (email, password_hash, full_name, google_id, is_active, role)
             VALUES ($1, $2, $3, $4, FALSE, 'pending')
             RETURNING *`,
            [email, hashedPassword, full_name, google_id]
          );

          user = newUserResult.rows[0];
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query(
      `SELECT u.*,
        (SELECT id FROM parents WHERE user_id = u.id) as parent_id,
        (SELECT id FROM students WHERE user_id = u.id) as student_id,
        (SELECT id FROM instructors WHERE user_id = u.id) as instructor_id
       FROM users u WHERE id = $1`,
      [id]
    );

    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('User not found'), null);
    }
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

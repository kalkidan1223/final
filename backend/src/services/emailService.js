const nodemailer = require('nodemailer');

// Check if email is properly configured
const isEmailConfigured = () => {
  return process.env.SMTP_USER && 
         process.env.SMTP_PASS && 
         process.env.SMTP_USER !== 'your-email@gmail.com' &&
         process.env.SMTP_PASS !== 'your-app-specific-password';
};

// Create reusable transporter (only if configured)
let transporter = null;

function createTransporter() {
  const isGmail = (process.env.SMTP_HOST || '').includes('gmail.com') ||
                  (process.env.SMTP_USER || '').endsWith('@gmail.com');

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  const isSecure = process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || (isSecure ? 465 : 587),
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

if (isEmailConfigured()) {
  transporter = createTransporter();
} else {
  console.warn('⚠️  Email service not configured. Emails will not be sent.');
  console.warn('   Set SMTP_USER and SMTP_PASS in .env to enable emails.');
}

/**
 * Send an email
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️  Email not sent (SMTP not configured):', subject, 'to:', to);
      return { success: false, error: 'SMTP not configured' };
    }

    if (!transporter) {
      transporter = createTransporter();
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Children Learning Hub'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    let info;
    try {
      info = await transporter.sendMail(mailOptions);
    } catch (primaryErr) {
      console.warn('⚠️ Primary SMTP attempt failed:', primaryErr.message, '— Attempting fallback...');
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false }
      });
      info = await fallbackTransporter.sendMail(mailOptions);
      transporter = fallbackTransporter;
    }

    console.log('✅ Email sent:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Welcome email after registration
 */
async function sendWelcomeEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Children Learning Hub!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.full_name || 'Friend'}! 👋</h2>
          <p>Thank you for joining Children Learning Hub! We're excited to have you on board.</p>
          
          <p><strong>Your account has been created successfully!</strong></p>
          
          <p>You can now log in and start your learning journey:</p>
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login" class="button">
              Start Learning Now →
            </a>
          </p>
          
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Explore interactive courses and activities</li>
            <li>Track your progress and achievements</li>
            <li>Learn at your own pace</li>
            <li>Get instant feedback from teachers</li>
          </ul>
          
          <p>If you have any questions, feel free to reach out to us!</p>
          
          <p>Happy Learning! 📚✨</p>
          <p><strong>The Children Learning Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Children Learning Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Children Learning Hub!

Hello ${user.full_name || 'Friend'}!

Thank you for joining Children Learning Hub! Your account has been created successfully.

You can now log in and start your learning journey at: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login

Happy Learning!
The Children Learning Hub Team
  `;

  return sendEmail({
    to: user.email,
    subject: '🎉 Welcome to Children Learning Hub!',
    html,
    text,
  });
}

/**
 * Password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.full_name || 'Friend'}!</h2>
          <p>We received a request to reset your password for your Children Learning Hub account.</p>
          
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">
              Reset Password →
            </a>
          </p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in <strong>1 hour</strong></li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password won't change until you create a new one</li>
            </ul>
          </div>
          
          <p>For security, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px; font-size: 12px;">
            ${resetUrl}
          </p>
          
          <p>If you need help, please contact our support team.</p>
          
          <p>Best regards,<br><strong>The Children Learning Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Children Learning Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request

Hello ${user.full_name || 'Friend'}!

We received a request to reset your password. Click this link to reset it:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
The Children Learning Hub Team
  `;

  return sendEmail({
    to: user.email,
    subject: '🔐 Reset Your Password - Children Learning Hub',
    html,
    text,
  });
}

/**
 * Inactivity reminder email
 */
async function sendInactivityEmail(user, daysSinceLogin) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #4facfe; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .highlight { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👋 We Miss You!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.full_name || 'Friend'}! 🌟</h2>
          <p>We noticed it's been <strong>${daysSinceLogin} days</strong> since you last visited Children Learning Hub.</p>
          
          <div class="highlight">
            <p><strong>📚 Your learning journey is waiting!</strong></p>
            <p>Don't let your progress slip away. Even a few minutes of learning can make a big difference!</p>
          </div>
          
          <p><strong>What's new since you were last here:</strong></p>
          <ul>
            <li>✨ New interactive activities and games</li>
            <li>📖 Fresh learning materials from your teachers</li>
            <li>🎯 Track your progress and achievements</li>
            <li>🏆 Earn badges and rewards</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login" class="button">
              Continue Learning →
            </a>
          </p>
          
          <p>Remember: <em>Learning every day keeps your brain growing! 🧠💪</em></p>
          
          <p>See you soon!<br><strong>The Children Learning Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Children Learning Hub. All rights reserved.</p>
          <p style="font-size: 10px; color: #999;">Don't want these emails? <a href="#">Manage preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
We Miss You!

Hello ${user.full_name || 'Friend'}!

It's been ${daysSinceLogin} days since you last visited Children Learning Hub.

Your learning journey is waiting! Come back and continue where you left off.

Log in now: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login

See you soon!
The Children Learning Hub Team
  `;

  return sendEmail({
    to: user.email,
    subject: `👋 We miss you! It's been ${daysSinceLogin} days`,
    html,
    text,
  });
}

/**
 * Assignment notification email
 */
async function sendAssignmentNotification(user, assignment) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #1f2937; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .card { background: white; border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 New Assignment!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.full_name || 'Student'}! 🎓</h2>
          <p>You have a new assignment from your teacher!</p>
          
          <div class="card">
            <h3 style="margin-top: 0; color: #4f46e5;">${assignment.title}</h3>
            <p><strong>Course:</strong> ${assignment.course || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${assignment.dueDate || 'No deadline'}</p>
            ${assignment.description ? `<p>${assignment.description}</p>` : ''}
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/child/activities" class="button">
              View Assignment →
            </a>
          </p>
          
          <p>Good luck with your work! 💪✨</p>
          <p><strong>The Children Learning Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Children Learning Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Assignment!

Hello ${user.full_name || 'Student'}!

You have a new assignment: ${assignment.title}
Course: ${assignment.course || 'N/A'}
Due Date: ${assignment.dueDate || 'No deadline'}

View it now: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/child/activities

Good luck!
The Children Learning Hub Team
  `;

  return sendEmail({
    to: user.email,
    subject: '📚 New Assignment - ' + assignment.title,
    html,
    text,
  });
}


/**
 * 1. Verification code / link email sent upon registration
 */
async function sendVerificationEmail({ email, full_name, token, code: verifyCode }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 32px 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .code-text { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace; }
        .button { display: inline-block; padding: 14px 32px; background: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">✉️ Verify Your Email Address</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Brana Kids Hub</p>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Hello ${full_name || 'Friend'}! 👋</h2>
          <p>Thank you for signing up for <strong>Brana Kids Hub</strong>. Please confirm your email address to complete your registration request.</p>
          
          <div class="code-box">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">Your 6-Digit Verification Code</p>
            <div class="code-text">${verifyCode || token.substring(0, 6).toUpperCase()}</div>
          </div>

          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Click Here to Verify Email →</a>
          </p>

          <p style="font-size: 13px; color: #64748b; text-align: center;">Or copy and paste this verification URL into your browser:</p>
          <p style="word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 12px; color: #475569;">${verifyUrl}</p>

          <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">This code will expire in 24 hours. If you did not register for this account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `✉️ Verify Your Email - Brana Kids Hub (Code: ${verifyCode || token.substring(0, 6).toUpperCase()})`,
    html,
    text: `Hello ${full_name || 'Friend'}! Your email verification code is: ${verifyCode || token.substring(0, 6).toUpperCase()}. Or visit: ${verifyUrl}`,
  });
}

/**
 * 2. Sent when email is verified: Confirms successful registration & pending admin review
 */
async function sendRegistrationPendingEmail({ email, full_name, role = 'parent' }) {
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 32px 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .info-card { background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">📋 Registration Submitted Successfully!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Pending Administrator Review</p>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Hello ${full_name || 'Friend'}! 👋</h2>
          <p>Your email address (<strong>${email}</strong>) has been <strong>verified successfully</strong>.</p>
          
          <div class="info-card">
            <h3 style="margin-top: 0; color: #1d4ed8; font-size: 16px;">⏳ What Happens Next?</h3>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              Your <strong>${roleName} registration request</strong> is now submitted and waiting for administrator review. 
              Our school administrator reviews and approves accounts to ensure a safe learning environment.
            </p>
          </div>

          <p><strong>What should you do?</strong></p>
          <ul style="color: #475569; font-size: 14px;">
            <li>You do not need to take any action right now.</li>
            <li>As soon as the administrator reviews and approves your account, you will receive an approval email notification.</li>
            <li>Once approved, you will be able to log in immediately and access all curriculum features.</li>
          </ul>

          <p style="margin-top: 24px;">Thank you for your patience and for choosing Brana Kids Hub!</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">The Brana Kids Hub Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '📋 Registration Received — Awaiting Administrator Approval (Brana Kids Hub)',
    html,
    text: `Hello ${full_name}! Your email has been verified and your ${roleName} registration was submitted successfully. Your account is currently pending administrator approval. You will receive an email as soon as an administrator approves your account.`,
  });
}

/**
 * 3. Sent when Admin approves the user account
 */
async function sendAccountApprovedEmail({ email, full_name, role = 'parent' }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const loginUrl = `${origin}/login`;
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 36px 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .success-badge { display: inline-block; background: #d1fae5; color: #065f46; font-weight: 800; font-size: 13px; text-transform: uppercase; padding: 6px 16px; rounded: 9999px; margin-bottom: 12px; }
        .button { display: inline-block; padding: 14px 36px; background: #10b981; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; margin: 24px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
          <h1 style="margin: 0; font-size: 26px;">Your Account Has Been Approved!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95;">Welcome to Brana Kids Hub</p>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Congratulations ${full_name || 'Friend'}! 🌟</h2>
          <p>We are delighted to inform you that your <strong>${roleName} account</strong> has been <strong>reviewed and approved by the school administrator</strong>.</p>
          
          <p>Your portal is now fully active. You can log in immediately to start exploring:</p>
          
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Log In to Your Account Now →</a>
          </p>

          <p><strong>What you can do now:</strong></p>
          <ul style="color: #475569; font-size: 14px;">
            ${role === 'parent' ? `
              <li>Add and manage your children's profiles</li>
              <li>Explore age-appropriate learning courses and Fidel lessons</li>
              <li>Track your children's daily learning progress, stars, and activities</li>
              <li>Communicate directly with instructors</li>
            ` : `
              <li>Access your assigned teaching courses and curriculum levels</li>
              <li>Create interactive lessons, learning cards, and practice exercises</li>
              <li>Review and grade student submissions</li>
              <li>Monitor class progress and student engagement</li>
            `}
          </ul>

          <p style="margin-top: 24px;">If you ever have questions or need assistance, our support team is always here to help.</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">Welcome to the Brana family! 🎓✨</p>
          <p style="margin: 4px 0 0 0; color: #64748b;">The Brana Kids Hub Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎉 Your Account Has Been Approved! Welcome to Brana Kids Hub',
    html,
    text: `Congratulations ${full_name}! Your ${roleName} account has been approved by the administrator. You can now log in at: ${loginUrl}`,
  });
}

/**
 * 4. Sent if Admin rejects registration request
 */
async function sendAccountRejectedEmail({ email, full_name, role = 'user', reason }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 28px 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0; color: #991b1b; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 22px;">Update Regarding Your Registration Request</h1>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Hello ${full_name || 'Friend'},</h2>
          <p>Thank you for your interest in joining <strong>Brana Kids Hub</strong>.</p>
          <p>After reviewing your registration application, the administrator was unable to approve it at this time.</p>
          
          <div class="reason-box">
            <strong>Reason provided:</strong>
            <p style="margin: 8px 0 0 0;">${reason || 'Application requirements could not be verified.'}</p>
          </div>

          <p>If you believe this was an error or would like to submit additional information, please contact our administrative support office.</p>
          <p>Best regards,<br><strong>Brana Kids Hub Administration</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Update Regarding Your Brana Kids Hub Registration Request',
    html,
    text: `Hello ${full_name}. Your registration request could not be approved at this time. Reason: ${reason}`,
  });
}

/**
 * 5. Sent to parent when their child's registration is approved by the admin
 */
async function sendStudentAccountApprovedEmail({ parentEmail, parentName, studentName, gradeName }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const portalUrl = `${origin}/parent/children`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px 24px; text-align: center; }
        .content { padding: 32px 24px; }
        .button { display: inline-block; padding: 14px 32px; background: #10b981; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🎉 Child Registration Approved!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Brana Kids Hub</p>
        </div>
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0;">Hello ${parentName || 'Parent'}! 🌟</h2>
          <p>Great news! Your child <strong>${studentName}</strong> (${gradeName || 'Primary Level'}) has been reviewed and approved by the administrator.</p>
          <p>They can now start learning right away with lessons, audio cards, and interactive exercises!</p>

          <p style="text-align: center;">
            <a href="${portalUrl}" class="button">Launch Child Learning Portal →</a>
          </p>

          <p>Happy Learning!<br><strong>The Brana Kids Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: parentEmail,
    subject: `🎉 Child Registration Approved for ${studentName}! - Brana Kids Hub`,
    html,
    text: `Great news ${parentName}! Your child ${studentName} has been approved by the administrator. Access their learning portal at: ${portalUrl}`,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInactivityEmail,
  sendAssignmentNotification,
  sendVerificationEmail,
  sendRegistrationPendingEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendStudentAccountApprovedEmail,
};

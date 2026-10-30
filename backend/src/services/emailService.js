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

if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('✅ Email service configured successfully');
} else {
  console.warn('⚠️  Email service not configured. Emails will not be sent.');
  console.warn('   Set SMTP_USER and SMTP_PASS in .env to enable emails.');
}

// Verify connection configuration (only if configured)
if (isEmailConfigured() && transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service configuration error:', error.message);
    } else {
      console.log('✅ Email service is ready to send messages');
    }
  });
}

/**
 * Send an email
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!isEmailConfigured() || !transporter) {
      console.warn('⚠️  Email not sent (SMTP not configured):', subject, 'to:', to);
      return { success: false, error: 'SMTP not configured' };
    }

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Children Learning Hub'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
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

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInactivityEmail,
  sendAssignmentNotification,
};

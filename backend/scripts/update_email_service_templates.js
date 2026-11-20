const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');
let code = fs.readFileSync(filePath, 'utf8');

const newFunctions = `
/**
 * 1. Verification code / link email sent upon registration
 */
async function sendVerificationEmail({ email, full_name, token, code: verifyCode }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const verifyUrl = \`\${origin}/verify-email?token=\${encodeURIComponent(token)}&email=\${encodeURIComponent(email)}\`;

  const html = \`
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
          <h2 style="color: #0f172a; margin-top: 0;">Hello \${full_name || 'Friend'}! 👋</h2>
          <p>Thank you for signing up for <strong>Brana Kids Hub</strong>. Please confirm your email address to complete your registration request.</p>
          
          <div class="code-box">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">Your 6-Digit Verification Code</p>
            <div class="code-text">\${verifyCode || token.substring(0, 6).toUpperCase()}</div>
          </div>

          <p style="text-align: center;">
            <a href="\${verifyUrl}" class="button">Click Here to Verify Email →</a>
          </p>

          <p style="font-size: 13px; color: #64748b; text-align: center;">Or copy and paste this verification URL into your browser:</p>
          <p style="word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 12px; color: #475569;">\${verifyUrl}</p>

          <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">This code will expire in 24 hours. If you did not register for this account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© \${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  \`;

  return sendEmail({
    to: email,
    subject: \`✉️ Verify Your Email - Brana Kids Hub (Code: \${verifyCode || token.substring(0, 6).toUpperCase()})\`,
    html,
    text: \`Hello \${full_name || 'Friend'}! Your email verification code is: \${verifyCode || token.substring(0, 6).toUpperCase()}. Or visit: \${verifyUrl}\`,
  });
}

/**
 * 2. Sent when email is verified: Confirms successful registration & pending admin review
 */
async function sendRegistrationPendingEmail({ email, full_name, role = 'parent' }) {
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const html = \`
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
          <h2 style="color: #0f172a; margin-top: 0;">Hello \${full_name || 'Friend'}! 👋</h2>
          <p>Your email address (<strong>\${email}</strong>) has been <strong>verified successfully</strong>.</p>
          
          <div class="info-card">
            <h3 style="margin-top: 0; color: #1d4ed8; font-size: 16px;">⏳ What Happens Next?</h3>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              Your <strong>\${roleName} registration request</strong> is now submitted and waiting for administrator review. 
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
          <p>© \${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  \`;

  return sendEmail({
    to: email,
    subject: '📋 Registration Received — Awaiting Administrator Approval (Brana Kids Hub)',
    html,
    text: \`Hello \${full_name}! Your email has been verified and your \${roleName} registration was submitted successfully. Your account is currently pending administrator approval. You will receive an email as soon as an administrator approves your account.\`,
  });
}

/**
 * 3. Sent when Admin approves the user account
 */
async function sendAccountApprovedEmail({ email, full_name, role = 'parent' }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const loginUrl = \`\${origin}/login\`;
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  const html = \`
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
          <h2 style="color: #0f172a; margin-top: 0;">Congratulations \${full_name || 'Friend'}! 🌟</h2>
          <p>We are delighted to inform you that your <strong>\${roleName} account</strong> has been <strong>reviewed and approved by the school administrator</strong>.</p>
          
          <p>Your portal is now fully active. You can log in immediately to start exploring:</p>
          
          <p style="text-align: center;">
            <a href="\${loginUrl}" class="button">Log In to Your Account Now →</a>
          </p>

          <p><strong>What you can do now:</strong></p>
          <ul style="color: #475569; font-size: 14px;">
            \${role === 'parent' ? \`
              <li>Add and manage your children's profiles</li>
              <li>Explore age-appropriate learning courses and Fidel lessons</li>
              <li>Track your children's daily learning progress, stars, and activities</li>
              <li>Communicate directly with instructors</li>
            \` : \`
              <li>Access your assigned teaching courses and curriculum levels</li>
              <li>Create interactive lessons, learning cards, and practice exercises</li>
              <li>Review and grade student submissions</li>
              <li>Monitor class progress and student engagement</li>
            \`}
          </ul>

          <p style="margin-top: 24px;">If you ever have questions or need assistance, our support team is always here to help.</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">Welcome to the Brana family! 🎓✨</p>
          <p style="margin: 4px 0 0 0; color: #64748b;">The Brana Kids Hub Team</p>
        </div>
        <div class="footer">
          <p>© \${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  \`;

  return sendEmail({
    to: email,
    subject: '🎉 Your Account Has Been Approved! Welcome to Brana Kids Hub',
    html,
    text: \`Congratulations \${full_name}! Your \${roleName} account has been approved by the administrator. You can now log in at: \${loginUrl}\`,
  });
}

/**
 * 4. Sent if Admin rejects registration request
 */
async function sendAccountRejectedEmail({ email, full_name, role = 'user', reason }) {
  const html = \`
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
          <h2 style="color: #0f172a; margin-top: 0;">Hello \${full_name || 'Friend'},</h2>
          <p>Thank you for your interest in joining <strong>Brana Kids Hub</strong>.</p>
          <p>After reviewing your registration application, the administrator was unable to approve it at this time.</p>
          
          <div class="reason-box">
            <strong>Reason provided:</strong>
            <p style="margin: 8px 0 0 0;">\${reason || 'Application requirements could not be verified.'}</p>
          </div>

          <p>If you believe this was an error or would like to submit additional information, please contact our administrative support office.</p>
          <p>Best regards,<br><strong>Brana Kids Hub Administration</strong></p>
        </div>
        <div class="footer">
          <p>© \${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  \`;

  return sendEmail({
    to: email,
    subject: 'Update Regarding Your Brana Kids Hub Registration Request',
    html,
    text: \`Hello \${full_name}. Your registration request could not be approved at this time. Reason: \${reason}\`,
  });
}

/**
 * 5. Sent to parent when their child's registration is approved by the admin
 */
async function sendStudentAccountApprovedEmail({ parentEmail, parentName, studentName, gradeName }) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const portalUrl = \`\${origin}/parent/children\`;

  const html = \`
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
          <h2 style="color: #0f172a; margin-top: 0;">Hello \${parentName || 'Parent'}! 🌟</h2>
          <p>Great news! Your child <strong>\${studentName}</strong> (\${gradeName || 'Primary Level'}) has been reviewed and approved by the administrator.</p>
          <p>They can now start learning right away with lessons, audio cards, and interactive exercises!</p>

          <p style="text-align: center;">
            <a href="\${portalUrl}" class="button">Launch Child Learning Portal →</a>
          </p>

          <p>Happy Learning!<br><strong>The Brana Kids Hub Team</strong></p>
        </div>
        <div class="footer">
          <p>© \${new Date().getFullYear()} Brana Kids Hub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  \`;

  return sendEmail({
    to: parentEmail,
    subject: \`🎉 Child Registration Approved for \${studentName}! - Brana Kids Hub\`,
    html,
    text: \`Great news \${parentName}! Your child \${studentName} has been approved by the administrator. Access their learning portal at: \${portalUrl}\`,
  });
}
`;

// Insert the new functions before module.exports
const exportTarget = `module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInactivityEmail,
  sendAssignmentNotification,
};`;

const newExports = `module.exports = {
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
};`;

code = code.replace(exportTarget, newFunctions + '\n' + newExports);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated emailService.js with approval and verification notification templates');

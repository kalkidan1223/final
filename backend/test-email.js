/**
 * Test Email Configuration
 * Run this to verify SMTP settings work
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing Email Configuration...\n');

console.log('SMTP Configuration:');
console.log('  Host:', process.env.SMTP_HOST || 'NOT SET');
console.log('  Port:', process.env.SMTP_PORT || 'NOT SET');
console.log('  Secure:', process.env.SMTP_SECURE || 'NOT SET');
console.log('  User:', process.env.SMTP_USER || 'NOT SET');
console.log('  Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
console.log('');

async function testEmail() {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('Step 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    console.log('Step 2: Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Test'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'Test Email - Children Learning Hub',
      text: 'This is a test email from the Children Learning Hub. If you receive this, your email configuration is working!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4a5568;">✅ Email Configuration Test</h2>
          <p>This is a test email from the <strong>Children Learning Hub</strong>.</p>
          <p>If you receive this, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}<br>
            SMTP Host: ${process.env.SMTP_HOST}<br>
            SMTP Port: ${process.env.SMTP_PORT}
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('\n🎉 Email configuration is working correctly!');
    console.log('   Check your inbox at:', process.env.SMTP_USER);
    
  } catch (error) {
    console.error('❌ Email configuration error:\n');
    console.error('Error:', error.message);
    console.error('\n📋 Troubleshooting Steps:');
    
    if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
      console.error('\n1. ❌ Gmail Authentication Failed');
      console.error('   - You MUST use an App Password, not your regular Gmail password');
      console.error('   - Generate App Password at: https://myaccount.google.com/apppasswords');
      console.error('   - Make sure 2-Factor Authentication is enabled on your Google account');
      console.error('   - Copy the 16-character App Password (without spaces) to SMTP_PASS in .env');
      console.error('\n2. Check your .env file:');
      console.error('   SMTP_HOST=smtp.gmail.com');
      console.error('   SMTP_PORT=587');
      console.error('   SMTP_SECURE=false');
      console.error('   SMTP_USER=your-email@gmail.com');
      console.error('   SMTP_PASS=your-16-char-app-password');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n❌ Connection Refused');
      console.error('   - Check if SMTP_HOST and SMTP_PORT are correct');
      console.error('   - Check firewall settings');
    } else {
      console.error('\n❌ Unknown error');
      console.error('   Full error:', error);
    }
  }
}

testEmail();

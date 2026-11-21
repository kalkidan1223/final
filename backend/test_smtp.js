const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmail() {
  const configs = [
    {
      name: 'Port 465 with TLSv1.2',
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
      }
    },
    {
      name: 'Service gmail with pool',
      transport: {
        service: 'gmail',
        pool: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 587 with STARTTLS',
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
      }
    }
  ];

  for (const cfg of configs) {
    console.log(`\n--- Testing ${cfg.name} ---`);
    try {
      const transporter = nodemailer.createTransport(cfg.transport);
      const info = await transporter.sendMail({
        from: `"Children Learning Hub" <${process.env.SMTP_USER}>`,
        to: 'onelx758@gmail.com',
        subject: '🎉 Your Instructor Account Has Been Approved! - Children Learning Hub',
        html: `
          <h2>Congratulations Lx One! 🎉</h2>
          <p>Your Instructor Account has been reviewed and approved by the school administrator.</p>
          <p>You can now log in at <a href="http://localhost:5173/login">http://localhost:5173/login</a>.</p>
        `
      });
      console.log(`SUCCESS with ${cfg.name}! MessageId: ${info.messageId}`);
      return;
    } catch (err) {
      console.error(`FAILED with ${cfg.name}: ${err.message}`);
    }
  }
}

testGmail().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

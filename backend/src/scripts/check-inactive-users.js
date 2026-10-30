/**
 * Check for inactive users and send reminder emails
 * This script should be run as a cron job (e.g., daily)
 * 
 * Usage: node src/scripts/check-inactive-users.js [days]
 * Example: node src/scripts/check-inactive-users.js 7
 */

require('dotenv').config();
const { pool } = require('../config/db');
const { sendInactivityEmail } = require('../services/emailService');

const DEFAULT_INACTIVE_DAYS = 7; // Days of inactivity before sending reminder

async function checkInactiveUsers(inactiveDays = DEFAULT_INACTIVE_DAYS) {
  try {
    console.log(`Checking for users inactive for ${inactiveDays} days or more...`);

    // Find users who haven't logged in for the specified days
    // Exclude admin users from reminders
    const result = await pool.query(
      `SELECT id, email, full_name, role, last_login_at
       FROM users
       WHERE is_active = TRUE
         AND role != 'admin'
         AND (
           last_login_at IS NULL 
           OR last_login_at < NOW() - INTERVAL '${inactiveDays} days'
         )
         AND created_at < NOW() - INTERVAL '${inactiveDays} days'`,
      []
    );

    const inactiveUsers = result.rows;

    if (inactiveUsers.length === 0) {
      console.log('No inactive users found.');
      return;
    }

    console.log(`Found ${inactiveUsers.length} inactive user(s).`);

    let successCount = 0;
    let failCount = 0;

    for (const user of inactiveUsers) {
      try {
        const lastLoginDate = user.last_login_at 
          ? new Date(user.last_login_at).toLocaleDateString()
          : 'Never';
        
        console.log(`Sending reminder to ${user.email} (${user.role}) - Last login: ${lastLoginDate}`);
        
        await sendInactivityEmail(user.email, user.full_name, inactiveDays);
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error.message);
        failCount++;
      }
    }

    console.log(`\nEmail sending complete:`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
  } catch (error) {
    console.error('Error checking inactive users:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get days from command line argument or use default
const inactiveDays = parseInt(process.argv[2]) || DEFAULT_INACTIVE_DAYS;

if (isNaN(inactiveDays) || inactiveDays < 1) {
  console.error('Invalid number of days. Please provide a positive integer.');
  process.exit(1);
}

checkInactiveUsers(inactiveDays);

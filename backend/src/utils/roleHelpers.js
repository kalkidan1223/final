const { query } = require('../config/db');

async function getInstructorIdForUser(userId) {
  const result = await query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
}

async function getParentIdForUser(userId) {
  const result = await query('SELECT id FROM parents WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
}

async function getStudentIdForUser(userId) {
  const result = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
}

module.exports = { getInstructorIdForUser, getParentIdForUser, getStudentIdForUser };

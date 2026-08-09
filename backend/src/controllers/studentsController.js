const { query } = require('../config/db');
const bcrypt = require('bcrypt');
const { isValidEmail, isValidPassword, validateChildRegistration } = require('../utils/validators');

const SALT_ROUNDS = 12;

function calculateAge(dateOfBirth) {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const birthdayHasPassed =
    today.getUTCMonth() > dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() >= dob.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

// ----------------------------------------------------------------------------
// POST /api/students/children  (parent only)
// Adds a Category 1 child (age 5-10) — no login account, parent-managed only.
// ----------------------------------------------------------------------------
async function addChild(req, res, next) {
  try {
    const { full_name, date_of_birth, age_group_id, gender } = req.body;

    if (!full_name || !date_of_birth || !age_group_id) {
      return res.status(400).json({ error: 'full_name, date_of_birth and age_group_id are required' });
    }

    const ageGroupResult = await query(
      'SELECT requires_account FROM age_groups WHERE id = $1',
      [age_group_id]
    );
    if (ageGroupResult.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown age_group_id' });
    }
    if (ageGroupResult.rows[0].requires_account) {
      return res.status(400).json({
        error: 'This age group requires an account — use POST /api/auth/students/invite instead',
      });
    }

    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only parents can add a child' });
    }

    const result = await query(
      `INSERT INTO students (parent_id, age_group_id, full_name, date_of_birth, gender)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, date_of_birth, age_group_id`,
      [parentResult.rows[0].id, age_group_id, full_name, date_of_birth, gender || null]
    );

    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/students/registration-requests (parent only)
// Every child is reviewed by an administrator before any learning access exists.
// Ages 5-9 become parent-managed after approval; ages 10-12 receive an account.
// ----------------------------------------------------------------------------
async function createChildRegistrationRequest(req, res, next) {
  try {
    const errors = validateChildRegistration(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { full_name, date_of_birth, gender, grade, section, preferred_language,
      student_email, password } = req.body;
    const age = calculateAge(date_of_birth);
    if (age < 5 || age > 12) {
      return res.status(400).json({ error: 'A child must be between 5 and 12 years old' });
    }

    const needsAccount = age >= 10;
    if (needsAccount && !isValidEmail(student_email)) {
      return res.status(400).json({ error: 'A valid student email is required for ages 10 to 12' });
    }
    if (needsAccount && !isValidPassword(password)) {
      return res.status(400).json({ error: 'Student password must be at least 8 characters and include a letter and a number' });
    }

    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (!parentResult.rows[0]) return res.status(403).json({ error: 'Only approved parents can register a child' });
    const parentId = parentResult.rows[0].id;

    const existing = await query(
      `SELECT id FROM student_registration_requests
       WHERE parent_id = $1 AND LOWER(student_full_name) = LOWER($2) AND date_of_birth = $3
         AND status IN ('pending', 'approved')`,
      [parentId, full_name.trim(), date_of_birth]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'This child already has a pending or approved registration' });
    }

    const passwordHash = needsAccount ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const result = await query(
      `INSERT INTO student_registration_requests
       (parent_id, student_full_name, date_of_birth, gender, grade, section, preferred_language,
        student_email, password_hash, age, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
       RETURNING id, student_full_name, date_of_birth, age, status, submitted_at`,
      [parentId, full_name.trim(), date_of_birth, gender, grade || null, section || null,
        preferred_language || null, needsAccount ? student_email.toLowerCase() : null, passwordHash, age]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'SUBMIT_CHILD_REGISTRATION', 'student_registration_request', $2, $3)`,
      [req.user.id, result.rows[0].id, { full_name: full_name.trim(), age }]
    );
    res.status(201).json({
      message: 'Child registration submitted for administrator approval. Learning access will be enabled after approval.',
      registration_request: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This email or child registration already exists' });
    next(err);
  }
}

async function listMyChildRegistrationRequests(req, res, next) {
  try {
    const result = await query(
      `SELECT sr.id, sr.student_full_name, sr.date_of_birth, sr.age, sr.grade, sr.status,
              sr.rejection_reason, sr.reviewed_at, sr.submitted_at, sr.student_email IS NOT NULL AS has_own_account
       FROM student_registration_requests sr
       JOIN parents p ON p.id = sr.parent_id
       WHERE p.user_id = $1
       ORDER BY sr.submitted_at DESC`,
      [req.user.id]
    );
    res.json({ registration_requests: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/students/children  (parent only) — list this parent's linked children
// ----------------------------------------------------------------------------
async function listMyChildren(req, res, next) {
  try {
    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only parents can view linked children' });
    }

    const result = await query(
      `SELECT s.id, s.full_name, s.date_of_birth, s.age_group_id, s.user_id IS NOT NULL AS has_own_account,
              ag.name AS age_group, u.email AS user_email, u.last_login_at,
              COALESCE(ROUND(AVG(pr.completion_percentage)), 0) AS progress_percentage,
              COUNT(DISTINCT pr.lesson_id) FILTER (WHERE pr.status = 'completed') AS completed_lessons
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN progress pr ON pr.student_id = s.id
       WHERE s.parent_id = $1
       GROUP BY s.id, ag.name, u.email, u.last_login_at
       ORDER BY s.date_of_birth`,
      [parentResult.rows[0].id]
    );

    res.json({ children: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { addChild, listMyChildren, createChildRegistrationRequest, listMyChildRegistrationRequests };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

// Minimum 8 chars, at least one letter and one number — deliberately not
// stricter than that; this is a platform used by parents, not engineers.
function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function validateRegisterParent(body) {
  const errors = [];
  if (!body.full_name || body.full_name.trim().length < 2) {
    errors.push('full_name is required');
  }
  if (!isValidEmail(body.email)) {
    errors.push('a valid email is required');
  }
  if (!isValidPassword(body.password)) {
    errors.push('password must be at least 8 characters and include a letter and a number');
  }
  if (!body.date_of_birth || Number.isNaN(Date.parse(body.date_of_birth))) {
    errors.push('a valid date_of_birth is required');
  } else {
    const birth = new Date(`${body.date_of_birth}T00:00:00Z`);
    const today = new Date();
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    if (today.getUTCMonth() < birth.getUTCMonth() ||
      (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
    if (age < 18) errors.push('a parent must be at least 18 years old');
  }
  const relationship = String(body.relationship_to_child || '').toLowerCase();
  if (['sibling', 'brother', 'sister', 'relative', 'other'].includes(relationship)) {
    errors.push('Sibling and guardian accounts must be created in person by an administrator');
  }
  return errors;
}

function validateLogin(body) {
  const errors = [];
  if (!isValidEmail(body.email)) errors.push('a valid email is required');
  if (!body.password) errors.push('password is required');
  return errors;
}

function validateStudentInvite(body) {
  const errors = [];
  if (!body.full_name || body.full_name.trim().length < 2) {
    errors.push('full_name is required');
  }
  if (!body.date_of_birth) errors.push('date_of_birth is required');
  if (!body.age_group_id) errors.push('age_group_id is required');
  return errors;
}

function validateStudentRegister(body) {
  const errors = [];
  if (!body.invite_code) errors.push('invite_code is required');
  if (!isValidEmail(body.email)) errors.push('a valid email is required');
  if (!isValidPassword(body.password)) {
    errors.push('password must be at least 8 characters and include a letter and a number');
  }
  return errors;
}

function validateChildRegistration(body) {
  const errors = [];
  if (!body.full_name || body.full_name.trim().length < 2) {
    errors.push('full_name is required');
  }
  if (!body.date_of_birth || Number.isNaN(Date.parse(body.date_of_birth))) {
    errors.push('a valid date_of_birth is required');
  }
  if (!body.gender) errors.push('gender is required');
  return errors;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  validateRegisterParent,
  validateLogin,
  validateStudentInvite,
  validateStudentRegister,
  validateChildRegistration,
};

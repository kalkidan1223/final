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

module.exports = {
  isValidEmail,
  isValidPassword,
  validateRegisterParent,
  validateLogin,
  validateStudentInvite,
  validateStudentRegister,
};

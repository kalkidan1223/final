/**
 * parentController.js
 * Complete Parent Portal API endpoints
 */

const { query } = require('../config/db');
const bcrypt = require('bcrypt');

// ============================================================================
// PARENT PROFILE
// ============================================================================

/**
 * GET /api/parent/profile
 * Get logged-in parent profile
 */
async function getProfile(req, res, next) {
  try {
    const result = await query(
      `SELECT 
        p.*,
        u.email, u.full_name, u.is_active, u.created_at as user_created_at,
        rr.status as registration_status,
        rr.rejection_reason,
        rr.reviewed_by,
        rr.reviewed_at
       FROM parents p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN registration_requests rr ON rr.user_id = u.id
       WHERE p.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }

    const parent = result.rows[0];

    // Get children count
    const childrenResult = await query(
      `SELECT COUNT(*)::int as children_count FROM students WHERE parent_id = $1`,
      [parent.id]
    );

    res.json({
      profile: {
        ...parent,
        children_count: childrenResult.rows[0].children_count,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/parent/profile
 * Update parent profile
 */
async function updateProfile(req, res, next) {
  try {
    const {
      phone, alt_phone, occupation, country, region, city,
      sub_city, woreda, house_number, postal_code,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
    } = req.body;

    // Get parent_id
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Update parent record
    const result = await query(
      `UPDATE parents SET
        phone = COALESCE($1, phone),
        alt_phone = $2,
        occupation = COALESCE($3, occupation),
        country = COALESCE($4, country),
        region = COALESCE($5, region),
        city = COALESCE($6, city),
        sub_city = $7,
        woreda = $8,
        house_number = $9,
        postal_code = $10,
        emergency_contact_name = $11,
        emergency_contact_relationship = $12,
        emergency_contact_phone = $13,
        updated_at = now()
       WHERE id = $14
       RETURNING *`,
      [
        phone, alt_phone, occupation, country, region, city,
        sub_city, woreda, house_number, postal_code,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        parentId,
      ]
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CHILDREN MANAGEMENT
// ============================================================================

/**
 * GET /api/parent/children
 * Get all children for logged-in parent
 */
async function getChildren(req, res, next) {
  try {
    // Get parent_id
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Get all children with related data
    const result = await query(
      `SELECT 
        s.*,
        u.email as student_email,
        u.is_active as student_is_active,
        ag.name as age_group_name,
        ag.min_age, ag.max_age, ag.requires_account,
        g.name as grade_name,
        sec.name as section_name,
        srr.status as account_status,
        srr.rejection_reason as account_rejection_reason,
        srr.review_notes as account_review_notes,
        (
          SELECT COUNT(*)::int 
          FROM progress pr 
          WHERE pr.student_id = s.id AND pr.status = 'completed'
        ) as completed_lessons,
        (
          SELECT ROUND(AVG(completion_percentage), 1)
          FROM progress pr
          WHERE pr.student_id = s.id
        ) as avg_progress,
        (
          SELECT MAX(last_accessed_at)
          FROM progress pr
          WHERE pr.student_id = s.id
        ) as last_activity
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN grades g ON g.id = s.grade_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       LEFT JOIN student_registration_requests srr ON srr.student_id = s.id
       WHERE s.parent_id = $1
       ORDER BY s.date_of_birth DESC`,
      [parentId]
    );

    res.json({ children: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id
 * Get single child details with full profile
 */
async function getChildById(req, res, next) {
  try {
    const { id } = req.params;

    // Get parent_id
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Verify this child belongs to this parent
    const result = await query(
      `SELECT 
        s.*,
        u.email as student_email,
        u.full_name as student_full_name,
        u.is_active as student_is_active,
        ag.name as age_group_name,
        ag.min_age, ag.max_age, ag.requires_account,
        g.name as grade_name,
        sec.name as section_name,
        srr.status as account_status,
        srr.rejection_reason as account_rejection_reason,
        srr.review_notes as account_review_notes,
        srr.reviewed_by,
        srr.reviewed_at
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN grades g ON g.id = s.grade_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       LEFT JOIN student_registration_requests srr ON srr.student_id = s.id
       WHERE s.id = $1 AND s.parent_id = $2`,
      [id, parentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const child = result.rows[0];

    // Get additional stats
    const [progressStats, activityStats, quizStats, attendanceStats] = await Promise.all([
      query(
        `SELECT 
          COUNT(*)::int as total_courses,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_courses,
          ROUND(AVG(completion_percentage), 1) as avg_progress
         FROM progress WHERE student_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*)::int as total_activities,
          COUNT(*) FILTER (WHERE status = 'submitted')::int as submitted,
          COUNT(*) FILTER (WHERE status = 'graded')::int as graded,
          ROUND(AVG(score / NULLIF(a.max_score, 0)) * 100, 1) as avg_score
         FROM activity_submissions asub
         JOIN activities a ON a.id = asub.activity_id
         WHERE asub.student_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*)::int as total_quizzes,
          ROUND(AVG(score / NULLIF(total_points, 0)) * 100, 1) as avg_score
         FROM quiz_results WHERE student_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*)::int as total_days,
          COUNT(*) FILTER (WHERE present = TRUE)::int as present_days,
          ROUND(COUNT(*) FILTER (WHERE present = TRUE)::real / NULLIF(COUNT(*), 0) * 100, 1) as attendance_rate
         FROM attendance WHERE student_id = $1`,
        [id]
      ),
    ]);

    res.json({
      child: {
        ...child,
        stats: {
          progress: progressStats.rows[0],
          activities: activityStats.rows[0],
          quizzes: quizStats.rows[0],
          attendance: attendanceStats.rows[0],
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parent/children
 * Register a new child
 */
async function registerChild(req, res, next) {
  try {
    const {
      // Personal
      first_name, middle_name, last_name, gender, date_of_birth,
      profile_picture, preferred_language, blood_group,
      medical_information, special_learning_needs,
      // School
      grade_id, section_id, student_id_number, academic_year,
      previous_school, enrollment_date,
      // Student Account (ages 10-12 only)
      student_email, password,
    } = req.body;

    // Get parent_id
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Calculate age
    const birthDate = new Date(date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age (5-12)
    if (age < 5) {
      return res.status(400).json({ error: 'Children below 5 years are outside the current system age range.' });
    }
    if (age > 12) {
      return res.status(400).json({ error: 'The Children Learning Hub currently supports children aged 5-12.' });
    }

    // Determine age group
    const ageGroupResult = await query(
      `SELECT id, requires_account FROM age_groups WHERE $1 BETWEEN min_age AND max_age`,
      [age]
    );

    if (ageGroupResult.rows.length === 0) {
      return res.status(400).json({ error: 'No age group found for this age' });
    }

    const ageGroup = ageGroupResult.rows[0];
    const requiresAccount = ageGroup.requires_account;

    // Validate student account info for ages 10-12
    let userId = null;
    if (requiresAccount) {
      if (!student_email || !password) {
        return res.status(400).json({ error: 'Student email and password are required for ages 10-12' });
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student_email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email already exists
      const emailCheck = await query(
        `SELECT id FROM users WHERE email = $1`,
        [student_email]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email is already registered' });
      }

      // Validate password strength
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        });
      }

      // Create user account for student (will be activated after admin approval)
      const hashedPassword = await bcrypt.hash(password, 10);
      const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();

      const userResult = await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, 'student', FALSE)
         RETURNING id`,
        [student_email, hashedPassword, full_name]
      );

      userId = userResult.rows[0].id;
    }

    // Create student record
    const full_name = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();

    const studentResult = await query(
      `INSERT INTO students (
        user_id, parent_id, age_group_id, grade_id, section_id,
        full_name, first_name, middle_name, last_name,
        gender, date_of_birth,
        profile_picture, preferred_language, blood_group,
        medical_information, special_learning_needs,
        student_id_number, academic_year, previous_school, enrollment_date
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14,
        $15, $16,
        $17, $18, $19, $20
      ) RETURNING *`,
      [
        userId, parentId, ageGroup.id, grade_id, section_id,
        full_name, first_name, middle_name, last_name,
        gender, date_of_birth,
        profile_picture, preferred_language, blood_group,
        medical_information, special_learning_needs,
        student_id_number, academic_year, previous_school, enrollment_date,
      ]
    );

    const student = studentResult.rows[0];

    // If requires account, create student registration request for admin approval
    if (requiresAccount) {
      await query(
        `INSERT INTO student_registration_requests (
          student_id, requested_by, status
        ) VALUES ($1, $2, 'pending')`,
        [student.id, req.user.id]
      );

      // Create notification for admin
      const adminResult = await query(`SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE`);
      if (adminResult.rows.length > 0) {
        const adminIds = adminResult.rows.map(r => r.id);
        const values = adminIds.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(',');
        const params = adminIds.flatMap(adminId => [
          adminId,
          'info',
          'New Student Account Request',
          `${full_name} - Student account pending approval`,
        ]);
        await query(
          `INSERT INTO notifications (user_id, type, title, message) VALUES ${values}`,
          params
        );
      }
    }

    res.status(201).json({
      message: requiresAccount
        ? 'Child registered successfully. Student account is pending admin approval.'
        : 'Child registered successfully as parent-managed.',
      student,
      requires_approval: requiresAccount,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CHILD LEARNING DATA
// ============================================================================

/**
 * GET /api/parent/children/:id/courses
 * Get courses for a specific child
 */
async function getChildCourses(req, res, next) {
  try {
    const { id } = req.params;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `SELECT 
        c.*,
        ag.name as age_group_name,
        u.full_name as instructor_name,
        p.status as enrollment_status,
        p.completion_percentage,
        p.last_accessed_at,
        (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*)::int FROM progress pr WHERE pr.student_id = $1 AND pr.course_id = c.id AND pr.status = 'completed') as completed_lessons
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1
       WHERE c.status = 'published'
       AND c.age_group_id = (SELECT age_group_id FROM students WHERE id = $1)
       ORDER BY p.last_accessed_at DESC NULLS LAST, c.created_at DESC`,
      [id]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/lessons
 * Get lessons for a specific child
 */
async function getChildLessons(req, res, next) {
  try {
    const { id } = req.params;
    const { course_id } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = 'WHERE c.status = \'published\'';
    const params = [id];

    if (course_id) {
      params.push(course_id);
      whereClause += ` AND l.course_id = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        l.*,
        c.title as course_title,
        c.id as course_id,
        u.full_name as instructor_name,
        p.status as completion_status,
        p.completion_percentage,
        p.last_accessed_at
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.student_id = $1
       ${whereClause}
       ORDER BY c.title, l.order_index`,
      params
    );

    res.json({ lessons: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/materials
 * Get learning materials for a specific child
 */
async function getChildMaterials(req, res, next) {
  try {
    const { id } = req.params;
    const { lesson_id, material_type } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = '';
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND m.lesson_id = $${params.length}`;
    }

    if (material_type) {
      params.push(material_type);
      whereClause += ` AND m.material_type = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        m.*,
        l.title as lesson_title,
        c.title as course_title,
        u.full_name as instructor_name,
        (
          SELECT completed FROM student_material_progress
          WHERE student_id = $1 AND material_id = m.id
        ) as completed,
        (
          SELECT last_position FROM student_material_progress
          WHERE student_id = $1 AND material_id = m.id
        ) as last_position
       FROM materials m
       JOIN lessons l ON l.id = m.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN instructors ins ON ins.id = c.instructor_id
       JOIN users u ON u.id = ins.user_id
       WHERE 1=1 ${whereClause}
       ORDER BY l.order_index, m.order_index`,
      params
    );

    res.json({ materials: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/activities
 * Get activities for a specific child
 */
async function getChildActivities(req, res, next) {
  try {
    const { id } = req.params;
    const { status, lesson_id } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = '';
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND a.lesson_id = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        a.*,
        l.title as lesson_title,
        c.title as course_title,
        u.full_name as instructor_name,
        asub.id as submission_id,
        asub.status as submission_status,
        asub.submitted_at,
        asub.score,
        asub.feedback,
        asub.graded_at,
        asub.file_url
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN instructors ins ON ins.id = c.instructor_id
       JOIN users u ON u.id = ins.user_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       WHERE 1=1 ${whereClause}
       ${status ? `AND asub.status = '${status}'` : ''}
       ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC`,
      params
    );

    res.json({ activities: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parent/children/:childId/activities/:activityId/submit
 * Submit activity on behalf of child (ages 5-9)
 */
async function submitChildActivity(req, res, next) {
  try {
    const { childId, activityId } = req.params;
    const { submission_text, file_url, notes } = req.body;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, childId);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    // Check if activity exists
    const activityResult = await query(
      `SELECT id, max_score FROM activities WHERE id = $1`,
      [activityId]
    );

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if already submitted
    const existingSubmission = await query(
      `SELECT id, status FROM activity_submissions WHERE activity_id = $1 AND student_id = $2`,
      [activityId, childId]
    );

    let result;
    if (existingSubmission.rows.length > 0) {
      // Update existing submission if not yet graded
      const existing = existingSubmission.rows[0];
      if (existing.status === 'graded') {
        return res.status(400).json({ error: 'This activity has already been graded and cannot be resubmitted' });
      }

      result = await query(
        `UPDATE activity_submissions SET
          submission_text = COALESCE($1, submission_text),
          file_url = COALESCE($2, file_url),
          notes = $3,
          status = 'submitted',
          submitted_at = now()
         WHERE id = $4
         RETURNING *`,
        [submission_text, file_url, notes, existing.id]
      );
    } else {
      // Create new submission
      result = await query(
        `INSERT INTO activity_submissions (
          activity_id, student_id, submission_text, file_url, notes, status, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, 'submitted', now())
        RETURNING *`,
        [activityId, childId, submission_text, file_url, notes]
      );
    }

    // Notify instructor
    const instructorResult = await query(
      `SELECT u.id FROM users u
       JOIN instructors i ON i.user_id = u.id
       JOIN courses c ON c.instructor_id = i.id
       JOIN lessons l ON l.course_id = c.id
       JOIN activities a ON a.lesson_id = l.id
       WHERE a.id = $1`,
      [activityId]
    );

    if (instructorResult.rows.length > 0) {
      const instructorId = instructorResult.rows[0].id;
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'info', 'New Activity Submission', 'A parent has submitted an activity on behalf of their child')`,
        [instructorId]
      );
    }

    res.status(201).json({
      message: 'Activity submitted successfully',
      submission: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/quizzes
 * Get quizzes for a specific child
 */
async function getChildQuizzes(req, res, next) {
  try {
    const { id } = req.params;
    const { lesson_id } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = '';
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND q.lesson_id = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        q.*,
        l.title as lesson_title,
        c.title as course_title,
        qr.id as result_id,
        qr.score,
        qr.total_points,
        qr.completed_at,
        qr.time_taken,
        (SELECT COUNT(*)::int FROM quiz_questions WHERE quiz_id = q.id) as total_questions
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $1
       WHERE 1=1 ${whereClause}
       ORDER BY q.created_at DESC`,
      params
    );

    res.json({ quizzes: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/progress
 * Get comprehensive progress for a child
 */
async function getChildProgress(req, res, next) {
  try {
    const { id } = req.params;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    // Overall progress
    const overallResult = await query(
      `SELECT 
        COUNT(DISTINCT course_id)::int as total_courses,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_courses,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress_courses,
        ROUND(AVG(completion_percentage), 1) as avg_completion
       FROM progress WHERE student_id = $1`,
      [id]
    );

    // Course-wise progress
    const courseProgress = await query(
      `SELECT 
        c.id, c.title, c.description,
        p.status, p.completion_percentage, p.last_accessed_at,
        (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*)::int FROM progress pr WHERE pr.student_id = $1 AND pr.course_id = c.id AND pr.lesson_id IS NOT NULL AND pr.status = 'completed') as completed_lessons
       FROM progress p
       JOIN courses c ON c.id = p.course_id
       WHERE p.student_id = $1 AND p.lesson_id IS NULL
       ORDER BY p.last_accessed_at DESC NULLS LAST`,
      [id]
    );

    // Activity performance
    const activityPerformance = await query(
      `SELECT 
        COUNT(*)::int as total_activities,
        COUNT(*) FILTER (WHERE status = 'submitted')::int as submitted,
        COUNT(*) FILTER (WHERE status = 'graded')::int as graded,
        ROUND(AVG(score / NULLIF(a.max_score, 0)) * 100, 1) as avg_score
       FROM activity_submissions asub
       JOIN activities a ON a.id = asub.activity_id
       WHERE asub.student_id = $1`,
      [id]
    );

    // Quiz performance
    const quizPerformance = await query(
      `SELECT 
        COUNT(*)::int as total_quizzes,
        ROUND(AVG(score / NULLIF(total_points, 0)) * 100, 1) as avg_score,
        MIN(score / NULLIF(total_points, 0) * 100) as lowest_score,
        MAX(score / NULLIF(total_points, 0) * 100) as highest_score
       FROM quiz_results WHERE student_id = $1`,
      [id]
    );

    // Recent activity
    const recentActivity = await query(
      `SELECT 
        'lesson' as type,
        l.title as title,
        p.last_accessed_at as activity_date,
        p.completion_percentage as progress
       FROM progress p
       JOIN lessons l ON l.id = p.lesson_id
       WHERE p.student_id = $1 AND p.lesson_id IS NOT NULL
       ORDER BY p.last_accessed_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      progress: {
        overall: overallResult.rows[0],
        courses: courseProgress.rows,
        activities: activityPerformance.rows[0],
        quizzes: quizPerformance.rows[0],
        recent_activity: recentActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/attendance
 * Get attendance records for a child
 */
async function getChildAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = 'WHERE student_id = $1';
    const params = [id];

    if (month && year) {
      params.push(parseInt(month), parseInt(year));
      whereClause += ` AND EXTRACT(MONTH FROM session_date) = $2 AND EXTRACT(YEAR FROM session_date) = $3`;
    }

    // Attendance records
    const records = await query(
      `SELECT 
        session_date,
        present,
        late,
        excused,
        notes,
        marked_by,
        marked_at
       FROM attendance
       ${whereClause}
       ORDER BY session_date DESC`,
      params
    );

    // Summary stats
    const summary = await query(
      `SELECT 
        COUNT(*)::int as total_days,
        COUNT(*) FILTER (WHERE present = TRUE)::int as present_days,
        COUNT(*) FILTER (WHERE present = FALSE AND excused = FALSE)::int as absent_days,
        COUNT(*) FILTER (WHERE late = TRUE)::int as late_days,
        COUNT(*) FILTER (WHERE excused = TRUE)::int as excused_days,
        ROUND(COUNT(*) FILTER (WHERE present = TRUE)::real / NULLIF(COUNT(*), 0) * 100, 1) as attendance_rate
       FROM attendance
       ${whereClause}`,
      params
    );

    res.json({
      attendance: records.rows,
      summary: summary.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/feedback
 * Get teacher feedback for a child
 */
async function getChildFeedback(req, res, next) {
  try {
    const { id } = req.params;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `SELECT 
        tf.*,
        u.full_name as instructor_name,
        c.title as course_title,
        l.title as lesson_title
       FROM teacher_feedback tf
       JOIN instructors i ON i.id = tf.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN courses c ON c.id = tf.course_id
       LEFT JOIN lessons l ON l.id = tf.lesson_id
       WHERE tf.student_id = $1
       ORDER BY tf.created_at DESC`,
      [id]
    );

    res.json({ feedback: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/recommendations
 * Get AI recommendations for a child
 */
async function getChildRecommendations(req, res, next) {
  try {
    const { id } = req.params;
    const { type } = req.query;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = 'WHERE student_id = $1';
    const params = [id];

    if (type) {
      params.push(type);
      whereClause += ` AND recommendation_type = $${params.length}`;
    }

    const result = await query(
      `SELECT *
       FROM ai_recommendations
       ${whereClause}
       ORDER BY generated_at DESC
       LIMIT 50`,
      params
    );

    res.json({ recommendations: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/achievements
 * Get achievements for a child
 */
async function getChildAchievements(req, res, next) {
  try {
    const { id } = req.params;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `SELECT *
       FROM achievements
       WHERE student_id = $1
       ORDER BY earned_at DESC`,
      [id]
    );

    res.json({ achievements: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/certificates
 * Get certificates for a child
 */
async function getChildCertificates(req, res, next) {
  try {
    const { id } = req.params;

    // Verify parent owns this child
    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `SELECT 
        cert.*,
        c.title as course_title
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.student_id = $1
       ORDER BY cert.issued_at DESC`,
      [id]
    );

    res.json({ certificates: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * GET /api/parent/dashboard-stats
 * Get stats for parent dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    // Get parent_id
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Get stats
    const [childrenStats, activityStats, progressStats, notificationStats] = await Promise.all([
      query(
        `SELECT 
          COUNT(*)::int as total_children,
          COUNT(*) FILTER (WHERE user_id IS NULL)::int as parent_managed,
          COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int as student_accounts
         FROM students WHERE parent_id = $1`,
        [parentId]
      ),
      query(
        `SELECT 
          COUNT(asub.id)::int as pending_activities,
          COUNT(asub.id) FILTER (WHERE a.due_date < CURRENT_DATE)::int as overdue_activities
         FROM students s
         LEFT JOIN activity_submissions asub ON asub.student_id = s.id AND asub.status != 'graded'
         LEFT JOIN activities a ON a.id = asub.activity_id
         WHERE s.parent_id = $1`,
        [parentId]
      ),
      query(
        `SELECT 
          ROUND(AVG(p.completion_percentage), 1) as avg_progress
         FROM students s
         JOIN progress p ON p.student_id = s.id
         WHERE s.parent_id = $1`,
        [parentId]
      ),
      query(
        `SELECT COUNT(*)::int as unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.user.id]
      ),
    ]);

    // Get children summary
    const childrenSummary = await query(
      `SELECT 
        s.id, s.full_name, s.profile_picture, s.date_of_birth,
        ag.name as age_group_name,
        ROUND(AVG(p.completion_percentage), 1) as avg_progress,
        (SELECT MAX(last_accessed_at) FROM progress WHERE student_id = s.id) as last_activity
       FROM students s
       LEFT JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN progress p ON p.student_id = s.id
       WHERE s.parent_id = $1
       GROUP BY s.id, s.full_name, s.profile_picture, s.date_of_birth, ag.name
       ORDER BY s.date_of_birth DESC`,
      [parentId]
    );

    res.json({
      stats: {
        children: childrenStats.rows[0],
        activities: activityStats.rows[0],
        progress: progressStats.rows[0],
        notifications: notificationStats.rows[0],
      },
      children_summary: childrenSummary.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify that parent owns the specified child
 */
async function verifyParentChild(userId, childId) {
  try {
    const result = await query(
      `SELECT s.id
       FROM students s
       JOIN parents p ON p.id = s.parent_id
       WHERE s.id = $1 AND p.user_id = $2`,
      [childId, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, status: 404, error: 'Child not found or access denied' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, status: 500, error: 'Database error' };
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getChildren,
  getChildById,
  registerChild,
  getChildCourses,
  getChildLessons,
  getChildMaterials,
  getChildActivities,
  submitChildActivity,
  getChildQuizzes,
  getChildProgress,
  getChildAttendance,
  getChildFeedback,
  getChildRecommendations,
  getChildAchievements,
  getChildCertificates,
  getDashboardStats,
};

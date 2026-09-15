/**
 * parentController.js
 * Comprehensive, database-accurate Parent Portal API endpoints
 * Connects Parent to Admin, Child, Instructor, Course, Lesson, Activity, Quiz,
 * Submission, Feedback, Progress, Achievements, and Notifications.
 */

const { query } = require('../config/db');
const bcrypt = require('bcrypt');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify that parent owns the specified child
 */
async function verifyParentChild(userId, childId) {
  try {
    const result = await query(
      `SELECT s.id, s.parent_id, s.user_id, s.age_group_id, s.full_name
       FROM students s
       JOIN parents p ON p.id = s.parent_id
       WHERE s.id = $1 AND p.user_id = $2`,
      [childId, userId]
    );

    if (result.rows.length === 0) {
      return { success: false, status: 404, error: 'Child not found or access denied' };
    }

    return { success: true, child: result.rows[0] };
  } catch (err) {
    return { success: false, status: 500, error: 'Database error' };
  }
}

// ============================================================================
// PARENT PROFILE & SECURITY
// ============================================================================

/**
 * GET /api/parent/profile
 * Get logged-in parent profile with account status & children count
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
       LEFT JOIN registration_requests rr ON rr.email = u.email
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
        children_count: childrenResult.rows[0]?.children_count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/parent/profile
 * Update parent profile information
 */
async function updateProfile(req, res, next) {
  try {
    const {
      phone, alt_phone, occupation, country, region, city,
      sub_city, woreda, house_number, postal_code,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      guardian_relationship, address,
    } = req.body;

    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

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
        emergency_contact_name = COALESCE($11, emergency_contact_name),
        emergency_contact_relationship = COALESCE($12, emergency_contact_relationship),
        emergency_contact_phone = COALESCE($13, emergency_contact_phone),
        guardian_relationship = COALESCE($14, guardian_relationship),
        address = COALESCE($15, address),
        updated_at = now()
       WHERE id = $16
       RETURNING *`,
      [
        phone, alt_phone, occupation, country, region, city,
        sub_city, woreda, house_number, postal_code,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        guardian_relationship, address,
        parentId,
      ]
    );

    if (phone) {
      await query(`UPDATE users SET phone = $1 WHERE id = $2`, [phone, req.user.id]);
    }

    res.json({ profile: result.rows[0], message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parent/change-password
 * Change parent password securely
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CHILDREN MANAGEMENT
// ============================================================================

/**
 * GET /api/parent/children
 * Get all children for the logged-in parent
 */
async function getChildren(req, res, next) {
  try {
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    const [approvedResult, pendingResult] = await Promise.all([
      query(
        `SELECT 
          s.*,
          s.id::text as id,
          s.profile_image_url as profile_picture,
          s.grade as grade_name,
          s.section as section_name,
          u.email as student_email,
          u.is_active as student_is_active,
          ag.name as age_group_name,
          ag.min_age, ag.max_age, ag.requires_account,
          'approved' as account_status,
          NULL as account_rejection_reason,
          (
            SELECT COUNT(DISTINCT c.id)::int
            FROM courses c
            WHERE c.age_group_id = s.age_group_id AND c.status = 'published'
          ) as total_assigned_courses,
          (
            SELECT COUNT(*)::int 
            FROM progress pr 
            WHERE pr.student_id = s.id AND pr.status = 'completed' AND pr.lesson_id IS NOT NULL
          ) as completed_lessons,
          (
            SELECT COUNT(*)::int
            FROM activity_submissions asub
            WHERE asub.student_id = s.id
          ) as completed_activities,
          (
            SELECT COUNT(*)::int
            FROM quiz_results qr
            WHERE qr.student_id = s.id
          ) as completed_quizzes,
          (
            SELECT COALESCE(ROUND(AVG(completion_percentage)), 0)::int
            FROM progress pr
            WHERE pr.student_id = s.id
          ) as avg_progress,
          (
            SELECT MAX(last_accessed_at)
            FROM progress pr
            WHERE pr.student_id = s.id
          ) as last_activity,
          FALSE as is_pending_request
         FROM students s
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN age_groups ag ON ag.id = s.age_group_id
         WHERE s.parent_id = $1
         ORDER BY s.date_of_birth DESC`,
        [parentId]
      ),
      query(
        `SELECT 
          ('req_' || sr.id::text) as id,
          sr.id as request_id,
          sr.student_full_name as full_name,
          sr.student_photo_url as profile_picture,
          sr.date_of_birth,
          sr.gender,
          COALESCE(sr.grade, sr.current_grade) as grade_name,
          sr.section as section_name,
          sr.preferred_language,
          sr.student_email,
          (CASE WHEN sr.student_email IS NOT NULL THEN 'pending_account' ELSE NULL END) as user_id,
          FALSE as student_is_active,
          (CASE WHEN sr.age BETWEEN 5 AND 7 THEN '5-7' WHEN sr.age BETWEEN 8 AND 9 THEN '8-9' ELSE '10-12' END) as age_group_name,
          sr.status as account_status,
          sr.rejection_reason as account_rejection_reason,
          0 as total_assigned_courses,
          0 as completed_lessons,
          0 as completed_activities,
          0 as completed_quizzes,
          0 as avg_progress,
          sr.submitted_at as last_activity,
          TRUE as is_pending_request
         FROM student_registration_requests sr
         WHERE sr.parent_id = $1 AND sr.status IN ('pending', 'rejected')
         ORDER BY sr.submitted_at DESC`,
        [parentId]
      ),
    ]);

    const allChildren = [...approvedResult.rows, ...pendingResult.rows];
    res.json({ children: allChildren });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id
 * Get single child details with full profile & learning stats
 */
async function getChildById(req, res, next) {
  try {
    const { id } = req.params;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );
    const parentId = parentResult.rows[0].id;

    const result = await query(
      `SELECT 
        s.*,
        s.profile_image_url as profile_picture,
        s.grade as grade_name,
        s.section as section_name,
        u.email as student_email,
        u.full_name as student_full_name,
        u.is_active as student_is_active,
        ag.name as age_group_name,
        ag.min_age, ag.max_age, ag.requires_account,
        CASE
          WHEN s.user_id IS NULL THEN 'active'
          WHEN u.is_active = TRUE THEN 'approved'
          WHEN srr.status = 'rejected' THEN 'rejected'
          ELSE 'pending'
        END as account_status,
        srr.rejection_reason as account_rejection_reason,
        srr.reviewed_by,
        srr.reviewed_at
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN student_registration_requests srr ON srr.student_email = u.email
       WHERE s.id = $1 AND s.parent_id = $2`,
      [id, parentId]
    );

    const child = result.rows[0];

    // Stats calculations
    const [progressStats, activityStats, quizStats, coursesCount] = await Promise.all([
      query(
        `SELECT 
          COUNT(*)::int as total_courses,
          COUNT(*) FILTER (WHERE status = 'completed' AND lesson_id IS NULL)::int as completed_courses,
          COALESCE(ROUND(AVG(completion_percentage)), 0)::int as avg_progress,
          (SELECT COUNT(*)::int FROM progress WHERE student_id = $1 AND status = 'completed' AND lesson_id IS NOT NULL) as completed_lessons
         FROM progress WHERE student_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*)::int as total_activities,
          COUNT(*) FILTER (WHERE asub.status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE asub.status = 'reviewed')::int as reviewed,
          COUNT(*) FILTER (WHERE asub.status = 'graded')::int as graded,
          COALESCE(ROUND(AVG(score / NULLIF(a.max_score, 0)) * 100), 0)::int as avg_score
         FROM activity_submissions asub
         JOIN activities a ON a.id = asub.activity_id
         WHERE asub.student_id = $1`,
        [id]
      ),
      query(
        `SELECT 
          COUNT(*)::int as total_quizzes,
          COALESCE(ROUND(AVG(score / NULLIF(total_points, 0)) * 100), 0)::int as avg_score
         FROM quiz_results WHERE student_id = $1`,
        [id]
      ),
      query(
        `SELECT COUNT(*)::int as count FROM courses WHERE age_group_id = $1 AND status = 'published'`,
        [child.age_group_id]
      ),
    ]);

    res.json({
      child: {
        ...child,
        stats: {
          courses_count: coursesCount.rows[0]?.count || 0,
          progress: progressStats.rows[0] || {},
          activities: activityStats.rows[0] || {},
          quizzes: quizStats.rows[0] || {},
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/parent/children/:id
 * Update child information
 */
async function updateChild(req, res, next) {
  try {
    const { id } = req.params;
    const {
      preferred_language, profile_picture,
      medical_condition, learning_disability,
    } = req.body;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `UPDATE students SET
        preferred_language = COALESCE($1, preferred_language),
        profile_image_url = COALESCE($2, profile_image_url),
        medical_condition = COALESCE($3, medical_condition),
        learning_disability = COALESCE($4, learning_disability),
        updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [preferred_language, profile_picture, medical_condition, learning_disability, id]
    );

    res.json({ child: result.rows[0], message: 'Child profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parent/children
 * Register a new child:
 * - Automatically calculates age from Date of Birth
 * - Ages 5–9: PARENT_MANAGED, immediately active
 * - Ages 10–12: requires student credentials, created with is_active=FALSE, pending admin approval
 */
async function registerChild(req, res, next) {
  try {
    const {
      first_name, middle_name, last_name, gender, date_of_birth,
      profile_picture, preferred_language, blood_group,
      grade, section, admission_number, academic_year,
      previous_school, medical_condition, learning_disability,
      student_email, password,
    } = req.body;

    if (!first_name || !date_of_birth) {
      return res.status(400).json({ error: 'First name and date of birth are required' });
    }

    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found' });
    }

    const parentId = parentResult.rows[0].id;

    // Calculate age from Date of Birth
    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date of birth provided' });
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age range (5-12)
    if (age < 5) {
      return res.status(400).json({
        error: 'Children below 5 years old are outside the current learning hub program.',
      });
    }
    if (age > 12) {
      return res.status(400).json({
        error: 'The Children Learning Hub currently supports children aged 5 to 12.',
      });
    }

    const full_name = `${first_name.trim()} ${middle_name ? middle_name.trim() + ' ' : ''}${last_name ? last_name.trim() : ''}`.trim();

    let cleanEmail = null;
    let hashedPassword = null;

    // Credentials required for Ages 10-12
    if (age >= 10) {
      if (!student_email || !password) {
        return res.status(400).json({
          error: 'Children aged 10–12 require a student email and login password.',
        });
      }

      cleanEmail = student_email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please provide a valid email format for the student.' });
      }

      const emailCheck = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email is already registered in the system.' });
      }

      const reqEmailCheck = await query(
        `SELECT id FROM student_registration_requests WHERE student_email = $1 AND status != 'rejected'`,
        [cleanEmail]
      );
      if (reqEmailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A registration request with this student email is already pending approval.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      hashedPassword = await bcrypt.hash(password, 10);
    } else if (student_email) {
      cleanEmail = student_email.toLowerCase().trim();
    }

    // Check if duplicate request exists for this parent, child name, and DOB
    const existingReq = await query(
      `SELECT id, status FROM student_registration_requests
       WHERE parent_id = $1 AND LOWER(student_full_name) = LOWER($2) AND date_of_birth = $3`,
      [parentId, full_name, date_of_birth]
    );

    let requestId;
    if (existingReq.rows.length > 0) {
      const ex = existingReq.rows[0];
      if (ex.status === 'pending') {
        return res.status(400).json({
          error: 'A registration request for this child is already pending administrator approval.',
        });
      } else if (ex.status === 'approved') {
        return res.status(400).json({
          error: 'This child is already approved and registered in the system.',
        });
      } else {
        // Re-submit rejected request
        const updateRes = await query(
          `UPDATE student_registration_requests SET
            gender = $1,
            grade = $2,
            current_grade = $2,
            section = $3,
            preferred_language = $4,
            student_photo_url = $5,
            admission_number = $6,
            previous_school = $7,
            academic_year = $8,
            student_email = $9,
            password_hash = $10,
            username = $11,
            age = $12,
            blood_group = $13,
            medical_condition = $14,
            learning_disability = $15,
            status = 'pending',
            rejection_reason = NULL,
            submitted_at = now()
           WHERE id = $16
           RETURNING id`,
          [
            gender || 'other',
            grade || null,
            section || null,
            preferred_language || 'Amharic',
            profile_picture || null,
            admission_number || null,
            previous_school || null,
            academic_year || '2026',
            cleanEmail,
            hashedPassword,
            cleanEmail || full_name,
            age,
            blood_group || null,
            medical_condition || null,
            learning_disability || null,
            ex.id,
          ]
        );
        requestId = updateRes.rows[0].id;
      }
    } else {
      // Insert new pending registration request (child waits for admin approval)
      const insertRes = await query(
        `INSERT INTO student_registration_requests (
          parent_id, student_full_name, date_of_birth, gender,
          grade, current_grade, section, preferred_language,
          student_photo_url, admission_number, previous_school, academic_year,
          blood_group, medical_condition, learning_disability,
          student_email, password_hash, username,
          age, status, submitted_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17,
          $18, 'pending', now()
        ) RETURNING id`,
        [
          parentId, full_name, date_of_birth, gender || 'female',
          grade || null, section || null, preferred_language || 'Amharic',
          profile_picture || null, admission_number || null, previous_school || null, academic_year || '2026',
          blood_group || null, medical_condition || null, learning_disability || null,
          cleanEmail, hashedPassword, cleanEmail || full_name,
          age,
        ]
      );
      requestId = insertRes.rows[0].id;
    }

    // Notify all active administrators
    const adminResult = await query(`SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE`);
    for (const admin of adminResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'info', 'New Child Registration Pending Review', $2)`,
        [admin.id, `Parent submitted registration for "${full_name}" (Age: ${age}). Requires administrator approval.`]
      );
    }

    // Notify parent
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'info', 'Child Registration Submitted', $2)`,
      [
        req.user.id,
        `Your child registration request for "${full_name}" (Age: ${age}) has been submitted and is waiting for administrator approval.`
      ]
    );

    res.status(201).json({
      message: `Child registration submitted successfully! Your child's registration is waiting for administrator approval.`,
      status: 'pending',
      request_id: requestId,
      child_name: full_name,
      age,
      requires_approval: true,
      account_type: age >= 10 ? 'STUDENT_ACCOUNT' : 'PARENT_MANAGED',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CHILD LEARNING DATA (COURSES, LESSONS, MATERIALS, ACTIVITIES, QUIZZES)
// ============================================================================

/**
 * GET /api/parent/children/:id/courses
 * Get assigned courses for a specific child
 */
async function getChildCourses(req, res, next) {
  try {
    const { id } = req.params;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const child = verification.child;

    const result = await query(
      `SELECT 
        c.*,
        ag.name as age_group_name,
        u.full_name as instructor_name,
        u.email as instructor_email,
        p.status as enrollment_status,
        COALESCE(p.completion_percentage, 0)::int as completion_percentage,
        p.last_accessed_at,
        (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*)::int FROM progress pr WHERE pr.student_id = $1 AND pr.course_id = c.id AND pr.status = 'completed' AND pr.lesson_id IS NOT NULL) as completed_lessons,
        (SELECT COUNT(DISTINCT a.id)::int FROM activities a JOIN lessons l ON l.id = a.lesson_id WHERE l.course_id = c.id AND a.status = 'active') as total_activities,
        (SELECT COUNT(DISTINCT q.id)::int FROM quizzes q JOIN lessons l ON l.id = q.lesson_id WHERE l.course_id = c.id) as total_quizzes
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1 AND p.lesson_id IS NULL
       WHERE c.status = 'published' AND c.age_group_id = $2
       ORDER BY p.last_accessed_at DESC NULLS LAST, c.created_at DESC`,
      [id, child.age_group_id]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/lessons
 * Get lessons for a specific course or child
 */
async function getChildLessons(req, res, next) {
  try {
    const { id } = req.params;
    const { course_id } = req.query;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = "WHERE c.status = 'published'";
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
        COALESCE(p.status, 'not_started') as completion_status,
        COALESCE(p.completion_percentage, 0)::int as completion_percentage,
        p.last_accessed_at,
        (SELECT COUNT(*)::int FROM learning_materials WHERE lesson_id = l.id AND status = 'active') as materials_count,
        (SELECT COUNT(*)::int FROM videos WHERE lesson_id = l.id AND status = 'active') as videos_count,
        (SELECT COUNT(*)::int FROM activities WHERE lesson_id = l.id AND status = 'active') as activities_count,
        (SELECT COUNT(*)::int FROM quizzes WHERE lesson_id = l.id) as quizzes_count
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.student_id = $1
       ${whereClause}
       ORDER BY c.title, l.order_index ASC, l.created_at ASC`,
      params
    );

    res.json({ lessons: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/materials
 * Get learning materials and videos for a specific lesson
 */
async function getChildMaterials(req, res, next) {
  try {
    const { id } = req.params;
    const { lesson_id } = req.query;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = "WHERE lm.status = 'active'";
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND lm.lesson_id = $${params.length}`;
    }

    // 1. Learning materials
    const materialsResult = await query(
      `SELECT 
        lm.*,
        l.title as lesson_title,
        c.title as course_title,
        u.full_name as instructor_name
       FROM learning_materials lm
       JOIN lessons l ON l.id = lm.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN instructors ins ON ins.id = c.instructor_id
       JOIN users u ON u.id = ins.user_id
       ${whereClause}
       ORDER BY l.order_index ASC, lm.display_order ASC, lm.created_at ASC`,
      params
    );

    // 2. Videos
    let videoWhere = "WHERE v.status = 'active'";
    const vParams = [id];
    if (lesson_id) {
      vParams.push(lesson_id);
      videoWhere += ` AND v.lesson_id = $${vParams.length}`;
    }

    const videosResult = await query(
      `SELECT 
        v.*,
        l.title as lesson_title,
        c.title as course_title,
        (EXISTS (SELECT 1 FROM video_watches vw WHERE vw.video_id = v.id AND vw.student_id = $1)) as watched
       FROM videos v
       JOIN lessons l ON l.id = v.lesson_id
       JOIN courses c ON c.id = l.course_id
       ${videoWhere}
       ORDER BY v.created_at ASC`,
      vParams
    );

    res.json({
      materials: materialsResult.rows,
      videos: videosResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/activities
 * Get activities for a specific child with submission status & feedback
 */
async function getChildActivities(req, res, next) {
  try {
    const { id } = req.params;
    const { status, lesson_id, course_id } = req.query;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = "WHERE a.status = 'active'";
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND a.lesson_id = $${params.length}`;
    }

    if (course_id) {
      params.push(course_id);
      whereClause += ` AND l.course_id = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        a.*,
        l.title as lesson_title,
        c.id as course_id,
        c.title as course_title,
        u.full_name as instructor_name,
        asub.id as submission_id,
        COALESCE(asub.status::text, 'not_started') as submission_status,
        asub.submitted_at,
        asub.score,
        asub.feedback,
        asub.reviewed_at as graded_at,
        asub.submission_url,
        asub.submission_text
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN instructors ins ON ins.id = c.instructor_id
       JOIN users u ON u.id = ins.user_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       ${whereClause}
       ${status && status !== 'all' ? `AND (CASE WHEN '${status}' = 'not_started' THEN asub.id IS NULL ELSE asub.status = '${status}' END)` : ''}
       ORDER BY a.display_order ASC, a.created_at DESC`,
      params
    );

    res.json({ activities: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parent/children/:childId/activities/:activityId/submit
 * Submit an activity on behalf of a young child (Ages 5-9)
 */
async function submitChildActivity(req, res, next) {
  try {
    const { childId, activityId } = req.params;
    const { submission_text, file_url } = req.body;

    const verification = await verifyParentChild(req.user.id, childId);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    // Check activity
    const activityResult = await query(
      `SELECT a.*, l.id as lesson_id, c.id as course_id
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE a.id = $1`,
      [activityId]
    );

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = activityResult.rows[0];

    // Check existing
    const existingSubmission = await query(
      `SELECT id, status FROM activity_submissions WHERE activity_id = $1 AND student_id = $2`,
      [activityId, childId]
    );

    let result;
    if (existingSubmission.rows.length > 0) {
      result = await query(
        `UPDATE activity_submissions SET
          submission_text = COALESCE($1, submission_text),
          submission_url = COALESCE($2, submission_url),
          submitted_by = 'parent',
          status = 'pending',
          submitted_at = now()
         WHERE id = $3
         RETURNING *`,
        [submission_text, file_url, existingSubmission.rows[0].id]
      );
    } else {
      result = await query(
        `INSERT INTO activity_submissions (
          activity_id, student_id, submission_text, submission_url, submitted_by, status, submitted_at
        ) VALUES ($1, $2, $3, $4, 'parent', 'pending', now())
        RETURNING *`,
        [activityId, childId, submission_text, file_url]
      );
    }

    // Notify instructor
    const instructorResult = await query(
      `SELECT u.id FROM users u
       JOIN instructors i ON i.user_id = u.id
       JOIN courses c ON c.instructor_id = i.id
       WHERE c.id = $1`,
      [activity.course_id]
    );

    if (instructorResult.rows.length > 0) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ($1, 'info', 'New Activity Submission (Parent-Assisted)', $2)`,
        [instructorResult.rows[0].id, `Submission received for ${activity.title} on behalf of ${verification.child.full_name}.`]
      );
    }

    res.status(201).json({
      message: 'Activity submitted successfully on behalf of your child',
      submission: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/quizzes
 * Get quizzes and quiz results for a child
 */
async function getChildQuizzes(req, res, next) {
  try {
    const { id } = req.params;
    const { lesson_id, course_id } = req.query;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    let whereClause = "WHERE 1=1";
    const params = [id];

    if (lesson_id) {
      params.push(lesson_id);
      whereClause += ` AND q.lesson_id = $${params.length}`;
    }

    if (course_id) {
      params.push(course_id);
      whereClause += ` AND l.course_id = $${params.length}`;
    }

    const result = await query(
      `SELECT 
        q.*,
        l.title as lesson_title,
        c.id as course_id,
        c.title as course_title,
        qr.id as result_id,
        qr.score,
        qr.total_points,
        qr.submitted_at as completed_at,
        ROUND((qr.score * 100.0 / NULLIF(qr.total_points, 0)))::int as percentage,
        (SELECT COUNT(*)::int FROM quiz_questions WHERE quiz_id = q.id) as total_questions,
        (SELECT COUNT(*)::int FROM quiz_results WHERE quiz_id = q.id AND student_id = $1) as attempt_count
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $1
       ${whereClause}
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
 * Get comprehensive learning progress for a child
 */
async function getChildProgress(req, res, next) {
  try {
    const { id } = req.params;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const child = verification.child;

    // 1. Overall progress & summary stats
    const overallResult = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM courses WHERE age_group_id = $2 AND status = 'published') as total_courses,
        (SELECT COUNT(*)::int FROM progress WHERE student_id = $1 AND lesson_id IS NULL AND status = 'completed') as completed_courses,
        (SELECT COUNT(*)::int FROM progress WHERE student_id = $1 AND lesson_id IS NOT NULL AND status = 'completed') as completed_lessons,
        (SELECT COALESCE(ROUND(AVG(completion_percentage)), 0)::int FROM progress WHERE student_id = $1) as avg_completion`,
      [id, child.age_group_id]
    );

    // 2. Course-wise progress
    const courseProgress = await query(
      `SELECT 
        c.id, c.title, c.description, c.thumbnail_url,
        ag.name as age_group_name,
        u.full_name as instructor_name,
        COALESCE(p.status, 'not_started') as status,
        COALESCE(p.completion_percentage, 0)::int as completion_percentage,
        p.last_accessed_at,
        (SELECT COUNT(*)::int FROM lessons WHERE course_id = c.id) as total_lessons,
        (SELECT COUNT(*)::int FROM progress pr WHERE pr.student_id = $1 AND pr.course_id = c.id AND pr.lesson_id IS NOT NULL AND pr.status = 'completed') as completed_lessons
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1 AND p.lesson_id IS NULL
       WHERE c.age_group_id = $2 AND c.status = 'published'
       ORDER BY p.last_accessed_at DESC NULLS LAST, c.created_at DESC`,
      [id, child.age_group_id]
    );

    // 3. Activity Performance
    const activityStats = await query(
      `SELECT 
        COUNT(*)::int as total_submitted,
        COUNT(*) FILTER (WHERE asub.status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE asub.status = 'graded')::int as graded,
        COALESCE(ROUND(AVG(score / NULLIF(a.max_score, 0)) * 100), 0)::int as avg_score
       FROM activity_submissions asub
       JOIN activities a ON a.id = asub.activity_id
       WHERE asub.student_id = $1`,
      [id]
    );

    // 4. Quiz Performance
    const quizStats = await query(
      `SELECT 
        COUNT(*)::int as total_taken,
        COALESCE(ROUND(AVG(score / NULLIF(total_points, 0)) * 100), 0)::int as avg_score,
        COALESCE(ROUND(MAX(score / NULLIF(total_points, 0)) * 100), 0)::int as highest_score
       FROM quiz_results WHERE student_id = $1`,
      [id]
    );

    // 5. Active Learning Sessions & Total Time
    const sessionStats = await query(
      `SELECT COALESCE(SUM(total_active_seconds), 0)::int as total_active_seconds
       FROM learning_sessions
       WHERE student_id = $1`,
      [id]
    );

    // 6. Learning Streak (active learning days in last 14 days)
    const streakResult = await query(
      `WITH activity_days AS (
        SELECT DISTINCT DATE(submitted_at) as act_date FROM activity_submissions WHERE student_id = $1
        UNION
        SELECT DISTINCT DATE(submitted_at) as act_date FROM quiz_results WHERE student_id = $1
        UNION
        SELECT DISTINCT DATE(started_at) as act_date FROM learning_sessions WHERE student_id = $1
      )
      SELECT COUNT(*)::int as streak_days
      FROM activity_days
      WHERE act_date >= CURRENT_DATE - INTERVAL '14 days'`,
      [id]
    );

    // 7. Recent activity items
    const recentActivity = await query(
      `SELECT 
        'lesson' as type,
        l.title as title,
        c.title as course_title,
        p.last_accessed_at as activity_date,
        p.completion_percentage as progress
       FROM progress p
       JOIN lessons l ON l.id = p.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE p.student_id = $1 AND p.lesson_id IS NOT NULL
       ORDER BY p.last_accessed_at DESC NULLS LAST
       LIMIT 8`,
      [id]
    );

    res.json({
      progress: {
        overall: {
          ...(overallResult.rows[0] || {}),
          total_active_seconds: sessionStats.rows[0]?.total_active_seconds || 0,
        },
        courses: courseProgress.rows,
        activities: activityStats.rows[0] || {},
        quizzes: quizStats.rows[0] || {},
        learning_streak: streakResult.rows[0]?.streak_days || 0,
        total_active_seconds: sessionStats.rows[0]?.total_active_seconds || 0,
        recent_activity: recentActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/feedback
 * Get instructor feedback for a child's work
 */
async function getChildFeedback(req, res, next) {
  try {
    const { id } = req.params;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query(
      `SELECT 
        asub.id as submission_id,
        asub.feedback,
        asub.score,
        a.max_score,
        asub.reviewed_at as feedback_date,
        a.title as activity_title,
        l.title as lesson_title,
        c.title as course_title,
        u.full_name as instructor_name,
        u.email as instructor_email
       FROM activity_submissions asub
       JOIN activities a ON a.id = asub.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN instructors ins ON ins.id = asub.reviewed_by
       LEFT JOIN users u ON u.id = ins.user_id
       WHERE asub.student_id = $1 AND asub.feedback IS NOT NULL AND asub.feedback != ''
       ORDER BY asub.reviewed_at DESC NULLS LAST, asub.submitted_at DESC`,
      [id]
    );

    res.json({ feedback: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/children/:id/achievements
 * Get real achievements unlocked by the child
 */
async function getChildAchievements(req, res, next) {
  try {
    const { id } = req.params;

    const verification = await verifyParentChild(req.user.id, id);
    if (!verification.success) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const [subCount, quizStats, vidCount, lessonCount, streakRes] = await Promise.all([
      query('SELECT COUNT(DISTINCT activity_id)::int as cnt FROM activity_submissions WHERE student_id = $1', [id]),
      query('SELECT COUNT(DISTINCT quiz_id)::int as cnt, COALESCE(MAX(score * 100.0 / NULLIF(total_points, 0)), 0) as max_pct FROM quiz_results WHERE student_id = $1', [id]),
      query('SELECT COUNT(DISTINCT video_id)::int as cnt FROM video_watches WHERE student_id = $1', [id]),
      query("SELECT COUNT(*)::int as cnt FROM progress WHERE student_id = $1 AND lesson_id IS NOT NULL AND status = 'completed'", [id]),
      query(`
        WITH act_days AS (
          SELECT DISTINCT DATE(submitted_at) as d FROM activity_submissions WHERE student_id = $1
          UNION
          SELECT DISTINCT DATE(submitted_at) as d FROM quiz_results WHERE student_id = $1
          UNION
          SELECT DISTINCT DATE(watched_at) as d FROM video_watches WHERE student_id = $1
        )
        SELECT COUNT(*)::int as cnt FROM act_days WHERE d >= CURRENT_DATE - INTERVAL '14 days'
      `, [id]),
    ]);

    const activitiesDone = subCount.rows[0]?.cnt || 0;
    const quizzesDone = quizStats.rows[0]?.cnt || 0;
    const maxQuizPct = Number(quizStats.rows[0]?.max_pct || 0);
    const videosWatched = vidCount.rows[0]?.cnt || 0;
    const lessonsDone = lessonCount.rows[0]?.cnt || 0;
    const streak = streakRes.rows[0]?.cnt || 0;

    const achievements = [
      {
        id: 'first_lesson',
        name: 'First Lesson Completed',
        icon: '⭐',
        description: 'Complete your first educational lesson',
        earned: lessonsDone >= 1,
      },
      {
        id: 'activity_explorer',
        name: 'Activity Explorer',
        icon: '✨',
        description: 'Complete 5 learning activities',
        earned: activitiesDone >= 5,
      },
      {
        id: 'super_learner',
        name: 'Super Learner',
        icon: '🚀',
        description: 'Complete 10 learning activities',
        earned: activitiesDone >= 10,
      },
      {
        id: 'quiz_master',
        name: 'Quiz Master',
        icon: '🧠',
        description: 'Score 90% or higher on a quiz',
        earned: maxQuizPct >= 90,
      },
      {
        id: 'perfect_score',
        name: 'Perfect Score',
        icon: '💯',
        description: 'Achieve 100% on any quiz',
        earned: maxQuizPct >= 100,
      },
      {
        id: 'video_master',
        name: 'Video Explorer',
        icon: '🎬',
        description: 'Watch 3 educational videos',
        earned: videosWatched >= 3,
      },
      {
        id: 'learning_flame',
        name: 'Learning Flame',
        icon: '🔥',
        description: 'Maintain a 3-day learning streak',
        earned: streak >= 3,
      },
    ];

    res.json({
      achievements,
      stats: {
        activities_completed: activitiesDone,
        quizzes_completed: quizzesDone,
        lessons_completed: lessonsDone,
        streak_days: streak,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * GET /api/parent/dashboard-stats
 * Comprehensive summary stats for Parent Dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].id;

    const [childrenStats, activityStats, progressStats, notificationStats, feedbackStats] = await Promise.all([
      query(
        `SELECT 
          (
            (SELECT COUNT(*)::int FROM students WHERE parent_id = $1) +
            (SELECT COUNT(*)::int FROM student_registration_requests WHERE parent_id = $1 AND status = 'pending')
          ) as total_children,
          (
            (SELECT COUNT(*)::int FROM students WHERE parent_id = $1 AND user_id IS NULL) +
            (SELECT COUNT(*)::int FROM student_registration_requests WHERE parent_id = $1 AND status = 'pending' AND age < 10)
          ) as parent_managed,
          (SELECT COUNT(*)::int FROM student_registration_requests WHERE parent_id = $1 AND status = 'pending') as pending_approvals
        `,
        [parentId]
      ),
      query(
        `SELECT 
          COUNT(asub.id) FILTER (WHERE asub.status = 'pending')::int as pending_activities,
          COUNT(asub.id) FILTER (WHERE asub.status = 'graded')::int as graded_activities,
          COUNT(asub.id)::int as total_submissions
         FROM students s
         JOIN activity_submissions asub ON asub.student_id = s.id
         WHERE s.parent_id = $1`,
        [parentId]
      ),
      query(
        `SELECT 
          COALESCE(ROUND(AVG(p.completion_percentage)), 0)::int as avg_progress,
          COUNT(p.id) FILTER (WHERE p.status = 'completed' AND p.lesson_id IS NOT NULL)::int as completed_lessons
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
      query(
        `SELECT 
          asub.feedback, asub.score, a.title as activity_title,
          c.title as course_title, u.full_name as instructor_name,
          s.full_name as child_name, asub.reviewed_at as date
         FROM students s
         JOIN activity_submissions asub ON asub.student_id = s.id
         JOIN activities a ON a.id = asub.activity_id
         JOIN lessons l ON l.id = a.lesson_id
         JOIN courses c ON c.id = l.course_id
         LEFT JOIN instructors ins ON ins.id = asub.reviewed_by
         LEFT JOIN users u ON u.id = ins.user_id
         WHERE s.parent_id = $1 AND asub.feedback IS NOT NULL AND asub.feedback != ''
         ORDER BY asub.reviewed_at DESC NULLS LAST
         LIMIT 3`,
        [parentId]
      ),
    ]);

    // Children overview cards (approved students + pending registration requests)
    const [approvedSummary, pendingSummary] = await Promise.all([
      query(
        `SELECT 
          s.id::text as id, s.full_name, s.profile_image_url as profile_picture, s.date_of_birth, s.user_id,
          ag.name as age_group_name,
          'approved' as account_status,
          (SELECT COUNT(DISTINCT c.id)::int FROM courses c WHERE c.age_group_id = s.age_group_id AND c.status = 'published') as courses_count,
          (SELECT COUNT(*)::int FROM progress pr WHERE pr.student_id = s.id AND pr.status = 'completed' AND pr.lesson_id IS NOT NULL) as completed_lessons,
          COALESCE(ROUND(AVG(p.completion_percentage)), 0)::int as avg_progress,
          (SELECT MAX(last_accessed_at) FROM progress WHERE student_id = s.id) as last_activity
         FROM students s
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN age_groups ag ON ag.id = s.age_group_id
         LEFT JOIN progress p ON p.student_id = s.id
         WHERE s.parent_id = $1
         GROUP BY s.id, s.full_name, s.profile_image_url, s.date_of_birth, s.user_id, ag.name, u.is_active
         ORDER BY s.date_of_birth DESC`,
        [parentId]
      ),
      query(
        `SELECT 
          ('req_' || sr.id::text) as id,
          sr.student_full_name as full_name,
          sr.student_photo_url as profile_picture,
          sr.date_of_birth,
          (CASE WHEN sr.student_email IS NOT NULL THEN 'pending_account' ELSE NULL END) as user_id,
          (CASE WHEN sr.age BETWEEN 5 AND 7 THEN '5-7' WHEN sr.age BETWEEN 8 AND 9 THEN '8-9' ELSE '10-12' END) as age_group_name,
          sr.status as account_status,
          0 as courses_count,
          0 as completed_lessons,
          0 as avg_progress,
          sr.submitted_at as last_activity
         FROM student_registration_requests sr
         WHERE sr.parent_id = $1 AND sr.status = 'pending'
         ORDER BY sr.submitted_at DESC`,
        [parentId]
      ),
    ]);

    const combinedSummary = [...approvedSummary.rows, ...pendingSummary.rows];

    res.json({
      stats: {
        children: childrenStats.rows[0] || {},
        activities: activityStats.rows[0] || {},
        progress: progressStats.rows[0] || {},
        notifications: notificationStats.rows[0] || {},
      },
      recent_feedback: feedbackStats.rows,
      children_summary: combinedSummary,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// NOTIFICATIONS & INSTRUCTORS
// ============================================================================

/**
 * GET /api/parent/notifications
 * Get parent notifications
 */
async function getNotifications(req, res, next) {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({
      notifications: result.rows,
      unread_count: unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/parent/notifications/:id/read
 * Mark notification as read
 */
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parent/instructors
 * Get instructors who teach the parent's children
 */
async function getInstructorsForParent(req, res, next) {
  try {
    const parentResult = await query(
      `SELECT id FROM parents WHERE user_id = $1`,
      [req.user.id]
    );

    if (parentResult.rows.length === 0) {
      return res.json({ instructors: [] });
    }

    const parentId = parentResult.rows[0].id;

    const result = await query(
      `SELECT DISTINCT
        i.id,
        u.full_name,
        u.email,
        i.qualification,
        i.specialty,
        i.bio,
        c.id as course_id,
        c.title as course_title,
        s.id as student_id,
        s.full_name as student_name
       FROM students s
       JOIN courses c ON c.age_group_id = s.age_group_id AND c.status = 'published'
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE s.parent_id = $1 AND s.is_active = TRUE
       ORDER BY u.full_name ASC`,
      [parentId]
    );

    res.json({ instructors: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getChildren,
  getChildById,
  updateChild,
  registerChild,
  getChildCourses,
  getChildLessons,
  getChildMaterials,
  getChildActivities,
  submitChildActivity,
  getChildQuizzes,
  getChildProgress,
  getChildFeedback,
  getChildAchievements,
  getDashboardStats,
  getNotifications,
  markNotificationRead,
  getInstructorsForParent,
};

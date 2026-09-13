# Student Portal Testing Guide

## Server Status ✅
- **Backend**: http://localhost:5000 - RUNNING
- **Frontend**: http://localhost:5173 - RUNNING
- **Database**: PostgreSQL localhost:5432/learning_hub - CONNECTED

## Database Fixes Applied ✅

### Column Name Corrections:
1. ✅ Fixed `activity_submissions`:
   - `submitted_content` → `submission_text`
   - `file_url` → `submission_url`
   - Added `submitted_by` field with value 'student'

2. ✅ Fixed `quiz_results`:
   - Removed non-existent `status` column
   - Changed `answers_json` → `answers`
   - Used `submitted_at` for timestamps

3. ✅ Fixed learning streak query:
   - Changed `created_at` → `submitted_at` in activity_submissions
   - Both tables now use `submitted_at` consistently

## Test Data Available

### Test Student Account:
- **Email**: ft12@gmail.com
- **Role**: student
- **Student ID**: 4
- **Age Group**: 10-12 (ID: 3)

### Available Content:
- **Course**: "civics" (ID: 4, Status: published)
- **Lesson**: "what is Civics" (ID: 1)

---

## Testing Steps

### 1. Login as Student
```
URL: http://localhost:5173/login
Email: ft12@gmail.com
Password: [Your test password]
```

**Expected Result:**
- Redirect to `/student/dashboard`
- See colorful student layout with navigation

---

### 2. Test Dashboard
**URL**: http://localhost:5173/student/dashboard

**What to Check:**
- ✅ Welcome banner displays
- ✅ Stats cards show correct numbers:
  - Available Courses: 1
  - Lessons to Explore: 1
  - Activities Done: (varies)
  - Quizzes Completed: (varies)
- ✅ Learning streak shows (if activity submitted recently)
- ✅ "Continue Learning" section displays lesson
- ✅ Recent courses grid shows "civics" course
- ✅ No errors in browser console

**API Call:**
```
GET /api/students/dashboard
```

---

### 3. Test Courses List
**URL**: http://localhost:5173/student/courses

**What to Check:**
- ✅ "civics" course card displays
- ✅ Course thumbnail/placeholder shows
- ✅ Lesson count shows "1"
- ✅ Activity and quiz counts display
- ✅ Age group badge shows "10-12"
- ✅ "Start Learning" button works
- ✅ No errors

**API Call:**
```
GET /api/students/courses
```

---

### 4. Test Course Detail
**URL**: http://localhost:5173/student/courses/4

**What to Check:**
- ✅ Course header with title "civics"
- ✅ Course description displays
- ✅ Stats boxes show correct counts
- ✅ Lessons list shows "what is Civics"
- ✅ Lesson card is clickable
- ✅ Back button works
- ✅ No errors

**API Call:**
```
GET /api/students/courses/4
```

---

### 5. Test Lesson View
**URL**: http://localhost:5173/student/lessons/1

**What to Check:**
- ✅ Lesson title "what is Civics" displays
- ✅ Three tabs visible: Materials, Activities, Quizzes
- ✅ Tab counters show item counts
- ✅ Materials tab content displays
- ✅ Activities tab shows activities (if any exist)
- ✅ Quizzes tab shows quizzes (if any exist)
- ✅ Back button works
- ✅ No errors

**API Call:**
```
GET /api/students/lessons/1
```

---

### 6. Test Activity Submission (If Activities Exist)
**URL**: http://localhost:5173/student/activities/:id

**What to Check:**
- ✅ Activity instructions display
- ✅ Text area for answer input
- ✅ File URL field (optional)
- ✅ Submit button works
- ✅ Success message after submission
- ✅ Status changes to "Pending Review"
- ✅ Can update submission before grading
- ✅ Cannot edit after grading

**API Calls:**
```
GET /api/students/activities/:id
POST /api/students/activities/:id/submit
```

---

### 7. Test Quiz Taking (If Quizzes Exist)
**URL**: http://localhost:5173/student/quizzes/:id

**What to Check:**
- ✅ Quiz title and description display
- ✅ Timer countdown (if time limit set)
- ✅ Questions display with proper formatting
- ✅ Can select answers
- ✅ Submit button validates all questions answered
- ✅ Results page shows score and percentage
- ✅ Pass/fail message displays
- ✅ Cannot retake (shows previous result)

**API Calls:**
```
GET /api/students/quizzes/:id
POST /api/students/quizzes/:id/submit
```

---

### 8. Test Progress Page
**URL**: http://localhost:5173/student/progress

**What to Check:**
- ✅ Overall stats cards display
- ✅ Progress bars show percentages
- ✅ Course-by-course breakdown visible
- ✅ "civics" course shows in list
- ✅ Progress bars animated
- ✅ Click course redirects to detail
- ✅ No errors

**API Call:**
```
GET /api/students/progress
```

---

### 9. Test Notifications
**URL**: http://localhost:5173/student/notifications

**What to Check:**
- ✅ Notifications list displays (or empty state)
- ✅ Unread count shows in badge
- ✅ Click notification marks as read
- ✅ Yellow dot indicator for unread
- ✅ Timestamp displays correctly
- ✅ No errors

**API Calls:**
```
GET /api/students/notifications
PATCH /api/students/notifications/:id/read
```

---

## Common Issues to Check

### If Dashboard Shows "Internal Server Error":
1. Check backend logs for SQL errors
2. Verify student has age_group_id
3. Check if courses exist for that age group

### If Courses Don't Load:
1. Verify courses have `status = 'published'`
2. Check course age_group_id matches student's
3. Verify instructor_id exists in instructors table

### If Activities/Quizzes Don't Show:
1. Check if lesson has activities/quizzes in database
2. Verify foreign keys are correct
3. Check lesson_id in activities/quizzes table

### If Submission Fails:
1. Check `submitted_by` enum value ('student' vs 'parent')
2. Verify student has access to activity/quiz
3. Check age group matching

---

## Browser Console Checks

### Expected Successful API Calls:
```
✅ GET /api/students/dashboard → 200 OK
✅ GET /api/students/courses → 200 OK
✅ GET /api/students/courses/4 → 200 OK
✅ GET /api/students/lessons/1 → 200 OK
✅ GET /api/students/progress → 200 OK
✅ GET /api/students/notifications → 200 OK
```

### Common Error Codes:
- **401 Unauthorized**: Not logged in or token expired
- **403 Forbidden**: Wrong role or age group mismatch
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: SQL error or missing data

---

## Creating Test Data

### To Create Activities for Testing:
```sql
INSERT INTO activities (course_id, lesson_id, title, description, type, max_score)
VALUES (4, 1, 'Test Activity', 'Answer this question about civics', 'text', 100);
```

### To Create Quizzes for Testing:
```sql
-- Create quiz
INSERT INTO quizzes (lesson_id, title, description, passing_score)
VALUES (1, 'Civics Quiz', 'Test your knowledge', 70)
RETURNING id;

-- Create quiz questions (use returned id)
INSERT INTO quiz_questions (quiz_id, question_text, question_type, correct_answer, points)
VALUES 
(1, 'What is civics?', 'short_answer', 'Study of citizenship', 10),
(1, 'Is voting important?', 'true_false', 'True', 10);
```

### To Create Materials for Testing:
```sql
INSERT INTO learning_materials (lesson_id, title, type, content)
VALUES (1, 'Introduction to Civics', 'document', 'Civics is the study of the rights and duties of citizenship...');
```

---

## Manual API Testing (Postman/Thunder Client)

### Get JWT Token First:
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "ft12@gmail.com",
  "password": "your_password"
}
```
Copy the `token` from response.

### Test Dashboard:
```
GET http://localhost:5000/api/students/dashboard
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

### Test Courses:
```
GET http://localhost:5000/api/students/courses
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

### Test Activity Submission:
```
POST http://localhost:5000/api/students/activities/1/submit
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
Body: {
  "submitted_content": "My answer here",
  "file_url": "https://example.com/file.pdf"
}
```

### Test Quiz Submission:
```
POST http://localhost:5000/api/students/quizzes/1/submit
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
Body: {
  "answers": {
    "1": "Study of citizenship",
    "2": "True"
  }
}
```

---

## Success Criteria ✅

### Minimal Working Flow:
1. ✅ Login as student
2. ✅ See dashboard with stats
3. ✅ Click "My Courses" → see course list
4. ✅ Click course → see lessons
5. ✅ Click lesson → see tabs (materials/activities/quizzes)
6. ✅ No console errors
7. ✅ UI is child-friendly and colorful

### Full Feature Testing:
1. ✅ Submit activity → see pending status
2. ✅ Take quiz → see score results
3. ✅ Check progress → see completion bars
4. ✅ View notifications → mark as read
5. ✅ Navigation works smoothly
6. ✅ All pages responsive (mobile/tablet/desktop)

---

## Next Steps After Testing

### If Everything Works:
1. Add more test data (courses, lessons, activities, quizzes)
2. Test instructor grading flow
3. Test parent viewing child's progress
4. Add real course content
5. Deploy to production

### If Issues Found:
1. Check backend logs in terminal
2. Check browser console for errors
3. Verify database schema matches code
4. Review API endpoint logic
5. Test with Postman/Thunder Client to isolate issue

---

## Quick Debug Commands

### Check Backend Logs:
```powershell
# In project root
Get-Content backend logs or check terminal running backend
```

### Check Database Connection:
```powershell
$env:PGPASSWORD='4512'; psql -U postgres -d learning_hub -c "SELECT COUNT(*) FROM students;"
```

### Restart Servers:
```powershell
# Kill and restart if needed
# Backend: Ctrl+C in backend terminal, then: npm run dev
# Frontend: Ctrl+C in frontend terminal, then: npm run dev
```

### Check API Response:
```powershell
curl http://localhost:5000/api/students/courses -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Testing Date**: Current Session
**Status**: Ready for Testing
**Priority**: Test Dashboard → Courses → Lessons flow first

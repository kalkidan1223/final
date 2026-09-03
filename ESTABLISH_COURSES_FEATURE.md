# Establish Courses for Age Groups Feature

## Overview
This feature implements a **two-step workflow** for managing instructor course assignments:

1. **Step 1 (Admin)**: Admin establishes which courses are available for each age group
2. **Step 2 (Admin)**: Admin assigns instructors to teach specific established courses

This ensures better organization and prevents confusion by clearly defining what courses exist for each age group before assigning instructors.

## Why This Approach?

### Problem Solved:
- **Before**: Instructors were assigned to generic courses without clear definition of what courses exist for each age group
- **After**: Admin first defines "5-7 year olds learn: Amharic, English, Math" then assigns instructors to teach those specific courses

### Benefits:
1. **Clear Curriculum Structure**: Each age group has a defined set of courses
2. **Better Organization**: Courses are established before instructor assignment
3. **Easier Management**: View and manage what courses are available per age group
4. **Prevents Errors**: Instructors can only be assigned to established courses
5. **Scalability**: Easy to add new courses or modify curriculum per age group

## Implementation Details

### Database Changes

#### Migration: `010_age_group_available_courses.sql`
Created new table to store established courses:

**Table: `age_group_available_courses`**
- `id` - Primary key
- `age_group_id` - Foreign key to age_groups table
- `course_title` - Name of the course (e.g., "Amharic Basics", "English Reading")
- `course_description` - Optional description
- `is_active` - Boolean flag to enable/disable courses
- `established_by` - Which admin created this course
- `established_at` - Timestamp when established
- `updated_at` - Last modification time
- **Unique constraint** on (`age_group_id`, `course_title`)

### Backend Implementation

#### New Controller: `ageGroupCoursesController.js`
Handles all CRUD operations for available courses:

1. **`listAvailableCourses()`**
   - GET `/admin/age-groups/:id/available-courses`
   - Returns all established courses for an age group

2. **`addAvailableCourse()`**
   - POST `/admin/age-groups/:id/available-courses`
   - Adds a single course to an age group
   - Validates course title length
   - Prevents duplicate courses

3. **`updateAvailableCourse()`**
   - PATCH `/admin/age-groups/:ageGroupId/available-courses/:courseId`
   - Updates course title, description, or active status

4. **`deleteAvailableCourse()`**
   - DELETE `/admin/age-groups/:ageGroupId/available-courses/:courseId`
   - Removes a course from age group

5. **`bulkAddAvailableCourses()`**
   - POST `/admin/age-groups/:id/available-courses/bulk`
   - Adds multiple courses at once
   - Skips duplicates automatically

#### Routes Added: `adminRoutes.js`
```javascript
router.get('/age-groups/:id/available-courses', ...)
router.post('/age-groups/:id/available-courses', ...)
router.post('/age-groups/:id/available-courses/bulk', ...)
router.patch('/age-groups/:ageGroupId/available-courses/:courseId', ...)
router.delete('/age-groups/:ageGroupId/available-courses/:courseId', ...)
```

### Frontend Implementation

#### Enhanced: `AdminAgeGroups.jsx`
Added "Establish Courses" functionality:

**New Component: `EstablishCoursesModal`**
- Opens when admin clicks "Establish Courses" button on age group card
- Features:
  - **Add Course Form**: Input for course title and description
  - **Course List**: Shows all established courses for the age group
  - **Activate/Deactivate**: Toggle course availability
  - **Delete**: Remove courses
  - **Real-time Updates**: List refreshes immediately after changes

**UI Changes:**
- New "Establish Courses" button on each age group card (violet)
- Icons added: MdSchool for courses, MdEdit for edit, MdDelete for delete
- Better visual hierarchy with colored buttons

#### Updated: `AdminInstructors.jsx`
Modified instructor assignment to use established courses:

**Changes:**
1. **Course Loading Logic**:
   - Changed from loading all courses to loading only established courses
   - Loads available courses per selected age group
   - `loadOptions()` now only loads age groups
   - New `useEffect` hook loads courses when age groups are selected

2. **UI Improvements**:
   - Shows warning if no age groups selected
   - Shows info message if no courses established for selected age groups
   - Course list includes course description
   - Clear guidance to establish courses first

3. **Edit Modal Updated**:
   - Same logic as create form
   - Loads available courses dynamically based on selected age groups
   - Pre-selects existing assignments

## User Workflow

### Step 1: Establish Courses for Age Groups

1. Admin logs in and navigates to **Age Groups** page
2. Clicks **"Establish Courses"** button on an age group (e.g., "5-7")
3. Modal opens showing established courses (empty initially)
4. Admin adds courses one by one:
   - Enter course title: "Amharic Basics"
   - Enter description: "Introduction to Amharic alphabet and basic words"
   - Click "Add Course"
5. Course appears in the list below
6. Admin adds more courses:
   - "English Reading"
   - "Basic Mathematics"
   - "General Knowledge"
7. Admin can:
   - **Activate/Deactivate** courses (temporarily disable without deleting)
   - **Delete** courses no longer needed
8. Click "Done" when finished

**Example Result:**
- Age Group "5-7" now has established courses:
  ✓ Amharic Basics
  ✓ English Reading
  ✓ Basic Mathematics
  ✓ General Knowledge

### Step 2: Assign Instructors to Teach Established Courses

1. Admin navigates to **Instructors** page
2. Clicks **"Add Instructor"** or **"Edit"** on existing instructor
3. Fills in instructor details
4. Selects age groups (e.g., "5-7" and "8-10")
5. Course list automatically shows **only established courses** from those age groups
6. If no courses established, shows helpful message:
   "ℹ️ No courses have been established for the selected age groups yet. Go to Age Groups page and click 'Establish Courses'."
7. Admin selects which courses the instructor will teach
8. Submits form

**Result:**
- Instructor "Sara Bekele" is assigned to teach:
  - Age Groups: 5-7, 8-10
  - Courses: Amharic Basics, English Reading (from 5-7), Advanced Math (from 8-10)

## API Endpoints

### Establish Courses

#### GET `/api/admin/age-groups/:id/available-courses`
**Purpose**: List all established courses for an age group

**Response:**
```json
{
  "available_courses": [
    {
      "id": 1,
      "age_group_id": 2,
      "course_title": "Amharic Basics",
      "course_description": "Introduction to Amharic alphabet",
      "is_active": true,
      "established_by": 1,
      "established_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/api/admin/age-groups/:id/available-courses`
**Purpose**: Add a single course to an age group

**Request:**
```json
{
  "course_title": "English Reading",
  "course_description": "Basic reading skills and vocabulary"
}
```

**Response:**
```json
{
  "available_course": {
    "id": 2,
    "age_group_id": 2,
    "course_title": "English Reading",
    "course_description": "Basic reading skills and vocabulary",
    "is_active": true,
    "established_by": 1,
    "established_at": "2024-01-15T10:05:00Z"
  }
}
```

#### POST `/api/admin/age-groups/:id/available-courses/bulk`
**Purpose**: Add multiple courses at once

**Request:**
```json
{
  "courses": [
    { "course_title": "Mathematics", "course_description": "Basic counting and numbers" },
    { "course_title": "Science", "course_description": "Introduction to natural world" }
  ]
}
```

**Response:**
```json
{
  "added_count": 2,
  "courses": [...]
}
```

#### PATCH `/api/admin/age-groups/:ageGroupId/available-courses/:courseId`
**Purpose**: Update course details or toggle active status

**Request:**
```json
{
  "is_active": false
}
```

#### DELETE `/api/admin/age-groups/:ageGroupId/available-courses/:courseId`
**Purpose**: Remove a course from age group

## Database Queries

### Get available courses for age group:
```sql
SELECT * FROM age_group_available_courses 
WHERE age_group_id = ? AND is_active = TRUE
ORDER BY course_title
```

### Add new course:
```sql
INSERT INTO age_group_available_courses 
(age_group_id, course_title, course_description, established_by)
VALUES (?, ?, ?, ?)
RETURNING *
```

## Testing Steps

### Part 1: Establish Courses

1. **Login as Admin**
2. **Navigate to Age Groups page**
3. **Click "Establish Courses"** on "5-7" age group
4. **Add first course**:
   - Title: "Amharic Basics"
   - Description: "Learn Amharic alphabet"
   - Click "Add Course"
   - Verify course appears in list
5. **Add more courses**:
   - "English Reading"
   - "Basic Mathematics"
   - "General Knowledge"
6. **Test Deactivate**:
   - Click "Deactivate" on "General Knowledge"
   - Verify status changes to "Inactive"
7. **Test Delete**:
   - Click Delete icon on one course
   - Confirm deletion
   - Verify course removed
8. **Click "Done"** to close modal

### Part 2: Assign Instructors

1. **Navigate to Instructors page**
2. **Click "Add Instructor"**
3. **Fill basic info**
4. **Select age group "5-7"**
   - Verify course list shows only courses from step 1
   - Verify only active courses appear
5. **Select courses to assign**
6. **Submit form**
7. **Verify instructor created** with correct assignments

### Part 3: Edit Assignments

1. **Click "Edit"** on created instructor
2. **Add another age group**
   - If that age group has no established courses, verify helpful message appears
3. **Change course selections**
4. **Save**
5. **Verify changes** by clicking "View"

## Files Modified/Created

### Backend:
- ✨ `backend/migrations/010_age_group_available_courses.sql` (NEW)
- ✨ `backend/src/controllers/ageGroupCoursesController.js` (NEW)
- `backend/src/routes/adminRoutes.js` (added 5 new routes)

### Frontend:
- `frontend/src/pages/admin/AdminAgeGroups.jsx` (added EstablishCoursesModal component)
- `frontend/src/pages/admin/AdminInstructors.jsx` (updated course loading logic)

## Migration Instructions

```bash
cd backend
$env:PGPASSWORD='your-db-password'
psql -U postgres -d learning_hub -f migrations/010_age_group_available_courses.sql
```

## Benefits Summary

✅ **Clear Curriculum Structure**: Each age group has defined courses
✅ **Better Organization**: Two-step workflow (establish → assign)
✅ **Prevents Errors**: Can't assign undefined courses
✅ **Easy Management**: View all courses per age group in one place
✅ **Flexible**: Activate/deactivate courses without deletion
✅ **Scalable**: Easy to add new courses or reorganize curriculum
✅ **User-Friendly**: Helpful messages guide admins through the process
✅ **Audit Trail**: Tracks who established each course and when

## Servers Running

- **Backend**: http://localhost:5000 ✓
- **Frontend**: http://localhost:5173 ✓

The feature is **fully functional and ready to use**!

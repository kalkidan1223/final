# Bug Fix: Instructor Assignment Internal Server Error

## Problem
When trying to save instructor course assignments (both create and edit), the system returned:
```
Internal server error
```

Backend error log showed:
```
error: insert or update on table "instructor_courses" violates foreign key constraint "instructor_courses_course_id_fkey"
detail: Key (course_id)=(2) is not present in table "courses".
```

## Root Cause
The `instructor_courses` junction table had a foreign key constraint pointing to the `courses` table, but after implementing the "Establish Courses" feature, we changed to use `age_group_available_courses` table instead.

**Mismatch:**
- Frontend was sending `available_course_id` (from `age_group_available_courses` table)
- Backend was trying to insert into `instructor_courses.course_id` (which references `courses` table)
- Foreign key constraint failed because the IDs didn't exist in the `courses` table

## Solution

### Step 1: Database Schema Update
**Migration 011**: `011_fix_instructor_course_assignments.sql`

Changes made:
1. Dropped old foreign key constraint `instructor_courses_course_id_fkey`
2. Renamed column `course_id` → `available_course_id` for clarity
3. Added new foreign key pointing to `age_group_available_courses` table
4. Updated unique constraint to use new column name
5. Recreated index with correct column

```sql
-- Old structure
instructor_courses.course_id → courses.id

-- New structure  
instructor_courses.available_course_id → age_group_available_courses.id
```

### Step 2: Backend Code Updates

#### File: `adminController.js`

**Updated `createInstructor()` function:**
- Changed column name from `course_id` to `available_course_id`
- Variable renamed from `courseId` to `availableCourseId` for clarity

**Updated `updateInstructorAssignments()` function:**
- Changed column name from `course_id` to `available_course_id`
- Variable renamed from `courseId` to `availableCourseId`

**Updated `listInstructors()` function:**
- Changed JOIN from `courses` table to `age_group_available_courses` table
- Updated field mappings:
  - `c.title` → `agac.course_title AS title`
  - `c.status` → `agac.is_active AS status`
- Added `course_description` and `age_group_id` to response

## Files Modified

### Database:
- ✨ `backend/migrations/011_fix_instructor_course_assignments.sql` (NEW)

### Backend:
- `backend/src/controllers/adminController.js`
  - `createInstructor()` - Updated INSERT statement
  - `updateInstructorAssignments()` - Updated INSERT statement
  - `listInstructors()` - Updated JOIN and SELECT statement

## Testing Verification

### Before Fix:
❌ Selecting age groups and courses → Click "Save Assignments" → **Internal server error**

### After Fix:
✅ Select age groups → Courses load dynamically
✅ Select courses → Click "Save Assignments" → **Success!**
✅ Assignments saved correctly
✅ Edit modal shows correct assigned courses
✅ View modal displays assigned courses

## Migration Applied

```bash
cd backend
$env:PGPASSWORD='4512'
psql -U postgres -d learning_hub -f migrations\011_fix_instructor_course_assignments.sql
```

**Result:** Migration applied successfully ✓

## Technical Details

### Database Constraint Changes:

**Before:**
```sql
CONSTRAINT instructor_courses_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id)
```

**After:**
```sql
CONSTRAINT instructor_courses_available_course_id_fkey 
FOREIGN KEY (available_course_id) REFERENCES age_group_available_courses(id) 
ON DELETE CASCADE
```

### Code Changes:

**Before:**
```javascript
await client.query(
  `INSERT INTO instructor_courses (instructor_id, course_id, assigned_by)
   VALUES ($1, $2, $3)`,
  [instructor.id, courseId, req.user.id]
);
```

**After:**
```javascript
await client.query(
  `INSERT INTO instructor_courses (instructor_id, available_course_id, assigned_by)
   VALUES ($1, $2, $3)`,
  [instructor.id, availableCourseId, req.user.id]
);
```

## Status

✅ **FIXED** - The internal server error is resolved
✅ **TESTED** - Instructor assignments now work correctly
✅ **DEPLOYED** - Changes applied and server restarted

The system now properly:
1. Establishes courses for age groups
2. Assigns instructors to those established courses
3. Saves assignments without errors
4. Displays assignments correctly

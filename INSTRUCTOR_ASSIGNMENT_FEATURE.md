# Instructor Course and Age Group Assignment Feature

## Overview
This feature allows administrators to assign specific courses and age groups to instructors during account creation. Once assigned, instructors can only create courses and teach content for their assigned age groups.

## Implementation Details

### Database Changes

#### Migration: `009_instructor_assignments.sql`
Created two junction tables to manage instructor assignments:

1. **instructor_age_groups**
   - Links instructors to age groups they can teach
   - Fields: `id`, `instructor_id`, `age_group_id`, `assigned_at`, `assigned_by`
   - Unique constraint on (`instructor_id`, `age_group_id`)

2. **instructor_courses**
   - Links instructors to courses they can teach
   - Fields: `id`, `instructor_id`, `course_id`, `assigned_at`, `assigned_by`
   - Unique constraint on (`instructor_id`, `course_id`)

### Backend Changes

#### `adminController.js` - `createInstructor()`
- **Added parameters**: `assigned_age_groups`, `assigned_courses` (arrays of IDs)
- **New logic**: After creating instructor record, inserts assignments into junction tables
- **Tracks assignment**: Records which admin (`assigned_by`) made the assignment

#### `adminController.js` - `updateInstructorAssignments()` ✨ NEW
- **Purpose**: Update existing instructor's age group and course assignments
- **Method**: PATCH `/api/admin/instructors/:id/assignments`
- **Logic**: 
  - Deletes all existing assignments
  - Inserts new assignments within a transaction
  - Tracks which admin made the changes
- **Validates**: Checks if instructor exists before updating

#### `adminController.js` - `listInstructors()`
- **Enhanced response**: Now includes `assigned_age_groups` and `assigned_courses` arrays for each instructor
- **Fetches related data**: Joins with age_groups and courses tables to provide full details

#### `coursesController.js` - `createCourse()`
- **Added validation**: Checks if instructor is assigned to the selected age group
- **Error handling**: Returns 403 with clear message if instructor tries to create course for unassigned age group
- **Query**: `SELECT FROM instructor_age_groups WHERE instructor_id = ? AND age_group_id = ?`

#### `adminRoutes.js`
- **New route**: `PATCH /admin/instructors/:id/assignments`
- **Authorization**: Requires admin role

### Frontend Changes

#### `AdminInstructors.jsx`
Enhanced instructor creation and editing with:

1. **Age Group Multi-Select** (Create & Edit)
   - Checkbox-based interface for selecting multiple age groups
   - Visual distinction for selected items (violet background)
   - Shows age range for each group (e.g., "5-7 years")

2. **Course Multi-Select** (Create & Edit)
   - Scrollable list (max-height: 60vh) with all available courses
   - **Smart filtering**: Only shows courses from selected age groups
   - Displays course title and associated age group
   - Checkbox-based selection with visual feedback

3. **Edit Assignments Modal** ✨ NEW
   - Separate modal for editing existing instructor assignments
   - Pre-fills with current assignments
   - Same UI as create form but for editing only
   - Accessible via "Edit" button on instructor cards

4. **Instructor Card Actions**
   - **View**: Shows instructor details in modal
   - **Edit**: Opens assignment editing modal ✨ NEW
   - **Activate/Deactivate**: Toggle instructor status

5. **Data Loading**
   - Fetches age groups from `/age-groups`
   - Fetches courses from `/admin/courses?limit=500`
   - Loading states with skeleton placeholders
   - Loads options when form or edit modal opens

6. **Form Submission**
   - Create: Sends `assigned_age_groups` and `assigned_courses` arrays to backend
   - Edit: Sends updated assignments to `/admin/instructors/:id/assignments`
   - Arrays contain the IDs of selected items
   - Success/error feedback with toast messages

### API Endpoints

#### POST `/api/admin/instructors`
**Purpose**: Create new instructor with assignments

**Request Body:**
```json
{
  "full_name": "Sara Bekele",
  "email": "teacher@school.edu",
  "password": "Teacher@123",
  "phone": "0912345678",
  "qualification": "B.Ed. Primary Education",
  "specialty": "Mathematics, English",
  "bio": "Optional bio...",
  "assigned_age_groups": [1, 2],    // Array of age group IDs
  "assigned_courses": [3, 5, 7]     // Array of course IDs
}
```

**Response:**
```json
{
  "user": {
    "id": 15,
    "email": "teacher@school.edu",
    "full_name": "Sara Bekele",
    "role": "instructor",
    "phone": "0912345678"
  },
  "instructor": {
    "id": 8,
    "bio": "Optional bio...",
    "qualification": "B.Ed. Primary Education",
    "specialty": "Mathematics, English",
    "created_at": "2024-01-15T10:30:00Z",
    "assigned_age_groups": [1, 2],
    "assigned_courses": [3, 5, 7]
  }
}
```

#### PATCH `/api/admin/instructors/:id/assignments` ✨ NEW
**Purpose**: Update existing instructor's assignments

**Request Body:**
```json
{
  "assigned_age_groups": [1, 3],    // New array of age group IDs
  "assigned_courses": [3, 7, 9]     // New array of course IDs
}
```

**Response:**
```json
{
  "success": true,
  "message": "Instructor assignments updated successfully",
  "assigned_age_groups": [1, 3],
  "assigned_courses": [3, 7, 9]
}
```

**Features**:
- Replaces all existing assignments with new ones
- Uses transaction to ensure data consistency
- Tracks which admin made the update (`assigned_by`)
- Returns 404 if instructor not found

#### GET `/api/admin/instructors`
**Response includes:**
```json
{
  "instructors": [
    {
      "id": 8,
      "full_name": "Sara Bekele",
      "email": "teacher@school.edu",
      "assigned_age_groups": [
        { "id": 1, "name": "5-7", "min_age": 5, "max_age": 7 },
        { "id": 2, "name": "8-10", "min_age": 8, "max_age": 10 }
      ],
      "assigned_courses": [
        { "id": 3, "title": "Basic Mathematics", "status": "published" },
        { "id": 5, "title": "English Reading", "status": "published" }
      ]
    }
  ]
}
```

## User Experience Flow

### Admin Creating Instructor
1. Admin clicks "Add Instructor" button
2. Fills in basic information (name, email, password, etc.)
3. Selects age groups the instructor can teach (multiple selection)
4. Selects courses from those age groups (filtered list)
5. Submits form
6. System creates instructor account with assignments

### Admin Editing Instructor Assignments ✨ NEW
1. Admin clicks "Edit" button on instructor card
2. Modal opens showing current assignments (pre-selected)
3. Admin modifies age group selections
4. Course list automatically updates based on selected age groups
5. Admin modifies course selections
6. Clicks "Save Assignments"
7. System updates assignments in database
8. Success message displayed
9. Instructor list refreshes with updated data

### Instructor Creating Course
1. Instructor logs in and navigates to "Create Course"
2. Selects age group dropdown
3. **Only sees age groups they're assigned to**
4. If they try to create a course for unassigned age group (via API manipulation):
   - Backend validates assignment
   - Returns 403 error: "You are not assigned to teach this age group"
5. Successfully creates course only for assigned age groups

### Admin Viewing Instructor Details
1. Admin views instructor list
2. Each instructor card shows:
   - Basic info (name, email, status)
   - Three action buttons: View, Edit, Activate/Deactivate
3. Clicking "View" opens modal with:
   - Personal details
   - Assigned age groups (with age ranges)
   - Assigned courses (with status badges)
4. Clicking "Edit" opens assignment editing modal

## Security & Authorization

### Backend Validation
- **Course creation**: Mandatory check against `instructor_age_groups` table
- **Enforcement**: Cannot be bypassed via API manipulation
- **Clear errors**: Users receive informative error messages

### Frontend UX
- **Filtered dropdowns**: Instructors only see their assigned options
- **Visual feedback**: Selected items highlighted in violet
- **Smart filtering**: Course list updates based on selected age groups

## Database Queries

### Check instructor assignment:
```sql
SELECT 1 FROM instructor_age_groups 
WHERE instructor_id = ? AND age_group_id = ?
```

### Get instructor assignments:
```sql
SELECT ag.id, ag.name, ag.min_age, ag.max_age
FROM instructor_age_groups iag
JOIN age_groups ag ON ag.id = iag.age_group_id
WHERE iag.instructor_id = ?
```

### Insert assignment:
```sql
INSERT INTO instructor_age_groups (instructor_id, age_group_id, assigned_by)
VALUES (?, ?, ?)
```

## Testing Steps

1. **Create instructor with assignments**
   - Login as admin
   - Navigate to "Instructors" page
   - Click "Add Instructor"
   - Fill form and select age groups and courses
   - Submit and verify success

2. **Verify assignments**
   - Click "View" on created instructor
   - Verify assigned age groups and courses appear in modal

3. **Edit instructor assignments** ✨ NEW
   - Click "Edit" button on instructor card
   - Modal opens with current assignments pre-selected
   - Change age group selections
   - Verify course list updates automatically
   - Change course selections
   - Click "Save Assignments"
   - Verify success message appears
   - Click "View" to confirm changes were saved

4. **Test instructor restrictions**
   - Login as newly created instructor
   - Try to create course for assigned age group → Should succeed
   - Try to create course for unassigned age group → Should fail with clear error

5. **Test filtering**
   - Select different age groups in create form
   - Verify course list updates to show only relevant courses
   - Same behavior in edit modal

6. **Test edge cases**
   - Create instructor with no assignments
   - Edit instructor to remove all assignments
   - Edit instructor to add assignments for the first time
   - Verify instructor list shows correct data after each change

## Future Enhancements

### Potential improvements:
1. ~~**Edit assignments**: Allow admins to update instructor assignments after creation~~ ✅ IMPLEMENTED
2. **Bulk assignment**: Assign multiple instructors to courses at once
3. **Assignment history**: Track when assignments changed and by whom (partially done - `assigned_by` field exists)
4. **Instructor dashboard**: Show assigned age groups prominently on instructor home page
5. **Reports**: Generate reports on instructor workload and assignments
6. **Notifications**: Alert instructors when assigned to new courses
7. **Copy assignments**: Clone assignments from one instructor to another
8. **Assignment templates**: Create reusable assignment templates for common instructor types

## Files Modified

### Backend:
- `backend/migrations/009_instructor_assignments.sql` (NEW)
- `backend/src/controllers/adminController.js` (createInstructor, listInstructors, updateInstructorAssignments ✨ NEW)
- `backend/src/controllers/coursesController.js` (createCourse)
- `backend/src/routes/adminRoutes.js` (added PATCH /instructors/:id/assignments ✨ NEW)

### Frontend:
- `frontend/src/pages/admin/AdminInstructors.jsx` (added EditAssignmentsModal ✨ NEW, enhanced create form, added Edit button)

## Migration Instructions

To apply this feature to an existing database:

```bash
cd backend
$env:PGPASSWORD='your-db-password'
psql -U postgres -d learning_hub -f migrations/009_instructor_assignments.sql
```

**Note**: Replace `your-db-password` with actual PostgreSQL password from `.env` file.

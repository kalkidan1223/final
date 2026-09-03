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

#### `adminController.js` - `listInstructors()`
- **Enhanced response**: Now includes `assigned_age_groups` and `assigned_courses` arrays for each instructor
- **Fetches related data**: Joins with age_groups and courses tables to provide full details

#### `coursesController.js` - `createCourse()`
- **Added validation**: Checks if instructor is assigned to the selected age group
- **Error handling**: Returns 403 with clear message if instructor tries to create course for unassigned age group
- **Query**: `SELECT FROM instructor_age_groups WHERE instructor_id = ? AND age_group_id = ?`

### Frontend Changes

#### `AdminInstructors.jsx`
Enhanced instructor creation form with:

1. **Age Group Multi-Select**
   - Checkbox-based interface for selecting multiple age groups
   - Visual distinction for selected items (violet background)
   - Shows age range for each group (e.g., "5-7 years")

2. **Course Multi-Select**
   - Scrollable list (max-height: 60vh) with all available courses
   - **Smart filtering**: Only shows courses from selected age groups
   - Displays course title and associated age group
   - Checkbox-based selection with visual feedback

3. **Data Loading**
   - Fetches age groups from `/api/age-groups`
   - Fetches courses from `/api/admin/courses?limit=500`
   - Loading states with skeleton placeholders

4. **Form Submission**
   - Sends `assigned_age_groups` and `assigned_courses` arrays to backend
   - Arrays contain the IDs of selected items

### API Endpoints

#### POST `/api/admin/instructors`
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
2. Each instructor card shows basic info
3. Clicking "View" opens modal with:
   - Personal details
   - Assigned age groups (with age ranges)
   - Assigned courses (with status badges)

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

3. **Test instructor restrictions**
   - Login as newly created instructor
   - Try to create course for assigned age group → Should succeed
   - Try to create course for unassigned age group → Should fail with clear error

4. **Test filtering**
   - Select different age groups in create form
   - Verify course list updates to show only relevant courses

## Future Enhancements

### Potential improvements:
1. **Edit assignments**: Allow admins to update instructor assignments after creation
2. **Bulk assignment**: Assign multiple instructors to courses at once
3. **Assignment history**: Track when assignments changed and by whom
4. **Instructor dashboard**: Show assigned age groups prominently
5. **Reports**: Generate reports on instructor workload and assignments
6. **Notifications**: Alert instructors when assigned to new courses

## Files Modified

### Backend:
- `backend/migrations/009_instructor_assignments.sql` (NEW)
- `backend/src/controllers/adminController.js`
- `backend/src/controllers/coursesController.js`

### Frontend:
- `frontend/src/pages/admin/AdminInstructors.jsx`

## Migration Instructions

To apply this feature to an existing database:

```bash
cd backend
$env:PGPASSWORD='your-db-password'
psql -U postgres -d learning_hub -f migrations/009_instructor_assignments.sql
```

**Note**: Replace `your-db-password` with actual PostgreSQL password from `.env` file.

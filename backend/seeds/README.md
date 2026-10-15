# Seeds

## Basic Curriculum Seed

The `seed_basic_curriculum.js` file creates a minimal sample course structure to demonstrate the system. It creates:

- 1 sample course
- 1 sample lesson  
- Instructor assignment to the course

**Purpose**: This provides a starting point for new deployments without hardcoding any specific curriculum content.

### Usage

```bash
npm run seed:basic
```

### Philosophy

Instead of hardcoding hundreds of lines of specific curriculum content (like Ethiopian Fidel letters, Geez numerals, etc.), this seed creates only the bare minimum structure. Instructors should create their own content through the instructor portal:

1. **Courses**: Create courses through `/instructor/courses`
2. **Lessons**: Add lessons to courses
3. **Activities**: Build activities using the Activity Builder (supports 18+ activity types)
4. **Quizzes**: Create quizzes with multiple question types
5. **Resources**: Upload videos, documents, and other learning materials
6. **Child Home**: Pin activities to make them visible to students

### Benefits

- **Flexibility**: Each deployment can have its own curriculum
- **Maintainability**: No hardcoded content to update in code
- **Localization**: Instructors create content in their own language
- **Real-world**: Content creation happens where it should - in the instructor portal, not in seed files

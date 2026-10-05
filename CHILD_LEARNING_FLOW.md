# Child Portal — Course → Lesson → Resource Learning Flow

This document records the guided learning flow for the Child Portal and the
gaps that were closed in this pass. The database is the single source of truth.

## Hierarchy

```
COURSE  ->  LESSONS (sequential)  ->  ORDERED RESOURCES
```

- `lesson_resources` stores the order (`display_order`), `is_required`, and
  `is_locked` for every resource in a lesson. The instructor controls the order
  (drag / move up-down in `LessonResourceManager`); the child portal always
  renders that exact order — nothing is hard-coded on the frontend.
- A lesson can hold any number and any mix of videos, materials, activities
  and quizzes.

## Completion rules (verified on the backend)

| Resource | Completed when | Enforced by |
|----------|----------------|-------------|
| Video | ≥ 90% genuinely watched (merged, non-overlapping playback intervals) | `student_video_watch_intervals` + `mergeWatchIntervals` |
| Material (audio) | ≥ 90% listened | `student_material_progress.view_percentage` |
| Material (pdf) | ≥ 80% of pages turned | `pages_viewed / total_pages` |
| Material (image/doc) | child confirms after viewing | `view_percentage = 100` |
| Activity | a submission exists (writing → submit → review) | `activity_submissions` |
| Quiz | a **passing** server-graded attempt exists | `student_quiz_attempts.passed` |
| Lesson | every **required** resource is completed (optional ones never block) | `student_lesson_progress` |

Opening/clicking a resource never marks it complete. The client cannot POST a
`completed: true` flag — the backend derives completion itself.

## Sequential unlocking

- **Between lessons only.** Lesson *N* is locked until lesson *N-1*
  (by `order_index`, then `id`) is completed — only when
  `courses.sequential_learning` is on.
- **Never inside a lesson.** Every video / material / activity / quiz inside an
  open lesson is freely accessible, in any order the child chooses. The only
  thing a lock ever gates is the next lesson.
- A lesson becomes *completed* once every **required** resource in it is done
  (optional resources never block). That completion is what unlocks the next
  lesson.

## Server-side enforcement (prompt sections 18, 19, 22)

All of the following now verify access through
`backend/src/utils/learningAccess.js`, so a child cannot bypass the sequence by
typing a URL or calling the API directly:

- `GET /api/child/learning/lessons/:id` (locked lesson → 403 `LESSON_LOCKED`)
- `GET /api/child/learning/resources/:type/:id` (locked → 403 `RESOURCE_LOCKED`)
- `POST /api/child/learning/progress/{video,material,activity,quiz}/...`
- `GET/POST /api/child/lessons/:id`, `/activities/:id`, `/quizzes/:id`
  (`getLesson`, `getActivity`, `startActivity`, `submitActivity`, `getQuiz`,
  `startQuiz`, `submitQuiz`)
- `GET /api/child/activities` and `/api/child/quizzes` now return an
  `is_locked` flag per row, and the Activities / Quizzes tabs render locked
  items as non-clickable.

## Resume learning

- `GET /api/child/learning/courses/:id` returns each lesson's status plus the
  `next_lesson`; the course page resumes there.
- `GET /api/child/learning/lessons/:id` returns `current_step` (the next
  incomplete required resource), which the lesson page highlights.

## Database-backed ordering

`ensureLessonResources(lessonId)` lazily registers a lesson's existing content
(activities, videos, materials, quizzes) into `lesson_resources` when the lesson
has none yet, so the order always comes from the database. It never overwrites
an instructor's saved order.

## Removed / consolidated

- Removed the fake YouTube "watch" simulation (progress no longer increases just
  by keeping the page open).
- Removed client-trusted `watch_percentage` writes; video completion is computed
  from genuine playback intervals.
- Removed the legacy frontend resource-order fallback that synthesised order by
  resource type.
- Fixed invalid `VALUES (... $n >= required_percentage ...)` SQL that broke the
  first insert of video/material progress.
- The child-facing activity/quiz completion now calls the verified journey
  endpoints instead of trusting the client.

## Useful commands

```bash
# Rebuild lesson journeys from existing content (safe to re-run)
cd backend && node scripts/migrate-lesson-resources.js
```

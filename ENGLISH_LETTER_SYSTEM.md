# English Letter Learning System — Implementation Notes

## Overview

An instructor-authored English alphabet learning system for the Brana Youth PERN application, mirroring the existing Amharic fidel system. **No hardcoded curriculum**: the 26 letters are seeded as *reference data* (admin-editable, like the Ge'ez syllabary), and the instructor chooses which letters to include in each lesson and in what order.

English TTS uses the Edge provider with voice `en-US-JennyNeural`, which produces real, variable-length speech (verified: "hello world" → 25200 bytes).

## Database (migration 041)

File: `backend/migrations/041_english_letters.sql`

Tables created:

- `english_letters` — reference data (A–Z), seeded with 26 rows. Columns: `id, letter, letter_name, speech_text, speech_language, display_order, is_active, created_at, updated_at`. UNIQUE on `letter`.
- `lesson_english_letters` — `lesson_id, letter_id, display_order`. UNIQUE on `(lesson_id, letter_id)`.
- `lesson_english_configs` — `lesson_id (PK), is_published, activities_enabled, listening_required_first, min_listen_count_required, published_at, created_at, updated_at`.
- `english_audio_assets` — TTS cache, one per letter. UNIQUE on `(english_letter_id, provider, voice_id, speech_text_hash)`. Mirrors `fidel_audio_assets`.
- `student_english_progress` — `student_id, lesson_id, english_letter_id, listen_count, first_listened_at, practice_completed_at`. UNIQUE on `(student_id, lesson_id, english_letter_id)`.

## Backend

### Service
- `backend/src/services/EnglishTtsService.js` — TTS generation + caching + concurrency lock + prewarm + invalidate, mirroring `TtsService` but for English letters. Default voice `en-US-JennyNeural`, language `en-US`.

### Controller
- `backend/src/controllers/englishLessonController.js`
  - `listLetters` — `GET /api/english-letters`
  - `createEnglishLesson` — `POST /api/instructor/courses/:courseId/english-lessons`
  - `getEnglishLessonDetail` — `GET /api/instructor/english-lessons/:lessonId`
  - `previewLetterAudio` — `POST /api/instructor/english-letters/:letterId/audio-preview`
  - `getChildEnglishContent` — `GET /api/student/lessons/:lessonId/english-content`
  - `recordEnglishProgress` — `POST /api/student/lessons/:lessonId/english-progress`

### Routes
- `backend/src/routes/englishLessonRoutes.js` — mounted in `app.js` via `app.use('/api', englishLessonRoutes)`.

## Frontend

- `frontend/src/pages/instructor/InstructorEnglishAuthoring.jsx` — instructor authoring page: select course, title, description, publish toggle, letter grid (A–Z, multi-select, select all/clear), creates the lesson.
- `frontend/src/pages/child/ChildEnglishLesson.jsx` — child lesson: grid of letters; tap to hear (TTS audio), records progress.
- Routes registered in `App.jsx`: `/instructor/english-lessons/create` and `/child/lessons/:lessonId/english`.
- `InstructorCourseDetail.jsx` — "CREATE LETTER LESSON" button shown only for English courses (`subject_id === 2` or title contains "english").

## Instructor button scoping

- "CREATE FIDEL LESSON" button: shown only for Amharic courses (`subject_id === 3` or title contains "amharic"/"ፊደል").
- "CREATE LETTER LESSON" button: shown only for English courses (`subject_id === 2` or title contains "english").

## Verification

- Migration applied successfully; 26 letters seeded.
- Backend e2e: create English lesson (5 letters) → 201; get detail → 200 with 5 letters; audio preview → `ready`; cleanup deleted the test lesson.
- `node --check` passes on all new backend files.
- `npm run build` passes.

## Related work in this session

### Quiz matching fix
- `QuizBuilder.jsx`: `fetchQuestions` no longer overwrites matching `options` with `[]`; `toApiQuestion` is now idempotent for matching (reads pairs from any shape).
- `ChildQuizTake.jsx`: added matching UI with shuffled answer pool; grading is now per-pair partial credit.
- `quizGrading.js` (new): `matchingPairsOf`, `matchingScore`, `gradeAnswer`, `correctAnswerText`, `formatMatchingAnswer`. Wired into child/student/generic submit endpoints.
- `_check_quiz_matching.js` harness: ALL CHECKS PASSED.

### Video progress (remaining limitations addressed)
- Configurable completion threshold (`videos.completion_threshold`, 50–100, default 90) with backend validation and instructor UI (`VideoModal.jsx`).
- Duration validation (positive).
- Auto-detect duration for uploaded videos.
- Standalone `VideoPlayer.jsx` converted to genuine interval tracking (shared `useGenuineWatch` hook); YouTube via IFrame API; Vimeo + direct video files supported; unsupported providers clearly marked as untracked.
- Removed manual "Mark Watched" bypass.

### PDF viewer
- `LessonResourceViewer.jsx`: full PDF in iframe, Download + Open-in-new-tab buttons, "I have read this PDF" completion button (no 5-page cap).

### Results / feedback buttons
- `ChildQuizTake.jsx`: "View My Result" button on results screen.
- `ChildActivityDetail.jsx`: "My Results" button.
- `ChildDashboard.jsx` and `EthiopianChildHome.jsx`: "My Results" button on child home.
- `QuizResultDetail.jsx`: case-insensitive answer comparison; matching per-pair display.
- `instructorResultsController.js`: admins can view all results (resolveInstructorId sentinel); backfilled null percentage/is_passed.

### TTS (Amharic fidel) investigation
- Root cause: msedge-tts returns fixed-length (11232-byte) placeholder audio for Amharic (and even short English inputs) — not real differentiated speech. Provider limitation, not a code bug.
- Verified: DB records, audio files, cache keys, concurrency locks, and frontend playback are all correct.
- Recommended: configure Azure TTS (`AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`, `TTS_PROVIDER=azure`) which is already implemented in `AzureTtsProvider.js`.
- System already provides error handling, retry, and a pronunciation issue-reporting flow.

### Environment note
- `students` table now uses `grade_level_id` (was `age_group_id`); `age_groups` table replaced by `grade_levels`. The `_check_child_home.js` harness is outdated against this schema (pre-existing drift, not caused by this work).
- `run-migration.js` takes a numeric prefix, not a filename. Standalone scripts need `node -r dotenv/config`. API must be reached via `127.0.0.1`, not `localhost`.
-- ============================================================================
-- Migration 019: Student media tracking
-- Tracks which videos a child has watched and which audio materials they have
-- listened to, so the child portal can show completed / in-progress media.
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_watches (
    id          BIGSERIAL PRIMARY KEY,
    video_id    BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    watched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (video_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_video_watches_student ON video_watches(student_id);

CREATE TABLE IF NOT EXISTS material_listens (
    id          BIGSERIAL PRIMARY KEY,
    material_id BIGINT NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (material_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_material_listens_student ON material_listens(student_id);
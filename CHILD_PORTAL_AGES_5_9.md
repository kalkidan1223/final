# The Child Portal (Ages 5–9) — Redesign

How the early-childhood side of **Children Learning Hub** works: what an instructor
authors, what a child sees, and why the writing system behind it is stored in the
database instead of the code.

---

## 1. The problem this solves

The portal had a Child Home for ages 5–9 that was hardcoded. The Amharic letters,
the Ge'ez numerals, the picture words and the encouragement phrases were all
written into JavaScript components. That is fine for a demo and wrong for a real
school:

- An instructor could not choose what a five-year-old learned. The content was
  whatever shipped in the bundle.
- A school in Bahir Dar could not use its own dialect or its own words for
  "well done".
- Changing the content meant a developer and a redeploy.
- Adding a letter meant editing a component, and the child home had no idea which
  words went with it.

**The rule this redesign is built on: nothing a child sees is hardcoded. The
instructor authors it, the admin curates the shared reference data, and the child
portal only renders what was actually chosen.**

The one thing that stayed in code is the *shape* of the content — the contract in
`practiceContent.js`. The data behind that shape moved to the database.

---

## 2. Design principles that were kept

| Principle | How it survived |
|---|---|
| Instructor as learning architect | Instructor authors activity content and chooses the home layout |
| Age stratification | 5–9 is parent-managed and voice-first; 10–12 is independent |
| Ethiopian cultural grounding | Ge'ez fidel, Ge'ez numerals, Ethiopian animals, food and places |
| Admin approval workflow | Unchanged — a child still cannot reach content before approval |
| One decision per screen | Each game asks exactly one question at a time |

---

## 3. The two ideas that shape everything

### 3.1 The child home is a *view*, not a page builder

There is no drag-and-drop page builder. The child home is a **view over normal
courses**: an instructor picks up to **six** already-published items per age band
and pins them to that band's home screen. The child's home is those six tiles, in
the instructor's order.

This was a deliberate choice. A page builder sounds more flexible but it produces
screens no one designed, breaks the one-decision-per-screen rule, and needs its
own storage, its own permissions and its own admin tooling. Pinning reuses the
course content that already exists and is already reviewed.

`home_pins` stores the choice:

```
home_pins(id, age_group_id, resource_type, resource_id, position, is_active)
```

`resource_type` is `activity`, `lesson`, `quiz`, `video` or `material` — so an
instructor is not limited to games, though the games are what the 5–9 home leads
with.

### 3.2 Games are renderers, not content

The games do not contain curriculum. They are renderers that take an instructor's
`activity_config` and draw it. Three `activity_type` values reach the child home:

| `activity_type` | Renderer | What the instructor configures |
|---|---|---|
| `letter_tracing` | `FidelPractice` | which series, how many vowel orders, the word and picture |
| `matching` | `MatchPractice` | the letter–word pairs |
| `counting` | `NumberPractice` | the countable objects, the range, the rounds, Ge'ez or Arabic |

`PracticePlay.jsx` maps these three to the three components above, and
`PRACTICE_ACTIVITY_TYPES` is exactly those three — so a fourth type can never
half-work by being listed but not rendered.

A note on naming, because it misleads: `NumberPractice` renders the **counting**
game, not a number-tracing game. The `activity_type` enum also still contains
`number_tracing`, which the child dispatcher does not route; the seeded Ge'ez
numerals are taught through a `matching` game instead. No new enum values were
needed, and the games remain interchangeable with the ordinary course activities.

---

## 4. Data model

Four migrations. All idempotent — re-running any of them is a no-op, which is
what makes the seed safe to run repeatedly.

### `023_child_home_instructor_content.sql` — the mechanism

Creates the shared reference tables and the pin table:

| Table | Holds | Seeded |
|---|---|---|
| `fidel_letters` | the syllabary: base char, romanised sound, the 7 vowel orders | 24 |
| `geez_numerals` | 1–10, glyph and name | 10 |
| `picture_words` | everyday vocabulary with emoji, category, linked series | 35 |
| `encouragement_phrases` | what a child hears on finishing | 5 |
| `home_pins` | the instructor's chosen home screen | 0 |

`fidel_letters.syllables` is `TEXT[]` with a `CHECK (cardinality(syllables) = 7)`,
because a series in the Ethiopic syllabary always has exactly seven vowel orders.

`picture_words.example_for_letter` is the link that makes the games possible: it
says which series a word introduces. A tracing game for the ቀ series offers
ቃሪያ because that is where ቀ appears in a real word.

### `024_content_idempotency_constraints.sql` — making the seed safe

Adds `UNIQUE (instructor_id, age_group_id, title)` on `courses` and
`UNIQUE (lesson_id, title)` on `activities`, with a duplicate guard that raises an
exception rather than silently tolerating a bad state.

Without these, the old seed's `ON CONFLICT DO NOTHING` silently did nothing,
because there was no matching unique index to conflict with. This is the fix for
"run the seed twice, get double the content".

### `025_picture_vocabulary.sql` — real vocabulary, and a derived link

Expands the vocabulary to 167 words, retires a wrong word (`ልጫ`, which was meant
to be `ላሽ`), and — importantly — **derives** `example_for_letter` in SQL instead
of writing it by hand.

The derivation matters more than it looks:

> A word's first syllable is usually **not** its base. ቃሪያ begins with ቃ, the
> third vowel order of the ቀ series, not with ቀ itself.

Writing the base by hand is error-prone and the error is *invisible in a terminal*,
because ቃ and ቀ look almost identical. So the link is derived: take the word's
first syllable, find the series whose seven orders contain it, longest match wins.
This is also the correct definition pedagogically — it is how a Grade 1 child is
taught that ቃሪያ is a ቀ-series word.

### `026_complete_syllabary.sql` — completing the syllabary

Added 7 series (`አ ከ ኰ ወ ፀ ፐ ቈ`) to reach 31, and fixed three malformed words.
This is the most interesting migration; see §7.

---

## 5. The content contract

`frontend/src/utils/practiceContent.js` is the single boundary between what the
instructor authors and what the child sees. Both sides import it, so a change to
the shape cannot be half-applied.

It provides:

- `normalizeLetters(config, reference)` — the tracing config, tolerant of missing
  fields
- `normalizePairs(config, reference)` — the matching config, with a `left` that is
  always a **base series**, never a vowel order
- `normalizeCounting(config, reference)` — the counting config, resolving each
  object to a picture
- `vowelOrderCount(config)` — how many vowel orders this activity teaches
- `wordsFromPins(pins, reference, limit)` — the word strip for the home
- `PRACTICE_TYPE_META` / `tileMetaFor(pin)` — the visual treatment for a tile

Each normaliser takes the reference data as an argument rather than importing it,
so the same code runs in the instructor's builder and on the child's device.

`normalizePairs` is where the ቃ/ቀ bug is prevented from reaching a child: a pair
whose `left` is not a real base series is dropped rather than rendered unmatchable.

The old `ethiopianLearning.js` was deleted once its data had moved to the
database. `useReferenceKit()` fetches the reference data once and
`invalidateReferenceKit()` drops it after an admin edit, so an admin's change
appears on the instructor's next picker without a reload.

---

## 6. API surface

Two mounts, added in `app.js`:

```js
app.use('/api/reference', referenceRoutes);
app.use('/api/home', homePinRoutes);
```

### Reference data

| Method | Path | Who |
|---|---|---|
| `GET` | `/api/reference/early-learner-kit` | any signed-in user |
| `GET` | `/api/reference/:kind` | any signed-in user |
| `GET` | `/api/reference/admin/:kind` | admin |
| `POST` | `/api/reference/admin/:kind` | admin |
| `PATCH` | `/api/reference/admin/:kind/:id` | admin |
| `DELETE` | `/api/reference/admin/:kind/:id` | admin (deactivates, never hard-deletes) |

`/early-learner-kit` returns all four datasets in one call, because the child
home needs all four on first paint.

The admin routes are registered **before** `/:kind` on purpose — otherwise
`admin` matches the `:kind` parameter and the admin CRUD becomes unreachable.

### Home pins

| Method | Path | Who |
|---|---|---|
| `GET` | `/api/home/candidates?age_group_id=N` | instructor, admin |
| `GET` | `/api/home/pins?age_group_id=N` | instructor, admin |
| `POST` | `/api/home/pins` | instructor, admin |
| `PATCH` | `/api/home/pins/:id` | instructor, admin |
| `DELETE` | `/api/home/pins/:id` | instructor, admin |

`homePinController.js` holds `MAX_HOME_TILES = 6` and `resolvePins()`, which
joins a pin to its content and produces the tile the child sees.

**Ownership is enforced, not assumed.** Every read and write filters on
`courses.instructor_id = $2`, so an instructor cannot pin another teacher's
content, and cannot unpin or reorder a pin that is not theirs. The verification
harness asserts this with a real second instructor.

`GET /child/dashboard` gained two fields:

- `home_pins` — the resolved tiles
- `encouragement` — an **array** of phrases, so the client can vary the praise
  with `pickPraise` instead of a child hearing the same line every time

---

## 7. Completing the syllabary — the interesting part

Making the seed *refuse to publish an impossible matching pair* turned six silent
content gaps into loud warnings. It reported that `ጫማ`, `ኳስ`, `አንበሳ`, `ጎመን`,
`እንጀሪ` and `ወይር` all "start with no known series".

That was correct, and the cause was a real gap: **27 of those words began with አ
or እ**, which are the vowel orders of the **አ** series — a series migration 023
had never seeded. A child cannot trace አንበሳ in a portal that has never heard of
አ.

53 of 167 words had no series at all. After migration 026: **156 of 165** link.

### How the missing series were identified

Not by hand. In the Ethiopic syllabary a series is **seven vowel orders occupying
seven consecutive code points** starting at the base. That property was verified
against all 24 seeded rows first, so the rule is confirmed, not assumed — and the
new rows are generated from it rather than transcribed by eye.

That mattered immediately. Transcribing Amharic by eye would have produced a
plausible-looking `ባ` and `ጫ` as "series". They are not: `ባ` is the **fourth order
of በ**, and `ጫ` is the **fourth order of ጨ**. Creating them would have been a new
instance of the exact bug the derivation was written to prevent.

### Which candidates were rejected, and why

Six candidates were **rejected** because their seven-order runs overlap a series
that is already seeded:

| Candidate | Rejected because |
|---|---|
| `ደ` | its 6th and 7th orders (`ድ ዶ`) belong to the seeded `ድ` series |
| `ዸ` | the whole series sits inside the seeded `ድ` series |
| `ጀ` | its 5th and 6th orders belong to the seeded `ጅ` series |
| `ገ` | the whole series sits inside the seeded `ጅ` series |
| `ጨ` | its 6th and 7th orders belong to the seeded `ጭ` series |
| `ጰ` | the whole series sits inside the seeded `ጭ` series |

This is a genuine property of the Unicode block, not a gap in the data: it assigns
some syllables to two base series. The seeded rows already own those characters.

The seven that were accepted — `አ ከ ኰ ወ ፀ ፐ ቈ` — collide with nothing.

**Migration 026 now enforces this.** It contains a `DO` block that raises an
exception if any two active series share a vowel order, so a future hand-edit
cannot quietly reintroduce an ambiguous owner.

### The nine words that stay unlinked, on purpose

`ጫማ ጫካ ጨንቆል ጨለም ዱራ ዱቀ ደህና መል ደስታ ጎመን`

Each is only reachable through a rejected, overlapping series. Rather than give
them a link that points at the wrong series nine times in ten, they keep a `NULL`
link, the tracing game does not offer them, and the seed logs them by name:

```
! "ጫማ" starts with no known series, so the pair is skipped.
  A matching game with one impossible pair is a game a child cannot finish.
```

A word with no series is a missing word. A word with the *wrong* series is a bug
a child hits at the worst moment.

### Three words that were simply wrong

The same investigation found content rot that was worse, because it was silently
wrong in front of a child:

- **`በርታ` was glossed "bread" 🥞.** It means **fruit**. The table had ended up with
  three rows called bread and the real flatbread `እንጀሪ` sitting beside them.
- **`የበርታ`** ("of the fruit") is a phrase, not a word — `የ` is the genitive
  particle and no series begins with it. Also a fourth flatbread row. Retired.
- **`የእኔ ክፍለ ትምህርት`** ("of my class") is a possessive phrase duplicating `ክፍል`.
  Retired.
- **`የጤና ቤት`** ("of the health house") is a genuine distinct word — a hospital
  is worth teaching — so the genitive was dropped, not the row.

---

## 8. The three screens

### Instructor — `/instructor/child-home`

Pick an age group, see the current tiles, pin from candidates, reorder, unpin.
The three game pickers in `ActivityBuilder.jsx` are wired to `useReferenceKit()`,
so an instructor chooses from admin-curated data instead of typing Amharic.

### Child — `/child` and `/child/practice/:activityId`

`EthiopianChildHome.jsx` renders the pinned tiles. With nothing pinned it shows
the honest empty state — "your teacher is still choosing" — not a fake dashboard.

`PracticePlay.jsx` is a dispatcher on `activity_type`. The 5–9 nav is reduced to
three items, and the dead `/child/practice/*` links that pointed at nothing were
removed.

### Admin — `/admin/reference`

Dataset-driven CRUD over all four reference tables, reached from
**Academic → Early Childhood Data**.

Its category dropdown is **derived from the words already saved**, not from a
hardcoded list. A hardcoded list had offered an `objects` category that no word
used while omitting the nine that words actually had — an admin editing a word was
shown choices that did not match their own data. Deriving the options means the
list cannot drift.

---

## 9. Seeding and verification

```bash
# migrations (each exits 0 if already applied)
node scripts/run-migration.js 023
node scripts/run-migration.js 026

# content
node -r dotenv/config seeds/seed_ethiopian_curriculum.js

# verification
node -r dotenv/config scripts/_check_seeded_content.js
node -r dotenv/config scripts/_check_child_home.js
```

The seed produces **4 courses, 6 lessons, 12 activities** across the 5–7 and 8–9
bands, and is safe to run repeatedly.

It also creates the `instructor_assignments` rows. This was a real bug found by
the verifier: `courses.instructor_id` records **authorship**, while
`instructor_assignments` is what an instructor's own course list **reads**. The
two are separate on purpose — an admin can hand a course to a second teacher
without transferring authorship. Without assignments the seed produced content
that was pinnable but invisible, which reads as an app bug rather than missing seed
data.

`home_pins` is intentionally left **empty**. Nothing is pinned by default, so the
child home correctly shows its empty state until a real instructor makes a real
choice. The seed prints the one click that changes this.

### What the harnesses check

`_check_seeded_content.js` — that every game has a valid config, that syllable
counts match `vowel_order_count`, that matching games have ≥4 pairs, no duplicate
left sides, sane counting ranges, and that both age bands have all three game
types.

`_check_child_home.js` — the reference kit's integrity, RBAC (student 403, anonymous
401), instructor scoping, pin ownership, the 6-tile cap, reorder persistence, and
that a child cannot open another age group's activity. It mints JWTs directly, so
no account passwords change during testing.

### One gap, stated plainly

**The dev database has no child under 10.** The only student is 10, so the 5–9
path cannot be exercised end to end here. The harness reports this as a note
rather than pretending it passed. To test it, create a child aged 5–9 in admin age
group 1 or 2, then pin an activity.

---

## 10. Before any demo

> The passwords for `sel12@gmail.com` (student) and `zproa23@gmail.com` (parent)
> were changed to `Test1234` during earlier testing. **The originals are not
> recorded anywhere.** Reset them before demonstrating, or the accounts will
> differ from what the project expects.

Also note: Node's `fetch` cannot reach the API via `localhost` (it resolves to
`::1` while the server binds IPv4), so scripts must use `http://127.0.0.1:5000`.
This previously produced a misleading `ECONNREFUSED`.

---

## 11. File map

**Backend**

| File | Role |
|---|---|
| `migrations/023_child_home_instructor_content.sql` | reference + pin tables |
| `migrations/024_content_idempotency_constraints.sql` | the UNIQUE keys the seed needs |
| `migrations/025_picture_vocabulary.sql` | vocabulary + derived series link |
| `migrations/026_complete_syllabary.sql` | 7 series + 3 word fixes + overlap guard |
| `src/controllers/referenceController.js` | reference CRUD + the kit |
| `src/controllers/homePinController.js` | `MAX_HOME_TILES`, `resolvePins()`, ownership |
| `src/controllers/childController.js` | `home_pins` and `encouragement` on the dashboard |
| `src/controllers/instructorController.js` | `listCourses` now selects `age_group_id` |
| `src/routes/referenceRoutes.js`, `homePinRoutes.js` | route tables |
| `seeds/seed_ethiopian_curriculum.js` | 4 courses / 6 lessons / 12 activities, idempotent |
| `scripts/_check_seeded_content.js`, `_check_child_home.js` | verification harnesses |

**Frontend**

| File | Role |
|---|---|
| `src/utils/practiceContent.js` | the contract between builder and renderers |
| `src/hooks/useReferenceKit.js` | one fetch for all reference data, with invalidation |
| `src/components/instructor/ActivityBuilder.jsx` | the three instructor pickers |
| `src/pages/instructor/InstructorChildHome.jsx` | pin management |
| `src/pages/admin/AdminReferenceData.jsx` | `/admin/reference` CRUD |
| `src/components/child/EthiopianChildHome.jsx` | the rebuilt 5–9 home |
| `src/pages/child/PracticePlay.jsx` | `activity_type` dispatcher |
| `src/pages/child/{FidelPractice,NumberPractice,MatchPractice}.jsx` | the game renderers |
| `src/App.jsx`, `{Child,Admin,Instructor}Layout.jsx` | routes and navigation |

---

## 12. What is deliberately still hardcoded

Only two things, and both are structural rather than curricular:

1. **`practiceContent.js`** — the *shape* of a config. The content behind the shape
   is in the database.
2. **`MAX_HOME_TILES = 6`** — a UX constant. Six is about how many choices a
   five-year-old can hold in mind, and it is a product decision, not curriculum.

Everything a child actually reads, hears or traces comes from the database, and
someone had to choose it.

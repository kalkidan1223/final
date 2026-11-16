const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'child', 'ChildLessonDetail.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// Add import for BasicChildLessonExperience if missing
if (!code.includes('BasicChildLessonExperience')) {
  code = code.replace(
    "import AskTeacherModal from '../../components/child/AskTeacherModal';",
    "import AskTeacherModal from '../../components/child/AskTeacherModal';\nimport BasicChildLessonExperience from '../../components/child/BasicChildLessonExperience';"
  );
}

// Add experience view preference state
if (!code.includes('const [experienceMode, setExperienceMode]')) {
  code = code.replace(
    "const [fidelData, setFidelData] = useState(null);",
    "const [fidelData, setFidelData] = useState(null);\n  const [experienceMode, setExperienceMode] = useState(null); // 'visual' | 'structured'"
  );
}

// Hook up the visual builder branch
const targetCondition = "const { lesson, progress, resources, current_step } = lessonData || {};";
const newBranch = `const { lesson, progress, resources, current_step } = lessonData || {};

  // Check if this lesson belongs to a visual/basic grade (KG1 - Grade 2)
  const isDefaultVisual =
    lesson?.lesson_builder_type === 'visual' ||
    ['KG1', 'KG2', 'G1', 'G2', 'KINDERGARTEN 1', 'KINDERGARTEN 2', 'GRADE 1', 'GRADE 2'].includes(
      String(lesson?.grade_level_code || lesson?.grade_level_name || '').toUpperCase().trim()
    ) ||
    (lesson?.grade_level_id && Number(lesson?.grade_level_id) <= 4);

  const activeMode = experienceMode || (isDefaultVisual ? 'visual' : 'structured');

  // If in visual mode (KG1-Grade 2 basic experience), render the full-screen visual interactive journey
  if (activeMode === 'visual') {
    return (
      <div className="space-y-4">
        {/* Experience mode switch pill for older students/parents/instructors */}
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center pt-2">
          <Link
            to={\`/child/courses/\${lesson?.course_id}\`}
            className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-900 font-bold text-xs bg-white px-3 py-1.5 rounded-full shadow-sm border border-indigo-100"
          >
            ← Back to {lesson?.course_title || 'Course'}
          </Link>
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold shadow-sm">
            <span className="text-slate-500">Mode:</span>
            <button
              onClick={() => setExperienceMode('visual')}
              className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black shadow-xs"
            >
              ⭐ Visual Storybook
            </button>
            <button
              onClick={() => setExperienceMode('structured')}
              className="px-2.5 py-0.5 rounded-full hover:bg-slate-100 text-slate-600 font-bold"
            >
              📑 Structured
            </button>
          </div>
        </div>

        <BasicChildLessonExperience
          lesson={lesson}
          resources={resources || []}
          progress={progress}
          onResourceCompleted={handleResourceCompleted}
          onFinishLesson={handleContinueToNextLesson}
        />

        <AskTeacherModal
          open={askOpen}
          onClose={() => setAskOpen(false)}
          courseId={lesson?.course_id || null}
          courseTitle={lesson?.course_title || ''}
          lessonId={lesson?.id || null}
          lessonTitle={lesson?.title || ''}
        />
      </div>
    );
  }`;

if (!code.includes('const isDefaultVisual =')) {
  code = code.replace(targetCondition, newBranch);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated ChildLessonDetail.jsx');

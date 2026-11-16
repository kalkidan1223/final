const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'instructor', 'InstructorLessonCreate.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add import for BasicGuidedLessonBuilder
if (!code.includes('BasicGuidedLessonBuilder')) {
  code = code.replace(
    "import InstructorLayout from '../../components/InstructorLayout';",
    "import InstructorLayout from '../../components/InstructorLayout';\nimport BasicGuidedLessonBuilder from '../../components/instructor/BasicGuidedLessonBuilder';"
  );
}

// 2. Add useGuidedBuilder state
if (!code.includes('const [useGuidedBuilder, setUseGuidedBuilder]')) {
  code = code.replace(
    "const [lessonBuilderType, setLessonBuilderType] = useState('structured');",
    "const [lessonBuilderType, setLessonBuilderType] = useState('structured');\n  const [useGuidedBuilder, setUseGuidedBuilder] = useState(false);"
  );
}

// 3. Update loadContext to automatically set useGuidedBuilder if visual
if (!code.includes("setUseGuidedBuilder(data.course?.lesson_builder_type === 'visual')")) {
  code = code.replace(
    "setLessonBuilderType(data.course?.lesson_builder_type || 'structured');",
    "setLessonBuilderType(data.course?.lesson_builder_type || 'structured');\n        if (data.course?.lesson_builder_type === 'visual') setUseGuidedBuilder(true);"
  );
  code = code.replace(
    "setLessonBuilderType(data.courses[0].lesson_builder_type || 'structured');",
    "setLessonBuilderType(data.courses[0].lesson_builder_type || 'structured');\n          if (data.courses[0].lesson_builder_type === 'visual') setUseGuidedBuilder(true);"
  );
}

// 4. In render, if useGuidedBuilder && !isEdit, render BasicGuidedLessonBuilder
const renderTarget = "const backTo = courseId ? `/instructor/courses/${courseId}` : '/instructor/lessons';";
const guidedBranch = `const backTo = courseId ? \`/instructor/courses/\${courseId}\` : '/instructor/lessons';

  if (useGuidedBuilder && !isEdit) {
    return (
      <InstructorLayout>
        <div className="pb-12 max-w-5xl mx-auto">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
            <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
              <MdArrowBack /> Back {courseTitle ? \`to \${courseTitle}\` : 'to Lessons'}
            </Link>
            <button
              type="button"
              onClick={() => setUseGuidedBuilder(false)}
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 transition"
            >
              Switch to Standard Structured Form
            </button>
          </div>
          <BasicGuidedLessonBuilder
            initialCourseId={courseId || targetCourseId}
            courses={courses.length > 0 ? courses : [{ course_id: courseId, course_title: courseTitle }]}
            onCancel={() => navigate(backTo)}
          />
        </div>
      </InstructorLayout>
    );
  }`;

if (!code.includes('if (useGuidedBuilder && !isEdit)')) {
  code = code.replace(renderTarget, guidedBranch);
}

// 5. In standard form, add switch button
const bannerTarget = `<h1 className="mt-3 mb-1 text-2xl font-bold text-slate-900">
          {isEdit ? 'Edit Lesson' : 'Create Lesson'}
        </h1>`;
const bannerReplacement = `<div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit Lesson' : 'Create Lesson'}
          </h1>
          {!isEdit && (
            <button
              type="button"
              onClick={() => setUseGuidedBuilder(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 py-2 rounded-xl shadow-sm hover:scale-105 transition"
            >
              ✨ Switch to Guided Visual Builder (KG - Grade 2)
            </button>
          )}
        </div>`;

if (code.includes(bannerTarget)) {
  code = code.replace(bannerTarget, bannerReplacement);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated InstructorLessonCreate.jsx');


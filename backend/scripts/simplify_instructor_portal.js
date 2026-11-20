const fs = require('fs');
const path = require('path');

// 1. Update InstructorLayout.jsx to conditionally show Fidel lessons only for Amharic teachers and streamline nav
const layoutPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'components', 'InstructorLayout.jsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

// Replace static NAV_GROUPS with dynamic getter
const oldNavGroups = `const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/instructor/dashboard', end: true },
    ]
  },
  {
    title: 'Teaching & Content',
    items: [
      { label: 'My Subject Assignments', to: '/instructor/subjects', icon: MdMenuBook },
      { label: 'Lessons', to: '/instructor/lessons', icon: MdAutoStories },
      { label: 'Fidel Family Lessons', to: '/instructor/fidel-lessons', icon: MdTranslate },
      { label: 'Materials', to: '/instructor/materials', icon: MdLibraryBooks },
      { label: 'Activities', to: '/instructor/activities', icon: MdExtension },
      { label: 'Quizzes', to: '/instructor/quizzes', icon: MdQuiz },
    ]
  },
  {
    title: 'Students & Grading',
    items: [
      { label: 'Student Questions', to: '/instructor/questions', icon: MdQuestionAnswer },
      { label: 'Submissions', to: '/instructor/submissions', icon: MdGrading, hasBadge: true },
      { label: 'Student Progress', to: '/instructor/progress', icon: MdTrendingUp },
      { label: 'Results & Analytics', to: '/instructor/results', icon: MdSchool },
      { label: 'My Students', to: '/instructor/students', icon: MdPeople },
    ]
  },
  {
    title: 'Kids Learning Hub',
    items: [
      { label: 'Child Home (Preview)', to: '/instructor/child-home', icon: MdChildCare },
      { label: 'Vocabulary Bank', to: '/instructor/vocabulary', icon: MdTranslate },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'Messages', to: '/instructor/messages', icon: MdMessage },
      { label: 'Notifications', to: '/instructor/notifications', icon: MdNotifications },
      { label: 'Profile', to: '/instructor/profile', icon: MdPerson },
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);`;

// We will replace with a clean, teacher-friendly nav structure
const newNavGroups = `function getNavGroups(teachesAmharic = false) {
  return [
    {
      title: 'Teaching Center',
      items: [
        { label: 'Dashboard', to: '/instructor/dashboard', icon: MdDashboard, end: true },
        { label: 'My Courses', to: '/instructor/courses', icon: MdMenuBook },
        { label: 'Lessons', to: '/instructor/lessons', icon: MdAutoStories },
        ...(teachesAmharic ? [{ label: 'Fidel Family Studio', to: '/instructor/fidel-lessons', icon: MdTranslate }] : []),
      ]
    },
    {
      title: 'Learning Content',
      items: [
        { label: 'Materials & Files', to: '/instructor/materials', icon: MdLibraryBooks },
        { label: 'Activities & Practice', to: '/instructor/activities', icon: MdExtension },
        { label: 'Quizzes & Checks', to: '/instructor/quizzes', icon: MdQuiz },
      ]
    },
    {
      title: 'Students & Grading',
      items: [
        { label: 'Submissions', to: '/instructor/submissions', icon: MdGrading, hasBadge: true },
        { label: 'Student Progress', to: '/instructor/progress', icon: MdTrendingUp },
        { label: 'Student Questions', to: '/instructor/questions', icon: MdQuestionAnswer },
        { label: 'My Students', to: '/instructor/students', icon: MdPeople },
      ]
    },
    {
      title: 'Preview',
      items: [
        { label: 'Child Portal Preview', to: '/instructor/child-home', icon: MdChildCare },
      ]
    }
  ];
}

export const NAV_ITEMS = getNavGroups(true).flatMap(g => g.items);`;

// Update Sidebar component in InstructorLayout to fetch instructor's courses/subjects
layoutCode = layoutCode.replace(
  /const NAV_GROUPS = \[[\s\S]*?export const NAV_ITEMS = NAV_GROUPS\.flatMap\(g => g\.items\);/,
  newNavGroups
);

layoutCode = layoutCode.replace(
  "function Sidebar({ open, onClose, pendingCount }) {",
  "function Sidebar({ open, onClose, pendingCount, teachesAmharic }) {\n  const navGroups = getNavGroups(teachesAmharic);"
);

layoutCode = layoutCode.replace(
  "{NAV_GROUPS.map((group) => (",
  "{navGroups.map((group) => ("
);

// In InstructorLayout, state for teachesAmharic
layoutCode = layoutCode.replace(
  "  const [pendingCount, setPendingCount] = useState(0);",
  "  const [pendingCount, setPendingCount] = useState(0);\n  const [teachesAmharic, setTeachesAmharic] = useState(false);"
);

layoutCode = layoutCode.replace(
  "axiosClient.get('/instructor/submissions?status=pending')",
  `// Check if instructor teaches Amharic
    axiosClient.get('/instructor/courses')
      .then(res => {
        if (mounted) {
          const list = res.data.courses || [];
          const hasAmharic = list.some(c => 
            String(c.subject_name || c.course_title || '').toLowerCase().includes('amharic') ||
            String(c.subject_code || '').toUpperCase() === 'AMH'
          );
          setTeachesAmharic(hasAmharic);
        }
      })
      .catch(() => {});

    axiosClient.get('/instructor/submissions?status=pending')`
);

layoutCode = layoutCode.replace(
  "pendingCount={pendingCount}",
  "pendingCount={pendingCount}\n        teachesAmharic={teachesAmharic}"
);

fs.writeFileSync(layoutPath, layoutCode, 'utf8');
console.log('Successfully updated InstructorLayout.jsx');

// 2. Update InstructorLessons.jsx to only show Fidel button if teaches Amharic
const lessonsPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'instructor', 'InstructorLessons.jsx');
let lessonsCode = fs.readFileSync(lessonsPath, 'utf8');

const oldFidelBtn = `<Link
              to="/instructor/fidel-lessons"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition text-sm"
            >
              <span>🔤</span> Fidel Family Lessons
            </Link>`;

const newFidelBtn = `{courses.some(c => String(c.course_title || c.subject_name || '').toLowerCase().includes('amharic')) && (
            <Link
              to="/instructor/fidel-lessons"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition text-sm"
            >
              <span>🔤</span> Fidel Family Lessons
            </Link>
          )}`;

if (lessonsCode.includes(oldFidelBtn)) {
  lessonsCode = lessonsCode.replace(oldFidelBtn, newFidelBtn);
  fs.writeFileSync(lessonsPath, lessonsCode, 'utf8');
  console.log('Successfully updated InstructorLessons.jsx');
}

// 3. Update InstructorDashboard.jsx to remove hardcoded Fidel banner text and make it subject-aware
const dashPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'instructor', 'InstructorDashboard.jsx');
let dashCode = fs.readFileSync(dashPath, 'utf8');

dashCode = dashCode.replace(
  "Welcome to your teaching hub. Manage course curricula, create interactive Fidel character exercises, grade child submissions, and follow your students' progress.",
  "Welcome to your teaching hub. Manage your lesson plans, create engaging activities and visual learning cards, grade student submissions, and follow your learners' progress."
);

fs.writeFileSync(dashPath, dashCode, 'utf8');
console.log('Successfully updated InstructorDashboard.jsx');

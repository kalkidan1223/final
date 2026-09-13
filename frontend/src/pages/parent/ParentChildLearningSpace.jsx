import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient, { setActiveChildId } from '../../api/axiosClient';
import {
  MdSchool,
  MdArrowBack,
  MdPlayCircleFilled,
  MdCheckCircle,
  MdAssignment,
  MdQuiz,
  MdFeedback,
  MdEmojiEvents,
  MdLocalFireDepartment,
  MdMenuBook,
  MdVideoLibrary,
  MdPictureAsPdf,
  MdImage,
  MdLock,
  MdVisibility,
  MdClose,
  MdSend,
} from 'react-icons/md';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function ParentChildLearningSpace() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [activeTab, setActiveTab] = useState('courses'); // courses, activities, quizzes, achievements

  // Data states
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [learningStreak, setLearningStreak] = useState(0);

  // Lesson content modal (for viewing materials / videos)
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonMaterials, setLessonMaterials] = useState([]);
  const [lessonVideos, setLessonVideos] = useState([]);
  const [loadingLessonContent, setLoadingLessonContent] = useState(false);

  // Parent activity submission modal (for parent-managed young children)
  const [submittingActivity, setSubmittingActivity] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChildFullData();
  }, [id]);

  async function fetchChildFullData() {
    try {
      setLoading(true);
      const [childRes, coursesRes, activitiesRes, quizzesRes, progressRes, achieveRes] = await Promise.all([
        axiosClient.get(`/parent/children/${id}`),
        axiosClient.get(`/parent/children/${id}/courses`).catch(() => ({ data: { courses: [] } })),
        axiosClient.get(`/parent/children/${id}/activities`).catch(() => ({ data: { activities: [] } })),
        axiosClient.get(`/parent/children/${id}/quizzes`).catch(() => ({ data: { quizzes: [] } })),
        axiosClient.get(`/parent/children/${id}/progress`).catch(() => ({ data: { progress: {} } })),
        axiosClient.get(`/parent/children/${id}/achievements`).catch(() => ({ data: { achievements: [] } })),
      ]);

      const childData = childRes.data.child;
      setChild(childData);
      setCourses(coursesRes.data.courses || []);
      setActivities(activitiesRes.data.activities || []);
      setQuizzes(quizzesRes.data.quizzes || []);
      setAchievements(achieveRes.data.achievements || []);
      setLearningStreak(progressRes.data?.progress?.learning_streak || 0);

      // If courses exist, fetch lessons for the first course
      if (coursesRes.data.courses?.length > 0) {
        setSelectedCourse(coursesRes.data.courses[0]);
        fetchLessonsForCourse(coursesRes.data.courses[0].id);
      }
    } catch (err) {
      console.error('Failed to load child learning space data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLessonsForCourse(courseId) {
    try {
      const res = await axiosClient.get(`/parent/children/${id}/lessons?course_id=${courseId}`);
      setLessons(res.data.lessons || []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  }

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    fetchLessonsForCourse(course.id);
  };

  const handleOpenLessonContent = async (lesson) => {
    setActiveLesson(lesson);
    setLoadingLessonContent(true);
    try {
      const res = await axiosClient.get(`/parent/children/${id}/materials?lesson_id=${lesson.id}`);
      setLessonMaterials(res.data.materials || []);
      setLessonVideos(res.data.videos || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoadingLessonContent(false);
    }
  };

  const handleLaunchChildPortal = () => {
    if (child?.id) {
      setActiveChildId(child.id);
      navigate('/child');
    }
  };

  const handleSubmitActivityOnBehalf = async (e) => {
    e.preventDefault();
    if (!submittingActivity) return;

    try {
      setIsSubmitting(true);
      await axiosClient.post(
        `/parent/children/${child.id}/activities/${submittingActivity.id}/submit`,
        {
          submission_text: submissionText,
          file_url: submissionUrl,
        }
      );
      // Refresh activities
      const actRes = await axiosClient.get(`/parent/children/${id}/activities`);
      setActivities(actRes.data.activities || []);
      setSubmittingActivity(null);
      setSubmissionText('');
      setSubmissionUrl('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
        <p className="text-slate-500 font-semibold text-sm">Opening child learning space...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto my-12">
        <span className="text-5xl block">⚠️</span>
        <h3 className="text-lg font-bold text-slate-800">Child Not Found</h3>
        <p className="text-sm text-slate-500">
          The requested child record does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/parent/children"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700"
        >
          ← Back to My Children
        </Link>
      </div>
    );
  }

  const age = calculateAge(child.date_of_birth);
  const isParentManaged = !child.user_id;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Back button */}
      <div>
        <Link
          to="/parent/children"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <MdArrowBack className="text-base" />
          <span>Back to Children</span>
        </Link>
      </div>

      {/* ── Child Space Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-black shadow-inner flex-shrink-0 overflow-hidden">
            {child.profile_picture ? (
              <img src={child.profile_picture} alt={child.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{child.gender === 'female' ? '👧' : '👦'}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-0.5 rounded-full">
                {child.age_group_name || 'Primary'}
              </span>
              <span className="text-[11px] font-extrabold bg-emerald-400 text-emerald-950 px-3 py-0.5 rounded-full">
                Age {age ?? '—'}
              </span>
              {isParentManaged ? (
                <span className="text-[11px] font-extrabold bg-purple-300 text-purple-950 px-3 py-0.5 rounded-full">
                  Parent Managed
                </span>
              ) : (
                <span className="text-[11px] font-extrabold bg-blue-300 text-blue-950 px-3 py-0.5 rounded-full">
                  Independent Student
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{child.full_name}</h1>
            <p className="text-xs sm:text-sm text-purple-100">
              Grade: {child.grade_name || child.grade || 'Grade 1'} • Preferred Language: {child.preferred_language || 'Amharic'}
            </p>
          </div>
        </div>

        {/* Big Dual-Action Launch Button */}
        <button
          onClick={handleLaunchChildPortal}
          className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <MdPlayCircleFilled className="text-2xl text-slate-900" />
          <span>Launch Child Learning Portal</span>
          <span>➔</span>
        </button>
      </div>

      {/* ── Key Metrics Overview ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-2xl font-black text-blue-600">{courses.length}</div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">Assigned Courses</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-2xl font-black text-emerald-600">
            {activities.filter((a) => a.submission_status === 'graded').length}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">Activities Graded</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-2xl font-black text-purple-600">{quizzes.length}</div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">Quizzes Available</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
            <MdLocalFireDepartment />
            <span>{learningStreak}</span>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">Day Streak</div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-sm font-extrabold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MdSchool className="text-lg" />
          <span>Courses & Lessons ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`pb-3 text-sm font-extrabold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'activities'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MdAssignment className="text-lg" />
          <span>Activities & Submissions ({activities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3 text-sm font-extrabold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'quizzes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MdQuiz className="text-lg" />
          <span>Quiz Results ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className={`pb-3 text-sm font-extrabold transition border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'achievements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MdEmojiEvents className="text-lg" />
          <span>Achievements ({achievements.filter((a) => a.earned).length})</span>
        </button>
      </div>

      {/* ── TAB 1: COURSES & LESSONS ── */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Courses selection pills */}
          {courses.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              No published courses are currently assigned for this age group.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {courses.map((c) => {
                  const isSelected = selectedCourse?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCourse(c)}
                      className={`px-4 py-3 rounded-2xl border text-left transition flex-shrink-0 min-w-[200px] ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-500">{c.age_group_name}</div>
                      <div className="font-extrabold text-sm text-slate-900 truncate mt-0.5">{c.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">Instructor: {c.instructor_name}</div>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${c.completion_percentage || 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Lessons List for Selected Course */}
              {selectedCourse && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{selectedCourse.title}</h3>
                      <p className="text-xs text-slate-500">
                        Instructor: <strong>{selectedCourse.instructor_name}</strong> • {lessons.length} Lessons
                      </p>
                    </div>

                    <button
                      onClick={handleLaunchChildPortal}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 text-slate-900 font-extrabold text-xs rounded-xl shadow-sm transition"
                    >
                      Learn this course together ➔
                    </button>
                  </div>

                  {lessons.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">No lessons in this course yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((lesson, index) => {
                        const isCompleted = lesson.completion_status === 'completed';
                        const isInProgress = lesson.completion_status === 'in_progress';

                        return (
                          <div
                            key={lesson.id}
                            className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isInProgress
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isCompleted ? '✓' : index + 1}
                              </div>

                              <div>
                                <h4 className="font-bold text-sm text-slate-800">{lesson.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                  {lesson.description || 'Interactive learning lesson'}
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                  <span>📚 {lesson.materials_count || 0} Materials</span>
                                  <span>🎬 {lesson.videos_count || 0} Videos</span>
                                  <span>✏️ {lesson.activities_count || 0} Activities</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              {isCompleted && (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-lg">
                                  Completed
                                </span>
                              )}
                              {isInProgress && (
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-lg">
                                  In Progress
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenLessonContent(lesson)}
                                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition flex items-center gap-1"
                              >
                                <MdVisibility className="text-sm" />
                                <span>View Content</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ACTIVITIES ── */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-lg text-slate-900">Assigned Activities</h3>
              <p className="text-xs text-slate-500">
                Track worksheets, matching exercises, and reading practice
              </p>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No activities assigned to this child yet.</div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => {
                const isGraded = act.submission_status === 'graded';
                const isPending = act.submission_status === 'pending';
                const notStarted = act.submission_status === 'not_started';

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{act.title}</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold uppercase text-[10px]">
                          {act.activity_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Course: <strong>{act.course_title}</strong> • Lesson: {act.lesson_title}
                      </div>
                      {act.feedback && (
                        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-xl mt-1.5">
                          <strong>Teacher Feedback:</strong> "{act.feedback}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                      <div>
                        {isGraded && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs">
                            Score: {act.score} / {act.max_score || 10}
                          </span>
                        )}
                        {isPending && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">
                            Pending Review
                          </span>
                        )}
                        {notStarted && (
                          <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full font-bold text-xs">
                            Not Started
                          </span>
                        )}
                      </div>

                      {/* Parent Help Submit Button */}
                      {isParentManaged && (
                        <button
                          onClick={() => {
                            setSubmittingActivity(act);
                            setSubmissionText(act.submission_text || '');
                            setSubmissionUrl(act.submission_url || '');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          {act.submission_id ? 'Update Submission' : 'Submit for Child'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: QUIZ RESULTS ── */}
      {activeTab === 'quizzes' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-black text-lg text-slate-900">Quiz Results & Progress</h3>
            <p className="text-xs text-slate-500">Review scores and completion dates</p>
          </div>

          {quizzes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No quizzes recorded for this child.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{quiz.title}</h4>
                      <p className="text-xs text-slate-500">
                        {quiz.course_title} • {quiz.lesson_title}
                      </p>
                    </div>
                    {quiz.percentage !== null && quiz.percentage !== undefined ? (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-black ${
                          quiz.percentage >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : quiz.percentage >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {quiz.percentage}%
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold">
                        Not Taken
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs bg-white p-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">SCORE</span>
                      <span className="font-bold text-slate-800">
                        {quiz.score !== null ? `${quiz.score} / ${quiz.total_points || 10}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">ATTEMPTS</span>
                      <span className="font-bold text-slate-800">{quiz.attempt_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ACHIEVEMENTS ── */}
      {activeTab === 'achievements' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-black text-lg text-slate-900">Milestone Achievements</h3>
            <p className="text-xs text-slate-500">Badges earned through lessons, quizzes, and streak consistency</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition flex items-center gap-3.5 ${
                  ach.earned
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${
                    ach.earned ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {ach.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{ach.name}</h4>
                  <p className="text-xs text-slate-500 leading-snug">{ach.description}</p>
                  <span className="text-[10px] font-black uppercase tracking-wider block mt-1">
                    {ach.earned ? '⭐ Unlocked' : '🔒 In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lesson Content Modal ── */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">{activeLesson.title}</h3>
                <p className="text-xs text-slate-400">Lesson Learning Materials & Videos</p>
              </div>
              <button onClick={() => setActiveLesson(null)} className="text-slate-400 hover:text-white">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {loadingLessonContent ? (
                <div className="py-12 text-center text-slate-400">Loading lesson content...</div>
              ) : (
                <>
                  {/* Videos */}
                  <div className="space-y-3">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MdVideoLibrary /> Videos ({lessonVideos.length})
                    </h4>
                    {lessonVideos.length === 0 ? (
                      <p className="text-xs text-slate-400">No videos for this lesson.</p>
                    ) : (
                      <div className="space-y-2">
                        {lessonVideos.map((v) => (
                          <div key={v.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs text-slate-800">{v.title}</span>
                              <span className="text-[11px] text-slate-400 block">{v.video_type || 'Educational Video'}</span>
                            </div>
                            {v.video_url && (
                              <a
                                href={v.video_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700"
                              >
                                Watch Video ▶
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Materials */}
                  <div className="space-y-3">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MdMenuBook /> Documents & Worksheets ({lessonMaterials.length})
                    </h4>
                    {lessonMaterials.length === 0 ? (
                      <p className="text-xs text-slate-400">No documents attached to this lesson.</p>
                    ) : (
                      <div className="space-y-2">
                        {lessonMaterials.map((m) => (
                          <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs text-slate-800">{m.title}</span>
                              <span className="text-[11px] text-slate-400 block">{m.type || 'Document'}</span>
                            </div>
                            {m.file_url && (
                              <a
                                href={m.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700"
                              >
                                View File 📄
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Parent Activity Submission Modal ── */}
      {submittingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Submit on Behalf of Child</h3>
                <p className="text-xs text-slate-500">{submittingActivity.title}</p>
              </div>
              <button onClick={() => setSubmittingActivity(null)} className="text-slate-400 hover:text-slate-600">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitActivityOnBehalf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Child's Written Answer or Response
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Type the child's response, notes, or practice sentences..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Worksheet Image or Document Link (Optional)
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingActivity(null)}
                  className="px-4 py-2 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <MdSend />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Instructor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

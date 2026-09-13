import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import RegisterParent from './pages/RegisterParent';
import Signup from './pages/Signup';
import SignupInstructor from './pages/SignupInstructor';
import Unauthorized from './pages/Unauthorized';
import Home from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminParents from './pages/admin/AdminParents';
import AdminInstructors from './pages/admin/AdminInstructors';
import AdminCourses from './pages/admin/AdminCourses';
import AdminAgeGroups from './pages/admin/AdminAgeGroups';
import AdminReports from './pages/admin/AdminReports';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminApproval from './pages/admin/AdminApproval';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminLessons from './pages/admin/AdminLessons';
import AdminProgress from './pages/admin/AdminProgress';
import AdminAIRecommendations from './pages/admin/AdminAIRecommendations';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminInstructorAssignments from './pages/admin/AdminInstructorAssignments';
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import InstructorLessonDetail from './pages/instructor/InstructorLessonDetail';
import InstructorLessonCreate from './pages/instructor/InstructorLessonCreate';
import InstructorQuizManage from './pages/instructor/InstructorQuizManage';
import InstructorActivitySubmissions from './pages/instructor/InstructorActivitySubmissions';
import InstructorStudentProfile from './pages/instructor/InstructorStudentProfile';
import InstructorStudents from './pages/instructor/InstructorStudents';
import InstructorMessages from './pages/instructor/InstructorMessages';
import InstructorNotifications from './pages/instructor/InstructorNotifications';
import InstructorProfile from './pages/instructor/InstructorProfile';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildren from './pages/parent/ParentChildren';
import ParentChildLearningSpace from './pages/parent/ParentChildLearningSpace';
import ParentProgress from './pages/parent/ParentProgress';
import ParentActivities from './pages/parent/ParentActivities';
import ParentQuizzes from './pages/parent/ParentQuizzes';
import ParentFeedback from './pages/parent/ParentFeedback';
import ParentNotifications from './pages/parent/ParentNotifications';
import ParentProfile from './pages/parent/ParentProfile';
import ParentHelp from './pages/parent/ParentHelp';
import ParentLayout from './components/ParentLayout';


// Child Portal
import ChildLayout from './components/ChildLayout';
import ChildDashboard from './pages/child/ChildDashboard';
import ChildCourses from './pages/child/ChildCourses';
import ChildCourseDetail from './pages/child/ChildCourseDetail';
import ChildLessonDetail from './pages/child/ChildLessonDetail';
import ChildProgress from './pages/child/ChildProgress';
import ChildActivities from './pages/child/ChildActivities';
import ChildQuizzes from './pages/child/ChildQuizzes';
import ChildAchievements from './pages/child/ChildAchievements';
import ChildNotifications from './pages/child/ChildNotifications';
import ChildProfile from './pages/child/ChildProfile';
import ChildQuizTake from './pages/child/ChildQuizTake';
import WritingActivity from './pages/child/WritingActivity';
import MatchingActivity from './pages/child/MatchingActivity';
import ListeningActivity from './pages/child/ListeningActivity';
import ReadingActivity from './pages/child/ReadingActivity';
import WorksheetActivity from './pages/child/WorksheetActivity';
import MaterialViewer from './components/child/MaterialViewer';
import VideoPlayer from './components/child/VideoPlayer';
import AudioPlayer from './components/child/AudioPlayer';

import { ROLE_HOME } from './utils/roles';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/home" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      {/* Sign up flow */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup/parent" element={<RegisterParent />} />
      <Route path="/signup/instructor" element={<SignupInstructor />} />
      {/* Legacy /register → redirect to /signup/parent */}
      <Route path="/register" element={<Navigate to="/signup/parent" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/parents"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminParents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/instructors"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminInstructors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/age-groups"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAgeGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/approval"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminApproval />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAuditLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/lessons"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLessons />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/progress"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminProgress />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/ai-recommendations"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAIRecommendations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminAnnouncements />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/instructor-assignments"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminInstructorAssignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/instructor/dashboard"
        element={<ProtectedRoute roles={['instructor']}><InstructorDashboard /></ProtectedRoute>}
      />
      <Route
        path="/instructor/courses"
        element={
          <ProtectedRoute roles={['instructor']}>
            <InstructorCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:id"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorCourseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/lessons/:id"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorLessonDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/lessons/create"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorLessonCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/courses/:courseId/lessons/:lessonId"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorLessonDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/lessons/:lessonId/edit"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorLessonCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/quizzes/:id"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorQuizManage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/activities/:id/submissions"
        element={
          <ProtectedRoute roles={['instructor', 'admin']}><InstructorActivitySubmissions /></ProtectedRoute>
        }
      />

      {/* ── Instructor Portal ── */}
      <Route path="/instructor/students/:studentId"
        element={<ProtectedRoute roles={['instructor']}><InstructorStudentProfile /></ProtectedRoute>}
      />
      <Route path="/instructor/students"
        element={<ProtectedRoute roles={['instructor']}><InstructorStudents /></ProtectedRoute>}
      />
      <Route path="/instructor/lessons"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/materials"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/activities"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/quizzes"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/submissions"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/attendance"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/progress"
        element={<ProtectedRoute roles={['instructor']}><Navigate to="/instructor/courses" replace /></ProtectedRoute>}
      />
      <Route path="/instructor/messages"
        element={<ProtectedRoute roles={['instructor']}><InstructorMessages /></ProtectedRoute>}
      />
      <Route path="/instructor/notifications"
        element={<ProtectedRoute roles={['instructor']}><InstructorNotifications /></ProtectedRoute>}
      />
      <Route path="/instructor/profile"
        element={<ProtectedRoute roles={['instructor']}><InstructorProfile /></ProtectedRoute>}
      />

      {/* ── Parent Portal ── */}
      <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="children" element={<ParentChildren />} />
        <Route path="children/:id" element={<ParentChildLearningSpace />} />
        <Route path="progress" element={<ParentProgress />} />
        <Route path="activities" element={<ParentActivities />} />
        <Route path="quizzes" element={<ParentQuizzes />} />
        <Route path="feedback" element={<ParentFeedback />} />
        <Route path="notifications" element={<ParentNotifications />} />
        <Route path="profile" element={<ParentProfile />} />
        <Route path="help" element={<ParentHelp />} />
        <Route path="register-child" element={<Navigate to="/parent/children?action=add" replace />} />
        <Route path="learning" element={<Navigate to="/parent/children" replace />} />
        <Route path="attendance" element={<Navigate to="/parent/progress" replace />} />
        <Route path="settings" element={<Navigate to="/parent/profile" replace />} />
      </Route>

      {/* ── Redirect legacy student routes to Child Portal ── */}
      <Route path="/student/*" element={<Navigate to="/child" replace />} />
      <Route path="/student" element={<Navigate to="/child" replace />} />
      <Route path="/courses" element={<Navigate to="/child/courses" replace />} />
      <Route path="/courses/:id" element={<Navigate to="/child/courses/:id" replace />} />
      <Route path="/lessons/:id" element={<Navigate to="/child/lessons/:id" replace />} />
      <Route path="/quizzes/:id" element={<Navigate to="/child/quizzes/:id" replace />} />
      <Route path="/activities/:id" element={<Navigate to="/child/activities" replace />} />

      {/* ── Child Learning Portal (Gamified, Interactive, Responsive) ── */}
      <Route path="/child" element={<ProtectedRoute roles={['student', 'parent']}><ChildLayout /></ProtectedRoute>}>
        <Route path="" element={<ChildDashboard />} />
        <Route path="dashboard" element={<ChildDashboard />} />
        <Route path="courses" element={<ChildCourses />} />
        <Route path="courses/:id" element={<ChildCourseDetail />} />
        <Route path="lessons/:id" element={<ChildLessonDetail />} />
        <Route path="progress" element={<ChildProgress />} />
        <Route path="activities" element={<ChildActivities />} />
        <Route path="quizzes" element={<ChildQuizzes />} />
        <Route path="achievements" element={<ChildAchievements />} />
        <Route path="notifications" element={<ChildNotifications />} />
        <Route path="profile" element={<ChildProfile />} />
        <Route path="quizzes/:id" element={<ChildQuizTake />} />
        <Route path="activities/:id/write" element={<WritingActivity />} />
        <Route path="activities/:id/match" element={<MatchingActivity />} />
        <Route path="activities/:id/listen" element={<ListeningActivity />} />
        <Route path="activities/:id/read" element={<ReadingActivity />} />
        <Route path="activities/:id/worksheet" element={<WorksheetActivity />} />
        <Route path="materials/:id" element={<MaterialViewer />} />
        <Route path="videos/:id" element={<VideoPlayer />} />
        <Route path="audio/:id" element={<AudioPlayer />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

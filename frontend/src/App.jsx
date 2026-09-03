import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Login from './pages/Login';
import RegisterParent from './pages/RegisterParent';
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
import InstructorCourses from './pages/instructor/InstructorCourses';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCourseDetail from './pages/instructor/InstructorCourseDetail';
import InstructorLessonDetail from './pages/instructor/InstructorLessonDetail';
import InstructorQuizManage from './pages/instructor/InstructorQuizManage';
import InstructorActivitySubmissions from './pages/instructor/InstructorActivitySubmissions';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildren from './pages/parent/ParentChildren';
import ParentChildLearningSpace from './pages/parent/ParentChildLearningSpace';
import ParentLayout from './components/ParentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import CourseCatalog from './pages/shared/CourseCatalog';
import StudentCourseDetail from './pages/student/StudentCourseDetail';
import StudentLessonDetail from './pages/student/StudentLessonDetail';
import QuizTake from './pages/student/QuizTake';
import ActivitySubmit from './pages/student/ActivitySubmit';
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
      <Route path="/register" element={<RegisterParent />} />
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
          <ProtectedRoute roles={['instructor', 'admin']}>
            <InstructorActivitySubmissions />
          </ProtectedRoute>
        }
      />

      {/* ── Parent ── */}
      <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="children" element={<ParentChildren />} />
        <Route path="children/:id" element={<ParentChildLearningSpace />} />
      </Route>

      <Route
        path="/parent/dashboard"
        element={
          <ProtectedRoute roles={['parent']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/children/:id"
        element={<ProtectedRoute roles={['parent']}><ParentChildLearningSpace /></ProtectedRoute>}
      />

      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Shared learning flow — both students and parents browse and act on behalf of a child */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute roles={['student', 'parent']}>
            <CourseCatalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id"
        element={
          <ProtectedRoute roles={['student', 'parent']}>
            <StudentCourseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:id"
        element={
          <ProtectedRoute roles={['student', 'parent']}>
            <StudentLessonDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id"
        element={
          <ProtectedRoute roles={['student']}>
            <QuizTake />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities/:id/submit"
        element={
          <ProtectedRoute roles={['student', 'parent']}>
            <ActivitySubmit />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

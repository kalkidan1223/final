const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const adminApprovalRoutes = require('./routes/adminApprovalRoutes');
const studentsRoutes = require('./routes/studentsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const lessonsRoutes = require('./routes/lessonsRoutes');
const ageGroupsRoutes = require('./routes/ageGroupsRoutes');
const quizzesRoutes = require('./routes/quizzesRoutes');
const quizQuestionsRoutes = require('./routes/quizQuestionsRoutes');
const activitiesRoutes = require('./routes/activitiesRoutes');
const submissionsRoutes = require('./routes/submissionsRoutes');
const progressRoutes = require('./routes/progressRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const videosRoutes = require('./routes/videosRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true, // required so the refresh-token cookie is sent/received
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/approval', adminApprovalRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/age-groups', ageGroupsRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/quiz-questions', quizQuestionsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai/recommendations', aiRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/videos', videosRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

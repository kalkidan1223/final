const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const adminApprovalRoutes = require('./routes/adminApprovalRoutes');
const studentsRoutes = require('./routes/studentsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const parentRoutes = require('./routes/parentRoutes');
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

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/approval', adminApprovalRoutes);
app.use('/api/parent', parentRoutes);
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

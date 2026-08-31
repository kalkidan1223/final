import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdSchool, MdFamilyRestroom, MdPerson, MdAdminPanelSettings,
  MdMenuBook, MdVideoLibrary, MdQuiz, MdAssignment, MdTrendingUp,
  MdSmartToy, MdStar, MdCheckCircle, MdArrowForward, MdMenu,
  MdClose, MdPlayCircle, MdAutoStories, MdDraw, MdCalculate,
  MdAbc, MdPalette, MdMusicNote, MdScience, MdPublic, MdChildCare
} from 'react-icons/md';

function PublicNav() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Learning Areas', href: '#learning-areas' },
    { label: 'Features', href: '#features' },
    { label: 'For Parents', href: '#parents' },
    { label: 'For Instructors', href: '#instructors' },
    { label: 'Contact', href: '#contact' },
  ];

  function handleNavClick(href) {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MdSchool className="text-white text-2xl" />
            </div>
            <span className="text-xl font-bold text-slate-800 hidden sm:block">
              Children Learning Hub
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-shadow font-semibold"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? (
              <MdClose className="text-2xl text-slate-700" />
            ) : (
              <MdMenu className="text-2xl text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold"
            >
              Login
            </button>
            <button
              onClick={() => {
                navigate('/register');
                setMobileMenuOpen(false);
              }}
              className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section id="home" className="pt-24 pb-16 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
              Making Learning{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Fun, Interactive
              </span>
              , and Personalized
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
              Children Learning Hub provides an engaging learning environment where children can learn,
              practice, participate in activities, and receive personalized learning support while parents
              and instructors monitor their progress.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Start Learning
              </button>
              <button
                onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-full font-bold text-lg hover:bg-blue-50 transition-all"
              >
                Explore Platform
              </button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-blue-200 to-purple-200 rounded-3xl p-8 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: MdAutoStories, color: 'from-blue-500 to-blue-600', label: 'Reading' },
                  { icon: MdCalculate, color: 'from-green-500 to-green-600', label: 'Math' },
                  { icon: MdMusicNote, color: 'from-purple-500 to-purple-600', label: 'Music' },
                  { icon: MdScience, color: 'from-orange-500 to-orange-600', label: 'Science' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform cursor-pointer`}
                  >
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3`}>
                      <item.icon className="text-white text-3xl" />
                    </div>
                    <div className="text-center font-semibold text-slate-700">{item.label}</div>
                  </div>
                ))}
              </div>
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <MdStar className="text-white text-2xl" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <MdSchool className="text-white text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UserRolesSection() {
  const roles = [
    {
      icon: MdFamilyRestroom,
      title: 'Parent',
      description: 'Parents manage their children\'s learning and monitor progress.',
      color: 'from-blue-500 to-blue-600',
      link: '#parents',
    },
    {
      icon: MdPerson,
      title: 'Instructor',
      description: 'Instructors create lessons, activities, quizzes and learning materials and support children\'s learning.',
      color: 'from-green-500 to-green-600',
      link: '#instructors',
    },
    {
      icon: MdChildCare,
      title: 'Child / Student',
      description: 'Children access age-appropriate learning content, activities, quizzes and interactive learning experiences.',
      color: 'from-purple-500 to-purple-600',
      link: '#learning-areas',
    },
    {
      icon: MdAdminPanelSettings,
      title: 'Administrator',
      description: 'Administrators manage users, instructors, courses, approvals and the overall learning platform.',
      color: 'from-orange-500 to-orange-600',
      link: '#about',
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Who Uses Children Learning Hub?
          </h2>
          <p className="text-lg text-slate-600">
            A comprehensive platform designed for everyone involved in children's education
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {roles.map((role, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
                <role.icon className="text-white text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{role.title}</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">{role.description}</p>
              <button
                onClick={() => document.querySelector(role.link)?.scrollIntoView({ behavior: 'smooth' })}
                className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
              >
                Learn More <MdArrowForward />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgeLearningModel() {
  return (
    <section id="about" className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Learning Designed for Every Child
          </h2>
          <p className="text-lg text-slate-600">
            Age-appropriate learning experiences tailored to each developmental stage
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Age 5-9 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-purple-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <MdFamilyRestroom className="text-white text-3xl" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">Age 5–9</div>
                <div className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full inline-block mt-1">
                  PARENT MANAGED
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Parent-Guided Learning</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Children aged 5–9 use the platform through their parent or guardian. Parents open the
              child's learning space and help them access lessons, learning materials and activities.
            </p>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <MdCheckCircle className="text-purple-600 flex-shrink-0 mt-0.5" />
                <span>Parents guide children through lessons and activities</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700 mt-2">
                <MdCheckCircle className="text-purple-600 flex-shrink-0 mt-0.5" />
                <span>No separate login required for children</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700 mt-2">
                <MdCheckCircle className="text-purple-600 flex-shrink-0 mt-0.5" />
                <span>Safe, parent-supervised learning environment</span>
              </div>
            </div>
          </div>

          {/* Age 10-12 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-blue-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <MdSchool className="text-white text-3xl" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">Age 10–12</div>
                <div className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block mt-1">
                  STUDENT ACCOUNT
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Independent Student Learning</h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Children aged 10–12 can use an individual student account created through their parent
              or guardian and approved by the administrator.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Parent registers child</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Administrator approves account</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Student receives access</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Student can log in independently</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200 text-sm text-slate-600">
                <MdCheckCircle className="inline text-blue-600 mr-2" />
                Parents can continue monitoring progress
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: 'Parent Registers',
      description: 'Parent creates an account and provides the required information.',
      icon: MdFamilyRestroom,
      color: 'from-blue-500 to-blue-600',
    },
    {
      number: 2,
      title: 'Admin Approves',
      description: 'Administrator reviews and approves the parent account.',
      icon: MdAdminPanelSettings,
      color: 'from-green-500 to-green-600',
    },
    {
      number: 3,
      title: 'Register Your Child',
      description: 'Parent provides the child\'s information.',
      icon: MdChildCare,
      color: 'from-purple-500 to-purple-600',
    },
    {
      number: 4,
      title: 'Learning Begins',
      description: 'Child accesses age-appropriate learning resources.',
      icon: MdSchool,
      color: 'from-pink-500 to-pink-600',
    },
    {
      number: 5,
      title: 'Instructor Support',
      description: 'Instructor provides lessons, materials, activities and assessments.',
      icon: MdPerson,
      color: 'from-orange-500 to-orange-600',
    },
    {
      number: 6,
      title: 'Progress Is Tracked',
      description: 'The system records learning activities, scores and progress.',
      icon: MdTrendingUp,
      color: 'from-teal-500 to-teal-600',
    },
    {
      number: 7,
      title: 'Personalized Recommendations',
      description: 'AI analyzes learning performance and recommends suitable learning activities.',
      icon: MdSmartToy,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            How Children Learning Hub Works
          </h2>
          <p className="text-lg text-slate-600">
            A simple, structured approach to online learning
          </p>
        </div>

        <div className="relative">
          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <step.icon className="text-white text-3xl" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} text-white flex items-center justify-center font-bold text-sm`}>
                        {step.number}
                      </span>
                      <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                    </div>
                    <p className="text-slate-600">{step.description}</p>
                  </div>
                </div>

                {/* Arrow */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex justify-center my-4">
                    <MdArrowForward className="text-3xl text-slate-300 transform rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningAreasSection() {
  const learningAreas = [
    {
      title: 'Amharic',
      description: 'Letters, words, reading and language practice.',
      icon: MdAbc,
      color: 'from-red-500 to-red-600',
    },
    {
      title: 'Mathematics',
      description: 'Numbers, counting, calculations and problem solving.',
      icon: MdCalculate,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Reading',
      description: 'Stories, vocabulary, comprehension and reading practice.',
      icon: MdAutoStories,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'General Knowledge',
      description: 'Age-appropriate knowledge and interactive learning.',
      icon: MdPublic,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Science',
      description: 'Fun experiments, observations and discoveries.',
      icon: MdScience,
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Art & Creativity',
      description: 'Drawing, coloring, painting and creative expression.',
      icon: MdPalette,
      color: 'from-pink-500 to-pink-600',
    },
  ];

  return (
    <section id="learning-areas" className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            What Can Children Learn?
          </h2>
          <p className="text-lg text-slate-600">
            Comprehensive curriculum covering essential learning areas
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {learningAreas.map((area, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${area.color} flex items-center justify-center mb-4`}>
                <area.icon className="text-white text-3xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{area.title}</h3>
              <p className="text-slate-600">{area.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InteractiveLearningPreview() {
  const activities = [
    { icon: MdVideoLibrary, label: 'Video Learning', color: 'from-red-500 to-red-600' },
    { icon: MdAutoStories, label: 'Reading', color: 'from-blue-500 to-blue-600' },
    { icon: MdDraw, label: 'Writing', color: 'from-green-500 to-green-600' },
    { icon: MdQuiz, label: 'Quizzes', color: 'from-purple-500 to-purple-600' },
    { icon: MdAssignment, label: 'Activities', color: 'from-orange-500 to-orange-600' },
    { icon: MdPalette, label: 'Drawing', color: 'from-pink-500 to-pink-600' },
    { icon: MdCalculate, label: 'Counting', color: 'from-teal-500 to-teal-600' },
    { icon: MdAbc, label: 'Letter Tracing', color: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Interactive Learning Experience
          </h2>
          <p className="text-lg text-slate-600">
            Engage children with multiple learning formats
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {activities.map((activity, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 hover:shadow-lg transition-all transform hover:scale-105 cursor-pointer"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${activity.color} flex items-center justify-center mx-auto mb-3`}>
                <activity.icon className="text-white text-3xl" />
              </div>
              <div className="text-center font-semibold text-slate-700">{activity.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-8 p-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl text-white shadow-2xl">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Learn</div>
              <div className="text-blue-100">New Concepts</div>
            </div>
            <div className="w-px h-16 bg-blue-300"></div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Practice</div>
              <div className="text-blue-100">Skills Daily</div>
            </div>
            <div className="w-px h-16 bg-blue-300"></div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Play</div>
              <div className="text-blue-100">Learning Games</div>
            </div>
            <div className="w-px h-16 bg-blue-300"></div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">Improve</div>
              <div className="text-blue-100">Continuously</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LearningMaterialsPreview() {
  const materials = [
    { icon: MdMenuBook, label: 'PDF Documents', color: 'from-red-500 to-red-600' },
    { icon: MdVideoLibrary, label: 'Video Lessons', color: 'from-blue-500 to-blue-600' },
    { icon: MdMusicNote, label: 'Audio Content', color: 'from-green-500 to-green-600' },
    { icon: MdPalette, label: 'Images & Graphics', color: 'from-purple-500 to-purple-600' },
    { icon: MdPlayCircle, label: 'Interactive Lessons', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Rich Learning Materials
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Instructors can provide different types of learning materials, allowing children to learn
            through text, images, audio and video.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {materials.map((material, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all text-center"
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${material.color} flex items-center justify-center mx-auto mb-4`}>
                <material.icon className="text-white text-4xl" />
              </div>
              <h3 className="font-bold text-slate-800">{material.label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityExample() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Learning Through Activities
          </h2>
          <p className="text-lg text-slate-600">
            Interactive activities make learning engaging and measurable
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Example 1 */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <MdAssignment className="text-blue-600 text-2xl" />
                <span className="font-bold text-slate-800">Writing Activity</span>
              </div>
              <p className="text-slate-700 mb-4">
                "Write the letter <span className="font-bold text-2xl text-blue-600">ሀ</span> five times."
              </p>
              <div className="bg-slate-50 rounded-lg p-3 border-2 border-dashed border-slate-300 text-center text-slate-500">
                [Child's Submission]
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <MdCheckCircle className="text-green-600 text-xl" />
                <span className="font-semibold text-green-700">Teacher Feedback:</span>
              </div>
              <p className="text-green-700 text-sm">
                "Excellent work! Keep practicing your letter formation."
              </p>
            </div>
          </div>

          {/* Example 2 */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <MdAutoStories className="text-purple-600 text-2xl" />
                <span className="font-bold text-slate-800">Reading Activity</span>
              </div>
              <p className="text-slate-700 mb-4">
                "Read this short story and answer the questions."
              </p>
              <div className="bg-purple-50 rounded-lg p-3 text-sm text-slate-600">
                Children can read, comprehend, and respond to questions.
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-purple-200">
              <div className="text-sm text-slate-600">
                <strong>Score:</strong> <span className="text-purple-600 font-bold">8/10</span>
              </div>
            </div>
          </div>

          {/* Example 3 */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border-2 border-green-200">
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <MdCalculate className="text-green-600 text-2xl" />
                <span className="font-bold text-slate-800">Math Activity</span>
              </div>
              <p className="text-slate-700 mb-4">
                "Count the objects and select the correct number."
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-green-200 rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    className={`w-10 h-10 rounded-lg font-bold ${
                      num === 5
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ParentFeaturesSection() {
  const features = [
    { icon: MdChildCare, label: 'Manage Children' },
    { icon: MdMenuBook, label: 'View Learning Materials' },
    { icon: MdTrendingUp, label: 'Monitor Progress' },
    { icon: MdAssignment, label: 'View Activities' },
    { icon: MdQuiz, label: 'View Quiz Results' },
    { icon: MdEventAvailable, label: 'View Attendance' },
    { icon: MdFeedback, label: 'Receive Teacher Feedback' },
    { icon: MdNotifications, label: 'Receive Notifications' },
    { icon: MdSmartToy, label: 'View AI Recommendations' },
    { icon: MdMessage, label: 'Communicate with Instructors' },
  ];

  return (
    <section id="parents" className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Designed for Parents
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Parents remain connected to their child's learning journey with comprehensive monitoring
            and communication tools.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all text-center"
            >
              <feature.icon className="text-blue-600 text-3xl mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">{feature.label}</div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Explore Parent Features <MdArrowForward />
          </button>
        </div>
      </div>
    </section>
  );
}

function InstructorFeaturesSection() {
  const features = [
    { icon: MdMenuBook, label: 'Create Lessons' },
    { icon: MdVideoLibrary, label: 'Upload Materials' },
    { icon: MdAssignment, label: 'Create Activities' },
    { icon: MdQuiz, label: 'Create Quizzes' },
    { icon: MdCheckCircle, label: 'Review Submissions' },
    { icon: MdStar, label: 'Grade Activities' },
    { icon: MdEventAvailable, label: 'Record Attendance' },
    { icon: MdFeedback, label: 'Provide Feedback' },
    { icon: MdTrendingUp, label: 'Monitor Progress' },
    { icon: MdSmartToy, label: 'View AI Recommendations' },
  ];

  return (
    <section id="instructors" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Powerful Tools for Instructors
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything instructors need to create engaging lessons and support student learning.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-4 hover:shadow-lg transition-all text-center border border-green-200"
            >
              <feature.icon className="text-green-600 text-3xl mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">{feature.label}</div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl">
            For Instructors <MdArrowForward />
          </button>
        </div>
      </div>
    </section>
  );
}

function AIRecommendationSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <MdSmartToy className="text-6xl" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Personalized Learning with AI
          </h2>
          <p className="text-lg text-indigo-100 max-w-3xl mx-auto">
            Our AI-powered recommendation system analyzes each child's learning patterns and provides
            personalized suggestions to enhance their educational journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <MdTrendingUp className="text-4xl mb-3" />
            <h3 className="text-xl font-bold mb-2">Analyzes Performance</h3>
            <p className="text-indigo-100 text-sm">
              Tracks quiz scores, activity completion, and learning patterns
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <MdAssignment className="text-4xl mb-3" />
            <h3 className="text-xl font-bold mb-2">Identifies Gaps</h3>
            <p className="text-indigo-100 text-sm">
              Detects areas where children need additional practice
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <MdMenuBook className="text-4xl mb-3" />
            <h3 className="text-xl font-bold mb-2">Recommends Content</h3>
            <p className="text-indigo-100 text-sm">
              Suggests lessons, activities, and materials tailored to each child
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <MdStar className="text-4xl mb-3" />
            <h3 className="text-xl font-bold mb-2">Improves Outcomes</h3>
            <p className="text-indigo-100 text-sm">
              Helps children learn more effectively with personalized support
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
            <p className="text-xl font-semibold mb-2">
              "Every child learns differently. Our AI ensures each child gets the support they need."
            </p>
            <p className="text-indigo-200">— Personalized Learning for Every Student</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const navigate = useNavigate();

  return (
    <section id="contact" className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
          Ready to Start Your Child's Learning Journey?
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of parents and children already using Children Learning Hub
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105"
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-transparent border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all"
          >
            Login to Your Account
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <MdSchool className="text-white text-2xl" />
              </div>
              <span className="text-xl font-bold text-white">Children Learning Hub</span>
            </div>
            <p className="text-sm text-slate-400">
              Making learning fun, interactive, and personalized for every child.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-blue-400 transition-colors">About Us</button></li>
              <li><button className="hover:text-blue-400 transition-colors">How It Works</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Learning Areas</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Features</button></li>
            </ul>
          </div>

          {/* For Users */}
          <div>
            <h3 className="text-white font-bold mb-4">For Users</h3>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-blue-400 transition-colors">For Parents</button></li>
              <li><button className="hover:text-blue-400 transition-colors">For Instructors</button></li>
              <li><button className="hover:text-blue-400 transition-colors">For Students</button></li>
              <li><button className="hover:text-blue-400 transition-colors">For Administrators</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-blue-400 transition-colors">Help Center</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Contact Us</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-blue-400 transition-colors">Terms of Service</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Children Learning Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <HeroSection />
      <UserRolesSection />
      <AgeLearningModel />
      <HowItWorksSection />
      <LearningAreasSection />
      <InteractiveLearningPreview />
      <LearningMaterialsPreview />
      <ActivityExample />
      <ParentFeaturesSection />
      <InstructorFeaturesSection />
      <AIRecommendationSection />
      <CTASection />
      <Footer />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { MdAdd, MdDelete, MdUpload, MdLink, MdVisibility, MdClose } from 'react-icons/md';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: '📝' },
  { value: 'true_false', label: 'True / False', icon: '✓' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', icon: '✏️' },
  { value: 'matching', label: 'Matching', icon: '🔗' },
  { value: 'short_answer', label: 'Short Answer', icon: '💬' },
  { value: 'picture', label: 'Picture Question', icon: '🖼️' },
  { value: 'audio', label: 'Audio Question', icon: '🎵' },
];
const MEDIA_TYPES = ['picture', 'audio'];
const OPTION_TYPES = ['mcq', 'matching'];

const EMPTY_SETTINGS = {
  title: '',
  description: '',
  instructions: '',
  time_limit_seconds: '',
  passing_score: '',
  max_score: '',
  attempt_limit: '1',
  shuffle_questions: false,
  show_result_immediately: true,
  status: 'active',
};

const EMPTY_QUESTION = {
  question_text: '',
  question_type: 'mcq',
  options: ['', '', '', ''],
  correct_answer: '',
  points: '1',
  explanation: '',
  media_url: '',
  selectedOptionIndex: 0,
  parseMatchingPairs: [
    { id: 1, question: '', answer: '' },
    { id: 2, question: '', answer: '' },
    { id: 3, question: '', answer: '' }
  ]
};

function optionsList(q) {
  if (Array.isArray(q.options)) {
    return q.options.filter(o => o && o.trim());
  }
  if (q.options && typeof q.options === 'string') {
    return q.options.split('\n').map((o) => o.trim()).filter(Boolean);
  }
  return [];
}

function parseMatchingPairs(q) {
  if (q.question_type === 'matching' && q.options) {
    // New format: { pairs: [{question, answer}] }
    if (typeof q.options === 'object' && q.options.pairs) {
      return q.options.pairs;
    }
    // Old format: { questions: [], answers: [], matches: [] }
    if (typeof q.options === 'object' && q.options.questions && q.options.answers) {
      const questions = q.options.questions || [];
      const answers = q.options.answers || [];
      return questions.map((question, idx) => ({
        question: question,
        answer: answers[idx] || ''
      }));
    }
    // Very old format: array of "question | answer"
    if (Array.isArray(q.options)) {
      return q.options.map(opt => {
        const parts = opt.split(' | ');
        return parts.length >= 2 ? { question: parts[0], answer: parts[1] } : { question: opt, answer: '' };
      });
    }
  }
  return [];
}

// Collects the matching pairs from any shape a matching question can be in:
// the editor form (`parseMatchingPairs`), the saved API shape (`options.pairs`),
// the legacy shape (`options.questions` + `options.answers`) or the oldest
// array-of-"question | answer" shape. Returns [{ question, answer }].
function extractMatchingPairs(q) {
  let pairs = [];

  if (Array.isArray(q.parseMatchingPairs)) {
    pairs = q.parseMatchingPairs;
  } else if (q.options && typeof q.options === 'object' && Array.isArray(q.options.pairs)) {
    pairs = q.options.pairs;
  } else if (q.options && typeof q.options === 'object' && Array.isArray(q.options.questions)) {
    const answers = Array.isArray(q.options.answers) ? q.options.answers : [];
    pairs = q.options.questions.map((question, idx) => ({ question, answer: answers[idx] || '' }));
  } else if (Array.isArray(q.options)) {
    pairs = q.options.map((opt) => {
      const parts = String(opt).split(' | ');
      return { question: parts[0] || '', answer: parts[1] || '' };
    });
  }

  return pairs
    .filter((p) => p && String(p.question || '').trim() && String(p.answer || '').trim())
    .map((p) => ({ question: String(p.question).trim(), answer: String(p.answer).trim() }));
}

// Normalise a question (either from the server or the local draft list)
// into the shape the backend expects. This is idempotent: it is called once
// when a question is added to the draft and again when the whole draft is
// saved, so it must accept both the editor shape and the already-saved shape.
function toApiQuestion(q) {
  if (q.question_type === 'matching') {
    const validPairs = extractMatchingPairs(q);
    return {
      question_text: String(q.question_text || '').trim() || 'Match the following items correctly',
      question_type: 'matching',
      // The stored mapping is informational; the child-side grader compares the
      // learner's selections against options.pairs, so the pairs are the source
      // of truth. We keep the identity mapping for backwards compatibility.
      correct_answer: JSON.stringify(validPairs.map((_, idx) => idx)),
      points: Number(q.points) || 1,
      explanation: q.explanation || null,
      options: { pairs: validPairs },
      question_config: (q.media_url || (q.question_config?.media_url))
        ? { media_url: q.media_url || q.question_config?.media_url }
        : (q.question_config && Object.keys(q.question_config).length ? q.question_config : null),
    };
  }

  const options = OPTION_TYPES.includes(q.question_type) ? optionsList(q) : undefined;

  return {
    question_text: q.question_text,
    question_type: q.question_type,
    correct_answer: q.correct_answer,
    points: Number(q.points) || 1,
    explanation: q.explanation || null,
    options, // Backend will JSON.stringify this
    question_config: (q.media_url || (q.question_config?.media_url))
      ? { media_url: q.media_url || q.question_config?.media_url }
      : (q.question_config && Object.keys(q.question_config).length ? q.question_config : null),
  };
}

export default function QuizBuilder({ open, onClose, lessonId, quiz, onSaved }) {
  const [settings, setSettings] = useState({ ...EMPTY_SETTINGS });
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState({ ...EMPTY_QUESTION });
  const [mode, setMode] = useState('create');
  const [activeId, setActiveId] = useState(null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const seqRef = useRef(0);
  const contentRef = useRef(null);

  const isEdit = mode === 'edit';
  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-500';

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function fetchQuestions(quizId) {
    setLoadingQuestions(true);
    try {
      const { data } = await axiosClient.get(`/quizzes/${quizId}`);
      // Normalise the options for the editor. Matching questions keep their
      // `{ pairs: [...] }` object untouched; only MCQ options are padded to
      // four blanks so the editor has four input rows.
      const formattedQuestions = (data.questions || []).map(q => {
        let options = q.options;
        if (q.question_type === 'mcq') {
          let list = [];
          if (Array.isArray(q.options)) {
            list = q.options;
          } else if (q.options && typeof q.options === 'string') {
            list = q.options.split('\n').filter(Boolean);
          }
          while (list.length < 4) list.push('');
          options = list;
        }
        return { ...q, options };
      });
      setQuestions(formattedQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.error || 'Could not load quiz questions');
    } finally {
      setLoadingQuestions(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setPreview(false);
    setError('');
    setNotice('');
    setBusy(false);
    setUploading(false);
    setQuestionForm({ 
      ...EMPTY_QUESTION, 
      options: ['', '', '', ''], 
      selectedOptionIndex: 0,
      parseMatchingPairs: [
        { id: Date.now() + 0, question: '', answer: '' },
        { id: Date.now() + 1, question: '', answer: '' },
        { id: Date.now() + 2, question: '', answer: '' }
      ]
    });
    contentRef.current?.scrollTo({ top: 0 });
    if (quiz) {
      console.log('Opening quiz in edit mode:', quiz);
      setMode('edit');
      setActiveId(quiz.id);
      setSettings({
        title: quiz.title || '',
        description: quiz.description || '',
        instructions: quiz.instructions || '',
        time_limit_seconds: quiz.time_limit_seconds || '',
        passing_score: quiz.passing_score || '',
        max_score: quiz.max_score || '',
        attempt_limit: quiz.attempt_limit ?? '1',
        shuffle_questions: Boolean(quiz.shuffle_questions),
        show_result_immediately: quiz.show_result_immediately !== false,
        status: quiz.status || 'active',
      });
      // Fetch questions from server
      fetchQuestions(quiz.id).catch((err) => {
        console.error('Fetch questions error:', err);
        setError(err.response?.data?.error || 'Could not load quiz questions');
      });
    } else {
      console.log('Opening quiz in create mode');
      setMode('create');
      setActiveId(null);
      setSettings({ ...EMPTY_SETTINGS });
      setQuestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz]);

  // Create the quiz (status active or inactive) and save every draft question
  // that was written in the modal in one step.
  async function createQuiz(status) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data } = await axiosClient.post(`/lessons/${lessonId}/quizzes`, { ...settings, status });
      const createdId = data.quiz.id;
      if (questions.length > 0) {
        try {
          await axiosClient.put(`/quizzes/${createdId}/questions`, {
            questions: questions.map(toApiQuestion),
          });
        } catch (questionErr) {
          setError(questionErr.response?.data?.error || 'The quiz was created but some questions could not be saved.');
          setMode('edit');
          setActiveId(createdId);
          await fetchQuestions(createdId);
          onSaved();
          return;
        }
      }
      setMode('edit');
      setActiveId(createdId);
      await fetchQuestions(createdId);
      contentRef.current?.scrollTo({ top: 0 });
      setNotice(`${status === 'active' ? 'Quiz created' : 'Draft saved'} with ${questions.length} question(s). Keep editing or close.`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the quiz');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveQuiz(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload = {
        title: settings.title,
        description: settings.description || null,
        instructions: settings.instructions || null,
        time_limit_seconds: settings.time_limit_seconds ? Number(settings.time_limit_seconds) : null,
        passing_score: settings.passing_score ? Number(settings.passing_score) : null,
        max_score: settings.max_score ? Number(settings.max_score) : null,
        attempt_limit: Number(settings.attempt_limit) || 1,
        shuffle_questions: settings.shuffle_questions,
        show_result_immediately: settings.show_result_immediately,
        status: settings.status,
      };
      await axiosClient.put(`/quizzes/${activeId}`, payload);
      setNotice('Quiz settings saved.');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the quiz');
    } finally {
      setBusy(false);
    }
  }

  // From the question form (edit mode persists immediately; create mode
  // keeps the question locally until the quiz is created).
  function handleQuestionSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = toApiQuestion(questionForm);

    // Validation
    if (payload.question_type === 'matching') {
      const validPairs = questionForm.parseMatchingPairs?.filter(p => 
        p.question && p.question.trim() && p.answer && p.answer.trim()
      ) || [];
      
      if (validPairs.length < 2) {
        setError('A matching question needs at least 2 complete question-answer pairs.');
        return;
      }
      if (validPairs.length > 10) {
        setError('Maximum 10 question-answer pairs allowed.');
        return;
      }
    } else if (OPTION_TYPES.includes(payload.question_type)) {
      const validOptions = payload.options ? payload.options.filter(o => o && o.trim()) : [];
      if (validOptions.length < 2) {
        setError('A multiple-choice/matching question needs at least two options with values.');
        return;
      }
      if (!payload.correct_answer || !validOptions.includes(payload.correct_answer)) {
        setError('Please select a correct answer from the options (use the radio button).');
        return;
      }
    }

    if (MEDIA_TYPES.includes(payload.question_type) && !payload.question_config?.media_url) {
      setError('A picture/audio question needs a media file or URL.');
      return;
    }

    if (isEdit) {
      setBusy(true);
      axiosClient.post(`/quizzes/${activeId}/questions`, payload)
        .then(() => fetchQuestions(activeId))
        .catch((err) => setError(err.response?.data?.error || 'Could not add the question'))
        .finally(() => setBusy(false));
    } else {
      seqRef.current += 1;
      setQuestions((qs) => [...qs, { id: `local-${seqRef.current}`, ...payload }]);
    }
    setQuestionForm({ 
      ...EMPTY_QUESTION, 
      options: ['', '', '', ''], 
      selectedOptionIndex: 0,
      parseMatchingPairs: [
        { id: Date.now() + 0, question: '', answer: '' },
        { id: Date.now() + 1, question: '', answer: '' },
        { id: Date.now() + 2, question: '', answer: '' }
      ]
    });
  }

  function handleQuestionDelete(q) {
    if (!confirm('Delete this question?')) return;
    setError('');
    console.log('Deleting question:', q);
    if (isEdit) {
      if (String(q.id).startsWith('local-')) {
        setQuestions((qs) => qs.filter((x) => x.id !== q.id));
        return;
      }
      setBusy(true);
      axiosClient.delete(`/quiz-questions/${q.id}`)
        .then(() => {
          console.log('Question deleted, fetching updated list');
          fetchQuestions(activeId);
        })
        .catch((err) => {
          console.error('Delete error:', err);
          setError(err.response?.data?.error || 'Could not delete the question');
        })
        .finally(() => setBusy(false));
    } else {
      setQuestions((qs) => qs.filter((x) => x.id !== q.id));
    }
  }

  function handleQuestionEdit(q) {
    setError('');
    setEditingQuestionId(q.id);

    // Populate the form with the question data
    let options = ['', '', '', ''];
    let parseMatchingPairs = [
      { id: 1, question: '', answer: '' },
      { id: 2, question: '', answer: '' },
      { id: 3, question: '', answer: '' }
    ];

    if (q.question_type === 'matching' && q.options) {
      // Parse matching data from options - new format with pairs
      if (typeof q.options === 'object' && q.options.pairs) {
        parseMatchingPairs = q.options.pairs.map((p, idx) => ({
          id: Date.now() + idx,
          question: p.question || '',
          answer: p.answer || ''
        }));
      } 
      // Old format with questions + answers arrays
      else if (typeof q.options === 'object' && q.options.questions && q.options.answers) {
        const questions = q.options.questions || [];
        const answers = q.options.answers || [];
        parseMatchingPairs = questions.map((question, idx) => ({
          id: Date.now() + idx,
          question: question || '',
          answer: answers[idx] || ''
        }));
      } 
      // Very old format - array of strings
      else if (Array.isArray(q.options)) {
        parseMatchingPairs = q.options.map((opt, idx) => {
          const parts = opt.split(' | ');
          return {
            id: Date.now() + idx,
            question: parts[0] || '',
            answer: parts[1] || ''
          };
        });
      }
    } else if (Array.isArray(q.options)) {
      options = [...q.options];
      while (options.length < 4) {
        options.push('');
      }
    } else if (q.options && typeof q.options === 'string') {
      options = q.options.split('\n').filter(Boolean);
      while (options.length < 4) {
        options.push('');
      }
    }

    setQuestionForm({
      question_text: q.question_text || '',
      question_type: q.question_type || 'mcq',
      options: options,
      correct_answer: q.correct_answer || '',
      points: q.points || '1',
      explanation: q.explanation || '',
      media_url: q.question_config?.media_url || '',
      selectedOptionIndex: 0,
      parseMatchingPairs: parseMatchingPairs
    });

    // Scroll to the question form
    contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
  }

  async function handleQuestionUpdate(e) {
    e.preventDefault();
    setError('');
    const payload = toApiQuestion(questionForm);

    // Validation
    if (payload.question_type === 'matching') {
      const validPairs = questionForm.parseMatchingPairs?.filter(p => 
        p.question && p.question.trim() && p.answer && p.answer.trim()
      ) || [];
      
      if (validPairs.length < 2) {
        setError('A matching question needs at least 2 complete question-answer pairs.');
        return;
      }
      if (validPairs.length > 10) {
        setError('Maximum 10 question-answer pairs allowed.');
        return;
      }
    } else if (OPTION_TYPES.includes(payload.question_type)) {
      const validOptions = payload.options ? payload.options.filter(o => o && o.trim()) : [];
      if (validOptions.length < 2) {
        setError('A multiple-choice/matching question needs at least two options with values.');
        return;
      }
      if (!payload.correct_answer || !validOptions.includes(payload.correct_answer)) {
        setError('Please select a correct answer from the options (use the radio button).');
        return;
      }
    }

    if (MEDIA_TYPES.includes(payload.question_type) && !payload.question_config?.media_url) {
      setError('A picture/audio question needs a media file or URL.');
      return;
    }

    if (isEdit && editingQuestionId && !String(editingQuestionId).startsWith('local-')) {
      setBusy(true);
      try {
        // Delete the old question
        await axiosClient.delete(`/quiz-questions/${editingQuestionId}`);
        // Add the updated question
        await axiosClient.post(`/quizzes/${activeId}/questions`, payload);
        await fetchQuestions(activeId);
        setNotice('Question updated successfully!');
        setEditingQuestionId(null);
        setQuestionForm({ 
      ...EMPTY_QUESTION, 
      options: ['', '', '', ''], 
      selectedOptionIndex: 0,
      parseMatchingPairs: [
        { id: Date.now() + 0, question: '', answer: '' },
        { id: Date.now() + 1, question: '', answer: '' },
        { id: Date.now() + 2, question: '', answer: '' }
      ]
    });
        setTimeout(() => setNotice(''), 3000);
      } catch (err) {
        console.error('Update error:', err);
        setError(err.response?.data?.error || 'Could not update the question');
      } finally {
        setBusy(false);
      }
    } else {
      // Local draft edit
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === editingQuestionId ? { ...q, ...payload } : q
        )
      );
      setNotice('Question updated in draft!');
      setEditingQuestionId(null);
      setQuestionForm({ 
      ...EMPTY_QUESTION, 
      options: ['', '', '', ''], 
      selectedOptionIndex: 0,
      parseMatchingPairs: [
        { id: Date.now() + 0, question: '', answer: '' },
        { id: Date.now() + 1, question: '', answer: '' },
        { id: Date.now() + 2, question: '', answer: '' }
      ]
    });
      setTimeout(() => setNotice(''), 3000);
    }
  }

  function cancelQuestionEdit() {
    setEditingQuestionId(null);
    setQuestionForm({ 
      ...EMPTY_QUESTION, 
      options: ['', '', '', ''], 
      selectedOptionIndex: 0,
      parseMatchingPairs: [
        { id: Date.now() + 0, question: '', answer: '' },
        { id: Date.now() + 1, question: '', answer: '' },
        { id: Date.now() + 2, question: '', answer: '' }
      ]
    });
    setError('');
  }

  async function handleMediaUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axiosClient.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQuestionForm((f) => ({ ...f, media_url: data.url }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the media file');
    } finally {
      setUploading(false);
    }
  }

  function renderPreview() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-800">👁️ Quiz Preview</h3>
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
          >
            <MdClose /> Close Preview
          </button>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white">
          <h2 className="text-2xl font-black mb-2">{settings.title || 'Untitled Quiz'}</h2>
          {settings.description && <p className="text-blue-100 mb-2">{settings.description}</p>}
          {settings.instructions && <p className="text-blue-200 text-sm">{settings.instructions}</p>}
        </div>

        {questions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
            <span className="text-6xl block mb-4">📝</span>
            <p className="text-gray-500 font-medium text-lg">No questions yet</p>
            <p className="text-gray-400 mt-2">Add questions to see the preview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                    {q.question_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                    {q.points} pt(s)
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-800 mb-4">{q.question_text}</p>

                {q.question_type === 'matching' && parseMatchingPairs(q).length > 0 ? (
                  (() => {
                    const matchingData = parseMatchingPairs(q);
                    if (matchingData.questions && matchingData.answers) {
                      // New format
                      return (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-600 mb-2">❓ Questions (Left)</p>
                            {matchingData.questions.map((question, idx) => (
                              <div key={idx} className="px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                                {idx + 1}. {question}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-600 mb-2">🎯 Answers (Right - Pool)</p>
                            {matchingData.answers.map((answer, idx) => (
                              <div key={idx} className="px-4 py-2 bg-green-50 rounded-xl border-2 border-green-200">
                                {String.fromCharCode(65 + idx)}. {answer}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      // Old format - pairs
                      return (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-600 mb-2">❓ Questions</p>
                            {matchingData.map((pair, idx) => (
                              <div key={idx} className="px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                                {idx + 1}. {pair.question}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-600 mb-2">🎯 Answers</p>
                            {matchingData.map((pair, idx) => (
                              <div key={idx} className="px-4 py-2 bg-green-50 rounded-xl border-2 border-green-200">
                                {idx + 1}. {pair.answer}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()
                ) : optionsList(q).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {optionsList(q).map((opt, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 rounded-xl border-2 bg-gray-50 border-gray-200 text-gray-700"
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                ) : null}

                {q.question_config?.media_url && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-xl">
                    <p className="text-sm text-indigo-600">📎 Media: {q.question_config.media_url}</p>
                  </div>
                )}

                <div className="bg-green-50 rounded-xl p-3 text-sm text-green-800">
                  <span className="font-bold">Correct Answer:</span> {q.correct_answer}
                  {q.explanation && <span className="ml-4">💡 {q.explanation}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function questionOptionsField() {
    if (!OPTION_TYPES.includes(questionForm.question_type)) return null;

    // Matching type special UI - questions on left, answer pool on right
    if (questionForm.question_type === 'matching') {
      // Initialize matching pairs if not exists
      if (!questionForm.parseMatchingPairs || questionForm.parseMatchingPairs.length === 0) {
        questionForm.parseMatchingPairs = [
          { id: Date.now() + 0, question: '', answer: '' },
          { id: Date.now() + 1, question: '', answer: '' },
          { id: Date.now() + 2, question: '', answer: '' }
        ];
      }

      const addPair = () => {
        const newPairs = [...(questionForm.parseMatchingPairs || [])];
        newPairs.push({ id: Date.now(), question: '', answer: '' });
        setQuestionForm({ ...questionForm, parseMatchingPairs: newPairs });
      };

      const removePair = (id) => {
        const newPairs = questionForm.parseMatchingPairs.filter(p => p.id !== id);
        setQuestionForm({ ...questionForm, parseMatchingPairs: newPairs });
      };

      const updatePair = (id, field, value) => {
        const newPairs = questionForm.parseMatchingPairs.map(p => 
          p.id === id ? { ...p, [field]: value } : p
        );
        setQuestionForm({ ...questionForm, parseMatchingPairs: newPairs });
      };

      return (
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            🔗 Matching Pairs (Students will match questions with answers)
          </label>
          <p className="text-sm text-gray-600 mb-4">
            Create question-answer pairs. Students will see questions on the left and must match them with the correct answers from a shuffled pool on the right.
          </p>

          <div className="space-y-3">
            {questionForm.parseMatchingPairs?.map((pair, index) => (
              <div key={pair.id} className="grid grid-cols-[auto,1fr,auto,1fr,auto] gap-3 items-center bg-white rounded-xl border-2 border-gray-200 p-4">
                {/* Pair number */}
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center text-sm">
                  {index + 1}
                </div>

                {/* Question input */}
                <div>
                  <label className="text-xs font-bold text-blue-600 mb-1 block">Question</label>
                  <input
                    type="text"
                    placeholder={`Question ${index + 1} (e.g., What is 2+2?)`}
                    value={pair.question}
                    onChange={(e) => updatePair(pair.id, 'question', e.target.value)}
                    className="w-full rounded-lg border-2 border-blue-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition"
                    required
                  />
                </div>

                {/* Arrow */}
                <div className="text-2xl text-gray-400">→</div>

                {/* Answer input */}
                <div>
                  <label className="text-xs font-bold text-green-600 mb-1 block">Correct Answer</label>
                  <input
                    type="text"
                    placeholder={`Answer ${index + 1} (e.g., 4)`}
                    value={pair.answer}
                    onChange={(e) => updatePair(pair.id, 'answer', e.target.value)}
                    className="w-full rounded-lg border-2 border-green-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition"
                    required
                  />
                </div>

                {/* Remove button */}
                {questionForm.parseMatchingPairs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePair(pair.id)}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-bold flex items-center justify-center transition"
                    title="Remove this pair"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add pair button */}
          <button
            type="button"
            onClick={addPair}
            className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition flex items-center gap-2"
          >
            <span>➕</span> Add Another Pair
          </button>

          {/* Info box */}
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <p className="text-sm font-bold text-blue-800 mb-2">ℹ️ How it works:</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Students will see all questions on the left side</li>
              <li>Answer options will be shuffled and shown on the right</li>
              <li>Students must match each question with its correct answer</li>
              <li>Add at least 2 pairs, up to 10 pairs maximum</li>
            </ul>
          </div>
        </div>
      );
    }

    // MCQ and other types
    return (
      <div className="sm:col-span-2">
        <label className="block text-sm font-bold text-gray-700 mb-3">
          Answer Options {questionForm.question_type === 'mcq' ? '(A, B, C, D)' : '(one per line)'}
        </label>
        {questionForm.question_type === 'mcq' ? (
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((letter, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                  {letter}
                </span>
                <input
                  type="text"
                  placeholder={`Option ${letter}`}
                  value={questionForm.options?.[index] || ''}
                  onChange={(e) => {
                    const newOptions = [...(questionForm.options || ['', '', '', ''])];
                    newOptions[index] = e.target.value;
                    setQuestionForm({ ...questionForm, options: newOptions });
                  }}
                  className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none transition"
                />
                <input
                  type="radio"
                  name="correctOption"
                  checked={questionForm.correct_answer === (questionForm.options?.[index] || '')}
                  onChange={() => setQuestionForm({ ...questionForm, correct_answer: questionForm.options?.[index] || '' })}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-xs text-gray-500">Correct</span>
              </div>
            ))}
          </div>
        ) : (
          <textarea
            rows={4}
            value={questionForm.options}
            onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))}
            placeholder={'A\nB\nC'}
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
          />
        )}
      </div>
    );
  }

  function questionMediaField() {
    if (!MEDIA_TYPES.includes(questionForm.question_type)) return null;
    return (
      <div className="sm:col-span-2">
        <label className="block text-sm font-bold text-gray-700 mb-3">Media (Image or Audio)</label>
        <div className="flex items-center gap-3">
          <input
            value={questionForm.media_url}
            onChange={(e) => setQuestionForm((f) => ({ ...f, media_url: e.target.value }))}
            placeholder="/uploads/… or https://…"
            className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
          />
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-2 border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition">
            {uploading ? '⏳ Uploading…' : <><MdUpload /> <span className="hidden sm:inline">Upload File</span></>}
            <input type="file" accept={questionForm.question_type === 'audio' ? 'audio/*' : 'image/*'} className="hidden" onChange={handleMediaUpload} disabled={uploading} />
          </label>
          {questionForm.media_url && (
            <a
              href={questionForm.media_url}
              className="px-4 py-3 bg-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-200 transition"
              target="_blank"
              rel="noreferrer"
            >
              <MdLink /> View
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      title={isEdit ? `Edit quiz${settings.title ? ` — ${settings.title}` : ''}` : 'Create quiz'}
      subtitle="Write the questions and answers here — they are saved together with the quiz."
      size="xl"
    >
      {error && <div className="mb-4 rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 text-sm text-rose-700 font-bold">{error}</div>}
      {notice && <div className="mb-4 rounded-2xl bg-green-50 border-2 border-green-200 p-4 text-sm text-green-700 font-bold">{notice}</div>}

      {preview ? (
        renderPreview()
      ) : (
        <div className="space-y-6">
          {/* Quiz Settings Form */}
          <form
            onSubmit={isEdit ? handleSaveQuiz : (e) => { e.preventDefault(); createQuiz(settings.status); }}
            className="space-y-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-2 border-blue-100"
          >
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <span>⚙️</span> Quiz Settings
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Quiz Title *</label>
                <input
                  required
                  value={settings.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Letter A — Phonics Quiz"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <input
                  value={settings.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Brief description of the quiz"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Instructions for Students</label>
                <textarea
                  rows={3}
                  value={settings.instructions}
                  onChange={(e) => set('instructions', e.target.value)}
                  placeholder="Read each question carefully and select the best answer."
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Time Limit (seconds)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.time_limit_seconds}
                  onChange={(e) => set('time_limit_seconds', e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Attempts Allowed</label>
                <input
                  type="number"
                  min="1"
                  value={settings.attempt_limit}
                  onChange={(e) => set('attempt_limit', e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passing_score}
                  onChange={(e) => set('passing_score', e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Max Score</label>
                <input
                  type="number"
                  min="0"
                  value={settings.max_score}
                  onChange={(e) => set('max_score', e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 bg-white rounded-2xl p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.shuffle_questions}
                  onChange={(e) => set('shuffle_questions', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>🔀 Shuffle Questions</span>
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_result_immediately}
                  onChange={(e) => set('show_result_immediately', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>👁️ Show Result Immediately</span>
              </label>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                <select
                  value={settings.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none transition"
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">⏸️ Inactive</option>
                  <option value="archived">📦 Archived</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              {!isEdit && (
                <button
                  type="button"
                  disabled={busy || !settings.title}
                  onClick={() => createQuiz('inactive')}
                  className="px-6 py-3 rounded-2xl border-2 border-gray-300 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Save Draft
                </button>
              )}
              <button
                type="submit"
                disabled={busy || !settings.title}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50"
              >
                {isEdit ? '💾 Save Quiz' : '✨ Create Quiz'}
              </button>
            </div>
          </form>

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <span>📝</span> Questions ({questions.length})
                {loadingQuestions && <span className="text-sm font-normal text-gray-400 ml-2">— Loading...</span>}
                {!isEdit && <span className="text-sm font-normal text-gray-400 ml-2">— Added below, saved with the quiz</span>}
              </h3>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition"
              >
                <MdVisibility /> Preview
              </button>
            </div>

            {loadingQuestions ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 font-medium mt-4">Loading questions...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
                <span className="text-6xl block mb-4">📝</span>
                <p className="text-gray-500 font-medium text-lg">No questions yet</p>
                <p className="text-gray-400 mt-2">Write your first question below to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, index) => {
                  const opts = optionsList(q);
                  const parseMatchingPairs = parseMatchingPairs(q);
                  return (
                    <div key={q.id} className="bg-white rounded-2xl p-5 shadow-md border-2 border-gray-100 hover:border-blue-200 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                              {q.question_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                              {q.points} pt(s)
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-800 mb-3">{q.question_text}</p>

                          {q.question_type === 'matching' && parseMatchingPairs(q).length > 0 ? (
                            (() => {
                              const matchingData = parseMatchingPairs(q);
                              if (matchingData.questions && matchingData.answers) {
                                // New format
                                return (
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold text-gray-600 mb-2">❓ Questions</p>
                                      {matchingData.questions.map((question, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                                          {idx + 1}. {question}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold text-gray-600 mb-2">🎯 Answers</p>
                                      {matchingData.answers.map((answer, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-green-50 rounded-xl border-2 border-green-200">
                                          {String.fromCharCode(65 + idx)}. {answer}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Old format - pairs
                                return (
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold text-gray-600 mb-2">❓ Questions</p>
                                      {matchingData.map((pair, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-blue-50 rounded-xl border-2 border-blue-200">
                                          {idx + 1}. {pair.question}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold text-gray-600 mb-2">🎯 Answers</p>
                                      {matchingData.map((pair, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-green-50 rounded-xl border-2 border-green-200">
                                          {idx + 1}. {pair.answer}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            })()
                          ) : opts.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {opts.map((opt, idx) => (
                                <div
                                  key={idx}
                                  className={`px-4 py-2 rounded-xl border-2 ${
                                    opt === q.correct_answer
                                      ? 'bg-green-50 border-green-300 text-green-800'
                                      : 'bg-gray-50 border-gray-200 text-gray-700'
                                  }`}
                                >
                                  <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                  {opt}
                                  {opt === q.correct_answer && ' ✓'}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Correct Answer:</span> {q.correct_answer}
                            {q.explanation && <span className="ml-4">💡 {q.explanation}</span>}
                          </div>
                          {q.question_config?.media_url && (
                            <div className="mt-2 text-sm text-indigo-600">
                              📎 {q.question_config.media_url}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuestionEdit(q)}
                            disabled={busy}
                            className="px-4 py-2 bg-blue-100 text-blue-600 font-bold rounded-xl hover:bg-blue-200 transition disabled:opacity-50"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleQuestionDelete(q)}
                            disabled={busy}
                            className="px-4 py-2 bg-rose-100 text-rose-600 font-bold rounded-xl hover:bg-rose-200 transition disabled:opacity-50"
                          >
                            <MdDelete /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Question Writer */}
          <form onSubmit={editingQuestionId ? handleQuestionUpdate : handleQuestionSubmit} className="space-y-6 rounded-3xl bg-white p-6 shadow-lg border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <span>{editingQuestionId ? '✏️' : '➕'}</span> {editingQuestionId ? 'Edit Question' : 'Add New Question'}
              </h3>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={cancelQuestionEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Question Type Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Question Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, question_type: type.value })}
                    className={`p-4 rounded-2xl border-2 font-bold transition ${
                      questionForm.question_type === type.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Question Text - Hide for matching type */}
              {questionForm.question_type !== 'matching' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Question Text *</label>
                  <textarea
                    required={questionForm.question_type !== 'matching'}
                    rows={3}
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, question_text: e.target.value }))}
                    placeholder="e.g. Which letter makes the /a/ sound?"
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Points *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, points: e.target.value }))}
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
              {questionOptionsField()}
              {questionMediaField()}
              {/* Correct Answer - Hide for matching type */}
              {questionForm.question_type !== 'matching' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Correct Answer *</label>
                  {questionForm.question_type === 'true_false' ? (
                    <select
                      required
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm((f) => ({ ...f, correct_answer: e.target.value }))}
                      className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                    >
                      <option value="">Select…</option>
                      <option value="true">✓ True</option>
                      <option value="false">✗ False</option>
                    </select>
                  ) : (
                    <input
                      required
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm((f) => ({ ...f, correct_answer: e.target.value }))}
                      placeholder="The answer students must give"
                      className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                    />
                  )}
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Explanation / Hint (optional)</label>
                <input
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))}
                  placeholder="Shown to students after they answer"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                disabled={
                  busy || 
                  (questionForm.question_type === 'matching' 
                    ? !questionForm.parseMatchingPairs || questionForm.parseMatchingPairs.filter(p => p.question && p.answer).length < 2
                    : !questionForm.question_text || !questionForm.correct_answer
                  )
                }
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] disabled:opacity-50"
              >
                {editingQuestionId ? '💾 Update Question' : <><MdAdd /> Add Question</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
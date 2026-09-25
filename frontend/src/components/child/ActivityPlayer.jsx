import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

export default function ActivityPlayer({ activity, onComplete }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmission();
  }, [activity.id]);

  const fetchSubmission = async () => {
    try {
      const response = await axiosClient.get(`/activities/${activity.id}/my-submission`);
      setSubmission(response.data.submission);
    } catch (err) {
      // No submission yet
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-5xl animate-spin">⚙️</div>
      </div>
    );
  }

  // If already submitted and graded, show results
  if (submission && submission.status === 'graded') {
    return (
      <ActivityResult
        activity={activity}
        submission={submission}
        onRetry={() => setSubmission(null)}
      />
    );
  }

  // If submitted but pending review
  if (submission && submission.status === 'pending') {
    return (
      <div className="text-center py-12 bg-blue-50 rounded-3xl border-2 border-blue-200">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-black text-blue-700 mb-2">Submitted!</h3>
        <p className="text-blue-600 font-medium">
          Your teacher will review your work soon.
        </p>
      </div>
    );
  }

  // Show the appropriate activity player based on type
  return (
    <div className="space-y-6">
      <ActivityTypePlayer
        activity={activity}
        onSubmit={onComplete}
        fetchSubmission={fetchSubmission}
      />
    </div>
  );
}

// ============================================
// ACTIVITY TYPE ROUTER
// ============================================
function ActivityTypePlayer({ activity, onSubmit, fetchSubmission }) {
  const { activity_type, activity_config } = activity;

  switch (activity_type) {
    case 'drag_and_drop':
      return <DragAndDropPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'multiple_choice':
      return <MultipleChoicePlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'true_false':
      return <TrueFalsePlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'fill_in_the_blank':
      return <FillInBlankPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'matching':
      return <MatchingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'writing':
      return <WritingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'drawing':
    case 'coloring':
      return <DrawingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'reading':
    case 'story_reading':
      return <ReadingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'speaking':
    case 'pronunciation':
      return <SpeakingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'listening':
      return <ListeningPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'counting':
      return <CountingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'vocabulary_practice':
      return <VocabularyPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'worksheet':
      return <WorksheetPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    case 'letter_tracing':
    case 'number_tracing':
      return <TracingPlayer activity={activity} config={activity_config} onSubmit={onSubmit} />;
    
    default:
      return <GenericPlayer activity={activity} onSubmit={onSubmit} />;
  }
}

// ============================================
// DRAG AND DROP PLAYER
// ============================================
function DragAndDropPlayer({ activity, config, onSubmit }) {
  const items = config?.items || [];
  const [draggedItem, setDraggedItem] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDrop = (target) => {
    if (draggedItem) {
      setAnswers(prev => ({ ...prev, [target]: draggedItem.draggable }));
      setDraggedItem(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    
    // Calculate score
    let correct = 0;
    items.forEach(item => {
      if (answers[item.target] === item.draggable) {
        correct++;
      }
    });
    
    const score = items.length > 0 ? (correct / items.length) * activity.max_score : 0;
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: JSON.stringify(answers),
        score: score,
        auto_graded: true
      });
      
      setResult({ correct, total: items.length, score });
      
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (result) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">
          {result.correct === result.total ? '🎉' : result.correct >= result.total / 2 ? '👍' : '💪'}
        </div>
        <h3 className="text-2xl font-black text-gray-800">
          {result.correct} out of {result.total} correct!
        </h3>
        <p className="text-lg font-bold text-purple-600">Score: {Math.round(result.score)}/{activity.max_score}</p>
        {result.correct === result.total && (
          <p className="text-green-600 font-medium">Perfect! You got them all right! 🌟</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">🎯 Drag and Drop</h3>
        <p className="text-gray-700">{activity.instructions}</p>
      </div>

      {/* Draggable Items */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-600 uppercase">Drag These Items:</h4>
        <div className="flex flex-wrap gap-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(item)}
              className="px-6 py-3 bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold rounded-xl shadow-lg cursor-move hover:scale-105 transition transform"
            >
              {item.draggable}
            </div>
          ))}
        </div>
      </div>

      {/* Drop Targets */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-gray-600 uppercase">Drop Here:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(item.target)}
              className={`min-h-[100px] rounded-2xl border-4 border-dashed flex flex-col items-center justify-center p-4 transition ${
                answers[item.target]
                  ? 'bg-green-50 border-green-400'
                  : 'bg-gray-50 border-gray-300 hover:border-purple-400'
              }`}
            >
              <div className="text-xs font-bold text-gray-500 mb-2">{item.target}</div>
              {answers[item.target] && (
                <div className="px-4 py-2 bg-white rounded-lg font-bold text-purple-600 shadow">
                  {answers[item.target]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || Object.keys(answers).length !== items.length}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.keys(answers).length === items.length ? '✓ Submit Answers' : `Complete All Matches (${Object.keys(answers).length}/${items.length})`}
      </button>
    </div>
  );
}

// ============================================
// MULTIPLE CHOICE PLAYER
// ============================================
function MultipleChoicePlayer({ activity, config, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    setSubmitted(true);
    
    const isCorrect = selected === config?.correct_answer;
    const score = isCorrect ? activity.max_score : 0;
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: selected,
        score: score,
        auto_graded: true
      });
      
      setResult({ isCorrect, score });
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (result) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">{result.isCorrect ? '🎉' : '💪'}</div>
        <h3 className="text-2xl font-black text-gray-800">
          {result.isCorrect ? 'Correct!' : 'Not quite right'}
        </h3>
        <p className="text-lg font-bold text-purple-600">Score: {result.score}/{activity.max_score}</p>
        {result.isCorrect ? (
          <p className="text-green-600 font-medium">Great job! You got it right! 🌟</p>
        ) : (
          <p className="text-orange-600 font-medium">Keep trying! You'll get it next time! 💪</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-orange-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">✅ Multiple Choice</h3>
        <p className="text-xl font-bold text-gray-800 mb-4">{config?.question || activity.instructions}</p>
      </div>

      <div className="space-y-3">
        {(config?.options || []).map((option, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(option)}
            disabled={submitted}
            className={`w-full text-left p-4 rounded-2xl border-2 font-medium transition transform hover:scale-102 ${
              selected === option
                ? 'bg-purple-100 border-purple-500 text-purple-900 shadow-lg'
                : 'bg-white border-gray-300 text-gray-800 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selected === option ? 'border-purple-500 bg-purple-500' : 'border-gray-400'
              }`}>
                {selected === option && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-lg">{option}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || !selected}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected ? '✓ Submit Answer' : 'Choose an answer first'}
      </button>
    </div>
  );
}

// ============================================
// TRUE/FALSE PLAYER
// ============================================
function TrueFalsePlayer({ activity, config, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    setSubmitted(true);
    
    const isCorrect = selected === config?.correct_answer;
    const score = isCorrect ? activity.max_score : 0;
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: selected,
        score: score,
        auto_graded: true
      });
      
      setResult({ isCorrect, score });
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (result) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">{result.isCorrect ? '🎉' : '💪'}</div>
        <h3 className="text-2xl font-black text-gray-800">
          {result.isCorrect ? 'Correct!' : 'Not quite right'}
        </h3>
        <p className="text-lg font-bold text-purple-600">Score: {result.score}/{activity.max_score}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-cyan-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">⭕ True or False</h3>
        <p className="text-xl font-bold text-gray-800">{config?.statement || activity.instructions}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSelected('true')}
          disabled={submitted}
          className={`py-8 rounded-2xl border-4 font-black text-2xl transition transform hover:scale-105 ${
            selected === 'true'
              ? 'bg-green-100 border-green-500 text-green-800 shadow-xl'
              : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
          }`}
        >
          ✓ TRUE
        </button>
        <button
          onClick={() => setSelected('false')}
          disabled={submitted}
          className={`py-8 rounded-2xl border-4 font-black text-2xl transition transform hover:scale-105 ${
            selected === 'false'
              ? 'bg-red-100 border-red-500 text-red-800 shadow-xl'
              : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
          }`}
        >
          ✕ FALSE
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || !selected}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected ? '✓ Submit Answer' : 'Choose True or False'}
      </button>
    </div>
  );
}

// ============================================
// FILL IN THE BLANK PLAYER
// ============================================
function FillInBlankPlayer({ activity, config, onSubmit }) {
  const blanks = config?.blanks || [];
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const sentence = config?.sentence || activity.instructions;
  const parts = sentence.split('[____]');

  const handleSubmit = async () => {
    setSubmitted(true);
    
    let correct = 0;
    blanks.forEach((blank, idx) => {
      const userAnswer = (answers[idx] || '').toLowerCase().trim();
      const correctAnswer = blank.answer.toLowerCase().trim();
      const alternatives = blank.alternatives?.map(a => a.toLowerCase().trim()) || [];
      
      if (userAnswer === correctAnswer || alternatives.includes(userAnswer)) {
        correct++;
      }
    });
    
    const score = blanks.length > 0 ? (correct / blanks.length) * activity.max_score : 0;
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: JSON.stringify(answers),
        score: score,
        auto_graded: true
      });
      
      setResult({ correct, total: blanks.length, score });
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (result) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">
          {result.correct === result.total ? '🎉' : result.correct >= result.total / 2 ? '👍' : '💪'}
        </div>
        <h3 className="text-2xl font-black text-gray-800">
          {result.correct} out of {result.total} correct!
        </h3>
        <p className="text-lg font-bold text-purple-600">Score: {Math.round(result.score)}/{activity.max_score}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-pink-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">📝 Fill in the Blanks</h3>
        <p className="text-gray-700">{activity.instructions}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <div className="text-lg leading-relaxed">
          {parts.map((part, idx) => (
            <span key={idx}>
              {part}
              {idx < blanks.length && (
                <input
                  type="text"
                  value={answers[idx] || ''}
                  onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
                  disabled={submitted}
                  className="inline-block mx-1 px-3 py-1 border-b-4 border-purple-400 bg-purple-50 rounded font-bold text-purple-700 focus:outline-none focus:border-purple-600 min-w-[120px]"
                  placeholder="____"
                />
              )}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || Object.keys(answers).length !== blanks.length}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.keys(answers).length === blanks.length ? '✓ Submit Answers' : `Fill all blanks (${Object.keys(answers).length}/${blanks.length})`}
      </button>
    </div>
  );
}

// ============================================
// MATCHING PLAYER
// ============================================
function MatchingPlayer({ activity, config, onSubmit }) {
  const pairs = config?.pairs || [];
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const leftItems = pairs.map(p => p.left);
  const rightItems = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5); // Shuffle

  const handleMatch = (left, right) => {
    setAnswers(prev => ({ ...prev, [left]: right }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    
    let correct = 0;
    pairs.forEach(pair => {
      if (answers[pair.left] === pair.right) {
        correct++;
      }
    });
    
    const score = pairs.length > 0 ? (correct / pairs.length) * activity.max_score : 0;
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: JSON.stringify(answers),
        score: score,
        auto_graded: true
      });
      
      setResult({ correct, total: pairs.length, score });
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (result) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-6xl">
          {result.correct === result.total ? '🎉' : result.correct >= result.total / 2 ? '👍' : '💪'}
        </div>
        <h3 className="text-2xl font-black text-gray-800">
          {result.correct} out of {result.total} correct matches!
        </h3>
        <p className="text-lg font-bold text-purple-600">Score: {Math.round(result.score)}/{activity.max_score}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border-2 border-teal-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">🔗 Matching</h3>
        <p className="text-gray-700">{activity.instructions}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-600 uppercase">Column A</h4>
          {leftItems.map((left, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border-2 border-gray-200 font-medium">
              <div className="flex items-center justify-between">
                <span>{left}</span>
                <span className="text-xl">→</span>
              </div>
              <select
                value={answers[left] || ''}
                onChange={(e) => handleMatch(left, e.target.value)}
                disabled={submitted}
                className="w-full mt-2 px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="">Choose match...</option>
                {rightItems.map((right, ridx) => (
                  <option key={ridx} value={right}>{right}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-600 uppercase">Column B</h4>
          {rightItems.map((right, idx) => (
            <div key={idx} className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200 font-medium text-center">
              {right}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || Object.keys(answers).length !== pairs.length}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {Object.keys(answers).length === pairs.length ? '✓ Submit Matches' : `Complete all matches (${Object.keys(answers).length}/${pairs.length})`}
      </button>
    </div>
  );
}

// ============================================
// WRITING PLAYER
// ============================================
function WritingPlayer({ activity, config, onSubmit }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const minWords = config?.min_words || 0;
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const handleSubmit = async () => {
    setSubmitted(true);
    
    try {
      await axiosClient.post(`/activities/${activity.id}/submit`, {
        submission_text: text,
        score: null, // Manual grading
        auto_graded: false
      });
      
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4 bg-blue-50 rounded-3xl border-2 border-blue-200 p-8">
        <div className="text-6xl">✅</div>
        <h3 className="text-2xl font-black text-blue-700">Submitted!</h3>
        <p className="text-blue-600 font-medium">Your teacher will read and grade your writing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-200">
        <h3 className="text-lg font-black text-gray-800 mb-2">✏️ Writing</h3>
        <p className="text-gray-700 font-medium">{config?.prompt || activity.instructions}</p>
        {minWords > 0 && (
          <p className="text-sm text-purple-600 font-bold mt-2">Minimum {minWords} words required</p>
        )}
      </div>

      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitted}
          rows={12}
          placeholder="Start writing here..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-purple-500 text-lg resize-none"
        />
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className={`font-bold ${wordCount >= minWords ? 'text-green-600' : 'text-gray-500'}`}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          {minWords > 0 && wordCount < minWords && (
            <span className="text-orange-600 font-medium">
              {minWords - wordCount} more needed
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || (minWords > 0 && wordCount < minWords)}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {wordCount >= minWords ? '✓ Submit Writing' : `Write at least ${minWords} words`}
      </button>
    </div>
  );
}

// ============================================
// GENERIC PLAYER (for upload-based activities)
// ============================================
function GenericPlayer({ activity, onSubmit }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    setSubmitted(true);
    setUploading(true);
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('submission_text', text);
      
      await axiosClient.post(`/activities/${activity.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to submit. Please try again.');
      setSubmitted(false);
    } finally {
      setUploading(false);
    }
  };

  if (submitted && !uploading) {
    return (
      <div className="text-center py-8 space-y-4 bg-blue-50 rounded-3xl border-2 border-blue-200 p-8">
        <div className="text-6xl">✅</div>
        <h3 className="text-2xl font-black text-blue-700">Submitted!</h3>
        <p className="text-blue-600 font-medium">Your teacher will review your work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-indigo-200">
        <p className="text-lg font-medium text-gray-700">{activity.instructions}</p>
      </div>

      {activity.resource_url && (
        <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
          <a
            href={activity.resource_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold"
          >
            📄 Download Activity File
          </a>
        </div>
      )}

      {activity.requires_upload && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Upload Your Work:</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            accept="image/*,application/pdf"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer/Notes:</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write your answer here..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-purple-500"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitted || uploading || (activity.requires_upload && !file)}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : '✓ Submit Work'}
      </button>
    </div>
  );
}

// Placeholder components for other activity types (use GenericPlayer pattern)
const DrawingPlayer = GenericPlayer;
const ReadingPlayer = GenericPlayer;
const SpeakingPlayer = GenericPlayer;
const ListeningPlayer = GenericPlayer;
const CountingPlayer = MultipleChoicePlayer; // Can reuse or customize
const VocabularyPlayer = GenericPlayer;
const WorksheetPlayer = GenericPlayer;
const TracingPlayer = GenericPlayer;

// ============================================
// ACTIVITY RESULT DISPLAY
// ============================================
function ActivityResult({ activity, submission, onRetry }) {
  const canRetry = activity.allow_resubmission && submission.status === 'graded';

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl p-8 text-center border-4 ${
        submission.score >= activity.max_score * 0.7
          ? 'bg-green-50 border-green-300'
          : 'bg-orange-50 border-orange-300'
      }`}>
        <div className="text-6xl mb-4">
          {submission.score >= activity.max_score * 0.7 ? '🎉' : '💪'}
        </div>
        <h3 className="text-2xl font-black text-gray-800 mb-2">
          {submission.score >= activity.max_score * 0.7 ? 'Great Work!' : 'Good Effort!'}
        </h3>
        <p className="text-3xl font-black text-purple-600 mb-4">
          {Math.round(submission.score)}/{activity.max_score} points
        </p>
        {submission.feedback && (
          <div className="bg-white rounded-xl p-4 mt-4 border-2 border-gray-200">
            <p className="text-sm font-bold text-gray-600 mb-1">Teacher's Feedback:</p>
            <p className="text-gray-800">{submission.feedback}</p>
          </div>
        )}
      </div>

      {canRetry && (
        <button
          onClick={onRetry}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-105"
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';

// Activity type definitions with their specific configuration needs
const ACTIVITY_TYPE_CONFIGS = {
  // Interactive activities with structured data
  drag_and_drop: {
    label: 'Drag and Drop',
    icon: '🎯',
    description: 'Match items by dragging them to the correct targets',
    fields: ['items', 'targets'],
    requiresUpload: false,
    autoGradable: true
  },
  multiple_choice: {
    label: 'Multiple Choice',
    icon: '✅',
    description: 'Choose the correct answer from options',
    fields: ['question', 'options', 'correctAnswer'],
    requiresUpload: false,
    autoGradable: true
  },
  true_false: {
    label: 'True or False',
    icon: '⭕',
    description: 'Answer true or false to a statement',
    fields: ['statement', 'correctAnswer'],
    requiresUpload: false,
    autoGradable: true
  },
  fill_in_the_blank: {
    label: 'Fill in the Blank',
    icon: '📝',
    description: 'Complete sentences with missing words',
    fields: ['sentence', 'blanks'],
    requiresUpload: false,
    autoGradable: true
  },
  matching: {
    label: 'Matching',
    icon: '🔗',
    description: 'Match items from two columns',
    fields: ['pairs'],
    requiresUpload: false,
    autoGradable: true
  },
  
  // Creative activities
  writing: {
    label: 'Writing',
    icon: '✏️',
    description: 'Write an essay, story, or response',
    fields: ['prompt', 'minWords'],
    requiresUpload: false,
    autoGradable: false
  },
  drawing: {
    label: 'Drawing',
    icon: '🎨',
    description: 'Create a drawing (upload image)',
    fields: ['prompt', 'exampleImage'],
    requiresUpload: true,
    autoGradable: false
  },
  coloring: {
    label: 'Coloring',
    icon: '🖍️',
    description: 'Color a template (upload result)',
    fields: ['templateImage'],
    requiresUpload: true,
    autoGradable: false
  },
  
  // Reading & Speaking
  reading: {
    label: 'Reading',
    icon: '📖',
    description: 'Read text and answer questions',
    fields: ['text', 'questions'],
    requiresUpload: false,
    autoGradable: false
  },
  story_reading: {
    label: 'Story Reading',
    icon: '📚',
    description: 'Read a story passage',
    fields: ['story', 'questions'],
    requiresUpload: false,
    autoGradable: false
  },
  speaking: {
    label: 'Speaking',
    icon: '🗣️',
    description: 'Record voice response (upload audio)',
    fields: ['prompt', 'duration'],
    requiresUpload: true,
    autoGradable: false
  },
  pronunciation: {
    label: 'Pronunciation',
    icon: '🎤',
    description: 'Practice pronouncing words (upload audio)',
    fields: ['words', 'exampleAudio'],
    requiresUpload: true,
    autoGradable: false
  },
  listening: {
    label: 'Listening',
    icon: '👂',
    description: 'Listen to audio and respond',
    fields: ['audioUrl', 'questions'],
    requiresUpload: false,
    autoGradable: false
  },
  
  // Math & Numbers
  counting: {
    label: 'Counting',
    icon: '🔢',
    description: 'Count objects and enter the number',
    fields: ['image', 'correctCount'],
    requiresUpload: false,
    autoGradable: true
  },
  number_tracing: {
    label: 'Number Tracing',
    icon: '✍️',
    description: 'Trace numbers (upload result)',
    fields: ['numbers', 'templateImage'],
    requiresUpload: true,
    autoGradable: false
  },
  
  // Language
  letter_tracing: {
    label: 'Letter Tracing',
    icon: '🔤',
    description: 'Trace letters (upload result)',
    fields: ['letters', 'templateImage'],
    requiresUpload: true,
    autoGradable: false
  },
  vocabulary_practice: {
    label: 'Vocabulary',
    icon: '📖',
    description: 'Practice vocabulary words',
    fields: ['words', 'definitions'],
    requiresUpload: false,
    autoGradable: true
  },
  
  // General
  worksheet: {
    label: 'Worksheet',
    icon: '📄',
    description: 'Complete a worksheet (PDF/document)',
    fields: ['worksheetUrl'],
    requiresUpload: true,
    autoGradable: false
  },
  puzzle: {
    label: 'Puzzle',
    icon: '🧩',
    description: 'Solve a puzzle',
    fields: ['puzzleType', 'puzzleData'],
    requiresUpload: false,
    autoGradable: true
  }
};

const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'advanced'];

export default function ActivityBuilder({ open, onClose, lessonId, activity, onSaved }) {
  const isEdit = Boolean(activity);
  const [form, setForm] = useState({
    title: '',
    activity_type: 'multiple_choice',
    instructions: '',
    difficulty: 'beginner',
    estimated_time_minutes: '',
    max_score: 100,
    start_date: '',
    due_date: '',
    activity_config: {}
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    if (activity) {
      setForm({
        title: activity.title || '',
        activity_type: activity.activity_type || 'multiple_choice',
        instructions: activity.instructions || '',
        difficulty: activity.difficulty || 'beginner',
        estimated_time_minutes: activity.estimated_time_minutes || '',
        max_score: activity.max_score ?? 100,
        start_date: activity.start_date ? activity.start_date.slice(0, 10) : '',
        due_date: activity.due_date ? activity.due_date.slice(0, 10) : '',
        activity_config: activity.activity_config || {}
      });
    } else {
      setForm({
        title: '',
        activity_type: 'multiple_choice',
        instructions: '',
        difficulty: 'beginner',
        estimated_time_minutes: '',
        max_score: 100,
        start_date: '',
        due_date: '',
        activity_config: {}
      });
    }
  }, [open, activity]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setConfig(field, value) {
    setForm(f => ({
      ...f,
      activity_config: { ...f.activity_config, [field]: value }
    }));
  }

  const currentTypeConfig = ACTIVITY_TYPE_CONFIGS[form.activity_type];

  // Validate that required config fields are filled
  const isConfigComplete = () => {
    if (!currentTypeConfig) return true; // No specific config needed
    
    const config = form.activity_config || {};
    
    // Check based on activity type
    switch (form.activity_type) {
      case 'drag_and_drop':
        return config.items && config.items.length > 0;
      case 'multiple_choice':
        return config.question && config.options && config.options.length >= 2 && config.correctAnswer;
      case 'true_false':
        return config.statement && config.correctAnswer !== undefined;
      case 'fill_in_the_blank':
        return config.sentence && config.blanks && config.blanks.length > 0;
      case 'matching':
        return config.pairs && config.pairs.length > 0;
      case 'writing':
        return config.prompt;
      case 'drawing':
      case 'coloring':
        return config.prompt;
      case 'reading':
      case 'story_reading':
        return config.text;
      case 'speaking':
      case 'pronunciation':
        return config.prompt;
      default:
        return true; // No validation for other types
    }
  };

  async function handleSubmit(e, status) {
    e.preventDefault();
    setError('');
    
    // Validate configuration is complete
    if (!isConfigComplete()) {
      setError('Please complete the activity configuration below before saving.');
      return;
    }
    
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        instructions: form.instructions,
        activity_type: form.activity_type,
        max_score: Number(form.max_score) || 100,
        requires_upload: currentTypeConfig?.requiresUpload || false,
        auto_gradable: currentTypeConfig?.autoGradable || false,
        allow_resubmission: true,
        difficulty: form.difficulty,
        estimated_time_minutes: form.estimated_time_minutes ? Number(form.estimated_time_minutes) : null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        activity_config: form.activity_config,
        status
      };

      if (isEdit) {
        const { status: _s, ...rest } = payload;
        await axiosClient.put(`/activities/${activity.id}`, rest);
      } else {
        await axiosClient.post(`/lessons/${lessonId}/activities`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the activity');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-500';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Activity' : 'Create Activity'}
      subtitle="Build interactive, engaging activities for students"
      size="xl"
    >
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, 'active')} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Basic Information</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Activity Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Multiplication Practice"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Activity Type *</label>
              <select
                value={form.activity_type}
                onChange={(e) => {
                  set('activity_type', e.target.value);
                  set('activity_config', {}); // Reset config when type changes
                }}
                className={inputCls}
              >
                {Object.entries(ACTIVITY_TYPE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
              {currentTypeConfig && (
                <p className="mt-1 text-xs text-gray-500">{currentTypeConfig.description}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Difficulty Level</label>
              <select
                value={form.difficulty}
                onChange={(e) => set('difficulty', e.target.value)}
                className={inputCls}
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Instructions for Students *</label>
              <textarea
                required
                rows={3}
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                placeholder="Explain what students should do..."
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Max Score</label>
              <input
                type="number"
                min="1"
                value={form.max_score}
                onChange={(e) => set('max_score', e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Estimated Time (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.estimated_time_minutes}
                onChange={(e) => set('estimated_time_minutes', e.target.value)}
                placeholder="e.g. 15"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Activity-Specific Configuration */}
        <div className="space-y-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentTypeConfig?.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                {currentTypeConfig?.label} Configuration
              </h3>
              <p className="text-xs text-gray-600">{currentTypeConfig?.description}</p>
            </div>
          </div>

          <ActivityConfigFields
            activityType={form.activity_type}
            config={form.activity_config}
            setConfig={setConfig}
            inputCls={inputCls}
            labelCls={labelCls}
          />
          
          {/* Configuration Warning */}
          {!isConfigComplete() && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border-2 border-amber-300 p-4">
              <span className="text-2xl">⚠️</span>
              <div className="text-sm">
                <p className="font-bold text-amber-900 mb-1">Configuration Required</p>
                <p className="text-amber-800">
                  Please complete the configuration above before saving. 
                  Students won't be able to interact with this activity without proper content.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Type Info */}
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Activity Behavior:</p>
            <ul className="text-blue-700 space-y-1">
              <li>
                • <strong>File Upload:</strong> {currentTypeConfig?.requiresUpload ? 'Required (students will upload images/files)' : 'Not required'}
              </li>
              <li>
                • <strong>Grading:</strong> {currentTypeConfig?.autoGradable ? 'Automatic (instant feedback)' : 'Manual (instructor reviews)'}
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !form.title || !form.instructions || !isConfigComplete()}
            onClick={(e) => handleSubmit(e, 'inactive')}
            className="rounded-xl border-2 border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Save as Draft
          </button>
          <button
            disabled={busy || !form.title || !form.instructions || !isConfigComplete()}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition shadow-lg"
          >
            {isEdit ? '✓ Save Changes' : '+ Create Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// ACTIVITY-SPECIFIC CONFIGURATION FIELDS
// ============================================
function ActivityConfigFields({ activityType, config, setConfig, inputCls, labelCls }) {
  switch (activityType) {
    case 'drag_and_drop':
      return <DragAndDropConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'multiple_choice':
      return <MultipleChoiceConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'true_false':
      return <TrueFalseConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'fill_in_the_blank':
      return <FillInBlankConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'matching':
      return <MatchingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'writing':
      return <WritingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'drawing':
    case 'coloring':
      return <DrawingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'reading':
    case 'story_reading':
      return <ReadingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'speaking':
    case 'pronunciation':
      return <SpeakingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'listening':
      return <ListeningConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'counting':
      return <CountingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'vocabulary_practice':
      return <VocabularyConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'worksheet':
      return <WorksheetConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'letter_tracing':
    case 'number_tracing':
      return <TracingConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} activityType={activityType} />;
    
    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No specific configuration needed for this activity type.</p>
          <p className="text-xs mt-1">Students will follow the instructions you provided above.</p>
        </div>
      );
  }
}

// ============================================
// DRAG AND DROP CONFIGURATION
// ============================================
function DragAndDropConfig({ config, setConfig, inputCls, labelCls }) {
  const items = config.items || [];
  const [newItem, setNewItem] = useState({ draggable: '', target: '' });

  const addItem = () => {
    if (newItem.draggable && newItem.target) {
      setConfig('items', [...items, { ...newItem, id: Date.now() }]);
      setNewItem({ draggable: '', target: '' });
    }
  };

  const removeItem = (id) => {
    setConfig('items', items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Drag and Drop Items</label>
        <p className="text-xs text-gray-600 mb-3">
          Create pairs: what students drag → where it should be dropped
        </p>

        {/* Existing Items */}
        {items.length > 0 && (
          <div className="space-y-2 mb-4">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <span className="font-bold text-purple-600">{idx + 1}.</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{item.draggable}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-gray-600">{item.target}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Item */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-end">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Draggable Item</label>
            <input
              value={newItem.draggable}
              onChange={(e) => setNewItem({ ...newItem, draggable: e.target.value })}
              placeholder="e.g. 2 × 3"
              className={inputCls}
            />
          </div>
          <span className="text-gray-400 pb-2">→</span>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Drop Target</label>
            <input
              value={newItem.target}
              onChange={(e) => setNewItem({ ...newItem, target: e.target.value })}
              placeholder="e.g. 6"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            + Add
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">⚠️ Add at least one drag-and-drop pair</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// MULTIPLE CHOICE CONFIGURATION
// ============================================
function MultipleChoiceConfig({ config, setConfig, inputCls, labelCls }) {
  const options = config.options || ['', '', '', ''];
  const correctAnswer = config.correct_answer || '';

  const setOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setConfig('options', newOptions);
  };

  const addOption = () => {
    setConfig('options', [...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setConfig('options', options.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Question Text *</label>
        <input
          required
          value={config.question || ''}
          onChange={(e) => setConfig('question', e.target.value)}
          placeholder="e.g. What is 2 + 2?"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Answer Options *</label>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct_answer"
                checked={correctAnswer === option && option !== ''}
                onChange={() => setConfig('correct_answer', option)}
                className="w-4 h-4"
              />
              <input
                required
                value={option}
                onChange={(e) => setOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className={`flex-1 ${inputCls}`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          + Add Option
        </button>
      </div>

      {!correctAnswer && (
        <p className="text-xs text-amber-600">⚠️ Select the correct answer by clicking the radio button</p>
      )}
    </div>
  );
}

// ============================================
// TRUE/FALSE CONFIGURATION
// ============================================
function TrueFalseConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Statement *</label>
        <input
          required
          value={config.statement || ''}
          onChange={(e) => setConfig('statement', e.target.value)}
          placeholder="e.g. The sun rises in the east"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Correct Answer *</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="correct_answer"
              checked={config.correct_answer === 'true'}
              onChange={() => setConfig('correct_answer', 'true')}
            />
            <span className="font-medium">True</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="correct_answer"
              checked={config.correct_answer === 'false'}
              onChange={() => setConfig('correct_answer', 'false')}
            />
            <span className="font-medium">False</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FILL IN THE BLANK CONFIGURATION
// ============================================
function FillInBlankConfig({ config, setConfig, inputCls, labelCls }) {
  const blanks = config.blanks || [];
  const [newBlank, setNewBlank] = useState({ answer: '', alternatives: '' });

  const addBlank = () => {
    if (newBlank.answer) {
      const alternatives = newBlank.alternatives
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
      
      setConfig('blanks', [...blanks, {
        id: Date.now(),
        answer: newBlank.answer.trim(),
        alternatives
      }]);
      setNewBlank({ answer: '', alternatives: '' });
    }
  };

  const removeBlank = (id) => {
    setConfig('blanks', blanks.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Sentence with Blanks *</label>
        <textarea
          required
          rows={3}
          value={config.sentence || ''}
          onChange={(e) => setConfig('sentence', e.target.value)}
          placeholder="Use [____] for blanks. Example: The capital of Ethiopia is [____]."
          className={inputCls}
        />
        <p className="text-xs text-gray-600 mt-1">Use [____] to mark where students fill in answers</p>
      </div>

      <div>
        <label className={labelCls}>Correct Answers for Each Blank</label>
        
        {blanks.length > 0 && (
          <div className="space-y-2 mb-3">
            {blanks.map((blank, idx) => (
              <div key={blank.id} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-200">
                <span className="font-bold text-purple-600">Blank {idx + 1}:</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{blank.answer}</div>
                  {blank.alternatives.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Also accept: {blank.alternatives.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeBlank(blank.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <input
            value={newBlank.answer}
            onChange={(e) => setNewBlank({ ...newBlank, answer: e.target.value })}
            placeholder="Correct answer (e.g. Addis Ababa)"
            className={inputCls}
          />
          <input
            value={newBlank.alternatives}
            onChange={(e) => setNewBlank({ ...newBlank, alternatives: e.target.value })}
            placeholder="Alternative answers (comma-separated, e.g. addis ababa, Addis)"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addBlank}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
          >
            + Add Blank Answer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MATCHING CONFIGURATION
// ============================================
function MatchingConfig({ config, setConfig, inputCls, labelCls }) {
  const pairs = config.pairs || [];
  const [newPair, setNewPair] = useState({ left: '', right: '' });

  const addPair = () => {
    if (newPair.left && newPair.right) {
      setConfig('pairs', [...pairs, { ...newPair, id: Date.now() }]);
      setNewPair({ left: '', right: '' });
    }
  };

  const removePair = (id) => {
    setConfig('pairs', pairs.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Matching Pairs</label>
        <p className="text-xs text-gray-600 mb-3">Create pairs that students should match</p>

        {pairs.length > 0 && (
          <div className="space-y-2 mb-4">
            {pairs.map((pair, idx) => (
              <div key={pair.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <span className="font-bold text-purple-600">{idx + 1}.</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{pair.left}</span>
                  <span className="mx-2 text-gray-400">⟷</span>
                  <span className="text-gray-600">{pair.right}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePair(pair.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-end">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Left Column</label>
            <input
              value={newPair.left}
              onChange={(e) => setNewPair({ ...newPair, left: e.target.value })}
              placeholder="e.g. Apple"
              className={inputCls}
            />
          </div>
          <span className="text-gray-400 pb-2">⟷</span>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Right Column</label>
            <input
              value={newPair.right}
              onChange={(e) => setNewPair({ ...newPair, right: e.target.value })}
              placeholder="e.g. Red Fruit"
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={addPair}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            + Add
          </button>
        </div>

        {pairs.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">⚠️ Add at least one matching pair</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// WRITING CONFIGURATION
// ============================================
function WritingConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Writing Prompt *</label>
        <textarea
          required
          rows={4}
          value={config.prompt || ''}
          onChange={(e) => setConfig('prompt', e.target.value)}
          placeholder="e.g. Write a story about your favorite animal. Include at least 3 sentences."
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Minimum Word Count</label>
        <input
          type="number"
          min="1"
          value={config.min_words || ''}
          onChange={(e) => setConfig('min_words', e.target.value)}
          placeholder="e.g. 50"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ============================================
// DRAWING/COLORING CONFIGURATION
// ============================================
function DrawingConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Drawing Prompt *</label>
        <textarea
          required
          rows={3}
          value={config.prompt || ''}
          onChange={(e) => setConfig('prompt', e.target.value)}
          placeholder="e.g. Draw your family"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Example/Template Image URL (optional)</label>
        <input
          value={config.example_image_url || ''}
          onChange={(e) => setConfig('example_image_url', e.target.value)}
          placeholder="https://... or /uploads/..."
          className={inputCls}
        />
        <p className="text-xs text-gray-600 mt-1">Students will upload their drawing/colored image</p>
      </div>
    </div>
  );
}

// ============================================
// READING CONFIGURATION
// ============================================
function ReadingConfig({ config, setConfig, inputCls, labelCls }) {
  const questions = config.questions || [];
  const [newQuestion, setNewQuestion] = useState('');

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setConfig('questions', [...questions, { id: Date.now(), text: newQuestion }]);
      setNewQuestion('');
    }
  };

  const removeQuestion = (id) => {
    setConfig('questions', questions.filter(q => q.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Reading Text/Passage *</label>
        <textarea
          required
          rows={6}
          value={config.text || ''}
          onChange={(e) => setConfig('text', e.target.value)}
          placeholder="Paste or type the reading passage..."
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Comprehension Questions (optional)</label>
        
        {questions.length > 0 && (
          <div className="space-y-2 mb-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-200">
                <span className="font-bold text-purple-600">{idx + 1}.</span>
                <div className="flex-1 text-gray-800">{q.text}</div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
            placeholder="Type a question and press Enter"
            className={`flex-1 ${inputCls}`}
          />
          <button
            type="button"
            onClick={addQuestion}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SPEAKING/PRONUNCIATION CONFIGURATION
// ============================================
function SpeakingConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Speaking Prompt *</label>
        <textarea
          required
          rows={3}
          value={config.prompt || ''}
          onChange={(e) => setConfig('prompt', e.target.value)}
          placeholder="e.g. Read the following words aloud: cat, dog, bird"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Example Audio URL (optional)</label>
        <input
          value={config.example_audio_url || ''}
          onChange={(e) => setConfig('example_audio_url', e.target.value)}
          placeholder="https://... or /uploads/..."
          className={inputCls}
        />
        <p className="text-xs text-gray-600 mt-1">Students will upload their audio recording</p>
      </div>

      <div>
        <label className={labelCls}>Recording Duration Limit (seconds)</label>
        <input
          type="number"
          min="10"
          value={config.max_duration_seconds || ''}
          onChange={(e) => setConfig('max_duration_seconds', e.target.value)}
          placeholder="e.g. 60"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ============================================
// LISTENING CONFIGURATION
// ============================================
function ListeningConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Audio File URL *</label>
        <input
          required
          value={config.audio_url || ''}
          onChange={(e) => setConfig('audio_url', e.target.value)}
          placeholder="https://... or /uploads/audio.mp3"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Question After Listening *</label>
        <textarea
          required
          rows={3}
          value={config.question || ''}
          onChange={(e) => setConfig('question', e.target.value)}
          placeholder="e.g. What did you hear?"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ============================================
// COUNTING CONFIGURATION
// ============================================
function CountingConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Image URL (with objects to count) *</label>
        <input
          required
          value={config.image_url || ''}
          onChange={(e) => setConfig('image_url', e.target.value)}
          placeholder="https://... or /uploads/counting.png"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Correct Count *</label>
        <input
          required
          type="number"
          min="1"
          value={config.correct_count || ''}
          onChange={(e) => setConfig('correct_count', e.target.value)}
          placeholder="e.g. 5"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>What to Count</label>
        <input
          value={config.count_object || ''}
          onChange={(e) => setConfig('count_object', e.target.value)}
          placeholder="e.g. apples, stars, animals"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ============================================
// VOCABULARY CONFIGURATION
// ============================================
function VocabularyConfig({ config, setConfig, inputCls, labelCls }) {
  const words = config.words || [];
  const [newWord, setNewWord] = useState({ word: '', definition: '' });

  const addWord = () => {
    if (newWord.word && newWord.definition) {
      setConfig('words', [...words, { ...newWord, id: Date.now() }]);
      setNewWord({ word: '', definition: '' });
    }
  };

  const removeWord = (id) => {
    setConfig('words', words.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Vocabulary Words</label>
        
        {words.length > 0 && (
          <div className="space-y-2 mb-4">
            {words.map((word, idx) => (
              <div key={word.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <span className="font-bold text-purple-600">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">{word.word}</div>
                  <div className="text-sm text-gray-600">{word.definition}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeWord(word.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          <input
            value={newWord.word}
            onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
            placeholder="Word (e.g. ecosystem)"
            className={inputCls}
          />
          <input
            value={newWord.definition}
            onChange={(e) => setNewWord({ ...newWord, definition: e.target.value })}
            placeholder="Definition (e.g. A community of living organisms)"
            className={inputCls}
          />
          <button
            type="button"
            onClick={addWord}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            + Add Word
          </button>
        </div>

        {words.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">⚠️ Add at least one vocabulary word</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// WORKSHEET CONFIGURATION
// ============================================
function WorksheetConfig({ config, setConfig, inputCls, labelCls }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Worksheet File URL *</label>
        <input
          required
          value={config.worksheet_url || ''}
          onChange={(e) => setConfig('worksheet_url', e.target.value)}
          placeholder="https://... or /uploads/worksheet.pdf"
          className={inputCls}
        />
        <p className="text-xs text-gray-600 mt-1">Students will download, complete, and upload the worksheet</p>
      </div>
    </div>
  );
}

// ============================================
// TRACING CONFIGURATION
// ============================================
function TracingConfig({ config, setConfig, inputCls, labelCls, activityType }) {
  const isLetters = activityType === 'letter_tracing';
  
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>{isLetters ? 'Letters to Trace' : 'Numbers to Trace'} *</label>
        <input
          required
          value={config.items || ''}
          onChange={(e) => setConfig('items', e.target.value)}
          placeholder={isLetters ? "e.g. A, B, C" : "e.g. 1, 2, 3"}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Template Image URL (optional)</label>
        <input
          value={config.template_url || ''}
          onChange={(e) => setConfig('template_url', e.target.value)}
          placeholder="https://... or /uploads/template.png"
          className={inputCls}
        />
        <p className="text-xs text-gray-600 mt-1">Students will upload their traced work</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';
import useReferenceKit, { invalidateReferenceKit } from '../../hooks/useReferenceKit';

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
    label: 'Matching (self-practice game)',
    icon: '🔗',
    description: 'Child matches each letter to its picture — pick the pairs yourself',
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
    label: 'Counting (self-practice game)',
    icon: '🔢',
    description: 'Child counts the objects you choose, in Ge’ez or Arabic numerals',
    fields: ['objects', 'min', 'max', 'rounds', 'numeral_system'],
    requiresUpload: false,
    autoGradable: true
  },
  number_tracing: {
    label: 'Number Tracing',
    icon: '✍️',
    description: 'Trace numbers (upload result)',
    fields: ['items', 'templateImage'],
    requiresUpload: true,
    autoGradable: false
  },
  
  // Language
  letter_tracing: {
    label: 'Letter Tracing (self-practice game)',
    icon: '🔤',
    description: 'Child traces the Ge’ez letters you choose, with their seven vowel orders',
    fields: ['letters', 'vowel_order_count'],
    requiresUpload: false,
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
  const { reference } = useReferenceKit();
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
      case 'letter_tracing':
        return config.letters && config.letters.length > 0;
      case 'counting':
        return config.objects && config.objects.length > 0;
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
            reference={reference}
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
function ActivityConfigFields({ activityType, config, setConfig, inputCls, labelCls, reference }) {
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
      return (
        <MatchingGameConfig
          config={config}
          setConfig={setConfig}
          inputCls={inputCls}
          labelCls={labelCls}
          reference={reference}
        />
      );
    
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
      return (
        <CountingGameConfig
          config={config}
          setConfig={setConfig}
          inputCls={inputCls}
          labelCls={labelCls}
          reference={reference}
        />
      );
    
    case 'vocabulary_practice':
      return <VocabularyConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'worksheet':
      return <WorksheetConfig config={config} setConfig={setConfig} inputCls={inputCls} labelCls={labelCls} />;
    
    case 'letter_tracing':
      return (
        <LetterTracingGameConfig
          config={config}
          setConfig={setConfig}
          inputCls={inputCls}
          labelCls={labelCls}
          reference={reference}
        />
      );
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
// MATCHING GAME CONFIGURATION
// The instructor chooses or authors the words and letter pairs.
// Teachers can select from the school word bank OR add custom words directly on the fly.
// ============================================
function MatchingGameConfig({ config, setConfig, inputCls, labelCls, reference = {} }) {
  const pairs = config.pairs || [];
  const words = reference.picture_words || [];
  const letters = reference.fidel_letters || [];

  const [mode, setMode] = useState('library'); // 'library' | 'custom'
  const [filterText, setFilterText] = useState('');

  // Custom pair form
  const [customWord, setCustomWord] = useState('');
  const [customLetter, setCustomLetter] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🍎');
  const [customEnglish, setCustomEnglish] = useState('');
  const [saveToBank, setSaveToBank] = useState(true);
  const [savingCustom, setSavingCustom] = useState(false);

  const addPair = (word) => {
    if (!word?.word) return;
    setConfig('pairs', [
      ...pairs,
      { left: word.example_for_letter || word.word.charAt(0), right: word.word, emoji: word.emoji || '' },
    ]);
  };

  const updatePair = (index, field, value) => {
    const next = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    setConfig('pairs', next);
  };

  const filteredWords = words.filter((w) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      (w.word || '').toLowerCase().includes(q) ||
      (w.english || '').toLowerCase().includes(q) ||
      (w.example_for_letter || '').toLowerCase().includes(q)
    );
  });

  const handleAddCustomPair = async (e) => {
    e.preventDefault();
    if (!customWord.trim()) return;

    const trimmedWord = customWord.trim();
    const resolvedLetter = customLetter.trim() || trimmedWord.charAt(0);
    const resolvedEmoji = customEmoji.trim() || '🖼️';

    // 1. Add to activity pairs immediately
    setConfig('pairs', [
      ...pairs,
      { left: resolvedLetter, right: trimmedWord, emoji: resolvedEmoji },
    ]);

    // 2. Optionally save to backend vocabulary bank
    if (saveToBank) {
      setSavingCustom(true);
      try {
        await axiosClient.post('/reference/words', {
          word: trimmedWord,
          english: customEnglish.trim() || null,
          emoji: resolvedEmoji,
          example_for_letter: resolvedLetter,
          category: 'general',
        });
        invalidateReferenceKit();
      } catch (err) {
        console.error('Failed to save custom word to bank:', err);
      } finally {
        setSavingCustom(false);
      }
    }

    // Reset fields
    setCustomWord('');
    setCustomLetter('');
    setCustomEnglish('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Letter → Picture Pairs *</label>
        <p className="text-xs text-gray-600 mb-3">
          The child taps a letter, then taps the matching picture. You can pick words from the school library or author custom words below.
        </p>

        {/* Existing pairs list */}
        {pairs.length > 0 && (
          <div className="space-y-2 mb-4">
            {pairs.map((pair, idx) => (
              <div
                key={`${pair.right}-${idx}`}
                className="flex items-center gap-2 bg-white rounded-xl p-3 border border-gray-200 shadow-sm"
              >
                <span className="font-bold text-indigo-600 shrink-0 text-sm">{idx + 1}.</span>
                
                {/* Editable Emoji */}
                <input
                  type="text"
                  value={pair.emoji || ''}
                  onChange={(e) => updatePair(idx, 'emoji', e.target.value)}
                  className="w-10 text-center text-xl rounded-lg border border-gray-200 py-1"
                  title="Edit picture emoji"
                />

                {/* Editable Letter */}
                <select
                  value={pair.left}
                  onChange={(e) => updatePair(idx, 'left', e.target.value)}
                  className={`w-20 ${inputCls}`}
                  aria-label="Letter"
                >
                  <option value="">—</option>
                  {letters.map((l) => (
                    <option key={l.base_char} value={l.base_char}>
                      {l.base_char} ({l.sound})
                    </option>
                  ))}
                </select>

                <span className="text-gray-400 shrink-0 font-bold">⟷</span>

                {/* Editable Word */}
                <input
                  type="text"
                  value={pair.right}
                  onChange={(e) => updatePair(idx, 'right', e.target.value)}
                  className={`flex-1 min-w-0 font-bold text-gray-800 ${inputCls}`}
                  placeholder="Word"
                />

                <button
                  type="button"
                  onClick={() => setConfig('pairs', pairs.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:text-red-700 font-bold shrink-0 p-1 rounded hover:bg-red-50"
                  title="Remove pair"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`py-2 px-4 text-xs font-bold transition border-b-2 ${
              mode === 'library'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📚 Choose from Word Bank ({words.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`py-2 px-4 text-xs font-bold transition border-b-2 ${
              mode === 'custom'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ✨ + Author Custom Word
          </button>
        </div>

        {/* Tab 1: Library Picker with Live Search Filter */}
        {mode === 'library' && (
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search library words (e.g. አንበሳ, Lion)..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white"
            />
            <select
              value=""
              onChange={(e) => {
                const word = words.find((w) => w.word === e.target.value);
                if (word) addPair(word);
              }}
              className={inputCls}
            >
              <option value="">— choose from {filteredWords.length} words —</option>
              {filteredWords.map((w) => (
                <option key={w.id} value={w.word}>
                  {w.emoji} {w.word} {w.english ? `(${w.english})` : ''} {w.example_for_letter ? `[${w.example_for_letter}]` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab 2: Custom Word Authoring */}
        {mode === 'custom' && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
            <div className="text-xs font-bold text-indigo-900">Add a new word to this matching activity:</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Amharic Word *</label>
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => {
                    setCustomWord(e.target.value);
                    if (!customLetter && e.target.value) {
                      setCustomLetter(e.target.value.charAt(0));
                    }
                  }}
                  placeholder="e.g. መጽሐፍ"
                  className={`${inputCls} text-sm font-bold`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Matching Fidel Letter</label>
                <select
                  value={customLetter}
                  onChange={(e) => setCustomLetter(e.target.value)}
                  className={`${inputCls} text-sm`}
                >
                  <option value="">— Choose Letter —</option>
                  {letters.map((l) => (
                    <option key={l.base_char} value={l.base_char}>
                      {l.base_char} ({l.sound})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Emoji / Icon</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    placeholder="🍎"
                    className="w-12 text-center text-lg rounded-lg border border-slate-200 py-1.5"
                  />
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {['📚', '✏️', '🍎', '🦁', '🚗', '☀️', '🏠', '⚽'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setCustomEmoji(em)}
                        className="text-base px-1.5 py-0.5 rounded hover:bg-white bg-slate-200/50"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">English Meaning (optional)</label>
                <input
                  type="text"
                  value={customEnglish}
                  onChange={(e) => setCustomEnglish(e.target.value)}
                  placeholder="e.g. Book"
                  className={`${inputCls} text-sm`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Save to school vocabulary bank for future use</span>
              </label>

              <button
                type="button"
                onClick={handleAddCustomPair}
                disabled={!customWord.trim() || savingCustom}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingCustom ? 'Saving...' : '+ Add Pair'}
              </button>
            </div>
          </div>
        )}

        {pairs.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Add at least one pair. The child cannot start the game without it.
          </p>
        )}
        {pairs.length > 0 && pairs.length < 3 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Three or more pairs make a better game. The child plays four per round.
          </p>
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
// COUNTING GAME CONFIGURATION
// The instructor picks or authors the objects to count and the number range.
// Teachers can choose from existing objects OR create custom objects on the fly.
// ============================================
function CountingGameConfig({ config, setConfig, inputCls, labelCls, reference = {} }) {
  const objects = config.objects || [];
  const words = reference.picture_words || [];
  const min = config.min ?? 1;
  const max = config.max ?? 10;

  const [mode, setMode] = useState('library'); // 'library' | 'custom'
  const [filterText, setFilterText] = useState('');

  // Custom object state
  const [customWord, setCustomWord] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🍎');
  const [customEnglish, setCustomEnglish] = useState('');
  const [saveToBank, setSaveToBank] = useState(true);
  const [savingCustom, setSavingCustom] = useState(false);

  const addObject = (word) => {
    if (!word?.emoji && !word?.image_url) return;
    setConfig('objects', [
      ...objects,
      { emoji: word.emoji || '', word: word.word, image_url: word.image_url || null },
    ]);
  };

  const updateObject = (index, field, value) => {
    const next = objects.map((obj, i) => (i === index ? { ...obj, [field]: value } : obj));
    setConfig('objects', next);
  };

  const availableWords = words
    .filter((w) => w.emoji)
    .filter((w) => {
      if (!filterText.trim()) return true;
      const q = filterText.toLowerCase();
      return (
        (w.word || '').toLowerCase().includes(q) ||
        (w.english || '').toLowerCase().includes(q)
      );
    });

  const handleAddCustomObject = async (e) => {
    e.preventDefault();
    if (!customWord.trim()) return;

    const trimmedWord = customWord.trim();
    const resolvedEmoji = customEmoji.trim() || '🍎';

    setConfig('objects', [
      ...objects,
      { emoji: resolvedEmoji, word: trimmedWord, image_url: null },
    ]);

    if (saveToBank) {
      setSavingCustom(true);
      try {
        await axiosClient.post('/reference/words', {
          word: trimmedWord,
          english: customEnglish.trim() || null,
          emoji: resolvedEmoji,
          example_for_letter: trimmedWord.charAt(0),
          category: 'objects',
        });
        invalidateReferenceKit();
      } catch (err) {
        console.error('Failed to save counting object to bank:', err);
      } finally {
        setSavingCustom(false);
      }
    }

    setCustomWord('');
    setCustomEnglish('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>What should the child count? *</label>
        <p className="text-xs text-gray-600 mb-3">
          Pick everyday objects or author custom objects. The child counts them, then taps the number.
        </p>

        {/* Existing objects list */}
        {objects.length > 0 && (
          <div className="space-y-2 mb-4">
            {objects.map((object, idx) => (
              <div
                key={`${object.word}-${idx}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200 shadow-sm"
              >
                <span className="font-bold text-indigo-600 shrink-0 text-sm">{idx + 1}.</span>
                
                {/* Editable Emoji */}
                <input
                  type="text"
                  value={object.emoji || ''}
                  onChange={(e) => updateObject(idx, 'emoji', e.target.value)}
                  className="w-10 text-center text-xl rounded-lg border border-gray-200 py-1"
                  title="Edit object emoji"
                />

                {/* Editable Word */}
                <input
                  type="text"
                  value={object.word}
                  onChange={(e) => updateObject(idx, 'word', e.target.value)}
                  className={`flex-1 min-w-0 font-bold text-gray-800 ${inputCls}`}
                  placeholder="Object name"
                />

                <button
                  type="button"
                  onClick={() =>
                    setConfig('objects', objects.filter((_, i) => i !== idx))
                  }
                  className="text-red-500 hover:text-red-700 font-bold shrink-0 p-1 rounded hover:bg-red-50"
                  title="Remove object"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            type="button"
            onClick={() => setMode('library')}
            className={`py-2 px-4 text-xs font-bold transition border-b-2 ${
              mode === 'library'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🍎 Choose from Library ({words.filter((w) => w.emoji).length})
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`py-2 px-4 text-xs font-bold transition border-b-2 ${
              mode === 'custom'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ✨ + Author Custom Object
          </button>
        </div>

        {/* Tab 1: Library Object Picker */}
        {mode === 'library' && (
          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search objects to count (e.g. ሎሚ, Lemon, ኳስ)..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white"
            />
            <select
              value=""
              onChange={(e) => {
                const word = words.find((w) => w.word === e.target.value);
                if (word) addObject(word);
              }}
              className={inputCls}
            >
              <option value="">— choose from {availableWords.length} objects —</option>
              {availableWords.map((w) => (
                <option key={w.id} value={w.word}>
                  {w.emoji} {w.word} {w.english ? `(${w.english})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab 2: Custom Counting Object Authoring */}
        {mode === 'custom' && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
            <div className="text-xs font-bold text-indigo-900">Add custom object for students to count:</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Amharic Object Name *</label>
                <input
                  type="text"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  placeholder="e.g. ብርቱካን, እርሳስ, ኳስ"
                  className={`${inputCls} text-sm font-bold`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Emoji / Icon</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    placeholder="🍎"
                    className="w-12 text-center text-lg rounded-lg border border-slate-200 py-1.5"
                  />
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {['🍊', '🍎', '🍌', '✏️', '⚽', '🚗', '⭐', '🎈'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setCustomEmoji(em)}
                        className="text-base px-1.5 py-0.5 rounded hover:bg-white bg-slate-200/50"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">English Translation (optional)</label>
                <input
                  type="text"
                  value={customEnglish}
                  onChange={(e) => setCustomEnglish(e.target.value)}
                  placeholder="e.g. Orange, Pencil, Ball"
                  className={`${inputCls} text-sm`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Save to school vocabulary bank for future activities</span>
              </label>

              <button
                type="button"
                onClick={handleAddCustomObject}
                disabled={!customWord.trim() || savingCustom}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {savingCustom ? 'Saving...' : '+ Add Object'}
              </button>
            </div>
          </div>
        )}

        {objects.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Add at least one object. The child cannot start the game without it.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Smallest number</label>
          <input
            type="number"
            min="1"
            max="20"
            value={min}
            onChange={(e) => setConfig('min', Number(e.target.value) || 1)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Largest number</label>
          <input
            type="number"
            min="1"
            max="20"
            value={max}
            onChange={(e) => setConfig('max', Number(e.target.value) || 10)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Questions per session</label>
          <input
            type="number"
            min="3"
            max="10"
            value={config.rounds ?? 5}
            onChange={(e) => setConfig('rounds', Number(e.target.value) || 5)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Numerals to show</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="numeral_system"
              checked={(config.numeral_system || 'geez') === 'geez'}
              onChange={() => setConfig('numeral_system', 'geez')}
            />
            <span className="font-medium">Ge’ez (፩ ፪ ፫) — as taught in Ethiopian schools</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="numeral_system"
              checked={config.numeral_system === 'arabic'}
              onChange={() => setConfig('numeral_system', 'arabic')}
            />
            <span className="font-medium">Arabic (1 2 3)</span>
          </label>
        </div>
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
// LETTER TRACING GAME CONFIGURATION
// The teacher TAPS the letters to teach; they never type them. The seven vowel
// orders for each character come from the seeded Ge'ez syllabary, because that
// is the writing system rather than curriculum - every Ethiopian school teaches
// it the same way, and re-typing 26 letters x 7 orders by hand is how errors
// get into a child's textbook.
// ============================================
function LetterTracingGameConfig({ config, setConfig, inputCls, labelCls, reference = {} }) {
  const letters = config.letters || [];
  const allLetters = reference.fidel_letters || [];
  const words = reference.picture_words || [];

  const toggleLetter = (base) => {
    if (letters.some((l) => l.base === base)) {
      setConfig(
        'letters',
        letters.filter((l) => l.base !== base)
      );
      return;
    }
    // Carry the reference sound, syllable series and example word with the
    // selection so the game is playable the moment it is published.
    const refLetter = allLetters.find((l) => l.base_char === base);
    const refWord = words.find((w) => w.example_for_letter === base);
    setConfig('letters', [
      ...letters,
      {
        base,
        sound: refLetter?.sound || '',
        syllables: refLetter?.syllables || [],
        word: refWord?.word || '',
        emoji: refWord?.emoji || '',
      },
    ]);
  };

  const updateLetter = (base, field, value) => {
    setConfig(
      'letters',
      letters.map((l) => (l.base === base ? { ...l, [field]: value } : l))
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Letters to practise *</label>
        <p className="text-xs text-gray-600 mb-3">
          Tap a letter to add or remove it. The Ethiopian primer teaches ሀ ለ ሐ መ ረ ሰ ሸ ቀ first.
        </p>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
          {allLetters.map((l) => {
            const active = letters.some((x) => x.base === l.base_char);
            return (
              <button
                key={l.base_char}
                type="button"
                onClick={() => toggleLetter(l.base_char)}
                title={`${l.base_char} (${l.sound})`}
                className={`aspect-square rounded-lg text-xl font-black transition active:scale-90 ${
                  active
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50'
                }`}
              >
                {l.base_char}
              </button>
            );
          })}
        </div>

        {letters.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Choose at least one letter. The child cannot start the game without it.
          </p>
        )}
      </div>

      {letters.length > 0 && (
        <div>
          <label className={labelCls}>The word that shows each letter</label>
          <p className="text-xs text-gray-600 mb-3">
            A Grade 1 child meets a letter inside a word they already know. Pick the
            word for each one, or leave the reference example.
          </p>
          <div className="space-y-2">
            {letters.map((l) => (
              <div
                key={l.base}
                className="flex flex-wrap items-center gap-2 bg-white rounded-lg p-3 border border-gray-200"
              >
                <span className="text-2xl font-black text-emerald-700 shrink-0 w-10 text-center">
                  {l.base}
                </span>
                {l.syllables?.length === 7 && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {l.syllables.join(' ')}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <input
                    value={l.word || ''}
                    onChange={(e) => updateLetter(l.base, 'word', e.target.value)}
                    placeholder="Amharic word"
                    className={`${inputCls} text-sm`}
                  />
                </span>
                <input
                  value={l.emoji || ''}
                  onChange={(e) => updateLetter(l.base, 'emoji', e.target.value)}
                  placeholder="🎨"
                  className={`w-16 ${inputCls} text-center`}
                  aria-label="Picture emoji"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>How many vowel orders to practise?</label>
        <select
          value={config.vowel_order_count ?? 7}
          onChange={(e) => setConfig('vowel_order_count', Number(e.target.value))}
          className={inputCls}
        >
          <option value={1}>Only the first (ሀ)</option>
          <option value={3}>First three (ሀ ሁ ሂ)</option>
          <option value={7}>All seven (አድ ኡ ኢ አ ኤ እ ኦ)</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          Younger children usually manage three; Grade 1 works through all seven.
        </p>
      </div>
    </div>
  );
}


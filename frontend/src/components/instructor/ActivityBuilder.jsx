import { useEffect, useState } from 'react';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';

const ACTIVITY_TYPES = [
  'worksheet', 'writing', 'reading', 'drawing', 'speaking', 'matching',
  'coloring', 'counting', 'fill_in_the_blank', 'drag_and_drop',
  'multiple_choice', 'true_false', 'puzzle', 'story_reading',
  'pronunciation', 'vocabulary_practice', 'letter_tracing', 'number_tracing',
  'listening', 'picture_selection', 'file_submission', 'short_answer',
];

const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'advanced'];

// Which activity types get an auto-built structured activity_config.
const CONFIG_TYPES = ['multiple_choice', 'picture_selection', 'true_false', 'short_answer'];
const OPTIONS_TYPES = ['multiple_choice', 'picture_selection'];

const EMPTY = {
  title: '', activity_type: 'worksheet', instructions: '',
  difficulty: 'beginner', estimated_time_minutes: '', max_score: 100,
  requires_upload: false, auto_gradable: false, allow_resubmission: false,
  start_date: '', due_date: '', resource_url: '',
  optionsText: '', correctAnswer: '', audioUrl: '', answersText: '',
};

function configFor(form) {
  if (!CONFIG_TYPES.includes(form.activity_type)) return null;
  if (OPTIONS_TYPES.includes(form.activity_type)) {
    const options = form.optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!options.length) return null;
    return { options, correct_answer: form.correctAnswer };
  }
  if (form.activity_type === 'true_false') {
    const answer = String(form.correctAnswer).toLowerCase();
    if (!['true', 'false'].includes(answer)) return null;
    return { correct_answer: answer };
  }
  if (form.activity_type === 'short_answer') {
    const answers = form.answersText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!answers.length) return null;
    return { accepted_answers: answers };
  }
  return null;
}

function seedFrom(activity) {
  const cfg = activity.activity_config || {};
  const optionsText = Array.isArray(cfg.options) ? cfg.options.join('\n') : '';
  return {
    title: activity.title || '',
    activity_type: activity.activity_type || 'worksheet',
    instructions: activity.instructions || '',
    difficulty: activity.difficulty || 'beginner',
    estimated_time_minutes: activity.estimated_time_minutes || '',
    max_score: activity.max_score ?? 100,
    requires_upload: Boolean(activity.requires_upload),
    auto_gradable: Boolean(activity.auto_gradable),
    allow_resubmission: Boolean(activity.allow_resubmission),
    start_date: activity.start_date ? activity.start_date.slice(0, 10) : '',
    due_date: activity.due_date ? activity.due_date.slice(0, 10) : '',
    resource_url: activity.resource_url || '',
    optionsText,
    correctAnswer: cfg.correct_answer || '',
    audioUrl: (cfg.audio_url || activity.resource_url || '').toString(),
    answersText: Array.isArray(cfg.accepted_answers) ? cfg.accepted_answers.join('\n') : '',
  };
}

export default function ActivityBuilder({ open, onClose, lessonId, activity, onSaved }) {
  const isEdit = Boolean(activity);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    setForm(activity ? seedFrom(activity) : { ...EMPTY });
  }, [open, activity]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const needsOptions = OPTIONS_TYPES.includes(form.activity_type);
  const needsCorrect = ['multiple_choice', 'picture_selection', 'true_false'].includes(form.activity_type);
  const needsAnswers = form.activity_type === 'short_answer';
  const needsResource = form.activity_type === 'listening';

  async function handleSubmit(e, status) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const base = {
        title: form.title,
        instructions: form.instructions,
        activity_type: form.activity_type,
        resource_url: needsResource ? form.audioUrl || null : form.resource_url || null,
        max_score: Number(form.max_score) || 100,
        requires_upload: form.requires_upload,
        auto_gradable: form.auto_gradable,
        allow_resubmission: form.allow_resubmission,
        difficulty: form.difficulty,
        estimated_time_minutes: form.estimated_time_minutes ? Number(form.estimated_time_minutes) : null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        activity_config: configFor(form),
        status,
      };
      if (isEdit) {
        const { status: _s, ...rest } = base;
        await axiosClient.put(`/activities/${activity.id}`, rest);
      } else {
        await axiosClient.post(`/lessons/${lessonId}/activities`, base);
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
      title={isEdit ? 'Edit activity' : 'Create activity'}
      subtitle="Activities are grouped by type. Students see their age-appropriate activities automatically."
      size="lg"
    >
      {error && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={(e) => handleSubmit(e, 'active')} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Activity title *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Trace the letter A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Activity type *</label>
            <select value={form.activity_type} onChange={(e) => set('activity_type', e.target.value)} className={inputCls}>
              {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Difficulty</label>
            <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={inputCls}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Instructions *</label>
            <textarea required rows={3} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max score</label>
            <input type="number" min="1" value={form.max_score} onChange={(e) => set('max_score', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Estimated time (minutes)</label>
            <input type="number" min="1" value={form.estimated_time_minutes} onChange={(e) => set('estimated_time_minutes', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Start date</label>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due date</label>
            <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} className={inputCls} />
          </div>
          {!needsResource && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Resource URL (worksheet file or link)</label>
              <input value={form.resource_url} onChange={(e) => set('resource_url', e.target.value)} placeholder="https://… or /uploads/…" className={inputCls} />
            </div>
          )}
        </div>

        {needsOptions && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Answer settings</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Options (one per line)</label>
                <textarea rows={4} value={form.optionsText} onChange={(e) => set('optionsText', e.target.value)} placeholder={'Cat\nDog\nBird'} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Correct answer *</label>
                <input required={needsCorrect} value={form.correctAnswer} onChange={(e) => set('correctAnswer', e.target.value)} placeholder="Must match one of the options" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {needsCorrect && !needsOptions && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Answer settings</p>
            <div>
              <label className={labelCls}>Correct answer *</label>
              <select value={String(form.correctAnswer).toLowerCase()} onChange={(e) => set('correctAnswer', e.target.value)} className={inputCls}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          </div>
        )}

        {needsAnswers && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Answer settings</p>
            <div>
              <label className={labelCls}>Accepted answers (one per line)</label>
              <textarea rows={3} value={form.answersText} onChange={(e) => set('answersText', e.target.value)} placeholder={'apple\nApple'} className={inputCls} />
            </div>
          </div>
        )}

        {needsResource && (
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Audio settings</p>
            <div>
              <label className={labelCls}>Audio URL / file</label>
              <input value={form.audioUrl} onChange={(e) => set('audioUrl', e.target.value)} placeholder="https://… or /uploads/…" className={inputCls} />
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.requires_upload} onChange={(e) => set('requires_upload', e.target.checked)} />
            File/photo upload
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.auto_gradable} onChange={(e) => set('auto_gradable', e.target.checked)} />
            Auto-gradable
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.allow_resubmission} onChange={(e) => set('allow_resubmission', e.target.checked)} />
            Allow resubmission
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !form.title || !form.instructions}
            onClick={(e) => handleSubmit(e, 'inactive')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            disabled={busy || !form.title || !form.instructions}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isEdit ? 'Save changes' : 'Create activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdArrowBack, MdArrowForward, MdAdd, MdDelete,
  MdTextFields, MdImage, MdAudiotrack, MdVideocam, MdStyle,
  MdSave, MdArrowUpward, MdArrowDownward, MdUpload, MdClose, MdAutoAwesome,
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';
import BasicChildLessonExperience from '../child/BasicChildLessonExperience';
import { FIDEL_FAMILIES, ENGLISH_ALPHABET, findFidelFamily } from '../../utils/fidelData';

const CONTENT_TYPES = [
  { id: 'card',  label: 'Learning Card',        icon: MdStyle,     desc: 'Character, number, or vocabulary card with symbol & meaning' },
  { id: 'text',  label: 'Text & Explanation',   icon: MdTextFields, desc: 'Simple explanations, stories, or instructions' },
  { id: 'audio', label: 'Audio & Pronunciation', icon: MdAudiotrack, desc: 'Voice recording or pronunciation guide' },
  { id: 'video', label: 'Video Demonstration',  icon: MdVideocam,  desc: 'Short engaging educational video' },
  { id: 'image', label: 'Picture / Illustration', icon: MdImage,   desc: 'Visual aid or diagram for children' },
];

const PRACTICE_TYPES = [
  { id: 'matching',       label: 'Matching Pairs',           desc: 'Connect matching words, pictures, or letters' },
  { id: 'counting',       label: 'Counting Practice',        desc: 'Count items and pick the right number' },
  { id: 'multiple_choice', label: 'Multiple Choice Practice', desc: 'Fun question with picture or text options' },
  { id: 'drag_and_drop',  label: 'Letter / Word Ordering',   desc: 'Put items in the correct sequence' },
];

function move(arr, idx, dir) {
  const next = idx + dir;
  if (next < 0 || next >= arr.length) return arr;
  const copy = [...arr];
  [copy[idx], copy[next]] = [copy[next], copy[idx]];
  return copy;
}

// Shared file-upload button
function UploadButton({ onUploaded, accept = 'audio/*,image/*,.pdf,.mp4,.mov', label = 'Upload File' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosClient.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.url || data.file_url || data.path || '');
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <MdUpload />
        {busy ? 'Uploading…' : label}
      </button>
    </>
  );
}

export default function BasicGuidedLessonBuilder({ initialCourseId, courses = [], onCancel }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('active');

  // ── Step 1: Lesson Info ──────────────────────────────────────────────────
  const [info, setInfo] = useState({
    course_id: initialCourseId || (courses[0]?.course_id || ''),
    title: '',
    description: '',
    learning_objectives: '',
    estimated_duration_minutes: 15,
    order_index: 0,
  });

  // ── Step 2: Content Blocks ───────────────────────────────────────────────
  const [contentBlocks, setContentBlocks] = useState([
    {
      id: 'block-1',
      block_type: 'card',
      title: 'Introduction Card',
      symbol: '',
      word: '',
      translation: '',
      audio_url: '',
      description: '',
    },
  ]);

  // ── Step 3: Practice Activities ──────────────────────────────────────────
  const [practiceBlocks, setPracticeBlocks] = useState([]);

  // ── Fidel Family & English Letter Pickers ─────────────────────────────────
  const [fidelPickerOpen, setFidelPickerOpen] = useState(false);
  const [selectedFidelBase, setSelectedFidelBase] = useState('ሀ');
  const [englishPickerOpen, setEnglishPickerOpen] = useState(false);
  const [selectedTargetBlockId, setSelectedTargetBlockId] = useState(null);

  const selectedCourse = courses.find((c) => String(c.course_id) === String(info.course_id));

  // ── Content block helpers ────────────────────────────────────────────────
  const addContentBlock = (type) => {
    const id = `block-${Date.now()}`;
    const base = { id, block_type: type, title: '', description: '' };
    if (type === 'card')  return setContentBlocks(prev => [...prev, { ...base, title: 'Learning Card', symbol: '', word: '', translation: '', audio_url: '' }]);
    if (type === 'text')  return setContentBlocks(prev => [...prev, { ...base, title: 'Read Along', content: '' }]);
    if (type === 'audio') return setContentBlocks(prev => [...prev, { ...base, title: 'Listen & Repeat', audio_url: '', transcript: '' }]);
    if (type === 'video') return setContentBlocks(prev => [...prev, { ...base, title: 'Fun Video', video_url: '', instructions: '' }]);
    if (type === 'image') return setContentBlocks(prev => [...prev, { ...base, title: 'Picture', file_url: '', caption: '' }]);
  };
  const removeContentBlock = (id) => setContentBlocks(prev => prev.filter(b => b.id !== id));
  const updateContentBlock = (id, field, value) =>
    setContentBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  const moveContent = (idx, dir) => setContentBlocks(prev => move(prev, idx, dir));

  // ── Fidel & Alphabet helpers ─────────────────────────────────────────────
  const insertFidelFamilyBlocks = (family, replaceFirstIfEmpty = true) => {
    if (!family || !family.forms) return;
    const newCards = family.forms.map((f, i) => ({
      id: `block-fidel-${Date.now()}-${i}`,
      block_type: 'card',
      title: `${f.symbol} (${f.order})`,
      symbol: f.symbol,
      word: f.word,
      translation: f.translation,
      description: `${family.name} - ${f.order} (${f.sound})`,
      audio_url: '',
    }));

    setContentBlocks((prev) => {
      if (replaceFirstIfEmpty && prev.length === 1 && prev[0].block_type === 'card' && !prev[0].symbol && !prev[0].word) {
        return newCards;
      }
      return [...prev, ...newCards];
    });

    if (!info.title.trim()) {
      setInfo((prev) => ({ ...prev, title: `የፊደል ትምህርት: የ${family.base} ቤተሰብ (${family.name})` }));
    }
    setFidelPickerOpen(false);
  };

  const expandFamilyForBlock = (blockId, family) => {
    if (!family || !family.forms) return;
    setContentBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx === -1) return prev;

      const form1 = family.forms[0];
      const updatedTarget = {
        ...prev[idx],
        block_type: 'card',
        symbol: form1.symbol,
        title: `${form1.symbol} (${form1.order})`,
        word: form1.word,
        translation: form1.translation,
        description: `${family.name} - ${form1.order} (${form1.sound})`,
      };

      const subsequentCards = family.forms.slice(1).map((f, i) => ({
        id: `block-fidel-${Date.now()}-${i + 1}`,
        block_type: 'card',
        title: `${f.symbol} (${f.order})`,
        symbol: f.symbol,
        word: f.word,
        translation: f.translation,
        description: `${family.name} - ${f.order} (${f.sound})`,
        audio_url: '',
      }));

      const copy = [...prev];
      copy.splice(idx, 1, updatedTarget, ...subsequentCards);
      return copy;
    });

    if (!info.title.trim()) {
      setInfo((prev) => ({ ...prev, title: `የፊደል ትምህርት: የ${family.base} ቤተሰብ (${family.name})` }));
    }
  };

  const insertSingleFidelCard = (form, family) => {
    const newCard = {
      id: `block-fidel-${Date.now()}`,
      block_type: 'card',
      title: `${form.symbol} (${form.order})`,
      symbol: form.symbol,
      word: form.word,
      translation: form.translation,
      description: `${family.name} - ${form.order} (${form.sound})`,
      audio_url: '',
    };

    setContentBlocks((prev) => {
      if (selectedTargetBlockId) {
        return prev.map((b) => (b.id === selectedTargetBlockId ? { ...b, ...newCard, id: b.id } : b));
      }
      if (prev.length === 1 && prev[0].block_type === 'card' && !prev[0].symbol && !prev[0].word) {
        return [newCard];
      }
      return [...prev, newCard];
    });

    setSelectedTargetBlockId(null);
    setFidelPickerOpen(false);
  };

  const insertEnglishLetterCard = (item) => {
    const newCard = {
      id: `block-en-${Date.now()}`,
      block_type: 'card',
      title: `Letter ${item.letter}`,
      symbol: item.letter,
      word: item.word,
      translation: item.translation,
      description: `English Alphabet: ${item.letter} is for ${item.word}`,
      audio_url: '',
    };

    setContentBlocks((prev) => {
      if (selectedTargetBlockId) {
        return prev.map((b) => (b.id === selectedTargetBlockId ? { ...b, ...newCard, id: b.id } : b));
      }
      if (prev.length === 1 && prev[0].block_type === 'card' && !prev[0].symbol && !prev[0].word) {
        return [newCard];
      }
      return [...prev, newCard];
    });

    if (!info.title.trim()) {
      setInfo((prev) => ({ ...prev, title: `English Letter: ${item.letter}` }));
    }
    setSelectedTargetBlockId(null);
    setEnglishPickerOpen(false);
  };

  // ── Practice block helpers ───────────────────────────────────────────────
  const addPracticeBlock = (type) => {
    const id = `practice-${Date.now()}`;
    const base = { id, activity_type: type, title: '', instructions: 'Choose the correct answer' };
    if (type === 'matching')        return setPracticeBlocks(prev => [...prev, { ...base, title: 'Match the Pairs', pairs: [{ left: '', right: '' }, { left: '', right: '' }] }]);
    if (type === 'counting')        return setPracticeBlocks(prev => [...prev, { ...base, title: 'Counting Fun', target_count: 3, options: ['1', '2', '3', '4'], correct_answer: '3' }]);
    if (type === 'multiple_choice') return setPracticeBlocks(prev => [...prev, { ...base, title: 'Practice Question', question: '', options: ['', '', '', ''], correct_answer: '' }]);
    if (type === 'drag_and_drop')   return setPracticeBlocks(prev => [...prev, { ...base, title: 'Put in Order', items: ['', '', ''], correct_order: ['', '', ''] }]);
  };
  const removePracticeBlock = (id) => setPracticeBlocks(prev => prev.filter(p => p.id !== id));
  const updatePracticeBlock = (id, field, value) =>
    setPracticeBlocks(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  const movePractice = (idx, dir) => setPracticeBlocks(prev => move(prev, idx, dir));

  // ── Build preview resources for Step 4 ──────────────────────────────────
  // Must match the shape BasicChildLessonExperience reads: resource.content.metadata etc.
  const buildPreviewResources = () => {
    const res = [];
    contentBlocks.forEach((b) => {
      if (b.block_type === 'card') {
        res.push({
          id: b.id, resource_type: 'material',
          title: b.title || 'Learning Card',
          description: b.description || '',
          status: 'not_started',
          content: {
            material_type: 'other',
            metadata: { type: 'learning_card', symbol: b.symbol, word: b.word, translation: b.translation, audio_url: b.audio_url },
            text_content: b.description || `${b.symbol || ''} - ${b.word || ''}`,
          },
        });
      } else if (b.block_type === 'text') {
        res.push({
          id: b.id, resource_type: 'material',
          title: b.title || 'Read Along',
          status: 'not_started',
          content: { material_type: 'document', text_content: b.content || '', metadata: { type: 'text_block' } },
        });
      } else if (b.block_type === 'audio') {
        res.push({
          id: b.id, resource_type: 'material',
          title: b.title || 'Listen & Speak',
          status: 'not_started',
          content: { material_type: 'audio', file_url: b.audio_url || '', text_content: b.transcript || '', metadata: { type: 'audio_block' } },
        });
      } else if (b.block_type === 'video') {
        res.push({
          id: b.id, resource_type: 'video',
          title: b.title || 'Demonstration Video',
          status: 'not_started',
          content: { video_url: b.video_url || '', source_type: 'youtube' },
        });
      } else if (b.block_type === 'image') {
        res.push({
          id: b.id, resource_type: 'material',
          title: b.title || 'Illustration',
          description: b.caption || '',
          status: 'not_started',
          content: { material_type: 'image', file_url: b.file_url || '', text_content: b.caption || '', metadata: { type: 'image_block' } },
        });
      }
    });
    practiceBlocks.forEach((p) => {
      res.push({
        id: p.id, resource_type: 'activity',
        title: p.title || 'Fun Practice',
        status: 'not_started',
        content: {
          activity_type: p.activity_type,
          instructions: p.instructions || '',
          max_score: 10,
          activity_config: {
            question: p.question,
            options: p.options,
            correct_answer: p.correct_answer,
            pairs: p.pairs,
            target_count: p.target_count,
            items: p.items,
            correct_order: p.correct_order,
          },
        },
      });
    });
    return res;
  };

  // ── Save & Publish ───────────────────────────────────────────────────────
  const handleSaveAndPublish = async () => {
    setError('');
    if (!info.course_id) { setError('Please select a course.'); setStep(1); return; }
    if (!info.title.trim()) { setError('Please provide a lesson title.'); setStep(1); return; }
    setSaving(true);
    try {
      // 1. Create lesson
      const { data: lessonData } = await axiosClient.post(`/courses/${info.course_id}/lessons`, {
        title: info.title.trim(),
        description: info.description.trim() || null,
        learning_objectives: info.learning_objectives.trim() || null,
        estimated_duration_minutes: Number(info.estimated_duration_minutes) || 15,
        order_index: Number(info.order_index) || 0,
        status,
        difficulty_level: 'beginner',
      });
      const lesson = lessonData.lesson;

      // 2. Create content blocks
      for (const b of contentBlocks) {
        if (b.block_type === 'video') {
          if (!b.video_url?.trim()) continue;
          await axiosClient.post(`/lessons/${lesson.id}/videos`, {
            title: b.title.trim() || 'Video Lesson',
            video_url: b.video_url.trim(),
            description: b.instructions || null,
            source_type: b.video_url.includes('youtube') || b.video_url.includes('youtu.be') ? 'youtube'
              : b.video_url.includes('vimeo') ? 'vimeo' : 'upload',
          });
        } else {
          const payload = {
            title: b.title.trim() || (b.block_type === 'card' ? `Card: ${b.symbol || b.word}` : b.block_type),
            description: b.description || b.caption || b.transcript || null,
            type: b.block_type === 'card' ? 'other' : b.block_type === 'text' ? 'document' : b.block_type,
            content: b.block_type === 'text' ? (b.content || '') : b.block_type === 'audio' ? (b.transcript || '') : null,
            file_url: b.audio_url || b.file_url || null,
            metadata: b.block_type === 'card'
              ? { type: 'learning_card', symbol: b.symbol, word: b.word, translation: b.translation, audio_url: b.audio_url }
              : { type: `${b.block_type}_block` },
          };
          await axiosClient.post(`/lessons/${lesson.id}/materials`, payload);
        }
      }

      // 3. Create practice activities
      for (const p of practiceBlocks) {
        const config = {
          question: p.question || p.instructions,
          options: p.options || [],
          correct_answer: p.correct_answer,
          pairs: p.pairs || [],
          target_count: p.target_count || 1,
          items: p.items || [],
          correct_order: p.correct_order || [],
        };
        await axiosClient.post(`/lessons/${lesson.id}/activities`, {
          title: p.title.trim() || 'Fun Practice',
          activity_type: p.activity_type,
          instructions: p.instructions || 'Follow the instructions to complete the exercise',
          activity_config: config,
          max_score: 10,
          auto_gradable: true,
        });
      }

      navigate(`/instructor/courses/${lesson.course_id}/lessons/${lesson.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lesson and content');
      setSaving(false);
    }
  };

  // ── Shared nav buttons ───────────────────────────────────────────────────
  const NavBack = ({ to, label = 'Back' }) => (
    <button onClick={() => setStep(to)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition">
      <MdArrowBack /> {label}
    </button>
  );
  const NavNext = ({ to, label = 'Next', validate }) => (
    <button onClick={() => { if (validate) { const err = validate(); if (err) { setError(err); return; } } setError(''); setStep(to); }}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl shadow hover:scale-105 transition">
      <span>{label}</span> <MdArrowForward />
    </button>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto my-6">
      {/* Header / Stepper */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Guided Lesson Builder · Basic Levels (KG1 – Grade 2)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black drop-shadow-sm">Create an Interactive Child Lesson</h2>
            <p className="text-white/90 text-sm mt-1">Build a visual learning experience step by step.</p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm backdrop-blur transition">
              Cancel
            </button>
          )}
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2 text-center text-xs font-bold">
          {[
            { n: 1, label: '1 · Info' },
            { n: 2, label: '2 · Content' },
            { n: 3, label: '3 · Practice' },
            { n: 4, label: '4 · Preview' },
            { n: 5, label: '5 · Publish' },
          ].map((s) => (
            <button key={s.n} onClick={() => setStep(s.n)}
              className={`py-2 rounded-xl transition flex flex-col items-center gap-1 ${step === s.n ? 'bg-white text-orange-600 shadow-lg font-black scale-105' : step > s.n ? 'bg-white/30 text-white hover:bg-white/40' : 'bg-black/10 text-white/60 hover:bg-black/20'}`}>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs uppercase font-bold underline">Dismiss</button>
        </div>
      )}

      {/* ── STEP 1: LESSON INFO ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800">Step 1: Lesson Details</h3>
            <p className="text-sm text-slate-500 mt-1">Assign this lesson to a course and set its basic information.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Assigned Course *</label>
              <select
                value={info.course_id}
                onChange={(e) => setInfo({ ...info, course_id: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title} ({c.grade_level_name || 'Visual Level'})
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <p className="text-xs text-orange-600 font-semibold mt-1">
                  {selectedCourse.grade_level_name || 'Basic Tier'} · {selectedCourse.subject_name || 'Core'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Lesson Order / Sequence</label>
              <input type="number" min="0" value={info.order_index}
                onChange={(e) => setInfo({ ...info, order_index: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:ring-2 focus:ring-orange-400 focus:outline-none"
                placeholder="0" />
              <p className="text-xs text-slate-400">Position in the course (0 = first)</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Lesson Title *</label>
              <input type="text" value={info.title}
                onChange={(e) => setInfo({ ...info, title: e.target.value })}
                placeholder="e.g. Counting 1 to 5 · Amharic Fidel ሀ ቤተሰብ · English Alphabet A"
                className="w-full rounded-xl border border-slate-300 p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Child-Friendly Description</label>
              <textarea rows={2} value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                placeholder="A warm, encouraging welcome for young learners..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Learning Objectives</label>
              <input type="text" value={info.learning_objectives}
                onChange={(e) => setInfo({ ...info, learning_objectives: e.target.value })}
                placeholder="e.g. Recognize and pronounce ሀ, count up to 5 items"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:ring-2 focus:ring-orange-400 focus:outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Duration (minutes)</label>
              <input type="number" min="5" max="60" value={info.estimated_duration_minutes}
                onChange={(e) => setInfo({ ...info, estimated_duration_minutes: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:ring-2 focus:ring-orange-400 focus:outline-none" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <NavNext to={2} label="Next: Add Learning Content"
              validate={() => !info.title.trim() ? 'Please fill in the lesson title' : !info.course_id ? 'Please select a course' : null} />
          </div>
        </div>
      )}

      {/* ── STEP 2: CONTENT BLOCKS ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 2: Add Learning Content</h3>
              <p className="text-sm text-slate-500 mt-1">Choose blocks below. The child sees them in this exact order. Reorder with ↑↓.</p>
            </div>
            <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full">{contentBlocks.length} Block{contentBlocks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Block type picker with Fidel Family & Letter Quick-Launch */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-700">➕ Add Learning Content:</p>
                <p className="text-[11px] text-slate-500">Pick standard blocks or use the Amharic Fidel Family generator below.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTargetBlockId(null);
                    setFidelPickerOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 text-xs font-black shadow-md hover:scale-102 transition"
                >
                  <MdAutoAwesome className="text-sm" />
                  <span>Insert Fidel Family (ሀ, ሁ, ሂ...)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTargetBlockId(null);
                    setEnglishPickerOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-black shadow-md hover:scale-102 transition"
                >
                  <span>🔤</span>
                  <span>Insert English Letter (A–Z)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {CONTENT_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => addContentBlock(t.id)}
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 shadow-xs transition group">
                    <Icon className="text-2xl text-orange-500 group-hover:scale-110 transition" />
                    <span className="text-xs font-extrabold text-slate-800 mt-1">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {contentBlocks.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">
              <p className="text-4xl mb-2">📚</p>
              <p className="font-semibold">Add at least one content block above to build the lesson.</p>
            </div>
          )}

          <div className="space-y-4">
            {contentBlocks.map((b, idx) => (
              <div key={b.id} className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4">
                {/* Block header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">{idx + 1}</span>
                    <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">{b.block_type.toUpperCase()}</span>
                    <input type="text" value={b.title}
                      onChange={(e) => updateContentBlock(b.id, 'title', e.target.value)}
                      placeholder="Block title..."
                      className="font-bold text-slate-800 text-sm border-b border-dashed border-slate-300 focus:outline-none focus:border-orange-500 px-1" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveContent(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" title="Move up"><MdArrowUpward /></button>
                    <button onClick={() => moveContent(idx, 1)} disabled={idx === contentBlocks.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" title="Move down"><MdArrowDownward /></button>
                    <button onClick={() => removeContentBlock(b.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50" title="Remove"><MdDelete className="text-lg" /></button>
                  </div>
                </div>

                {/* Card block */}
                {b.block_type === 'card' && (
                  <div className="space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-amber-900 block">Symbol / Character / Number</label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTargetBlockId(b.id);
                              setFidelPickerOpen(true);
                            }}
                            className="text-[11px] text-amber-700 font-extrabold hover:text-amber-900 hover:underline flex items-center gap-1"
                          >
                            <span>🔍</span> Browse ፊደል
                          </button>
                        </div>
                        <input type="text" value={b.symbol || ''} onChange={(e) => updateContentBlock(b.id, 'symbol', e.target.value)}
                          placeholder="e.g. ሀ or 1 or A"
                          className="w-full text-center text-3xl font-black rounded-lg border border-amber-300 p-2 bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-amber-900 block mb-1">Word / Spoken Text</label>
                        <input type="text" value={b.word || ''} onChange={(e) => updateContentBlock(b.id, 'word', e.target.value)}
                          placeholder="e.g. ሀገር or Apple"
                          className="w-full font-bold rounded-lg border border-amber-300 p-2 bg-white text-sm" />
                        <label className="text-xs font-bold text-amber-900 block mt-2 mb-1">Translation / Meaning</label>
                        <input type="text" value={b.translation || ''} onChange={(e) => updateContentBlock(b.id, 'translation', e.target.value)}
                          placeholder="e.g. Country or ፖም"
                          className="w-full rounded-lg border border-amber-300 p-2 bg-white text-xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-amber-900 block mb-1">Audio / Voice URL</label>
                        <input type="text" value={b.audio_url || ''} onChange={(e) => updateContentBlock(b.id, 'audio_url', e.target.value)}
                          placeholder="Audio URL (optional)"
                          className="w-full rounded-lg border border-amber-300 p-2 bg-white text-xs mb-2" />
                        <UploadButton accept="audio/*" label="Upload Audio" onUploaded={(url) => updateContentBlock(b.id, 'audio_url', url)} />
                        <p className="text-[11px] text-amber-700 mt-2 font-medium">💡 If empty, text-to-speech pronounces it automatically!</p>
                      </div>
                    </div>

                    {/* Inline helper: If symbol matches an Amharic Fidel family */}
                    {(() => {
                      const matchedFamily = findFidelFamily(b.symbol);
                      if (!matchedFamily) return null;
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-amber-200/80 bg-white/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                          <div className="flex items-center gap-1.5 text-xs text-amber-900">
                            <span className="text-base">✨</span>
                            <span>
                              Amharic Fidel Family detected: <strong>{matchedFamily.name}</strong> ({matchedFamily.forms.map(f => f.symbol).join(', ')})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => expandFamilyForBlock(b.id, matchedFamily)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black px-3 py-1.5 text-xs shadow-xs transition"
                          >
                            <span>⚡ Follow with {matchedFamily.base} family ({matchedFamily.forms.map(f => f.symbol).join(' ')})</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Text block */}
                {b.block_type === 'text' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">Story / Text Instruction</label>
                    <textarea rows={4} value={b.content || ''} onChange={(e) => updateContentBlock(b.id, 'content', e.target.value)}
                      placeholder="Write friendly instructions or a short story for young children..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                )}

                {/* Audio block */}
                {b.block_type === 'audio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Audio File</label>
                      <input type="text" value={b.audio_url || ''} onChange={(e) => updateContentBlock(b.id, 'audio_url', e.target.value)}
                        placeholder="Audio URL or upload below"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm mb-2" />
                      <UploadButton accept="audio/*,.mp3,.wav,.ogg" label="Upload Audio File" onUploaded={(url) => updateContentBlock(b.id, 'audio_url', url)} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Spoken Transcript / Prompt</label>
                      <input type="text" value={b.transcript || ''} onChange={(e) => updateContentBlock(b.id, 'transcript', e.target.value)}
                        placeholder="Listen and say: ሀ!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                    </div>
                  </div>
                )}

                {/* Video block */}
                {b.block_type === 'video' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Video URL (YouTube or Vimeo) *</label>
                      <input type="text" value={b.video_url || ''} onChange={(e) => updateContentBlock(b.id, 'video_url', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Watch Instructions</label>
                      <input type="text" value={b.instructions || ''} onChange={(e) => updateContentBlock(b.id, 'instructions', e.target.value)}
                        placeholder="Watch the song and dance along!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                    </div>
                  </div>
                )}

                {/* Image block */}
                {b.block_type === 'image' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Image</label>
                      <input type="text" value={b.file_url || ''} onChange={(e) => updateContentBlock(b.id, 'file_url', e.target.value)}
                        placeholder="Image URL or upload below"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm mb-2" />
                      <UploadButton accept="image/*" label="Upload Image" onUploaded={(url) => updateContentBlock(b.id, 'file_url', url)} />
                      {b.file_url && <img src={b.file_url} alt="preview" className="mt-2 h-24 w-auto rounded-lg border object-contain" />}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Caption / Description</label>
                      <input type="text" value={b.caption || ''} onChange={(e) => updateContentBlock(b.id, 'caption', e.target.value)}
                        placeholder="Look at this friendly lion!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <NavBack to={1} />
            <NavNext to={3} label="Next: Add Practice" />
          </div>
        </div>
      )}

      {/* ── STEP 3: PRACTICE ACTIVITIES ─────────────────────────────────── */}
      {step === 3 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 3: Add Practice Activities</h3>
              <p className="text-sm text-slate-500 mt-1">Optional but recommended. Practice is age-appropriate and fun, not an exam.</p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full">{practiceBlocks.length} Activit{practiceBlocks.length !== 1 ? 'ies' : 'y'}</span>
          </div>

          {/* Practice type picker */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">➕ Add a Practice Activity:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRACTICE_TYPES.map((t) => (
                <button key={t.id} onClick={() => addPracticeBlock(t.id)}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 shadow-xs transition text-left">
                  <span className="block text-xs font-black text-slate-800">{t.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-1">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {practiceBlocks.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">
              <p className="text-4xl mb-2">🎮</p>
              <p className="font-semibold">No practice activities yet. Add one above, or skip to preview.</p>
            </div>
          )}

          <div className="space-y-4">
            {practiceBlocks.map((p, idx) => (
              <div key={p.id} className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">{idx + 1}</span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{p.activity_type.replace(/_/g, ' ')}</span>
                    <input type="text" value={p.title}
                      onChange={(e) => updatePracticeBlock(p.id, 'title', e.target.value)}
                      placeholder="Activity title..."
                      className="font-bold text-slate-800 text-sm border-b border-dashed border-slate-300 focus:outline-none focus:border-emerald-500 px-1" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => movePractice(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><MdArrowUpward /></button>
                    <button onClick={() => movePractice(idx, 1)} disabled={idx === practiceBlocks.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><MdArrowDownward /></button>
                    <button onClick={() => removePracticeBlock(p.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"><MdDelete className="text-lg" /></button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Instructions for Child</label>
                  <input type="text" value={p.instructions}
                    onChange={(e) => updatePracticeBlock(p.id, 'instructions', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="e.g. Tap the star to count, or match the letter!" />
                </div>

                {/* Counting */}
                {p.activity_type === 'counting' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-1">Correct Count (Number of items to show)</label>
                      <input type="number" min="1" max="20" value={p.target_count || 1}
                        onChange={(e) => { const v = Number(e.target.value); updatePracticeBlock(p.id, 'target_count', v); updatePracticeBlock(p.id, 'correct_answer', String(v)); }}
                        className="w-full rounded-lg border border-emerald-300 p-2 text-center text-xl font-bold bg-white" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-emerald-900 block mb-1">Answer Options (comma-separated)</label>
                      <input type="text" value={(p.options || []).join(', ')}
                        onChange={(e) => updatePracticeBlock(p.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="1, 2, 3, 4"
                        className="w-full rounded-lg border border-emerald-300 p-2 text-sm font-semibold bg-white" />
                      <p className="text-xs text-emerald-700 mt-1">The correct answer is automatically set to the count above.</p>
                    </div>
                  </div>
                )}

                {/* Matching */}
                {p.activity_type === 'matching' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <p className="text-xs font-bold text-emerald-900">Matching Pairs (Left → Right):</p>
                    {(p.pairs || []).map((pair, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-3">
                        <input type="text" value={pair.left}
                          onChange={(e) => { const np = [...p.pairs]; np[pIdx] = { ...np[pIdx], left: e.target.value }; updatePracticeBlock(p.id, 'pairs', np); }}
                          placeholder="Left (e.g. ሀ)"
                          className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white font-bold text-center" />
                        <span className="text-emerald-700 font-bold">⇄</span>
                        <input type="text" value={pair.right}
                          onChange={(e) => { const np = [...p.pairs]; np[pIdx] = { ...np[pIdx], right: e.target.value }; updatePracticeBlock(p.id, 'pairs', np); }}
                          placeholder="Right (e.g. ሀብታም)"
                          className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white font-bold text-center" />
                        <button onClick={() => { const np = p.pairs.filter((_, i) => i !== pIdx); updatePracticeBlock(p.id, 'pairs', np); }}
                          className="text-rose-400 hover:text-rose-600 p-1"><MdDelete /></button>
                      </div>
                    ))}
                    <button onClick={() => updatePracticeBlock(p.id, 'pairs', [...(p.pairs || []), { left: '', right: '' }])}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1">
                      <MdAdd className="text-sm" /> Add another pair
                    </button>
                  </div>
                )}

                {/* Multiple Choice */}
                {p.activity_type === 'multiple_choice' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-1">Question Prompt</label>
                      <input type="text" value={p.question || ''} onChange={(e) => updatePracticeBlock(p.id, 'question', e.target.value)}
                        placeholder="e.g. Which letter makes the sound 'Ha'?"
                        className="w-full rounded-lg border border-emerald-300 p-2 text-sm bg-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-900 block">Answer Options (enter each one):</label>
                      {(p.options || ['', '', '', '']).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${opt === p.correct_answer ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <input type="text" value={opt}
                            onChange={(e) => { const opts = [...(p.options || ['', '', '', ''])]; opts[oIdx] = e.target.value; updatePracticeBlock(p.id, 'options', opts); }}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white" />
                          <button onClick={() => updatePracticeBlock(p.id, 'correct_answer', opt)}
                            className={`text-xs px-2 py-1 rounded-lg font-bold border transition ${opt === p.correct_answer ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}>
                            {opt === p.correct_answer ? '✓ Correct' : 'Mark Correct'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-700">Click "Mark Correct" next to the right answer.</p>
                  </div>
                )}

                {/* Drag and Drop / Ordering */}
                {p.activity_type === 'drag_and_drop' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <p className="text-xs font-bold text-emerald-900">Items to Order — enter each item, then set the correct sequence below.</p>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-800">Items (the student will arrange these):</label>
                      {(p.items || ['', '']).map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-500 w-5">{iIdx + 1}.</span>
                          <input type="text" value={item}
                            onChange={(e) => { const it = [...(p.items || [])]; it[iIdx] = e.target.value; updatePracticeBlock(p.id, 'items', it); }}
                            placeholder={`Item ${iIdx + 1} (e.g. ሀ or Monday)`}
                            className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white font-bold" />
                          {(p.items || []).length > 2 && (
                            <button onClick={() => { const it = p.items.filter((_, i) => i !== iIdx); updatePracticeBlock(p.id, 'items', it); }}
                              className="text-rose-400 hover:text-rose-600 p-1"><MdDelete /></button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => updatePracticeBlock(p.id, 'items', [...(p.items || []), ''])}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1">
                        <MdAdd className="text-sm" /> Add another item
                      </button>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-800 block mb-1">Correct Order (comma-separated, e.g. ሀ, ለ, ሐ):</label>
                      <input type="text" value={(p.correct_order || []).join(', ')}
                        onChange={(e) => updatePracticeBlock(p.id, 'correct_order', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="ሀ, ለ, ሐ, መ"
                        className="w-full rounded-lg border border-emerald-300 p-2 text-sm bg-white" />
                      <p className="text-xs text-emerald-700 mt-1">List the items in the correct sequence.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <NavBack to={2} />
            <NavNext to={4} label="Next: Live Child Preview" />
          </div>
        </div>
      )}

      {/* ── STEP 4: PREVIEW ─────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 4: Live Child Preview</h3>
              <p className="text-sm text-slate-500 mt-1">See the lesson exactly as the child will experience it.</p>
            </div>
            <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black">Interactive Test Mode</span>
          </div>

          {contentBlocks.length === 0 && practiceBlocks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">
              <p className="text-4xl mb-2">🎨</p>
              <p className="font-semibold">No content yet. Go back to Step 2 to add learning blocks.</p>
            </div>
          ) : (
            <div className="rounded-3xl border-4 border-amber-300 shadow-2xl overflow-hidden bg-slate-900/5 p-4">
              <BasicChildLessonExperience
                lesson={{
                  id: 'preview',
                  title: info.title || 'Untitled Lesson',
                  description: info.description || '',
                  learning_objectives: info.learning_objectives || '',
                  course_title: selectedCourse?.course_title || 'Preview',
                }}
                resources={buildPreviewResources()}
                progress={{ progress_percentage: 0 }}
                onResourceCompleted={() => {}}
                onFinishLesson={() => alert('Child completed the entire lesson preview! 🎉')}
              />
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <NavBack to={3} label="Back to Practice" />
            <NavNext to={5} label="Looks Great: Save & Publish" />
          </div>
        </div>
      )}

      {/* ── STEP 5: SAVE & PUBLISH ──────────────────────────────────────── */}
      {step === 5 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800">Step 5: Save & Publish</h3>
            <p className="text-sm text-slate-500 mt-1">Everything will be saved to the database and linked to the child portal.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">Lesson Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Content Blocks', value: contentBlocks.length, color: 'orange' },
                { label: 'Practice Activities', value: practiceBlocks.length, color: 'emerald' },
                { label: 'Duration', value: `${info.estimated_duration_minutes}m`, color: 'indigo' },
                { label: 'Total Steps', value: contentBlocks.length + practiceBlocks.length, color: 'amber' },
              ].map((s) => (
                <div key={s.label} className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className={`block text-2xl font-black text-${s.color}-600`}>{s.value}</span>
                  <span className="text-xs font-bold text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Publish Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1 hover:border-emerald-500">
                  <input type="radio" name="pub_status" checked={status === 'active'} onChange={() => setStatus('active')} className="text-emerald-600" />
                  <div>
                    <span className="block text-sm font-black text-slate-800">Publish Immediately</span>
                    <span className="block text-xs text-slate-500">Visible to assigned children right away</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1 hover:border-slate-400">
                  <input type="radio" name="pub_status" checked={status === 'inactive'} onChange={() => setStatus('inactive')} className="text-slate-600" />
                  <div>
                    <span className="block text-sm font-black text-slate-800">Save as Draft</span>
                    <span className="block text-xs text-slate-500">Keep hidden from students until ready</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <NavBack to={4} label="Back to Preview" />
            <button onClick={handleSaveAndPublish} disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base rounded-xl shadow-lg hover:scale-105 transition disabled:opacity-50">
              <MdSave className="text-xl" />
              <span>{saving ? 'Saving to Database…' : status === 'active' ? 'Publish Lesson Now' : 'Save as Draft'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Fidel Family Picker Modal ── */}
      {fidelPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>✨</span> Amharic Fidel Family Studio (የአማርኛ ፊደላት)
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Select a base Fidel to preview and insert its complete 7-form family into your lesson.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFidelPickerOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 transition text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                  1. Select Base Fidel (ፊደል ምረጥ):
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                  {FIDEL_FAMILIES.map((fam) => {
                    const isSelected = fam.base === selectedFidelBase;
                    return (
                      <button
                        key={fam.base}
                        type="button"
                        onClick={() => setSelectedFidelBase(fam.base)}
                        className={`h-11 w-11 rounded-xl text-lg font-black transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-md scale-105 ring-2 ring-amber-300'
                            : 'bg-white text-slate-800 border border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                        }`}
                      >
                        {fam.base}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const currentFam = FIDEL_FAMILIES.find((f) => f.base === selectedFidelBase) || FIDEL_FAMILIES[0];
                return (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3">
                      <div>
                        <h4 className="text-base font-black text-amber-950 flex items-center gap-2">
                          <span className="text-2xl font-black text-amber-600 bg-white px-3 py-1 rounded-xl border border-amber-200">
                            {currentFam.base}
                          </span>
                          <span>የ{currentFam.base} ቤተሰብ — {currentFam.name}</span>
                        </h4>
                        <p className="text-xs text-amber-800 mt-1">
                          Consists of 7 phonetic forms: {currentFam.forms.map((f) => f.symbol).join(', ')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => insertFidelFamilyBlocks(currentFam)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2.5 text-sm font-black shadow-md hover:scale-102 transition"
                      >
                        <span>⚡</span>
                        <span>Insert All 7 '{currentFam.base}' Forms</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                      {currentFam.forms.map((f, i) => (
                        <div
                          key={f.symbol}
                          className="bg-white rounded-xl p-3 border border-amber-200 text-center shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              {i + 1}. {f.order}
                            </span>
                            <div className="text-3xl font-black text-slate-800 my-2">{f.symbol}</div>
                            <div className="text-[11px] font-semibold text-slate-500">[{f.sound}]</div>
                            <div className="mt-1 text-xs font-bold text-amber-900 truncate" title={f.word}>
                              {f.word}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate" title={f.translation}>
                              {f.translation}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => insertSingleFidelCard(f, currentFam)}
                            className="mt-2 w-full text-[10px] font-bold py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition"
                          >
                            + Single Form
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── English Alphabet Picker Modal ── */}
      {englishPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>🔤</span> English Alphabet Cards (A–Z)
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Click any letter to insert a learning card with symbol, word, and translation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnglishPickerOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 transition text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
                {ENGLISH_ALPHABET.map((item) => (
                  <button
                    key={item.letter}
                    type="button"
                    onClick={() => insertEnglishLetterCard(item)}
                    className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded-2xl text-center group transition shadow-xs"
                  >
                    <div className="text-2xl font-black text-indigo-600 group-hover:scale-110 transition">
                      {item.letter}
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1 truncate">{item.word}</div>
                    <div className="text-[10px] text-slate-500 truncate">{item.translation}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

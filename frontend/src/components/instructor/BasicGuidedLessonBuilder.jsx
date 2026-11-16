import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdArrowBack, MdArrowForward, MdCheck, MdAdd, MdDelete,
  MdTextFields, MdImage, MdAudiotrack, MdVideocam, MdStyle,
  MdExtension, MdVisibility, MdSave, MdHelpOutline, MdQuiz
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';
import BasicChildLessonExperience from '../child/BasicChildLessonExperience';

const CONTENT_TYPES = [
  { id: 'card', label: 'Learning Card', icon: MdStyle, desc: 'Fidel letter, number card, or vocabulary card with symbol & meaning' },
  { id: 'text', label: 'Text & Explanation', icon: MdTextFields, desc: 'Simple explanations, stories, or instructions' },
  { id: 'audio', label: 'Audio & Pronunciation', icon: MdAudiotrack, desc: 'Voice recording or pronunciation guide' },
  { id: 'video', label: 'Video Demonstration', icon: MdVideocam, desc: 'Short engaging educational video' },
  { id: 'image', label: 'Picture / Illustration', icon: MdImage, desc: 'Visual aid or diagram for children' },
];

const PRACTICE_TYPES = [
  { id: 'matching', label: 'Matching Pairs', desc: 'Connect matching words, pictures, or letters' },
  { id: 'counting', label: 'Counting Practice', desc: 'Count items and pick the right number' },
  { id: 'multiple_choice', label: 'Multiple Choice Practice', desc: 'Fun question with picture or text options' },
  { id: 'drag_and_drop', label: 'Letter / Word Ordering', desc: 'Put items in the correct sequence' },
];

export default function BasicGuidedLessonBuilder({ initialCourseId, courses = [], onCancel }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('active');

  // Step 1: Lesson Information
  const [info, setInfo] = useState({
    course_id: initialCourseId || (courses[0]?.course_id || ''),
    title: '',
    description: '',
    learning_objectives: '',
    estimated_duration_minutes: 15,
    order_index: 0,
  });

  // Step 2: Content Blocks
  const [contentBlocks, setContentBlocks] = useState([
    {
      id: 'block-1',
      block_type: 'card',
      title: 'Introduction Card',
      symbol: '1',
      word: 'One',
      translation: 'አንድ (And)',
      audio_url: '',
      description: 'Let us learn number one!',
    }
  ]);

  // Step 3: Practice Activities
  const [practiceBlocks, setPracticeBlocks] = useState([
    {
      id: 'practice-1',
      activity_type: 'counting',
      title: 'Count the Objects',
      instructions: 'How many stars do you see?',
      question: 'Count the items on screen',
      item_count: 1,
      target_count: 1,
      options: ['1', '2', '3', '4'],
      correct_answer: '1',
    }
  ]);

  // Selected course object
  const selectedCourse = courses.find((c) => String(c.course_id) === String(info.course_id));

  // Add a new content block
  const addContentBlock = (type) => {
    const newId = `block-${Date.now()}`;
    let newBlock = {
      id: newId,
      block_type: type,
      title: '',
      description: '',
    };

    if (type === 'card') {
      newBlock.symbol = 'A';
      newBlock.word = 'Apple';
      newBlock.translation = '';
      newBlock.audio_url = '';
    } else if (type === 'text') {
      newBlock.title = 'Lesson Story';
      newBlock.content = 'Once upon a time...';
    } else if (type === 'audio') {
      newBlock.title = 'Listen & Repeat';
      newBlock.audio_url = '';
      newBlock.transcript = 'Listen to the sound and say it loud!';
    } else if (type === 'video') {
      newBlock.title = 'Fun Song Video';
      newBlock.video_url = '';
      newBlock.instructions = 'Watch and sing along!';
    } else if (type === 'image') {
      newBlock.title = 'Picture Vocabulary';
      newBlock.file_url = '';
      newBlock.caption = '';
    }

    setContentBlocks([...contentBlocks, newBlock]);
  };

  const removeContentBlock = (id) => {
    setContentBlocks(contentBlocks.filter((b) => b.id !== id));
  };

  const updateContentBlock = (id, field, value) => {
    setContentBlocks(
      contentBlocks.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // Add practice block
  const addPracticeBlock = (type) => {
    const newId = `practice-${Date.now()}`;
    let newPractice = {
      id: newId,
      activity_type: type,
      title: type === 'matching' ? 'Match the Pairs' : type === 'counting' ? 'Counting Fun' : 'Practice Question',
      instructions: 'Choose the correct answer',
    };

    if (type === 'matching') {
      newPractice.pairs = [
        { left: '1', right: '⭐' },
        { left: '2', right: '⭐⭐' },
        { left: '3', right: '⭐⭐⭐' },
      ];
    } else if (type === 'counting') {
      newPractice.item_count = 3;
      newPractice.target_count = 3;
      newPractice.options = ['2', '3', '4', '5'];
      newPractice.correct_answer = '3';
    } else if (type === 'multiple_choice') {
      newPractice.question = 'Which letter is this?';
      newPractice.options = ['ሀ', 'ለ', 'ሐ', 'መ'];
      newPractice.correct_answer = 'ሀ';
    }

    setPracticeBlocks([...practiceBlocks, newPractice]);
  };

  const removePracticeBlock = (id) => {
    setPracticeBlocks(practiceBlocks.filter((p) => p.id !== id));
  };

  const updatePracticeBlock = (id, field, value) => {
    setPracticeBlocks(
      practiceBlocks.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Build preview resources representation for Step 4
  const buildPreviewResources = () => {
    const res = [];
    let order = 0;

    contentBlocks.forEach((b) => {
      if (b.block_type === 'card') {
        res.push({
          id: b.id,
          resource_type: 'material',
          material_type: 'learning_card',
          title: b.title || 'Learning Card',
          description: b.description || '',
          metadata: {
            symbol: b.symbol,
            word: b.word,
            translation: b.translation,
            audio_url: b.audio_url,
          },
          status: 'not_started',
        });
      } else if (b.block_type === 'text') {
        res.push({
          id: b.id,
          resource_type: 'material',
          material_type: 'text',
          title: b.title || 'Read Along',
          text_content: b.content || '',
          status: 'not_started',
        });
      } else if (b.block_type === 'audio') {
        res.push({
          id: b.id,
          resource_type: 'material',
          material_type: 'audio',
          title: b.title || 'Listen & Speak',
          file_url: b.audio_url || '',
          text_content: b.transcript || '',
          status: 'not_started',
        });
      } else if (b.block_type === 'video') {
        res.push({
          id: b.id,
          resource_type: 'video',
          title: b.title || 'Demonstration Video',
          video_url: b.video_url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          duration_seconds: 120,
          status: 'not_started',
        });
      } else if (b.block_type === 'image') {
        res.push({
          id: b.id,
          resource_type: 'material',
          material_type: 'image',
          title: b.title || 'Illustration',
          file_url: b.file_url || '',
          description: b.caption || '',
          status: 'not_started',
        });
      }
    });

    practiceBlocks.forEach((p) => {
      res.push({
        id: p.id,
        resource_type: 'activity',
        activity_type: p.activity_type,
        title: p.title || 'Fun Practice',
        instructions: p.instructions || '',
        activity_config: {
          question: p.question,
          options: p.options,
          correct_answer: p.correct_answer,
          pairs: p.pairs,
          target_count: p.target_count || p.item_count,
        },
        max_score: 10,
        status: 'not_started',
      });
    });

    return res;
  };

  // Step 5: Save & Publish
  const handleSaveAndPublish = async () => {
    setError('');
    if (!info.course_id) {
      setError('Please select a course for this lesson.');
      setStep(1);
      return;
    }
    if (!info.title.trim()) {
      setError('Please provide a lesson title in Step 1.');
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      // 1. Create Lesson
      const lessonRes = await axiosClient.post(`/courses/${info.course_id}/lessons`, {
        title: info.title.trim(),
        description: info.description.trim() || null,
        learning_objectives: info.learning_objectives.trim() || null,
        estimated_duration_minutes: Number(info.estimated_duration_minutes) || 15,
        order_index: Number(info.order_index) || 0,
        status,
        difficulty_level: 'beginner',
      });
      const newLesson = lessonRes.data.lesson;

      // 2. Create Content Blocks (Materials & Videos)
      for (const block of contentBlocks) {
        if (block.block_type === 'video') {
          await axiosClient.post(`/lessons/${newLesson.id}/videos`, {
            title: block.title.trim() || 'Video Lesson',
            video_url: block.video_url.trim() || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            duration_seconds: 120,
          });
        } else if (block.block_type === 'card') {
          await axiosClient.post(`/lessons/${newLesson.id}/materials`, {
            title: block.title.trim() || `Card: ${block.symbol || block.word}`,
            description: block.description || null,
            type: 'other',
            content: block.description || `${block.symbol || ''} - ${block.word || ''} - ${block.translation || ''}`,
            metadata: {
              type: 'learning_card',
              symbol: block.symbol,
              word: block.word,
              translation: block.translation,
              audio_url: block.audio_url,
            },
          });
        } else if (block.block_type === 'text') {
          await axiosClient.post(`/lessons/${newLesson.id}/materials`, {
            title: block.title.trim() || 'Reading Section',
            description: block.description || null,
            type: 'document',
            content: block.content || '',
            metadata: { type: 'text_block' },
          });
        } else if (block.block_type === 'audio') {
          await axiosClient.post(`/lessons/${newLesson.id}/materials`, {
            title: block.title.trim() || 'Audio Pronunciation',
            description: block.transcript || null,
            type: 'audio',
            file_url: block.audio_url || null,
            content: block.transcript || '',
            metadata: { type: 'audio_block' },
          });
        } else if (block.block_type === 'image') {
          await axiosClient.post(`/lessons/${newLesson.id}/materials`, {
            title: block.title.trim() || 'Illustration',
            description: block.caption || null,
            type: 'image',
            file_url: block.file_url || null,
            metadata: { type: 'image_block' },
          });
        }
      }

      // 3. Create Practice Activities
      for (const p of practiceBlocks) {
        const config = {
          question: p.question || p.instructions,
          options: p.options || [],
          correct_answer: p.correct_answer,
          pairs: p.pairs || [],
          target_count: p.target_count || p.item_count || 1,
        };

        await axiosClient.post(`/lessons/${newLesson.id}/activities`, {
          title: p.title.trim() || 'Fun Practice',
          activity_type: p.activity_type,
          instructions: p.instructions || 'Follow the instructions to complete the exercise',
          activity_config: config,
          max_score: 10,
          auto_gradable: true,
        });
      }

      // Done! Navigate to lesson detail page
      navigate(`/instructor/courses/${newLesson.course_id}/lessons/${newLesson.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lesson and content');
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto my-6">
      {/* Top Banner / Stepper Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              Guided Lesson Builder · Basic Levels (KG1 - Grade 2)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black drop-shadow-sm">
              Create an Interactive Child Lesson
            </h2>
            <p className="text-white/90 text-sm mt-1">
              Build an engaging visual learning experience without complex traditional tabs.
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm backdrop-blur transition"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Stepper Wizard Bar */}
        <div className="mt-8 grid grid-cols-5 gap-2 text-center text-xs font-bold">
          {[
            { n: 1, label: '1. Info' },
            { n: 2, label: '2. Content' },
            { n: 3, label: '3. Practice' },
            { n: 4, label: '4. Preview' },
            { n: 5, label: '5. Publish' },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => setStep(s.n)}
              className={`py-2 rounded-xl transition flex flex-col items-center gap-1 ${
                step === s.n
                  ? 'bg-white text-orange-600 shadow-lg font-black scale-105'
                  : step > s.n
                  ? 'bg-white/30 text-white hover:bg-white/40'
                  : 'bg-black/10 text-white/60 hover:bg-black/20'
              }`}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-xs uppercase font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: LESSON INFORMATION */}
      {step === 1 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800">Step 1: Lesson Details & Curriculum Level</h3>
            <p className="text-sm text-slate-500">
              Provide foundational information for this lesson and assign it to your visual-tier course.
            </p>
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
                  Target Curriculum: {selectedCourse.grade_level_name || 'Basic Tier'} · {selectedCourse.subject_name || 'Core'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Lesson Order / Sequence</label>
              <input
                type="number"
                min="0"
                value={info.order_index}
                onChange={(e) => setInfo({ ...info, order_index: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:ring-2 focus:ring-orange-400 focus:outline-none"
                placeholder="0"
              />
              <p className="text-xs text-slate-400">Position of this lesson inside the course (0 = first)</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Lesson Title *</label>
              <input
                type="text"
                value={info.title}
                onChange={(e) => setInfo({ ...info, title: e.target.value })}
                placeholder="e.g. Counting Numbers 1 to 5, or Amharic Fidel: የ 'ሀ' ቤተሰብ"
                className="w-full rounded-xl border border-slate-300 p-3 text-base font-bold text-slate-800 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Child-Friendly Description</label>
              <textarea
                rows={2}
                value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                placeholder="A warm, encouraging welcome message for young learners..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Learning Objectives</label>
              <input
                type="text"
                value={info.learning_objectives}
                onChange={(e) => setInfo({ ...info, learning_objectives: e.target.value })}
                placeholder="e.g. Recognize and pronounce character 'ሀ', count up to 5 items"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-700 focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Estimated Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={info.estimated_duration_minutes}
                onChange={(e) => setInfo({ ...info, estimated_duration_minutes: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:ring-2 focus:ring-orange-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                if (!info.title.trim()) {
                  setError('Please fill in the lesson title');
                  return;
                }
                setStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl shadow hover:scale-105 transition"
            >
              <span>Next: Add Learning Content</span>
              <MdArrowForward />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONTENT BLOCKS LIBRARY */}
      {step === 2 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 2: Add Learning Content Items</h3>
              <p className="text-sm text-slate-500">
                Choose visual cards, characters, audio, or video blocks. The child will see them in this exact order.
              </p>
            </div>
            <div className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full">
              {contentBlocks.length} Content Block{contentBlocks.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Block Library Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              ➕ Add a Content Block to the Sequence:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {CONTENT_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => addContentBlock(t.id)}
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 shadow-xs transition group"
                  >
                    <Icon className="text-2xl text-orange-500 group-hover:scale-110 transition" />
                    <span className="text-xs font-extrabold text-slate-800 mt-1">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configurable Form for each block */}
          <div className="space-y-4">
            {contentBlocks.map((b, idx) => (
              <div
                key={b.id}
                className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                      {b.block_type.toUpperCase()} BLOCK
                    </span>
                    <input
                      type="text"
                      value={b.title}
                      onChange={(e) => updateContentBlock(b.id, 'title', e.target.value)}
                      placeholder="Block title..."
                      className="font-bold text-slate-800 text-sm border-b border-dashed border-slate-300 focus:outline-none focus:border-orange-500 px-1"
                    />
                  </div>
                  <button
                    onClick={() => removeContentBlock(b.id)}
                    className="text-rose-500 hover:text-rose-700 text-sm p-1 rounded hover:bg-rose-50"
                    title="Remove block"
                  >
                    <MdDelete className="text-lg" />
                  </button>
                </div>

                {/* Specific Block Fields */}
                {b.block_type === 'card' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                    <div>
                      <label className="text-xs font-bold text-amber-900 block mb-1">
                        Symbol / Character / Number
                      </label>
                      <input
                        type="text"
                        value={b.symbol || ''}
                        onChange={(e) => updateContentBlock(b.id, 'symbol', e.target.value)}
                        placeholder="e.g. ሀ or 1 or A"
                        className="w-full text-center text-3xl font-black rounded-lg border border-amber-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-amber-900 block mb-1">Word / Spoken Text</label>
                      <input
                        type="text"
                        value={b.word || ''}
                        onChange={(e) => updateContentBlock(b.id, 'word', e.target.value)}
                        placeholder="e.g. ሀብታም or Apple"
                        className="w-full font-bold rounded-lg border border-amber-300 p-2 bg-white text-sm"
                      />
                      <label className="text-xs font-bold text-amber-900 block mt-2 mb-1">Translation / Meaning</label>
                      <input
                        type="text"
                        value={b.translation || ''}
                        onChange={(e) => updateContentBlock(b.id, 'translation', e.target.value)}
                        placeholder="e.g. Wealthy or Fruit"
                        className="w-full rounded-lg border border-amber-300 p-2 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-amber-900 block mb-1">Audio / Voice Guide</label>
                      <input
                        type="text"
                        value={b.audio_url || ''}
                        onChange={(e) => updateContentBlock(b.id, 'audio_url', e.target.value)}
                        placeholder="Optional audio URL..."
                        className="w-full rounded-lg border border-amber-300 p-2 bg-white text-xs"
                      />
                      <p className="text-[11px] text-amber-700 mt-2 font-medium">
                        💡 If left empty, the hub automatically uses speech synthesis to pronounce the letter/number!
                      </p>
                    </div>
                  </div>
                )}

                {b.block_type === 'text' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">Story / Text Instruction</label>
                    <textarea
                      rows={3}
                      value={b.content || ''}
                      onChange={(e) => updateContentBlock(b.id, 'content', e.target.value)}
                      placeholder="Write friendly instructions or a short story for young children..."
                      className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                )}

                {b.block_type === 'audio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Audio File URL</label>
                      <input
                        type="text"
                        value={b.audio_url || ''}
                        onChange={(e) => updateContentBlock(b.id, 'audio_url', e.target.value)}
                        placeholder="https://... or uploaded file"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Spoken Transcript / Prompt</label>
                      <input
                        type="text"
                        value={b.transcript || ''}
                        onChange={(e) => updateContentBlock(b.id, 'transcript', e.target.value)}
                        placeholder="Listen and say: ሀ!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {b.block_type === 'video' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Video URL (YouTube or Vimeo)</label>
                      <input
                        type="text"
                        value={b.video_url || ''}
                        onChange={(e) => updateContentBlock(b.id, 'video_url', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Watch Instructions</label>
                      <input
                        type="text"
                        value={b.instructions || ''}
                        onChange={(e) => updateContentBlock(b.id, 'instructions', e.target.value)}
                        placeholder="Watch the song and dance along!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {b.block_type === 'image' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Image URL</label>
                      <input
                        type="text"
                        value={b.file_url || ''}
                        onChange={(e) => updateContentBlock(b.id, 'file_url', e.target.value)}
                        placeholder="https://... or image link"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Caption / Description</label>
                      <input
                        type="text"
                        value={b.caption || ''}
                        onChange={(e) => updateContentBlock(b.id, 'caption', e.target.value)}
                        placeholder="Look at this friendly lion!"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              <MdArrowBack /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl shadow hover:scale-105 transition"
            >
              <span>Next: Add Practice Activities</span>
              <MdArrowForward />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ADD PRACTICE & INTERACTIVE EXERCISES */}
      {step === 3 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 3: Add Age-Appropriate Practice</h3>
              <p className="text-sm text-slate-500">
                Engaging interactive games and exercises without heavy examination pressure.
              </p>
            </div>
            <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full">
              {practiceBlocks.length} Practice Activit{practiceBlocks.length === 1 ? 'y' : 'ies'}
            </div>
          </div>

          {/* Practice Library selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              ➕ Add an Interactive Activity:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRACTICE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => addPracticeBlock(t.id)}
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 shadow-xs transition text-left"
                >
                  <span className="block text-xs font-black text-slate-800">{t.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-1">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Configurable form for activities */}
          <div className="space-y-4">
            {practiceBlocks.map((p, idx) => (
              <div
                key={p.id}
                className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      {p.activity_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) => updatePracticeBlock(p.id, 'title', e.target.value)}
                      placeholder="Activity title..."
                      className="font-bold text-slate-800 text-sm border-b border-dashed border-slate-300 focus:outline-none focus:border-emerald-500 px-1"
                    />
                  </div>
                  <button
                    onClick={() => removePracticeBlock(p.id)}
                    className="text-rose-500 hover:text-rose-700 text-sm p-1 rounded hover:bg-rose-50"
                  >
                    <MdDelete className="text-lg" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Instructions for Child</label>
                  <input
                    type="text"
                    value={p.instructions}
                    onChange={(e) => updatePracticeBlock(p.id, 'instructions', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="e.g. Tap the star to count, or match the letter with the picture!"
                  />
                </div>

                {/* Counting configuration */}
                {p.activity_type === 'counting' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-1">Number of Items to Show</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={p.target_count || p.item_count || 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updatePracticeBlock(p.id, 'target_count', val);
                          updatePracticeBlock(p.id, 'correct_answer', String(val));
                        }}
                        className="w-full rounded-lg border border-emerald-300 p-2 text-center text-xl font-bold bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-emerald-900 block mb-1">
                        Multiple Choice Options (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={(p.options || []).join(', ')}
                        onChange={(e) =>
                          updatePracticeBlock(
                            p.id,
                            'options',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="1, 2, 3, 4"
                        className="w-full rounded-lg border border-emerald-300 p-2 text-sm font-semibold bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Matching pairs configuration */}
                {p.activity_type === 'matching' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <p className="text-xs font-bold text-emerald-900">Matching Pairs (Left connects to Right):</p>
                    {(p.pairs || []).map((pair, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={pair.left}
                          onChange={(e) => {
                            const newPairs = [...p.pairs];
                            newPairs[pIdx].left = e.target.value;
                            updatePracticeBlock(p.id, 'pairs', newPairs);
                          }}
                          placeholder="Left item (e.g. ሀ)"
                          className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white font-bold text-center"
                        />
                        <span className="text-emerald-700 font-bold">⇄</span>
                        <input
                          type="text"
                          value={pair.right}
                          onChange={(e) => {
                            const newPairs = [...p.pairs];
                            newPairs[pIdx].right = e.target.value;
                            updatePracticeBlock(p.id, 'pairs', newPairs);
                          }}
                          placeholder="Right item (e.g. ሀብታም)"
                          className="flex-1 rounded-lg border border-emerald-300 p-2 text-sm bg-white font-bold text-center"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newPairs = [...(p.pairs || []), { left: '', right: '' }];
                        updatePracticeBlock(p.id, 'pairs', newPairs);
                      }}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      + Add another pair
                    </button>
                  </div>
                )}

                {/* Multiple choice practice */}
                {p.activity_type === 'multiple_choice' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-1">Question Prompt</label>
                      <input
                        type="text"
                        value={p.question || ''}
                        onChange={(e) => updatePracticeBlock(p.id, 'question', e.target.value)}
                        placeholder="e.g. Which letter makes the sound 'Ha'?"
                        className="w-full rounded-lg border border-emerald-300 p-2 text-sm bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-emerald-900 block mb-1">Options (comma-separated)</label>
                        <input
                          type="text"
                          value={(p.options || []).join(', ')}
                          onChange={(e) =>
                            updatePracticeBlock(
                              p.id,
                              'options',
                              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                            )
                          }
                          placeholder="ሀ, ለ, ሐ, መ"
                          className="w-full rounded-lg border border-emerald-300 p-2 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-emerald-900 block mb-1">Correct Answer</label>
                        <input
                          type="text"
                          value={p.correct_answer || ''}
                          onChange={(e) => updatePracticeBlock(p.id, 'correct_answer', e.target.value)}
                          placeholder="ሀ"
                          className="w-full rounded-lg border border-emerald-300 p-2 text-sm font-bold bg-white text-emerald-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              <MdArrowBack /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl shadow hover:scale-105 transition"
            >
              <span>Next: Live Child Preview</span>
              <MdArrowForward />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW AS CHILD */}
      {step === 4 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Step 4: Live Child Simulation</h3>
              <p className="text-sm text-slate-500">
                Experience the lesson exactly as the child will see it before publishing!
              </p>
            </div>
            <div className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black">
              Interactive Test Mode
            </div>
          </div>

          {/* Embedded live player */}
          <div className="rounded-3xl border-4 border-amber-300 shadow-2xl overflow-hidden bg-slate-900/5 p-4">
            <BasicChildLessonExperience
              lesson={{
                id: 'preview',
                title: info.title || 'Untitled Lesson',
                description: info.description || '',
                learning_objectives: info.learning_objectives || '',
                course_title: selectedCourse?.course_title || 'Visual Tier Course',
              }}
              resources={buildPreviewResources()}
              progress={{ progress_percentage: 0 }}
              onResourceCompleted={() => {}}
              onFinishLesson={() => alert('Child completed the entire preview sequence! 🎉')}
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              <MdArrowBack /> Back to Practice
            </button>
            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-xl shadow hover:scale-105 transition"
            >
              <span>Looks Great: Save & Publish</span>
              <MdArrowForward />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SAVE & PUBLISH */}
      {step === 5 && (
        <div className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800">Step 5: Save & Publish</h3>
            <p className="text-sm text-slate-500">
              Confirm publication status. Everything you created will immediately be saved to the database and linked to the child portal.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">Lesson Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-orange-600">{contentBlocks.length}</span>
                <span className="text-xs font-bold text-slate-500">Content Blocks</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-emerald-600">{practiceBlocks.length}</span>
                <span className="text-xs font-bold text-slate-500">Practice Activities</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-indigo-600">{info.estimated_duration_minutes}m</span>
                <span className="text-xs font-bold text-slate-500">Duration</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="block text-2xl font-black text-amber-600">{contentBlocks.length + practiceBlocks.length}</span>
                <span className="text-xs font-bold text-slate-500">Total Steps</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Publish Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1 hover:border-emerald-500">
                  <input
                    type="radio"
                    name="pub_status"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="text-emerald-600"
                  />
                  <div>
                    <span className="block text-sm font-black text-slate-800">Publish Immediately</span>
                    <span className="block text-xs text-slate-500">Visible to assigned children right away</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1 hover:border-slate-400">
                  <input
                    type="radio"
                    name="pub_status"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="text-slate-600"
                  />
                  <div>
                    <span className="block text-sm font-black text-slate-800">Save as Draft</span>
                    <span className="block text-xs text-slate-500">Keep hidden from students until ready</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              <MdArrowBack /> Back to Preview
            </button>
            <button
              onClick={handleSaveAndPublish}
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base rounded-xl shadow-lg hover:scale-105 transition disabled:opacity-50"
            >
              <MdSave className="text-xl" />
              <span>{saving ? 'Saving Everything to Database...' : status === 'active' ? 'Publish Lesson Now' : 'Save as Draft'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


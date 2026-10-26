import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MdArrowBack,
  MdSave,
  MdPublish,
  MdVisibility,
  MdPlayArrow,
  MdPause,
  MdRefresh,
  MdFlag,
  MdArrowUpward,
  MdArrowDownward,
  MdDeleteOutline,
  MdCheckCircle,
  MdWarning,
  MdSearch,
  MdVolumeUp,
  MdClose,
  MdHeadphones,
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';
import Layout from '../../components/Layout';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function InstructorFidelAuthoring() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const defaultCourseId = searchParams.get('courseId');

  const isEditing = Boolean(lessonId);

  // Form State
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');

  // Catalogue & Family Selection State
  const [catalogueFamilies, setCatalogueFamilies] = useState([]);
  const [familySearch, setFamilySearch] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState([]); // Array of { id, family_name, base_character, forms: [...] }

  // Practice Settings
  const [activitiesEnabled, setActivitiesEnabled] = useState([
    'listen_explore',
    'listen_identify',
    'sound_match',
    'quiz',
  ]);
  const [listeningRequiredFirst, setListeningRequiredFirst] = useState(true);
  const [requireAllAudioReady, setRequireAllAudioReady] = useState(true);

  // Audio preview state
  const [playingCharacterId, setPlayingCharacterId] = useState(null);
  const [audioLoadingId, setAudioLoadingId] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const audioRef = useRef(new Audio());

  // Report Issue Modal
  const [reportingAsset, setReportingAsset] = useState(null);
  const [issueType, setIssueType] = useState('vowel_sound');
  const [issueDescription, setIssueDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Child Preview Modal
  const [showChildPreview, setShowChildPreview] = useState(false);
  const [previewFamilyIndex, setPreviewFamilyIndex] = useState(0);

  // Status & UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Audio cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    audio.onended = () => setPlayingCharacterId(null);
    audio.onerror = () => {
      setPlayingCharacterId(null);
      setAudioLoadingId(null);
    };
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Initial Data Fetching
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // 1. Fetch assigned courses
        const coursesRes = await axiosClient.get('/courses?mine=true');
        const myCourses = coursesRes.data.courses || [];
        setCourses(myCourses);

        if (!selectedCourseId && myCourses.length > 0) {
          const amh = myCourses.find(c => c.subject_name === 'Amharic' || c.title?.includes('Amharic'));
          setSelectedCourseId(amh ? amh.id : myCourses[0].id);
        }

        // 2. Fetch full catalogue of fidel families
        const catRes = await axiosClient.get('/fidel-families');
        setCatalogueFamilies(catRes.data.families || []);

        // 3. If editing existing lesson, fetch lesson detail
        if (isEditing) {
          const detailRes = await axiosClient.get(`/instructor/fidel-lessons/${lessonId}`);
          const data = detailRes.data;
          const l = data.lesson;
          setTitle(l.title || '');
          setDescription(l.description || '');
          setLearningObjectives(l.learning_objectives || '');
          setSelectedCourseId(l.course_id);

          if (l.activities_enabled) setActivitiesEnabled(l.activities_enabled);
          if (l.listening_required_first !== undefined) setListeningRequiredFirst(l.listening_required_first);
          if (l.require_all_audio_ready !== undefined) setRequireAllAudioReady(l.require_all_audio_ready);

          // Populate selected families with their loaded forms
          setSelectedFamilies(data.families || []);
        }
      } catch (err) {
        console.error('Error loading authoring data:', err);
        setError('Failed to load lesson authoring information.');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [lessonId]);

  // When instructor toggles a family in the catalogue
  async function toggleFamilySelection(family) {
    const alreadySelected = selectedFamilies.some(f => String(f.id) === String(family.id));

    if (alreadySelected) {
      // Remove family
      setSelectedFamilies(prev => prev.filter(f => String(f.id) !== String(family.id)));
    } else {
      // Fetch 7 forms for this family from catalogue endpoint
      try {
        const res = await axiosClient.get(`/fidel-families/${family.id}`);
        const forms = res.data.forms || [];
        setSelectedFamilies(prev => [
          ...prev,
          {
            id: family.id,
            family_name: family.family_name,
            base_character: family.base_character,
            description: family.description,
            forms,
          },
        ]);
      } catch (err) {
        console.error('Failed to load forms for family:', err);
        setError(`Failed to retrieve forms for family ${family.family_name}`);
      }
    }
  }

  // Reorder families
  function moveFamily(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedFamilies.length) return;
    const copy = [...selectedFamilies];
    const item = copy.splice(index, 1)[0];
    copy.splice(newIndex, 0, item);
    setSelectedFamilies(copy);
  }

  // Audio Playback
  async function playCharacterAudio(form) {
    if (playingCharacterId === form.id) {
      audioRef.current.pause();
      setPlayingCharacterId(null);
      return;
    }

    setAudioLoadingId(form.id);
    try {
      let audioUrl = form.audio_url;

      // If no audio_url ready yet, request preview generation from backend
      if (!audioUrl) {
        const genRes = await axiosClient.post(
          `/instructor/fidel-characters/${form.id}/audio-preview`
        );
        audioUrl = genRes.data.asset?.audio_url;
        form.audio_url = audioUrl;
      }

      if (audioUrl) {
        const fullUrl = resolveFileUrl(audioUrl);
        audioRef.current.src = fullUrl;
        await audioRef.current.play();
        setPlayingCharacterId(form.id);
      }
    } catch (err) {
      console.error('Audio playback failed:', err);
      setError(`Audio preview failed for character ${form.character}`);
    } finally {
      setAudioLoadingId(null);
    }
  }

  // Retry Failed Audio
  async function retryAudio(form) {
    setAudioLoadingId(form.id);
    try {
      const res = await axiosClient.post(
        `/instructor/fidel-characters/${form.id}/audio-preview`,
        { force: true }
      );
      if (res.data.asset?.audio_url) {
        form.audio_url = res.data.asset.audio_url;
        form.generation_status = 'ready';
        setMessage(`Audio regenerated for ${form.character}!`);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setError(`Failed to regenerate audio for ${form.character}: ${err.message}`);
    } finally {
      setAudioLoadingId(null);
    }
  }

  // Submit Pronunciation Issue Report
  async function submitReport() {
    if (!reportingAsset) return;
    setReportSubmitting(true);
    try {
      await axiosClient.post(
        `/instructor/fidel-audio-assets/${reportingAsset.assetId}/report-issue`,
        {
          issue_type: issueType,
          description: issueDescription,
        }
      );
      setMessage('Pronunciation issue reported to administrator for review.');
      setReportingAsset(null);
      setIssueDescription('');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError('Failed to submit issue report.');
    } finally {
      setReportSubmitting(false);
    }
  }

  // Save Lesson (Draft or Publish)
  async function handleSave(publishNow = false) {
    if (!title.trim()) {
      setError('Please provide a lesson title');
      return;
    }
    if (selectedFamilies.length === 0) {
      setError('Please select at least one fidel family');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      learning_objectives: learningObjectives.trim(),
      family_ids: selectedFamilies.map(f => f.id),
      practice_settings: {
        activities_enabled: activitiesEnabled,
        listening_required_first: listeningRequiredFirst,
        require_all_audio_ready: requireAllAudioReady,
      },
      publish_now: publishNow,
    };

    try {
      if (isEditing) {
        await axiosClient.put(`/instructor/fidel-lessons/${lessonId}`, payload);
        if (publishNow) {
          await axiosClient.post(`/instructor/fidel-lessons/${lessonId}/publish`);
        }
        setMessage(`Lesson successfully ${publishNow ? 'published' : 'saved'}!`);
      } else {
        const res = await axiosClient.post(
          `/instructor/courses/${selectedCourseId}/fidel-lessons`,
          payload
        );
        const newId = res.data.lesson.id;
        if (publishNow) {
          await axiosClient.post(`/instructor/fidel-lessons/${newId}/publish`);
        }
        setMessage(`Lesson successfully ${publishNow ? 'published' : 'created'}!`);
      }

      setTimeout(() => {
        navigate('/instructor/fidel-lessons');
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      setError(err.response?.data?.error || 'Failed to save lesson');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));
  const filteredCatalogue = catalogueFamilies.filter(f => {
    if (!familySearch.trim()) return true;
    const q = familySearch.toLowerCase();
    return (
      f.family_name?.toLowerCase().includes(q) ||
      f.base_character?.includes(q) ||
      f.description?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout title={isEditing ? 'Edit Fidel Lesson' : 'Create Fidel Lesson'} role="instructor">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/instructor/fidel-lessons')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors"
          >
            <MdArrowBack className="text-lg" />
            <span>Back to Lessons</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChildPreview(true)}
              disabled={selectedFamilies.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <MdVisibility className="text-base" />
              <span>Child Preview</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <MdSave className="text-base" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              <MdPublish className="text-base" />
              <span>Publish Lesson</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-sm flex items-center gap-2">
            <MdCheckCircle className="text-lg text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 font-medium text-sm flex items-center gap-2">
            <MdWarning className="text-lg text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Course & Basic Lesson Info */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Step 1 of 5
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Course & Lesson Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your assigned course and define early literacy objectives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Course:
              </label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                disabled={isEditing}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Grade / Curriculum Level:
              </label>
              <input
                type="text"
                readOnly
                value={selectedCourse?.grade_level_name || 'Kindergarten 1'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Subject:
              </label>
              <input
                type="text"
                readOnly
                value={selectedCourse?.subject_name || 'Amharic'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Lesson Title: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Let's Learn the Ha Family (የሀ ፊደላት)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Lesson Description:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Short description for young children and parents..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Learning Objectives:
                </label>
                <textarea
                  rows={3}
                  value={learningObjectives}
                  onChange={e => setLearningObjectives(e.target.value)}
                  placeholder="Identify all seven forms and reproduce correct pronunciation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: Fidel Family Catalogue Selector */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
                Step 2 & 3 of 5
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                Select Fidel Families
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click a family from the approved curriculum catalogue. All 7 forms are included automatically.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                value={familySearch}
                onChange={e => setFamilySearch(e.target.value)}
                placeholder="Search families (ሀ, ለ, መ)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Families Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-3 max-h-64 overflow-y-auto p-1">
            {filteredCatalogue.map(fam => {
              const isSelected = selectedFamilies.some(f => String(f.id) === String(fam.id));
              return (
                <button
                  type="button"
                  key={fam.id}
                  onClick={() => toggleFamilySelection(fam)}
                  className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all transform active:scale-95 ${
                    isSelected
                      ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                      : 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-800'
                  }`}
                >
                  <span className="text-2xl font-black">{fam.base_character}</span>
                  <span className="text-[10px] font-semibold opacity-75">
                    {isSelected ? 'Selected' : '7 forms'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* STEP 3 & 4: Selected Families, Seven Forms & Pronunciation Preview */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Step 4 of 5
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Included Families & 7-Form Pronunciation Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reorder families using arrows. Click the speaker button to preview actual Amharic TTS pronunciation.
            </p>
          </div>

          {selectedFamilies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-sm">No fidel families selected yet. Pick one from the grid above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {selectedFamilies.map((fam, famIndex) => (
                <div
                  key={fam.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-4"
                >
                  {/* Family Header & Controls */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-black text-2xl flex items-center justify-center shadow-sm">
                        {fam.base_character}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">
                          The {fam.base_character} Family
                        </h4>
                        <span className="text-xs text-slate-400">
                          Curriculum Order #{famIndex + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveFamily(famIndex, -1)}
                        disabled={famIndex === 0}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        title="Move Up"
                      >
                        <MdArrowUpward className="text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFamily(famIndex, 1)}
                        disabled={famIndex === selectedFamilies.length - 1}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                        title="Move Down"
                      >
                        <MdArrowDownward className="text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFamilySelection(fam)}
                        className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors ml-2"
                        title="Remove Family"
                      >
                        <MdDeleteOutline className="text-base" />
                      </button>
                    </div>
                  </div>

                  {/* Seven Forms Preview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                    {fam.forms?.map(form => {
                      const isPlaying = playingCharacterId === form.id;
                      const isLoading = audioLoadingId === form.id;

                      return (
                        <div
                          key={form.id}
                          className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-col items-center justify-between text-center gap-2 group hover:border-amber-400 transition-all"
                        >
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Order {form.display_order} ({form.character_name})
                          </span>

                          <div className="text-3xl font-black text-slate-900 my-1 group-hover:scale-110 transition-transform">
                            {form.character}
                          </div>

                          <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-around">
                            {/* Play Button */}
                            <button
                              type="button"
                              onClick={() => playCharacterAudio(form)}
                              disabled={isLoading}
                              className={`p-2 rounded-xl transition-all ${
                                isPlaying
                                  ? 'bg-amber-600 text-white animate-pulse'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                              }`}
                              title="Preview Speech Pronunciation"
                            >
                              {isLoading ? (
                                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                              ) : isPlaying ? (
                                <MdPause className="text-base" />
                              ) : (
                                <MdVolumeUp className="text-base" />
                              )}
                            </button>

                            {/* Retry if failed */}
                            <button
                              type="button"
                              onClick={() => retryAudio(form)}
                              disabled={isLoading}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Regenerate Audio"
                            >
                              <MdRefresh className="text-sm" />
                            </button>

                            {/* Flag Issue */}
                            <button
                              type="button"
                              onClick={() =>
                                setReportingAsset({
                                  assetId: form.audio_asset_id,
                                  character: form.character,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Flag Pronunciation Issue"
                            >
                              <MdFlag className="text-sm" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STEP 5: Practice & Progression Settings */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
              Step 5 of 5
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Practice & Sequential Learning Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize which activities young learners will complete for this lesson.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Included Learning Activities:
              </label>

              {[
                { id: 'listen_explore', label: 'Listen & Explore (Free audio tap on all 7 forms)' },
                { id: 'listen_identify', label: 'Listen & Identify (Audio prompt matching)' },
                { id: 'sound_match', label: 'Sound to Character Challenge' },
                { id: 'quiz', label: 'Short Fidel Quiz Activity' },
              ].map(act => {
                const checked = activitiesEnabled.includes(act.id);
                return (
                  <label
                    key={act.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setActivitiesEnabled(prev => [...prev, act.id]);
                        } else {
                          setActivitiesEnabled(prev => prev.filter(x => x !== act.id));
                        }
                      }}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">{act.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Progression & Audio Policy:
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={listeningRequiredFirst}
                  onChange={e => setListeningRequiredFirst(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Require Listening Exploration Before Practice
                  </span>
                  <span className="text-xs text-slate-500">
                    Children must tap each character to listen before unlocking matching activities.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireAllAudioReady}
                  onChange={e => setRequireAllAudioReady(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Require All Audio Ready Before Publishing
                  </span>
                  <span className="text-xs text-slate-500">
                    Guarantees every character has cached speech ready before children can access.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            Publish Lesson
          </button>
        </div>

        {/* REPORT ISSUE MODAL */}
        {reportingAsset && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <MdFlag className="text-rose-500" />
                  <span>Report Pronunciation Issue</span>
                </h3>
                <button
                  onClick={() => setReportingAsset(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <MdClose className="text-xl" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Flagging character <span className="font-bold text-slate-800">{reportingAsset.character}</span> for administrator pronunciation review.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Issue Type:
                </label>
                <select
                  value={issueType}
                  onChange={e => setIssueType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-semibold"
                >
                  <option value="vowel_sound">Vowel Sound / Order Length Incorrect</option>
                  <option value="glottal_stop">Consonant Sound / Ejective Mispronounced</option>
                  <option value="clipped_audio">Audio Clipped or Inaudible</option>
                  <option value="speed_cadence">Cadence Too Fast for Early Literacy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Details / Suggested Phonetic Spelling:
                </label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Describe the discrepancy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingAsset(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={reportSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm"
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHILD PREVIEW MODAL */}
        {showChildPreview && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl border-4 border-amber-300 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowChildPreview(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 shadow-sm"
              >
                <MdClose className="text-xl" />
              </button>

              <div className="text-center space-y-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 font-black text-xs">
                  <MdHeadphones className="text-sm" />
                  CHILD VIEW PREVIEW
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                  {title || "Let's Learn Amharic Fidel"}
                </h2>
                {selectedFamilies[previewFamilyIndex] && (
                  <p className="text-lg font-bold text-amber-800">
                    The {selectedFamilies[previewFamilyIndex].base_character} Family
                  </p>
                )}
              </div>

              {/* Family Carousel Navigation if multiple families */}
              {selectedFamilies.length > 1 && (
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    disabled={previewFamilyIndex === 0}
                    onClick={() => setPreviewFamilyIndex(i => i - 1)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-800 disabled:opacity-30"
                  >
                    ← Previous Family
                  </button>
                  <span className="text-xs font-extrabold text-amber-900">
                    Family {previewFamilyIndex + 1} of {selectedFamilies.length}
                  </span>
                  <button
                    disabled={previewFamilyIndex === selectedFamilies.length - 1}
                    onClick={() => setPreviewFamilyIndex(i => i + 1)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-800 disabled:opacity-30"
                  >
                    Next Family →
                  </button>
                </div>
              )}

              {/* Interactive 7 Forms Grid */}
              {selectedFamilies[previewFamilyIndex] && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {selectedFamilies[previewFamilyIndex].forms?.map(form => {
                    const isPlaying = playingCharacterId === form.id;
                    return (
                      <button
                        type="button"
                        key={form.id}
                        onClick={() => playCharacterAudio(form)}
                        className={`h-36 rounded-3xl p-3 flex flex-col items-center justify-between border-4 transition-all transform active:scale-95 shadow-md ${
                          isPlaying
                            ? 'bg-amber-500 border-amber-400 text-white scale-105 shadow-amber-500/40 animate-pulse'
                            : 'bg-white hover:bg-amber-100 border-amber-200 text-slate-800'
                        }`}
                      >
                        <span className="text-xs font-black opacity-60">
                          {form.character_name}
                        </span>
                        <span className="text-4xl md:text-5xl font-black">
                          {form.character}
                        </span>
                        <div
                          className={`p-2 rounded-full ${
                            isPlaying ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <MdVolumeUp className="text-lg" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 pt-4 border-t border-amber-200/60 text-center">
                <p className="text-xs text-amber-900/70 font-medium">
                  Children tap any card to listen and repeat pronunciation as many times as they want.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

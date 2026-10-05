import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdCheck,
  MdClose,
  MdDelete,
  MdEdit,
  MdFilterList,
  MdRefresh,
  MdSearch,
  MdTranslate,
  MdSchool,
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import Modal from '../../components/Modal';
import axiosClient from '../../api/axiosClient';
import useReferenceKit, { invalidateReferenceKit } from '../../hooks/useReferenceKit';

const COMMON_EMOJIS = [
  '🦁', '🐶', '🐱', '🐎', '🐄', '🐑', '🐘', '🐒', '🦅', '🐟',
  '🍎', '🍌', '🍊', '🍋', '🍇', '🍞', '🥛', '☕', '🍯', '🌽',
  '📚', '✏️', '🏫', '⚽', '🚗', '🚲', '✈️', '🏠', '⭐', '☀️',
  '🌳', '🌺', '👶', '👨‍👩‍👧', '👕', '👟', '⏰', '🔔', '🎨', '🧩'
];

const PRESET_CATEGORIES = [
  'general',
  'animals',
  'food',
  'nature',
  'school',
  'home',
  'people',
  'clothing',
  'actions',
  'colors'
];

export default function InstructorVocabulary() {
  const { reference } = useReferenceKit();
  const fidelLetters = reference.fidel_letters || [];

  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLetter, setSelectedLetter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [form, setForm] = useState({
    word: '',
    english: '',
    emoji: '🍎',
    image_url: '',
    category: 'general',
    example_for_letter: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [deletingId, setDeletingId] = useState(null);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/reference/words');
      setWords(res.data.words || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vocabulary words');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Derived categories
  const categories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES);
    words.forEach((w) => {
      if (w.category) set.add(w.category.toLowerCase());
    });
    return Array.from(set);
  }, [words]);

  // Filtered words
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (!w.is_active && w.is_active !== undefined) return false;
      if (selectedCategory !== 'all' && (w.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (selectedLetter !== 'all' && w.example_for_letter !== selectedLetter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const amhMatch = (w.word || '').toLowerCase().includes(q);
        const engMatch = (w.english || '').toLowerCase().includes(q);
        const catMatch = (w.category || '').toLowerCase().includes(q);
        return amhMatch || engMatch || catMatch;
      }
      return true;
    });
  }, [words, selectedCategory, selectedLetter, search]);

  function openCreateModal() {
    setEditingWord(null);
    setForm({
      word: '',
      english: '',
      emoji: '🍎',
      image_url: '',
      category: 'general',
      example_for_letter: '',
    });
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(w) {
    setEditingWord(w);
    setForm({
      word: w.word || '',
      english: w.english || '',
      emoji: w.emoji || '🖼️',
      image_url: w.image_url || '',
      category: w.category || 'general',
      example_for_letter: w.example_for_letter || '',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.word.trim()) {
      setFormError('Please enter an Amharic word');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        word: form.word.trim(),
        english: form.english.trim(),
        emoji: form.emoji.trim(),
        image_url: form.image_url.trim() || null,
        category: form.category.trim() || 'general',
        example_for_letter: form.example_for_letter.trim() || form.word.trim().charAt(0),
      };

      if (editingWord) {
        await axiosClient.patch(`/reference/words/${editingWord.id}`, payload);
        setSuccessMsg(`Word "${payload.word}" updated successfully!`);
      } else {
        await axiosClient.post('/reference/words', payload);
        setSuccessMsg(`Word "${payload.word}" added to the vocabulary bank!`);
      }

      invalidateReferenceKit();
      setModalOpen(false);
      await fetchWords();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save vocabulary word');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await axiosClient.delete(`/reference/words/${id}`);
      invalidateReferenceKit();
      setSuccessMsg('Word removed from active vocabulary.');
      setDeletingId(null);
      await fetchWords();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate word');
    }
  }

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 mb-1">
              <MdSchool className="text-base" />
              <span>Curriculum Content Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight sm:text-3xl">
              Vocabulary Word Bank
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Create and manage everyday Ethiopian words, picture associations, and learning materials.
              Words added here are immediately available across the Child Home screen, Activity Builder, and quizzes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWords}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
              title="Refresh list"
            >
              <MdRefresh className={`text-lg ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition"
            >
              <MdAdd className="text-xl" />
              <span>Add New Word</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800 animate-fadeIn">
            <MdCheck className="text-xl text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-800">
            <span>{error}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Words</div>
            <div className="mt-1 text-2xl font-black text-slate-800">{words.length}</div>
            <div className="mt-1 text-xs text-indigo-600 font-medium">In curriculum database</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories</div>
            <div className="mt-1 text-2xl font-black text-purple-600">{categories.length}</div>
            <div className="mt-1 text-xs text-slate-400">Animals, Food, School...</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Matching Letters</div>
            <div className="mt-1 text-2xl font-black text-emerald-600">
              {words.filter((w) => w.example_for_letter).length}
            </div>
            <div className="mt-1 text-xs text-slate-400">Linked to Fidel characters</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered View</div>
            <div className="mt-1 text-2xl font-black text-amber-600">{filteredWords.length}</div>
            <div className="mt-1 text-xs text-slate-400">Matching current filter</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search words by Amharic, English, or category (e.g. አንበሳ, Lion)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <MdClose />
                </button>
              )}
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-2">
              <label htmlFor="cat-filter" className="text-xs font-bold text-slate-600 shrink-0">
                Category:
              </label>
              <select
                id="cat-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">All Categories ({words.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Letter Select */}
            <div className="flex items-center gap-2">
              <label htmlFor="letter-filter" className="text-xs font-bold text-slate-600 shrink-0">
                Letter:
              </label>
              <select
                id="letter-filter"
                value={selectedLetter}
                onChange={(e) => setSelectedLetter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">All Letters</option>
                {fidelLetters.map((l) => (
                  <option key={l.base_char} value={l.base_char}>
                    {l.base_char} ({l.sound})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Word Cards Grid */}
        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">Loading curriculum vocabulary...</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="text-4xl">📝</div>
            <h3 className="text-base font-bold text-slate-800">No words match your filter</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {search || selectedCategory !== 'all' || selectedLetter !== 'all'
                ? 'Try clearing the search query or category filters to see more words.'
                : 'No vocabulary words found. Click "Add New Word" to create your first teaching word!'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <MdAdd /> Add a Word
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredWords.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Top line with emoji and category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl shadow-inner group-hover:scale-105 transition-transform">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.word} className="h-full w-full object-cover rounded-2xl" />
                      ) : (
                        item.emoji || '🖼️'
                      )}
                    </div>
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
                      {item.category || 'general'}
                    </span>
                  </div>

                  {/* Amharic Word & English */}
                  <div className="mt-3">
                    <h3 className="text-xl font-black text-slate-800 tracking-wide font-ethiopic">
                      {item.word}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {item.english || '—'}
                    </p>
                  </div>

                  {/* Associated Letter */}
                  {item.example_for_letter && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                      <span>Fidel:</span>
                      <span className="text-sm font-black text-emerald-700">{item.example_for_letter}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => openEditModal(item)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <MdEdit className="text-sm" /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <MdDelete className="text-sm" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingWord ? `Edit Word: ${editingWord.word}` : 'Add New Curriculum Word'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amharic Word *
              </label>
              <input
                type="text"
                required
                value={form.word}
                onChange={(e) => setForm({ ...form, word: e.target.value })}
                placeholder="e.g. አንበሳ, መጽሐፍ, ሎሚ"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-base font-bold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                English Meaning / Translation
              </label>
              <input
                type="text"
                value={form.english}
                onChange={(e) => setForm({ ...form, english: e.target.value })}
                placeholder="e.g. Lion, Book, Lemon"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Emoji Quick Picker & Custom Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Visual Icon (Emoji or Image)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="🎨"
                  className="w-16 text-center text-2xl rounded-xl border border-slate-200 p-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <span className="text-xs text-slate-500">Pick from quick presets below or type any emoji:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                {COMMON_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setForm({ ...form, emoji: em })}
                    className={`h-8 w-8 rounded-lg text-lg flex items-center justify-center transition active:scale-90 ${
                      form.emoji === em ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white bg-slate-100'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. animals, food, school"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Example for Fidel Letter
                </label>
                <select
                  value={form.example_for_letter}
                  onChange={(e) => setForm({ ...form, example_for_letter: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— Auto from first letter —</option>
                  {fidelLetters.map((l) => (
                    <option key={l.base_char} value={l.base_char}>
                      {l.base_char} ({l.sound})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting ? 'Saving...' : editingWord ? 'Update Word' : 'Save to Word Bank'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <Modal
            isOpen={Boolean(deletingId)}
            onClose={() => setDeletingId(null)}
            title="Remove Word from Curriculum"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to deactivate this word? It will no longer appear in new activity pickers, but existing student progress and activity records will remain safe.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deletingId)}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 shadow-sm transition"
                >
                  Confirm Remove
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </InstructorLayout>
  );
}

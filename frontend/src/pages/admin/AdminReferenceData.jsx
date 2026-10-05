import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdCheck,
  MdClose,
  MdDelete,
  MdEdit,
  MdRefresh,
} from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';
import { invalidateReferenceKit } from '../../hooks/useReferenceKit';

/**
 * AdminReferenceData
 * ------------------
 * Maintenance of the four reference datasets the age 5-9 child portal is built
 * on: the Ge'ez syllabary, the Ethiopic numerals, the picture words, and the
 * encouragement phrases.
 *
 * These are deliberately NOT course content - an instructor never retypes a
 * letter's seven vowel orders, and no school should have to redeploy a website to
 * correct a syllable. They are the shared writing system and vocabulary of
 * Ethiopian early-childhood teaching, kept in tables so a mistake in them is
 * fixable by an admin in seconds.
 *
 * Deleting is a soft delete (`is_active = false`) so that a letter already used
 * by a published activity keeps resolving, and existing child progress is never
 * orphaned.
 */

// Each dataset declares its editable fields once, and the table, the form and
// the validation are all derived from that. Adding a column to the schema means
// adding one entry here, not rewriting a screen.
const DATASETS = [
  {
    kind: 'fidel',
    route: 'fidel',
    title: "Ge'ez Syllabary",
    blurb:
      'The 24 letter series of the Ethiopian writing system, each with its seven vowel orders (አድ ኡ ኢ አ ኤ እ ኦ). Teaching order is the order they appear in an Ethiopian Grade 1 primer.',
    columns: [
      { key: 'base_char', label: 'Letter', width: 'w-16' },
      { key: 'sound', label: 'Sound' },
      { key: 'syllables', label: 'Seven vowel orders' },
      { key: 'teaching_order', label: 'Order', type: 'number' },
    ],
    fields: [
      { key: 'base_char', label: 'Base character', required: true, placeholder: 'ሀ' },
      { key: 'sound', label: 'Sound', placeholder: 'ha' },
      {
        key: 'syllables',
        label: 'Vowel orders',
        type: 'syllables',
        hint: 'Seven characters separated by commas, in order',
        placeholder: 'ሀ, ሁ, ሂ, ሃ, ሄ, ህ, ሆ',
      },
      { key: 'teaching_order', label: 'Teaching order', type: 'number' },
    ],
    validate: (row) => {
      if (!row.base_char?.trim()) return 'A letter is required';
      const syl = toSyllables(row.syllables);
      if (syl && syl.length !== 7) return 'A letter needs exactly 7 vowel orders';
      return '';
    },
  },
  {
    kind: 'numerals',
    route: 'numerals',
    title: "Ge'ez Numerals",
    blurb:
      'The Ethiopic digits ፩ ፪ ፫ … ፲ as taught in Ethiopian schools. The counting game shows these glyphs unless the instructor chooses Arabic numerals.',
    columns: [
      { key: 'value', label: 'Value', type: 'number' },
      { key: 'glyph', label: 'Glyph', width: 'w-20' },
      { key: 'sound', label: 'Sound' },
    ],
    fields: [
      { key: 'value', label: 'Value', type: 'number', required: true },
      { key: 'glyph', label: 'Glyph', required: true, placeholder: '፩' },
      { key: 'sound', label: 'Sound', placeholder: 'and' },
    ],
    validate: (row) => {
      if (row.value === '' || row.value === undefined) return 'A value is required';
      if (!row.glyph?.trim()) return 'A glyph is required';
      return '';
    },
  },
  {
    kind: 'words',
    route: 'words',
    title: 'Picture Words',
    blurb:
      'Everyday words a child recognises by picture before they can read: the greeting cards, the animals, the food, the objects they count. `Example for letter` links a word to the syllabary letter it introduces, which is how the tracing and matching games get their vocabulary.',
    columns: [
      { key: 'emoji', label: '', width: 'w-12' },
      { key: 'word', label: 'Word' },
      { key: 'english', label: 'English' },
      { key: 'category', label: 'Category' },
      { key: 'example_for_letter', label: 'For letter' },
    ],
    fields: [
      { key: 'word', label: 'Amharic word', required: true, placeholder: 'ሰላም' },
      { key: 'english', label: 'English', placeholder: 'hello' },
      { key: 'emoji', label: 'Emoji', placeholder: '👋' },
      { key: 'image_url', label: 'Image URL (optional)', placeholder: '/uploads/word.png' },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        // Taken from the words already saved, not a list written here. A hardcoded
        // list silently goes stale: it once offered an "objects" category that no
        // word used while omitting the nine that words actually had, so an admin
        // editing a word was shown choices that did not match their own data.
        optionsFrom: 'category',
      },
      { key: 'example_for_letter', label: 'Example for letter', placeholder: 'ሰ' },
    ],
    validate: (row) => (row.word?.trim() ? '' : 'A word is required'),
  },
  {
    kind: 'praise',
    route: 'praise',
    title: 'Encouragement Phrases',
    blurb:
      'What the child hears when they finish something. Kept in the database so a school can use its own language and dialect rather than being stuck with what shipped in the code.',
    columns: [
      { key: 'emoji', label: '', width: 'w-12' },
      { key: 'text', label: 'Phrase' },
      { key: 'english', label: 'English' },
    ],
    fields: [
      { key: 'text', label: 'Phrase', required: true, placeholder: 'በጣም ጥሩ ነው!' },
      { key: 'english', label: 'English', placeholder: 'Very well done!' },
      { key: 'emoji', label: 'Emoji', placeholder: '🎉' },
    ],
    validate: (row) => (row.text?.trim() ? '' : 'A phrase is required'),
  },
];

const inputCls =
  'rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';

// The backend accepts syllables as an array or a comma string; the form uses a
// plain text input, so normalise here rather than in three places.
function toSyllables(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function blankRow(dataset) {
  const row = {};
  for (const field of dataset.fields) {
    row[field.key] = field.type === 'number' ? '' : '';
  }
  return row;
}

function ReferenceForm({ dataset, initial, rows, onCancel, onSubmit, saving, error }) {
  const [row, setRow] = useState(initial || blankRow(dataset));
  const [localError, setLocalError] = useState('');

  const message = localError || error;

  // A select may take its choices from a column of the data it is editing, so the
  // list of categories offered always matches the categories actually in use.
  const optionsFor = (field) => {
    if (field.optionsFrom) {
      return [
        ...new Set((rows || []).map((r) => r[field.optionsFrom]).filter(Boolean)),
      ].sort();
    }
    return field.options || [];
  };

  function handleSubmit(e) {
    e.preventDefault();
    const problem = dataset.validate(row);
    if (problem) {
      setLocalError(problem);
      return;
    }
    setLocalError('');
    onSubmit(row);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4"
    >
      <p className="mb-3 text-sm font-medium text-slate-700">
        {initial ? `Editing “${initial[primaryKey(dataset)] || ''}”` : 'Add a new entry'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {dataset.fields.map((field) => (
          <div key={field.key} className={field.type === 'syllables' ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {field.label}
              {field.required && <span className="text-rose-500"> *</span>}
            </label>
            {field.type === 'select' ? (
              <select
                value={row[field.key] || ''}
                onChange={(e) => setRow({ ...row, [field.key]: e.target.value })}
                className={inputCls}
              >
                <option value="">— none —</option>
                {optionsFor(field).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={row[field.key] ?? ''}
                type={field.type === 'number' ? 'number' : 'text'}
                placeholder={field.placeholder}
                onChange={(e) => setRow({ ...row, [field.key]: e.target.value })}
                className={`${inputCls} w-full`}
              />
            )}
            {field.hint && <p className="mt-1 text-xs text-slate-500">{field.hint}</p>}
          </div>
        ))}
      </div>

      {message && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{message}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <MdCheck /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <MdClose /> Cancel
        </button>
      </div>
    </form>
  );
}

function primaryKey(dataset) {
  return dataset.columns[0].key;
}

function displayValue(row, column, dataset) {
  const value = row[column.key];
  if (column.key === 'syllables') return toSyllables(value).join(' ');
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function AdminReferenceData() {
  const [activeKind, setActiveKind] = useState(DATASETS[0].kind);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const dataset = useMemo(
    () => DATASETS.find((d) => d.kind === activeKind),
    [activeKind]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosClient.get(`/reference/admin/${dataset.route}`);
      setRows(data[dataset.kind] || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this dataset');
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    setEditing(null);
    setAdding(false);
    load();
  }, [load]);

  async function create(row) {
    setSaving(true);
    setError('');
    try {
      await axiosClient.post(`/reference/admin/${dataset.route}`, row);
      invalidateReferenceKit();
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save that entry');
    } finally {
      setSaving(false);
    }
  }

  async function update(id, row) {
    setSaving(true);
    setError('');
    try {
      await axiosClient.patch(`/reference/admin/${dataset.route}/${id}`, row);
      invalidateReferenceKit();
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save that change');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(row) {
    if (!window.confirm('Retire this entry? It disappears from the pickers but stays in the database.')) {
      return;
    }
    setError('');
    try {
      await axiosClient.delete(`/reference/admin/${dataset.route}/${row.id}`);
      invalidateReferenceKit();
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not retire that entry');
    }
  }

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-800">Early Childhood Reference Data</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            The shared writing system and vocabulary behind the age 5&ndash;9 child portal.
            Instructors pick from these lists when they build an activity &mdash; they never
            retype them &mdash; so correcting an entry here corrects it for every lesson in
            the school at once.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {DATASETS.map((d) => (
            <button
              key={d.kind}
              onClick={() => setActiveKind(d.kind)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                d.kind === activeKind
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d.title}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-800">{dataset.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {activeCount} active of {rows.length}
              </span>
              <button
                onClick={load}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
              >
                <MdRefresh /> Refresh
              </button>
              <button
                onClick={() => {
                  setAdding((v) => !v);
                  setEditing(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                <MdAdd /> Add
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-600">{dataset.blurb}</p>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {adding && (
            <div className="mb-5">
              <ReferenceForm
                dataset={dataset}
                rows={rows}
                saving={saving}
                error={error}
                onCancel={() => setAdding(false)}
                onSubmit={create}
              />
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Nothing in this dataset yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    {dataset.columns.map((c) => (
                      <th key={c.key} className={`px-3 py-2 font-medium ${c.width || ''}`}>
                        {c.label}
                      </th>
                    ))}
                    <th className="w-24 px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = editing === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-100 ${
                          row.is_active ? '' : 'bg-slate-50 text-slate-400 line-through'
                        }`}
                      >
                        <td colSpan={dataset.columns.length + 1} className="p-0">
                          {isEditing ? (
                            <div className="p-3">
                              <ReferenceForm
                                dataset={dataset}
                                initial={row}
                                rows={rows}
                                saving={saving}
                                error={error}
                                onCancel={() => setEditing(null)}
                                onSubmit={(values) => update(row.id, values)}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center">
                              {dataset.columns.map((c) => (
                                <span
                                  key={c.key}
                                  className={`px-3 py-2.5 ${c.width || ''} ${
                                    c.key === primaryKey(dataset)
                                      ? 'font-medium text-slate-800'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {displayValue(row, c, dataset)}
                                </span>
                              ))}
                              <span className="flex gap-1 px-3 py-2">
                                <button
                                  onClick={() => {
                                    setEditing(row.id);
                                    setAdding(false);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                  aria-label="Edit"
                                >
                                  <MdEdit />
                                </button>
                                <button
                                  onClick={() => deactivate(row)}
                                  disabled={!row.is_active}
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                                  aria-label="Retire"
                                >
                                  <MdDelete />
                                </button>
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-400">
          Retiring an entry hides it from the instructor pickers and the child portal. It is
          never deleted, so lessons that already reference it keep working.
        </p>
      </div>
    </AdminLayout>
  );
}

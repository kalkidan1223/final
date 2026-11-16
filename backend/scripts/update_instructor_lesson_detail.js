const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'instructor', 'InstructorLessonDetail.jsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add imports if missing
if (!code.includes('BasicChildLessonExperience')) {
  code = code.replace(
    "import QuizBuilder from '../../components/instructor/QuizBuilder';",
    "import QuizBuilder from '../../components/instructor/QuizBuilder';\nimport Modal from '../../components/Modal';\nimport BasicChildLessonExperience from '../../components/child/BasicChildLessonExperience';\nimport { MdArrowUpward, MdArrowDownward, MdVisibility, MdStyle, MdTextFields, MdAudiotrack, MdStar } from 'react-icons/md';"
  );
}

// 2. Add 'journey' tab to TABS and set initial tab to 'journey'
code = code.replace(
  "const TABS = [\n  { id: 'overview', label: 'Overview' },",
  "const TABS = [\n  { id: 'journey', label: '✨ Learning Journey (Child Order)' },\n  { id: 'overview', label: 'Overview' },"
);
code = code.replace(
  "const [tab, setTab] = useState('overview');",
  "const [tab, setTab] = useState('journey');\n  const [previewOpen, setPreviewOpen] = useState(false);\n  const [cardModalOpen, setCardModalOpen] = useState(false);\n  const [cardForm, setCardForm] = useState({ symbol: '', word: '', translation: '', audio_url: '', description: '' });"
);

// 3. Add reordering and card creation helper functions
const funcTarget = "  async function patchStatus(url, status) {";
const newFuncs = `  async function moveResource(index, direction) {
    const list = [...(data?.resources || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reordered = list.map((r, idx) => ({ id: r.id, display_order: idx }));
    setBusy(true);
    try {
      await axiosClient.post(\`/instructor/lessons/\${lessonParam}/resources/reorder\`, {
        resources: reordered,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reorder step');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRequired(resItem) {
    setBusy(true);
    try {
      await axiosClient.put(\`/instructor/lessons/\${lessonParam}/resources/\${resItem.id}\`, {
        is_required: !resItem.is_required,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update requirement');
    } finally {
      setBusy(false);
    }
  }

  async function removeResourceFromJourney(resItem) {
    if (!window.confirm(\`Remove "\${resItem.resource_title || 'this step'}" from the learning journey?\`)) return;
    setBusy(true);
    try {
      await axiosClient.delete(\`/instructor/lessons/\${lessonParam}/resources/\${resItem.id}\`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove from journey');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCard(e) {
    e.preventDefault();
    if (!cardForm.symbol && !cardForm.word) {
      alert('Please enter at least a symbol, letter, number, or word');
      return;
    }
    setBusy(true);
    try {
      await axiosClient.post(\`/lessons/\${lessonParam}/materials\`, {
        title: \`Card: \${cardForm.symbol || cardForm.word}\`,
        description: cardForm.description || null,
        type: 'other',
        content: cardForm.description || \`\${cardForm.symbol || ''} - \${cardForm.word || ''} - \${cardForm.translation || ''}\`,
        metadata: {
          type: 'learning_card',
          symbol: cardForm.symbol,
          word: cardForm.word,
          translation: cardForm.translation,
          audio_url: cardForm.audio_url,
        },
      });
      setCardModalOpen(false);
      setCardForm({ symbol: '', word: '', translation: '', audio_url: '', description: '' });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add learning card');
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(url, status) {`;

code = code.replace(funcTarget, newFuncs);

// 4. Add "Preview as Child" button to header
const headerTarget = `<Link
              to={\`/instructor/lessons/\${lesson.id}/edit\`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <MdEdit /> Edit Lesson
            </Link>`;

const headerReplacement = `<div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:scale-105 transition"
              >
                <MdVisibility className="text-base" /> Preview Child Experience
              </button>
              <Link
                to={\`/instructor/lessons/\${lesson.id}/edit\`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <MdEdit /> Edit Lesson
              </Link>
            </div>`;

code = code.replace(headerTarget, headerReplacement);

// 5. Add 'journey' tab rendering before tab === 'overview'
const overviewTarget = "{/* Overview */}\n        {tab === 'overview' && (";
const journeyTabCode = `{/* Journey Tab */}
        {tab === 'journey' && (
          <section className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 border-2 border-indigo-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-white px-3 py-1 rounded-full shadow-xs">
                  Connected Learning Experience
                </span>
                <h2 className="text-xl font-black text-slate-800 mt-2">Child Learning Journey Flow</h2>
                <p className="text-sm text-slate-600 mt-1 max-w-xl">
                  This ordered sequence is what the child sees step-by-step in their portal. Use the arrows to reorder, toggle required steps, or add new content blocks.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <MdStyle /> + Add Learning Card
                </button>
                <button
                  type="button"
                  onClick={() => openModal('material')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <MdUpload /> + Add Material
                </button>
                <button
                  type="button"
                  onClick={() => openModal('activity')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <MdAssignment /> + Add Activity
                </button>
                <button
                  type="button"
                  onClick={() => openModal('quiz')}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <MdQuiz /> + Add Quiz
                </button>
              </div>
            </div>

            {/* Sequence Steps */}
            {(!data?.resources || data.resources.length === 0) ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center bg-white space-y-3">
                <div className="text-5xl">📚</div>
                <h3 className="text-lg font-black text-slate-800">No Learning Steps Added Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Add learning cards, audio, videos, or practice activities above. They will automatically be linked to this lesson and visible in the child portal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.resources.map((r, index) => {
                  const isCard = r.metadata?.type === 'learning_card' || r.material_type === 'learning_card';
                  const isFirst = index === 0;
                  const isLast = index === data.resources.length - 1;

                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        {/* Order badge */}
                        <div className="w-10 h-10 rounded-xl bg-slate-100 font-black text-slate-700 text-base flex items-center justify-center shrink-0 border border-slate-200">
                          {index + 1}
                        </div>

                        {/* Icon & Type badge */}
                        <div className="text-2xl shrink-0">
                          {isCard ? '🔤' :
                           r.resource_type === 'video' ? '🎬' :
                           r.resource_type === 'activity' ? '✏️' :
                           r.resource_type === 'quiz' ? '🧠' :
                           r.material_type === 'audio' ? '🎵' : '📖'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {isCard ? 'Learning Card' : r.resource_type.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRequired(r)}
                              className={\`text-[11px] font-bold px-2 py-0.5 rounded-md border transition \${
                                r.is_required
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }\`}
                            >
                              {r.is_required ? '✓ Required for Completion' : 'Optional Step'}
                            </button>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 truncate">
                            {r.resource_title || r.title || 'Untitled Step'}
                          </h4>
                          {r.resource_detail && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{r.resource_detail}</p>
                          )}
                          {isCard && r.metadata && (
                            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                              <span>Symbol: <strong>{r.metadata.symbol}</strong></span>
                              {r.metadata.word && <span>Word: <strong>{r.metadata.word}</strong></span>}
                              {r.metadata.translation && <span>Meaning: {r.metadata.translation}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Reorder, Delete) */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={isFirst || busy}
                          onClick={() => moveResource(index, -1)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move step up"
                        >
                          <MdArrowUpward className="text-lg" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast || busy}
                          onClick={() => moveResource(index, 1)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move step down"
                        >
                          <MdArrowDownward className="text-lg" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeResourceFromJourney(r)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Remove from journey"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        ` + overviewTarget;

code = code.replace(overviewTarget, journeyTabCode);

// 6. Add Modal for Learning Card and Child Preview at end of component
const modalTarget = `      <ActivityBuilder
        open={modal.type === 'activity'}
        onClose={() => setModal({ type: null, item: null })}
        lessonId={lessonParam}
        activity={modal.item}
        onSaved={load}
      />`;

const modalAdditions = `      {/* Quick Learning Card Modal */}
      <Modal open={cardModalOpen} onClose={() => setCardModalOpen(false)} title="Add Learning Card (Letter, Number, Word)">
        <form onSubmit={handleCreateCard} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Character / Symbol / Number *</label>
              <input
                type="text"
                value={cardForm.symbol}
                onChange={(e) => setCardForm({ ...cardForm, symbol: e.target.value })}
                placeholder="e.g. ሀ, 1, or A"
                className="w-full text-center text-3xl font-black rounded-xl border border-slate-300 p-2 focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Associated Word / Reading</label>
              <input
                type="text"
                value={cardForm.word}
                onChange={(e) => setCardForm({ ...cardForm, word: e.target.value })}
                placeholder="e.g. ሀብታም or Apple"
                className="w-full font-bold rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Translation / Meaning (Optional)</label>
            <input
              type="text"
              value={cardForm.translation}
              onChange={(e) => setCardForm({ ...cardForm, translation: e.target.value })}
              placeholder="e.g. Wealthy or Red fruit"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Pronunciation Audio URL (Optional)</label>
            <input
              type="text"
              value={cardForm.audio_url}
              onChange={(e) => setCardForm({ ...cardForm, audio_url: e.target.value })}
              placeholder="https://... (or leave empty to use built-in child speech)"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setCardModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow transition disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Add Card to Journey'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Child Experience Simulation Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Child Experience Live Preview" maxWidth="max-w-5xl">
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-500">
            This is the live interactive player exactly as your students will experience it.
          </p>
          <div className="rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-900/5 p-4">
            <BasicChildLessonExperience
              lesson={lesson}
              resources={data?.resources || []}
              progress={{ progress_percentage: 0 }}
              onResourceCompleted={() => {}}
              onFinishLesson={() => alert('Child completed the lesson sequence! ⭐')}
            />
          </div>
        </div>
      </Modal>

` + modalTarget;

code = code.replace(modalTarget, modalAdditions);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated InstructorLessonDetail.jsx');


import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ChildEnglishLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState(null);
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => { setIsPlaying(false); setPlaybackError('Could not play. Tap to retry.'); };
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await axiosClient.get(`/student/lessons/${lessonId}/english-content`);
        setLessonData(res.data.lesson);
        setLetters(res.data.letters || []);
        if (res.data.letters?.[0]) setSelectedId(res.data.letters[0].id);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load lesson');
      } finally { setLoading(false); }
    })();
  }, [lessonId]);

  const handleLetterClick = (letter) => {
    setPlaybackError(null);
    setSelectedId(letter.id);
    const url = resolveFileUrl(letter.audio?.audio_url || letter.audio_url);
    if (!url) { setPlaybackError('No audio available.'); return; }
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { setIsPlaying(false); setPlaybackError('Tap to retry.'); });
    // record progress
    axiosClient.post(`/student/lessons/${lessonId}/english-progress`, { english_letter_id: letter.id }).catch(() => {});
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-2xl animate-pulse">Loading letters...</div></div>;
  if (error) return <div className="p-8 text-center"><p className="text-rose-600 font-bold">{error}</p><button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl">Back</button></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white rounded-xl shadow text-sm font-bold text-indigo-700">← Back</button>
          <h1 className="text-xl font-black text-slate-800">{lessonData?.title || 'English Letters'}</h1>
        </div>
        {playbackError && <div className="mb-4 p-3 bg-amber-100 text-amber-800 rounded-xl text-sm font-bold text-center">{playbackError}</div>}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {letters.map((l) => {
            const isSelected = selectedId === l.id;
            return (
              <button
                key={l.id}
                onClick={() => handleLetterClick(l)}
                className={`aspect-square rounded-2xl border-4 text-3xl font-black flex items-center justify-center transition-all active:scale-95 ${
                  isSelected ? 'bg-indigo-600 text-white border-indigo-400 scale-105' : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {l.letter}
              </button>
            );
          })}
        </div>
        {selectedId && (
          <div className="mt-6 text-center">
            <p className="text-lg font-bold text-slate-700">
              {letters.find((l) => l.id === selectedId)?.letter} — tap to hear
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function AudioPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [played, setPlayed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchMaterial();
  }, [id]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/materials/${id}`);
      setMaterial(response.data.material);
      if (response.data.material?.listened) {
        setPlayed(true);
        setCurrentTime(response.data.material.duration_seconds || 0);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audio');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
      if (audioRef.current.currentTime / audioRef.current.duration > 0.9 && !played) {
        markAsListened();
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!played) {
      markAsListened();
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const markAsListened = async () => {
    setPlayed(true);
    try {
      await axiosClient.post(`/students/materials/${id}/listen`);
    } catch (e) {
      // Silent fail
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading audio... 🎧</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          <span className="mr-2">←</span> Back
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  if (!material) return null;

  const fileUrl = resolveFileUrl(material.file_url);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
            <span className="text-3xl">🎧</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{material.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700">Audio Learning</span>
              {material.type && <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{material.type.toUpperCase()}</span>}
              {material.status && <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">{material.status}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {played && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex items-center gap-1">
              <span>✅</span> Listened
            </span>}
          </div>
        </div>

        {material.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-700">{material.description}</p>
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Main Player */}
        <div className="p-8 bg-gradient-to-r from-green-50 to-teal-50">
          <div className="max-w-2xl mx-auto">
            {/* Waveform Visualization */}
            <div className="mb-6 h-24 bg-white/50 rounded-xl flex items-end justify-center gap-1 px-4 py-4" role="img" aria-label="Audio waveform">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 rounded bg-green-400 transition-all duration-200"
                  style={{
                    height: `${isPlaying ? (20 + Math.random() * 60) : (10 + Math.sin(i * 0.5) * 5)}px`,
                    opacity: isPlaying ? 1 : 0.4,
                  }}
                />
              ))}
            </div>

            {/* Audio Element & Controls */}
            <audio
              ref={audioRef}
              src={fileUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              preload="metadata"
            />

            {/* Custom Controls */}
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-16 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full relative cursor-pointer" onClick={(e) => {
                  if (audioRef.current) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = percent * audioRef.current.duration;
                  }
                }}>
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-teal-500 rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-16">{formatTime(duration)}</span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                    }
                  }}
                  className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition text-green-600"
                  aria-label="Rewind 10 seconds"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      if (audioRef.current.paused) {
                        audioRef.current.play();
                      } else {
                        audioRef.current.pause();
                      }
                    }
                  }}
                  className={`p-4 rounded-full shadow-lg transition ${isPlaying ? 'bg-green-500 text-white' : 'bg-white text-green-600 hover:bg-green-50'}`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
                    }
                  }}
                  className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition text-green-600"
                  aria-label="Forward 10 seconds"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Volume & Speed */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">🔊</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      setVolume(e.target.value);
                      if (audioRef.current) audioRef.current.volume = e.target.value;
                    }}
                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                  />
                </div>
                <select
                  value={1}
                  onChange={(e) => {
                    if (audioRef.current) audioRef.current.playbackRate = parseFloat(e.target.value);
                  }}
                  className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-sm text-gray-700"
                  aria-label="Playback speed"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1" selected>1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mark as Listened */}
        <div className="px-8 pb-8">
          <button
            onClick={markAsListened}
            disabled={played}
            className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition ${played ? 'bg-green-100 text-green-700 cursor-default' : 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600'}`}
          >
            {played ? '✅ Marked as Listened' : '✅ Mark as Listened'}
          </button>
        </div>
      </div>

      {/* Learning Tips */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6">
        <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
          <span>💡</span> Listening Tip
        </h3>
        <p className="text-gray-700">
          Listen carefully! You can replay the audio as many times as you need. 
          Try to repeat what you hear out loud to practice pronunciation.
        </p>
      </div>
    </div>
  );
}
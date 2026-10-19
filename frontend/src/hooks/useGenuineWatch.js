import { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

// Genuine watch tracking shared by native <video> and the YouTube player.
// Only contiguous spans of real playback are reported, so seeking forward or
// leaving the tab never counts as watched. Backend validates and stores the
// unique watched content, so the frontend never sets completion directly.
export function useGenuineWatch(resourceId, onCompleted) {
  const [progress, setProgress] = useState({
    watch_percentage: 0,
    watched_seconds: 0,
    duration_seconds: 0,
    current_position_seconds: 0,
    required_percentage: 90,
    completed: false,
  });
  const accStartRef = useRef(null);
  const hiddenRef = useRef(typeof document !== 'undefined' ? document.hidden : false);

  useEffect(() => {
    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) accStartRef.current = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const send = useCallback(async (from, to, current, duration) => {
    if (!(to > from)) return;
    try {
      const { data } = await axiosClient.post(`/child/learning/progress/video/${resourceId}`, {
        current_position_seconds: current,
        duration_seconds: duration,
        position: { from, to },
      });
      if (data?.progress) {
        setProgress(data.progress);
        if (data.progress.completed && onCompleted) onCompleted();
      }
    } catch (err) {
      // Locked step or offline: keep playing, just do not record.
    }
  }, [resourceId, onCompleted]);

  const tick = useCallback((current, duration, playing) => {
    if (!playing || hiddenRef.current) { accStartRef.current = null; return; }
    const start = accStartRef.current;
    if (start == null) { accStartRef.current = current; return; }
    const delta = current - start;
    if (delta < 0 || delta > 5) { accStartRef.current = current; return; } // seek / stall
    if (delta >= 2) {
      accStartRef.current = current;
      send(start, current, current, duration);
    }
  }, [send]);

  const reset = useCallback(() => { accStartRef.current = null; }, []);

  return { progress, setProgress, tick, reset };
}

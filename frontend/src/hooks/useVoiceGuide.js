import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Amharic-first read-aloud engine for the child portal.
 * -----------------------------------------------------------------
 * Ethiopian children aged 5-9 are typically not fluent readers, and
 * reading fluency in grade 2-3 is nationally very low. Instruction
 * therefore has to be *spoken*, not just written. This hook wraps the
 * Web Speech API and guarantees:
 *
 *  1. An Amharic voice (am-ET / am) is preferred whenever the device has one.
 *  2. Speech is slowed and pitched up slightly so a 5-year-old can follow.
 *  3. Voices load asynchronously in Chrome, so we listen for `voiceschanged`.
 *  4. Every screen keeps at most one utterance alive, so starting a new
 *     lesson announcement never overlaps with the previous one.
 */

const STORAGE_KEY = 'brana_child_voice_on';

/** Preference order: Amharic first, then English as a safety net. */
const VOICE_PRIORITY = ['am-et', 'am', 'ti', 'so', 'sw', 'en-us', 'en'];

const RATE_BY_LANG = {
  am: 0.75,
  en: 0.85,
};

const PITCH_BY_LANG = {
  am: 1.1,
  en: 1.05,
};

function scoreVoice(voice) {
  const lang = (voice.lang || '').toLowerCase().replace('_', '-');
  const index = VOICE_PRIORITY.findIndex((code) => lang === code || lang.startsWith(code));
  // Local voices beat remote ones: they work offline in low-connectivity schools.
  if (index === -1) return 999;
  return index * 10 + (voice.localService ? 0 : 1);
}

export function pickVoice(voices) {
  if (!voices || voices.length === 0) return null;
  return [...voices].sort((a, b) => scoreVoice(a) - scoreVoice(b))[0] || null;
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function readVoicePreference() {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function writeVoicePreference(on) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(!!on));
}

export default function useVoiceGuide(options = {}) {
  const { lang = 'am', rate, pitch, autoSpeak = true } = options;

  const [enabled, setEnabled] = useState(readVoicePreference);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const utteranceRef = useRef(null);
  const mountedRef = useRef(true);

  // Refresh the voice list; Chrome populates it after the first paint.
  useEffect(() => {
    if (!isSpeechSupported()) {
      setVoiceReady(false);
      return undefined;
    }

    const refresh = () => setVoiceReady(window.speechSynthesis.getVoices().length > 0);
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (isSpeechSupported()) window.speechSynthesis.cancel();
    },
    []
  );

  // Persist the child's / parent's sound choice across sessions.
  const setVoiceEnabled = useCallback((value) => {
    const next = !!value;
    setEnabled(next);
    writeVoicePreference(next);
    if (!next && isSpeechSupported()) window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  /**
   * Speak a phrase. `text` may be a plain string or a list of
   * `{ text, lang }` parts so one sentence can mix Amharic and English.
   */
  const speak = useCallback(
    (text, override = {}) => {
      if (!enabled || !isSpeechSupported() || !text) return false;

      const parts = Array.isArray(text) ? text : [{ text: String(text), lang }];
      const clean = parts.filter((part) => part && part.text);
      if (clean.length === 0) return false;

      const utteranceLang = override.lang || clean[0].lang || lang;
      const speechRate = override.rate ?? rate ?? RATE_BY_LANG[utteranceLang.slice(0, 2)] ?? 0.85;
      const speechPitch = override.pitch ?? pitch ?? PITCH_BY_LANG[utteranceLang.slice(0, 2)] ?? 1.05;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(clean.map((part) => part.text).join(' '));
      utterance.lang = utteranceLang;
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        pickVoice(voices.filter((v) => (v.lang || '').toLowerCase().startsWith(utteranceLang.slice(0, 2)))) ||
        pickVoice(voices);
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        if (mountedRef.current) setIsSpeaking(true);
      };
      const finish = () => {
        if (mountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [enabled, lang, rate, pitch]
  );

  /**
   * Speak only once per `key`. Used for greetings and step narration so
   * a re-render never restarts the same sentence mid-way.
   */
  const spokenKeys = useRef(new Set());
  const speakOnce = useCallback(
    (key, text, override) => {
      if (!autoSpeak || spokenKeys.current.has(key)) return false;
      spokenKeys.current.add(key);
      return speak(text, override);
    },
    [autoSpeak, speak]
  );

  return {
    enabled,
    setVoiceEnabled,
    isSpeaking,
    voiceReady,
    supported: isSpeechSupported(),
    speak,
    speakOnce,
    stop,
  };
}

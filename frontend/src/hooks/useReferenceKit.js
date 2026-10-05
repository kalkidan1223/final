import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

/**
 * The early-learner reference kit.
 * ----------------------------------------------------------------------------
 * The writing system of Ethiopian schooling: the Ge'ez syllabary, the Ethiopic
 * numerals, the everyday picture words, and the encouragement phrases. These
 * are seeded once and maintained by an admin, so they are fetched from the
 * database rather than hardcoded in the bundle.
 *
 * Both the child portal and the instructor's activity builder read this, which
 * guarantees a child plays with the same letters their teacher selected from
 * the same list.
 *
 * The response is cached in module scope for the life of the tab: it changes
 * only when an admin edits it, and every screen needs it.
 */

let cache = null;
let inFlight = null;

async function loadKit() {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = axiosClient
      .get('/reference/early-learner-kit')
      .then(({ data }) => {
        cache = data;
        inFlight = null;
        return data;
      })
      .catch((err) => {
        inFlight = null;
        throw err;
      });
  }
  return inFlight;
}

/** Drop the cached kit, e.g. right after an admin edits the reference lists. */
export function invalidateReferenceKit() {
  cache = null;
  inFlight = null;
}

const EMPTY = {
  fidel_letters: [],
  geez_numerals: [],
  picture_words: [],
  encouragement_phrases: [],
};

export default function useReferenceKit() {
  const [reference, setReference] = useState(cache || EMPTY);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (cache) return undefined;

    loadKit()
      .then((data) => {
        if (!alive) return;
        setReference(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Could not load the learning words');
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { reference, loading, error, refresh: loadKit };
}

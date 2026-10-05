import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import useReferenceKit from '../../hooks/useReferenceKit';
import FidelPractice, { PracticeHeader } from './FidelPractice';
import NumberPractice from './NumberPractice';
import MatchPractice from './MatchPractice';

/**
 * PracticePlay
 * ------------
 * The single entry point for every self-practice game.
 *
 * The child taps a tile on the home screen, this loads THAT instructor-authored
 * activity, and the right renderer draws it. The game is a renderer; the
 * letters, numbers and pictures come from `activity_config`, which the
 * instructor built in the ActivityBuilder from the seeded reference tables.
 *
 * Nothing here invents content. If the instructor's activity is missing or
 * belongs to another age group, the child is sent back to the home screen
 * rather than shown someone else's lesson.
 */

const RENDERERS = {
  letter_tracing: FidelPractice,
  counting: NumberPractice,
  matching: MatchPractice,
};

export default function PracticePlay() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { reference, loading: refLoading } = useReferenceKit();

  const [state, setState] = useState({ status: 'loading', activity: null, error: '' });

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', activity: null, error: '' });

    axiosClient
      .get(`/child/activities/${activityId}`)
      .then(({ data }) => {
        if (!alive) return;
        const activity = data.activity;
        if (!activity || !RENDERERS[activity.activity_type]) {
          setState({
            status: 'unsupported',
            activity,
            error: 'ይህ ሥራ አይደለም',
          });
          return;
        }
        setState({ status: 'ready', activity, error: '' });
      })
      .catch((err) => {
        if (!alive) return;
        setState({
          status: 'error',
          activity: null,
          error: err.response?.data?.error || 'ሥራውን መጫን አልቻልንም',
        });
      });

    return () => {
      alive = false;
    };
  }, [activityId]);

  if (state.status === 'loading' || refLoading) {
    return (
      <div className="min-h-screen bg-emerald-50">
        <PracticeHeader
          title="እየተከፈተ ነው..."
          subtitle="ጨዋታውን እየመስቀመን ነው"
          voice={{ enabled: true, isSpeaking: false, setVoiceEnabled: () => {}, speak: () => {} }}
        />
        <div className="text-center py-20 text-6xl animate-bounce">🌱</div>
      </div>
    );
  }

  if (state.status === 'error' || state.status === 'unsupported') {
    return (
      <div className="min-h-screen bg-emerald-50">
        <PracticeHeader
          title="ሥራው አልተገኘም"
          subtitle={state.activity?.title || 'እንደገና ሞክር'
          }
          voice={{ enabled: true, isSpeaking: false, setVoiceEnabled: () => {}, speak: () => {} }}
        />
        <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
          <span className="block text-6xl">🤔</span>
          <h2 className="text-xl font-black text-slate-800">{state.error}</h2>
          <p className="text-sm font-bold text-slate-500">
            ወደ መነሻ ተመለስ፤ ሌላ ሥራ ምረጥ።
          </p>
          <button
            onClick={() => navigate('/child')}
            className="px-8 py-3.5 bg-emerald-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition"
          >
            🏠 ወደ መነሻ ተመለስ
          </button>
        </div>
      </div>
    );
  }

  const Renderer = RENDERERS[state.activity.activity_type];
  return <Renderer activity={state.activity} reference={reference} />;
}

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function TrainingVisibility({ value, onChange, lockedCircleId, onReady }) {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [preference, setPreference] = useState('Ask every time');
  const latestValue = useRef(value); latestValue.current = value;
  const latestChange = useRef(onChange); latestChange.current = onChange;
  const appliedDefault = useRef(false);
  useEffect(() => {
    let mounted = true;
    onReady?.(false);
    async function load() {
      if (!supabase) throw new Error('Unavailable');
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) throw new Error('Unavailable');
      const result = await supabase.from('training_circle_members').select('circle_id, training_circles(id,name)').eq('user_id', data.user.id);
      if (!mounted) return;
      if (result.error) throw new Error('Unavailable');
      const loaded = (result.data || []).map(row => row.training_circles).filter(Boolean);
      const savedPreference = data.user.user_metadata?.default_circle_sharing || 'Ask every time';
      setCircles(loaded); setPreference(savedPreference);
      if (!appliedDefault.current && latestValue.current.length === 0) {
        appliedDefault.current = true;
        if (savedPreference === 'Training Circles') latestChange.current(loaded.map(circle => circle.id));
      }
    }
    load().catch(() => { if (mounted) setUnavailable(true); }).finally(() => { if (mounted) { setLoading(false); onReady?.(true); } });
    return () => { mounted = false; };
  }, []);
  return <fieldset className="cs-training-visibility"><legend>Share this session</legend>
    <p>{lockedCircleId ? 'This challenge posts to its Circle. Other Circles are optional.' : preference === 'Training Circles' ? 'Your default selects your Circles. Uncheck any to keep this session private.' : 'Private unless you select a Circle.'}</p>
    {loading && <small role="status">Loading your Circles…</small>}
    {circles.map(circle => <label key={circle.id}><input type="checkbox" checked={value.includes(circle.id) || circle.id === lockedCircleId} disabled={circle.id === lockedCircleId} onChange={event => onChange(event.target.checked ? [...new Set([...value, circle.id])] : value.filter(id => id !== circle.id))} /> {circle.name}</label>)}
    {unavailable && <small role="alert">Circles could not load. No additional Circles will be selected.</small>}
    {!loading && !circles.length && !unavailable && <small>No Circles yet. You can train privately.</small>}
  </fieldset>;
}

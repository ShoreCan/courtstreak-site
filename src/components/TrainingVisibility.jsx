import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function TrainingVisibility({ value, onChange, lockedCircleId }) {
  const [circles, setCircles] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      const result = await supabase.from('training_circle_members').select('circle_id, training_circles(id,name)').eq('user_id', data.user.id);
      if (!mounted) return;
      if (result.error) { setUnavailable(true); return; }
      setCircles((result.data || []).map((row) => row.training_circles).filter(Boolean));
    }
    load().catch(() => { if (mounted) setUnavailable(true); });
    return () => { mounted = false; };
  }, []);
  return <fieldset className="cs-training-visibility"><legend>Who sees this session?</legend>
    <p>Private unless you choose a Circle. Posted challenge results are shared with that challenge’s Circle.</p>
    {circles.map((circle) => <label key={circle.id}><input type="checkbox" checked={value.includes(circle.id) || circle.id === lockedCircleId} disabled={circle.id === lockedCircleId} onChange={(event) => onChange(event.target.checked ? [...value, circle.id] : value.filter((id) => id !== circle.id))} /> {circle.name}</label>)}
    {unavailable && <small>Circles could not load. This session will stay private.</small>}
    {!circles.length && !unavailable && <small>You can train privately and create a Circle later.</small>}
  </fieldset>;
}

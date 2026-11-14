import React, {useEffect, useRef, useState} from 'react';
import {supabase} from '../lib/supabaseClient.js';

const bucket = 'courtstreak-shooting-pilot';
const release = 'shooting-live-01';
const assetNames = new Set([
  'pilot.mjs', 'yolox_nano.onnx', 'yolox_s.onnx', 'pose_landmarker_lite.task',
  'vision_wasm_internal.js', 'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm',
]);

async function privateAsset(name, signal) {
  if (!assetNames.has(name)) throw new Error('This shooting asset is unavailable.');
  const result = await supabase.storage.from(bucket).download(`${release}/${name}`, {}, {signal, cache: 'no-store'});
  if (result.error || !result.data) throw result.error ?? new Error('Shooting files are unavailable.');
  return result.data;
}

export default function ShootingPilot() {
  const host = useRef(null);
  const [state, setState] = useState('checking');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let dispose;
    const timeout = setTimeout(() => {
      setState('unavailable');
      controller.abort();
    }, 20000);
    async function load() {
      try {
        const {data: allowed, error} = await supabase.rpc('cs_has_shooting_pilot_access')
          .abortSignal(controller.signal);
        if (error) throw error;
        if (controller.signal.aborted) return;
        if (allowed !== true) { setState('restricted'); return; }
        const blob = await privateAsset('pilot.mjs', controller.signal);
        const url = URL.createObjectURL(new Blob([blob], {type: 'text/javascript'}));
        try {
          const {mountShootingPilot} = await import(/* @vite-ignore */ url);
          if (controller.signal.aborted) return;
          dispose = mountShootingPilot(host.current, {
            publicRuntime: new URL(`${import.meta.env.BASE_URL}ai/runtime/`, window.location.origin).href,
            asset: privateAsset,
          });
          setState('ready');
        } finally { URL.revokeObjectURL(url); }
      } catch {
        if (!controller.signal.aborted) setState('unavailable');
      } finally { clearTimeout(timeout); }
    }
    setState('checking');
    load();
    return () => { clearTimeout(timeout); controller.abort(); dispose?.(); };
  }, [retry]);

  return <>
    {state !== 'ready' && <main className="cs-welcome-page">
      <section className="cs-welcome-card">
        <p className="cs-auth-eyebrow">COURTSTREAK</p>
        <h1>Live shooting</h1>
        <p role="status">{{
          checking:'Checking access to the shooting pilot…',
          restricted:'This CourtStreak account does not have access to the shooting pilot.',
          unavailable:'The private shooting pilot is unavailable right now.',
        }[state]}</p>
        {state === 'unavailable' && <button type="button" onClick={() => setRetry(n => n + 1)}>Try again</button>}
      </section>
    </main>}
    <div ref={host} hidden={state !== 'ready'} />
  </>;
}

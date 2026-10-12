import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function usePreviewNavigate(previewOnly) {
  const navigate = useNavigate();
  return useCallback((destination, options) => {
    if (!previewOnly || typeof destination !== 'string') return navigate(destination, options);
    if (/^\/(pricing|create-account|login|preview)(\/|\?|$)/.test(destination)) return navigate(destination, options);
    if (destination === '/dashboard') return navigate('/preview', options);
    if (destination.startsWith('/lab/') && destination.endsWith('/session')) return navigate('/preview/membership');
    if (destination.startsWith('/training-circles')) return navigate(destination.replace('/training-circles', '/preview/circles'), options);
    return navigate(`/preview${destination}`, options);
  }, [navigate, previewOnly]);
}

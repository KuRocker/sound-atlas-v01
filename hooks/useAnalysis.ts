import { useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store/AppContext';

export function useAnalysis(send: (data: any) => void) {
  const { latestAnalysis, similarityThreshold, analysisPolicy } = useAppState();
  const dispatch = useAppDispatch();

  const setThreshold = useCallback(async (value: number) => {
    try {
      await fetch('/api/analysis/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: value }),
      });
      dispatch({ type: 'SET_THRESHOLD', payload: value });
    } catch (e) {
      console.error('Failed to set threshold:', e);
    }
  }, [dispatch]);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis/policy');
      const data = await res.json();
      dispatch({ type: 'SET_ANALYSIS_POLICY', payload: data });
    } catch (e) {
      console.error('Failed to fetch policy:', e);
    }
  }, [dispatch]);

  const updatePolicy = useCallback(async (patch: any) => {
    try {
      const res = await fetch('/api/analysis/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      dispatch({ type: 'SET_ANALYSIS_POLICY', payload: data });
    } catch (e) {
      console.error('Failed to update policy:', e);
    }
  }, [dispatch]);

  const fetchHistory = useCallback(async (limit = 200) => {
    try {
      const res = await fetch(`/api/analysis/history?limit=${limit}`);
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch history:', e);
      return [];
    }
  }, []);

  return {
    latestAnalysis,
    similarityThreshold,
    analysisPolicy,
    setThreshold,
    fetchPolicy,
    updatePolicy,
    fetchHistory,
  };
}

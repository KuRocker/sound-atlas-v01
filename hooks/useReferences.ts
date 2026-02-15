import { useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store/AppContext';

export function useReferences(send: (data: any) => void) {
  const { references, activeReferenceId, selectedReferenceIds } = useAppState();
  const dispatch = useAppDispatch();

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch('/api/references');
      const data = await res.json();
      dispatch({ type: 'SET_REFERENCES', payload: {
        references: data.references || [],
        activeReferenceId: data.activeReferenceId || null,
        selectedReferenceIds: data.selectedReferenceIds || [],
        threshold: data.similarityThreshold || 0.80,
      }});
    } catch (e) {
      console.error('Failed to fetch references:', e);
    }
  }, [dispatch]);

  const selectReference = useCallback((id: string) => {
    send({ type: 'set_reference', referenceId: id });
  }, [send]);

  const selectMultiple = useCallback(async (ids: string[]) => {
    try {
      await fetch('/api/reference/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceIds: ids }),
      });
      fetchReferences();
    } catch (e) {
      console.error('Failed to select references:', e);
    }
  }, [fetchReferences]);

  const updateType = useCallback(async (id: string, referenceType: string) => {
    try {
      await fetch(`/api/references/${id}/type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceType }),
      });
      fetchReferences();
    } catch (e) {
      console.error('Failed to update reference type:', e);
    }
  }, [fetchReferences]);

  return {
    references,
    activeReferenceId,
    selectedReferenceIds,
    fetchReferences,
    selectReference,
    selectMultiple,
    updateType,
  };
}

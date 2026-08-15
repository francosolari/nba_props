import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cloneStandings,
  loadEditableStandings,
  orderSignature,
  postStandings,
  resolveSeasonSlug,
  standingsPayload,
} from './editableStandingsData';

const reorder = (teams, fromIndex, toIndex) => {
  const next = [...teams];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export default function useEditableStandings({
  initialSeasonSlug,
  canEdit,
  username,
  localOnly,
  draftStorageKey,
  onLocalSave,
}) {
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [initialEastStandings, setInitialEastStandings] = useState([]);
  const [initialWestStandings, setInitialWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(canEdit);
  const [saving, setSaving] = useState(false);
  const [seasonSlug, setSeasonSlug] = useState(initialSeasonSlug);
  const [isDragging, setIsDragging] = useState(false);
  const bodyOverflowRef = useRef('');

  const hasUnsavedChanges = useMemo(() => (
    orderSignature(eastStandings) !== orderSignature(initialEastStandings)
      || orderSignature(westStandings) !== orderSignature(initialWestStandings)
  ), [eastStandings, initialEastStandings, initialWestStandings, westStandings]);

  useEffect(() => {
    if (initialSeasonSlug) setSeasonSlug(initialSeasonSlug);
  }, [initialSeasonSlug]);

  useEffect(() => {
    setIsEditing(canEdit);
    setSaving(false);
  }, [canEdit, seasonSlug]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (isDragging) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = bodyOverflowRef.current || '';
    }
    return () => { document.body.style.overflow = bodyOverflowRef.current || ''; };
  }, [isDragging]);

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      setLoading(true);
      const resolvedSlug = await resolveSeasonSlug(seasonSlug);
      if (!resolvedSlug) {
        if (mounted) setLoading(false);
        return;
      }
      if (resolvedSlug !== seasonSlug) {
        if (mounted) setSeasonSlug(resolvedSlug);
        return;
      }
      const standings = await loadEditableStandings({
        seasonSlug: resolvedSlug,
        localOnly,
        username,
        draftStorageKey,
      });
      if (!mounted) return;
      const east = cloneStandings(standings.east);
      const west = cloneStandings(standings.west);
      setEastStandings(east);
      setWestStandings(west);
      setInitialEastStandings(cloneStandings(east));
      setInitialWestStandings(cloneStandings(west));
      setLoading(false);
    };
    hydrate();
    return () => { mounted = false; };
  }, [draftStorageKey, localOnly, seasonSlug, username]);

  const handleDragStart = useCallback(() => setIsDragging(true), []);

  const handleDragEnd = useCallback((result) => {
    setIsDragging(false);
    const { source, destination } = result;
    if (!destination || source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;
    if (source.droppableId.startsWith('East')) {
      setEastStandings((teams) => reorder(teams, source.index, destination.index));
    } else {
      setWestStandings((teams) => reorder(teams, source.index, destination.index));
    }
  }, []);

  const setBaseline = useCallback(() => {
    setInitialEastStandings(cloneStandings(eastStandings));
    setInitialWestStandings(cloneStandings(westStandings));
  }, [eastStandings, westStandings]);

  const handleSave = useCallback(async ({ slugOverride, silent = false, force = false } = {}) => {
    if (!force && !hasUnsavedChanges) return { success: true, skipped: true, slug: slugOverride || seasonSlug };
    setSaving(true);
    const payload = standingsPayload(eastStandings, westStandings);

    if (localOnly) {
      if (draftStorageKey) {
        localStorage.setItem(draftStorageKey, JSON.stringify({
          east: payload.slice(0, eastStandings.length).map((prediction) => prediction.team_id),
          west: payload.slice(eastStandings.length).map((prediction) => prediction.team_id),
        }));
      }
      setBaseline();
      setSaving(false);
      onLocalSave?.();
      return { success: true, localOnly: true, slug: slugOverride || seasonSlug };
    }

    try {
      const targetSlug = await resolveSeasonSlug(slugOverride || seasonSlug);
      if (!targetSlug) throw new Error('Unable to determine the active season for saving predictions.');
      await postStandings(targetSlug, payload);
      if (targetSlug !== seasonSlug) setSeasonSlug(targetSlug);
      if (draftStorageKey) localStorage.removeItem(draftStorageKey);
      setBaseline();
      if (!canEdit) setIsEditing(false);
      return { success: true, slug: targetSlug, updated: true };
    } catch (error) {
      console.error('Error saving predictions:', error);
      if (!silent) alert(error?.message || error?.response?.data?.message || 'There was an error saving your predictions.');
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  }, [
    canEdit,
    draftStorageKey,
    eastStandings,
    hasUnsavedChanges,
    localOnly,
    onLocalSave,
    seasonSlug,
    setBaseline,
    westStandings,
  ]);

  const handleCancel = useCallback(() => {
    setEastStandings(cloneStandings(initialEastStandings));
    setWestStandings(cloneStandings(initialWestStandings));
    setIsEditing(false);
  }, [initialEastStandings, initialWestStandings]);

  const handleResetAll = useCallback(() => {
    setEastStandings(cloneStandings(initialEastStandings));
    setWestStandings(cloneStandings(initialWestStandings));
  }, [initialEastStandings, initialWestStandings]);

  return {
    eastStandings,
    westStandings,
    loading,
    saving,
    isEditing,
    isDragging,
    hasUnsavedChanges,
    handleDragStart,
    handleDragEnd,
    handleSave,
    handleCancel,
    handleResetAll,
    setIsEditing,
  };
}

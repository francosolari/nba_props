import React, { forwardRef, useImperativeHandle } from 'react';
import EditableStandingsBoard from './EditableStandingsBoard';
import useEditableStandings from './useEditableStandings';

const EditablePredictionBoard = forwardRef(function EditablePredictionBoard(
  {
    seasonSlug: initialSeasonSlug,
    canEdit = true,
    username,
    localOnly = false,
    draftStorageKey = null,
    onLocalSave,
  },
  ref
) {
  const standings = useEditableStandings({
    initialSeasonSlug,
    canEdit,
    username,
    localOnly,
    draftStorageKey,
    onLocalSave,
  });

  useImperativeHandle(ref, () => ({
    saveStandings: (options = {}) => standings.handleSave({ silent: true, ...options }),
    hasUnsavedChanges: () => standings.hasUnsavedChanges,
    isSaving: () => standings.saving,
  }), [standings.handleSave, standings.hasUnsavedChanges, standings.saving]);

  return (
    <EditableStandingsBoard
      eastStandings={standings.eastStandings}
      westStandings={standings.westStandings}
      loading={standings.loading}
      saving={standings.saving}
      isEditing={standings.isEditing}
      isDragging={standings.isDragging}
      canEdit={canEdit}
      hasUnsavedChanges={standings.hasUnsavedChanges}
      onDragStart={standings.handleDragStart}
      onDragEnd={standings.handleDragEnd}
      onCancel={standings.handleCancel}
      onReset={standings.handleResetAll}
      onSave={() => standings.handleSave()}
      onEdit={() => standings.setIsEditing(true)}
    />
  );
});

export default EditablePredictionBoard;

import React from 'react';
import { useDrag } from 'react-dnd';

function DraggableTeam({ team, index }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TEAM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag} className="draggable-team" style={{ opacity: isDragging ? 0.5 : 1 }}>
      {team.name}
    </div>
  );
}

export default DraggableTeam;
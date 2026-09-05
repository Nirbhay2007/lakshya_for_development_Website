import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CMSDragList({
  items = [],
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id || item.name,
  droppableId = 'drag-list',
  className = 'space-y-3'
}) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    
    onReorder(reordered);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={className}
          >
            {items.map((item, index) => {
              const id = keyExtractor(item, index).toString();
              return (
                <Draggable key={id} draggableId={id} index={index}>
                  {(providedDraggable, snapshot) => (
                    <div
                      ref={providedDraggable.innerRef}
                      {...providedDraggable.draggableProps}
                      className="transition-shadow duration-100"
                      style={{
                        ...providedDraggable.draggableProps.style,
                        // Ensure layout doesn't break during dragging
                        userSelect: 'none'
                      }}
                    >
                      <motion.div
                        animate={snapshot.isDragging ? { scale: 1.02, rotate: 1 } : { scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`flex items-start md:items-center gap-3 p-4 bg-admin-surface border rounded-2xl ${
                          snapshot.isDragging 
                            ? 'border-admin-accent bg-admin-surface-2 shadow-2xl z-50' 
                            : 'border-admin-border'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div
                          {...providedDraggable.dragHandleProps}
                          className="text-admin-muted hover:text-admin-text cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/5 transition-colors mt-1 md:mt-0"
                        >
                          <GripVertical className="w-5 h-5 shrink-0" />
                        </div>

                        {/* Custom Content */}
                        <div className="flex-1 min-w-0">
                          {renderItem(item, index, snapshot)}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

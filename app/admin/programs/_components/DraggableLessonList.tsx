'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Video } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  durationSec?: number;
  category?: string;
}

interface DraggableLessonListProps {
  lessons: Lesson[];
  onReorder: (lessons: Lesson[]) => void;
  onRemove: (lessonId: string) => void;
}

interface SortableItemProps {
  lesson: Lesson;
  index: number;
  onRemove: (lessonId: string) => void;
}

function SortableItem({ lesson, index, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card rounded-lg border"
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Order Number */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
        {index + 1}
      </div>

      {/* Lesson Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white">
        <Video className="h-5 w-5" />
      </div>

      {/* Lesson Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{lesson.title}</div>
        {lesson.description && (
          <div className="text-sm text-muted-foreground line-clamp-1">
            {lesson.description}
          </div>
        )}
        <div className="flex gap-2 mt-1">
          {lesson.category && (
            <Badge variant="outline" className="text-xs capitalize">
              {lesson.category}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {formatDuration(lesson.durationSec)}
          </Badge>
        </div>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(lesson.id)}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DraggableLessonList({
  lessons,
  onReorder,
  onRemove,
}: DraggableLessonListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);

      const reorderedLessons = arrayMove(lessons, oldIndex, newIndex);
      onReorder(reorderedLessons);
    }
  };

  if (lessons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
        No lessons added yet. Click "Add Lessons" to get started.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={lessons.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {lessons.map((lesson, index) => (
            <SortableItem
              key={lesson.id}
              lesson={lesson}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

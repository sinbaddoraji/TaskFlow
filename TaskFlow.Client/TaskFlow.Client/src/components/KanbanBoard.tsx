import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Circle, PlayCircle, CheckCircle2 } from 'lucide-react';
import TaskCard from './TaskCard';
import type { TaskDto } from '../services/calendarService';

interface KanbanBoardProps {
  tasks: TaskDto[];
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onTaskEdit: (task: TaskDto) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: () => void;
}

type ColumnId = 'Pending' | 'In Progress' | 'Completed';

interface Column {
  id: ColumnId;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const columns: Column[] = [
  {
    id: 'Pending',
    title: 'To Do',
    icon: <Circle className="h-5 w-5" />,
    color: 'border-gray-300 bg-gray-50',
  },
  {
    id: 'In Progress',
    title: 'In Progress',
    icon: <PlayCircle className="h-5 w-5" />,
    color: 'border-blue-300 bg-blue-50',
  },
  {
    id: 'Completed',
    title: 'Done',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'border-green-300 bg-green-50',
  },
];

export default function KanbanBoard({
  tasks,
  onTaskStatusChange,
  onTaskEdit,
  onTaskComplete,
  onTaskDelete,
  onAddTask,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByColumn = useMemo(() => {
    const grouped: Record<ColumnId, TaskDto[]> = {
      'Pending': [],
      'In Progress': [],
      'Completed': [],
    };

    tasks.forEach(task => {
      const status = task.status as ColumnId;
      if (status in grouped) {
        grouped[status].push(task);
      } else {
        grouped['Pending'].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    const overId = over.id as string;
    
    let newStatus: ColumnId | null = null;
    
    if (columns.some(col => col.id === overId)) {
      newStatus = overId as ColumnId;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status as ColumnId;
      }
    }

    if (newStatus && newStatus !== activeTask.status) {
      onTaskStatusChange(activeTask.id, newStatus);
    }

    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map(column => (
          <div
            key={column.id}
            className={`flex-1 min-w-[320px] rounded-lg border-2 ${column.color} p-4`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{column.icon}</span>
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <span className="bg-white rounded-full px-2 py-0.5 text-sm font-medium text-gray-600">
                  {tasksByColumn[column.id].length}
                </span>
              </div>
              {column.id === 'Pending' && (
                <button
                  onClick={onAddTask}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded transition-colors"
                  title="Add new task"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>

            <SortableContext
              items={tasksByColumn[column.id].map(t => t.id)}
              strategy={verticalListSortingStrategy}
              id={column.id}
            >
              <div className="min-h-[200px]">
                {tasksByColumn[column.id].length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <p className="text-sm">No tasks</p>
                    {column.id === 'Pending' && (
                      <button
                        onClick={onAddTask}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Add a task
                      </button>
                    )}
                  </div>
                ) : (
                  tasksByColumn[column.id].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={onTaskEdit}
                      onComplete={onTaskComplete}
                      onDelete={onTaskDelete}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80 rotate-3">
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onComplete={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
import { useState, useMemo } from 'react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Circle, PlayCircle, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import TaskCard from './TaskCard';
import type { TaskDto } from '../services/calendarService';

interface KanbanBoardProps {
  tasks: TaskDto[];
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onTaskEdit: (task: TaskDto) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onAddTask: () => void;
  onTaskUpdate?: (updatedTask: TaskDto) => void;
  currentUserId?: string;
}

type ColumnId = 'Pending' | 'InProgress' | 'Completed' | 'OnHold' | 'Cancelled';

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
    id: 'InProgress',
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
  {
    id: 'OnHold',
    title: 'On Hold',
    icon: <PauseCircle className="h-5 w-5" />,
    color: 'border-yellow-300 bg-yellow-50',
  },
  {
    id: 'Cancelled',
    title: 'Cancelled',
    icon: <XCircle className="h-5 w-5" />,
    color: 'border-red-300 bg-red-50',
  },
];

interface ColumnDropZoneProps {
  column: Column;
  children: React.ReactNode;
}

function ColumnDropZone({ column, children }: ColumnDropZoneProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded-lg border-2 ${column.color} p-3`}
    >
      {children}
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  onTaskStatusChange,
  onTaskEdit,
  onTaskComplete,
  onTaskDelete,
  onAddTask,
  onTaskUpdate,
  currentUserId,
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
      'InProgress': [],
      'Completed': [],
      'OnHold': [],
      'Cancelled': [],
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-4">
        {columns.map(column => (
          <ColumnDropZone key={column.id} column={column}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">{column.icon}</span>
                <h3 className="font-medium text-gray-900 text-sm">{column.title}</h3>
                <span className="bg-white rounded-full px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  {tasksByColumn[column.id].length}
                </span>
              </div>
              {column.id === 'Pending' && (
                <button
                  onClick={onAddTask}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded transition-colors"
                  title="Add new task"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            <SortableContext
              items={tasksByColumn[column.id].map(t => t.id)}
              strategy={verticalListSortingStrategy}
              id={column.id}
            >
              <div className="min-h-[150px]">
                {tasksByColumn[column.id].length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-400">
                    <p className="text-xs">No tasks</p>
                    {column.id === 'Pending' && (
                      <button
                        onClick={onAddTask}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
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
                      onTaskUpdate={onTaskUpdate}
                      currentUserId={currentUserId}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </ColumnDropZone>
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
              onTaskUpdate={() => {}}
              currentUserId={currentUserId}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
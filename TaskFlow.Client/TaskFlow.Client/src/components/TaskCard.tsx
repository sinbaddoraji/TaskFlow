import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Tag, AlertCircle, CheckCircle, Calendar, ChevronDown, ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { TaskDto } from '../services/calendarService';
import SubtaskItem from './SubtaskItem';
import CommentItem from './CommentItem';
import AddSubtaskForm from './AddSubtaskForm';
import AddCommentForm from './AddCommentForm';
import { calendarService } from '../services/calendarService';

interface TaskCardProps {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onTaskUpdate?: (updatedTask: TaskDto) => void;
  currentUserId?: string;
}

export default function TaskCard({ task, onEdit, onComplete, onDelete, onTaskUpdate, currentUserId = '' }: TaskCardProps) {
  const [isSubtasksExpanded, setIsSubtasksExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  const updateLocalTask = (updatedTask: TaskDto) => {
    setLocalTask(updatedTask);
    onTaskUpdate?.(updatedTask);
  };

  // Subtask handlers
  const handleAddSubtask = async (title: string) => {
    try {
      const newSubtask = await calendarService.addSubtask(localTask.id, title);
      const updatedTask = {
        ...localTask,
        subtasks: [...localTask.subtasks, newSubtask]
      };
      updateLocalTask(updatedTask);
      setShowAddSubtask(false);
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const updatedSubtask = await calendarService.toggleSubtask(localTask.id, subtaskId);
      const updatedTask = {
        ...localTask,
        subtasks: localTask.subtasks.map(st => 
          st.id === subtaskId ? updatedSubtask : st
        )
      };
      updateLocalTask(updatedTask);
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtaskId: string, title: string) => {
    try {
      const currentSubtask = localTask.subtasks.find(st => st.id === subtaskId);
      if (!currentSubtask) return;
      
      const updatedSubtask = await calendarService.updateSubtask(
        localTask.id, 
        subtaskId, 
        title, 
        currentSubtask.completed
      );
      const updatedTask = {
        ...localTask,
        subtasks: localTask.subtasks.map(st => 
          st.id === subtaskId ? updatedSubtask : st
        )
      };
      updateLocalTask(updatedTask);
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await calendarService.deleteSubtask(localTask.id, subtaskId);
      const updatedTask = {
        ...localTask,
        subtasks: localTask.subtasks.filter(st => st.id !== subtaskId)
      };
      updateLocalTask(updatedTask);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  // Comment handlers
  const handleAddComment = async (content: string) => {
    try {
      const newComment = await calendarService.addComment(localTask.id, content);
      const updatedTask = {
        ...localTask,
        comments: [...localTask.comments, newComment]
      };
      updateLocalTask(updatedTask);
      setShowAddComment(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const updatedComment = await calendarService.updateComment(localTask.id, commentId, content);
      const updatedTask = {
        ...localTask,
        comments: localTask.comments.map(c => 
          c.id === commentId ? updatedComment : c
        )
      };
      updateLocalTask(updatedTask);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await calendarService.deleteComment(localTask.id, commentId);
      const updatedTask = {
        ...localTask,
        comments: localTask.comments.filter(c => c.id !== commentId)
      };
      updateLocalTask(updatedTask);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const completedSubtasks = localTask.subtasks.filter(st => st.completed).length;
  const totalSubtasks = localTask.subtasks.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 cursor-move hover:shadow-md transition-shadow group ${
        localTask.status === 'Completed' ? 'opacity-75' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 
          className={`font-medium text-gray-900 flex-1 ${
            localTask.status === 'Completed' ? 'line-through text-gray-500' : ''
          }`}
        >
          {localTask.title}
        </h3>
        <div className="flex items-center gap-1 ml-2">
          {localTask.status !== 'Completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(localTask.id);
              }}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Mark as complete"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(localTask);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit task"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(localTask.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {localTask.description && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{localTask.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${getPriorityColor(localTask.priority)}`}>
          {getPriorityIcon(localTask.priority)}
          {localTask.priority}
        </span>

        {localTask.timeEstimateInMinutes && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            {formatTime(localTask.timeEstimateInMinutes)}
          </span>
        )}

        {localTask.dueDate && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            {format(new Date(localTask.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      {localTask.tags && localTask.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {localTask.tags.map(tag => (
            <span 
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtasks Section */}
      {(totalSubtasks > 0 || isSubtasksExpanded) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSubtasksExpanded(!isSubtasksExpanded);
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isSubtasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Subtasks
              {totalSubtasks > 0 && (
                <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}
            </button>
            {!showAddSubtask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddSubtask(true);
                  setIsSubtasksExpanded(true);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Add subtask"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          {isSubtasksExpanded && (
            <div className="space-y-1">
              {localTask.subtasks.map(subtask => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={handleToggleSubtask}
                  onUpdate={handleUpdateSubtask}
                  onDelete={handleDeleteSubtask}
                />
              ))}
              {showAddSubtask && (
                <AddSubtaskForm
                  onAdd={handleAddSubtask}
                  onCancel={() => setShowAddSubtask(false)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      {(localTask.comments.length > 0 || isCommentsExpanded) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCommentsExpanded(!isCommentsExpanded);
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isCommentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <MessageSquare className="w-4 h-4" />
              Comments
              {localTask.comments.length > 0 && (
                <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                  {localTask.comments.length}
                </span>
              )}
            </button>
            {!showAddComment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddComment(true);
                  setIsCommentsExpanded(true);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Add comment"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          {isCommentsExpanded && (
            <div className="space-y-2">
              {localTask.comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                />
              ))}
              {showAddComment && (
                <AddCommentForm
                  onAdd={handleAddComment}
                  onCancel={() => setShowAddComment(false)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons for Adding Subtasks/Comments */}
      {!isSubtasksExpanded && !isCommentsExpanded && totalSubtasks === 0 && localTask.comments.length === 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddSubtask(true);
              setIsSubtasksExpanded(true);
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add subtask
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddComment(true);
              setIsCommentsExpanded(true);
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Add comment
          </button>
        </div>
      )}
    </div>
  );
}
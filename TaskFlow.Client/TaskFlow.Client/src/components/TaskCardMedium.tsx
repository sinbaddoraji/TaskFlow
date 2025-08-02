import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { TaskDto } from '../services/calendarService';
import SubtaskItem from './SubtaskItem';
import CommentItem from './CommentItem';
import AddSubtaskForm from './AddSubtaskForm';
import AddCommentForm from './AddCommentForm';
import { calendarService } from '../services/calendarService';

interface TaskCardMediumProps {
  task: TaskDto;
  onTaskUpdate?: (updatedTask: TaskDto) => void;
  onTaskClick?: (task: TaskDto) => void;
  currentUserId?: string;
}

export default function TaskCardMedium({ 
  task, 
  onTaskUpdate, 
  onTaskClick, 
  currentUserId = '' 
}: TaskCardMediumProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [localTask, setLocalTask] = useState(task);

  const updateLocalTask = (updatedTask: TaskDto) => {
    setLocalTask(updatedTask);
    onTaskUpdate?.(updatedTask);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusConfig = {
      'Pending': { display: 'Pending', className: 'bg-gray-100 text-gray-800' },
      'InProgress': { display: 'In Progress', className: 'bg-blue-100 text-blue-800' },
      'Completed': { display: 'Completed', className: 'bg-green-100 text-green-800' },
      'OnHold': { display: 'On Hold', className: 'bg-yellow-100 text-yellow-800' },
      'Cancelled': { display: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || { 
      display: status, 
      className: 'bg-gray-100 text-gray-800' 
    };
  };

  // Subtask handlers (same as TaskCardCompact)
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

  // Comment handlers (same as TaskCardCompact)
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
  const hasSubtasksOrComments = totalSubtasks > 0 || localTask.comments.length > 0;

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSubtasksOrComments) {
      setIsExpanded(!isExpanded);
    } else {
      onTaskClick?.(localTask);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full">
      {/* Medium Task Display */}
      <div
        className={`text-sm p-2 rounded cursor-pointer text-white ${getPriorityColor(localTask.priority)} hover:opacity-90 transition-opacity group`}
        onClick={handleMainClick}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium truncate flex-1">{localTask.title}</div>
          {hasSubtasksOrComments && (
            <button
              onClick={handleExpandClick}
              className="p-0.5 hover:bg-black/10 rounded ml-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs opacity-90">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded ${getStatusDisplay(localTask.status).className.includes('bg-gray') ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
              {getStatusDisplay(localTask.status).display}
            </span>
            {localTask.scheduledTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(localTask.scheduledTime), 'HH:mm')}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {totalSubtasks > 0 && (
              <span>{completedSubtasks}/{totalSubtasks}</span>
            )}
            {localTask.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{localTask.comments.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 bg-white border border-gray-200 rounded p-3 shadow-md z-10 relative">
          <div className="text-sm text-gray-900 font-medium mb-2">{localTask.title}</div>
          
          {localTask.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{localTask.description}</p>
          )}
          
          {/* Subtasks Section */}
          {(totalSubtasks > 0 || showAddSubtask) && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-medium">
                  Subtasks {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
                </span>
                {!showAddSubtask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddSubtask(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1 max-h-32 overflow-y-auto">
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
            </div>
          )}

          {/* Comments Section */}
          {(localTask.comments.length > 0 || showAddComment) && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-medium">
                  Comments ({localTask.comments.length})
                </span>
                {!showAddComment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddComment(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
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
            </div>
          )}

          {/* Quick Add Actions */}
          {!showAddSubtask && !showAddComment && totalSubtasks === 0 && localTask.comments.length === 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddSubtask(true);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Subtask
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddComment(true);
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Add Comment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
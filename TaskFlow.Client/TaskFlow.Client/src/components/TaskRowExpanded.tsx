import { useState } from 'react';
import { Plus, MessageSquare, ListTodo, Users, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { TaskDto } from '../services/calendarService';
import { taskService } from '../services/taskService';
import SubtaskItem from './SubtaskItem';
import CommentItem from './CommentItem';
import AddSubtaskForm from './AddSubtaskForm';
import AddCommentForm from './AddCommentForm';

interface TaskRowExpandedProps {
  task: TaskDto;
  currentUserId: string;
  onTaskUpdate: (task: TaskDto) => void;
}

export default function TaskRowExpanded({ task, currentUserId, onTaskUpdate }: TaskRowExpandedProps) {
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'details'>('subtasks');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [loading, setLoading] = useState(false);

  const updateLocalTask = (updatedTask: TaskDto) => {
    setLocalTask(updatedTask);
    onTaskUpdate(updatedTask);
  };

  // Subtask handlers
  const handleAddSubtask = async (title: string) => {
    try {
      setLoading(true);
      const newSubtask = await taskService.addSubtask(localTask.id, { title });
      const updatedTask = {
        ...localTask,
        subtasks: [...localTask.subtasks, newSubtask]
      };
      updateLocalTask(updatedTask);
      setShowAddSubtask(false);
    } catch (error) {
      console.error('Error adding subtask:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const updatedSubtask = await taskService.toggleSubtask(localTask.id, subtaskId);
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
      const updatedSubtask = await taskService.updateSubtask(localTask.id, subtaskId, { title });
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
    if (!confirm('Are you sure you want to delete this subtask?')) return;
    
    try {
      await taskService.deleteSubtask(localTask.id, subtaskId);
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
      setLoading(true);
      const newComment = await taskService.addComment(localTask.id, { content });
      const updatedTask = {
        ...localTask,
        comments: [...localTask.comments, newComment]
      };
      updateLocalTask(updatedTask);
      setShowAddComment(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      const updatedComment = await taskService.updateComment(localTask.id, commentId, { content });
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
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await taskService.deleteComment(localTask.id, commentId);
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
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="bg-gray-50 border-t border-b border-gray-200">
          <div className="p-4">
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('subtasks')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'subtasks'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <ListTodo className="h-4 w-4" />
                Subtasks
                {totalSubtasks > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'comments'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Comments
                {localTask.comments.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                    {localTask.comments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'details'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Users className="h-4 w-4" />
                Details
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {/* Subtasks Tab */}
              {activeTab === 'subtasks' && (
                <div className="space-y-2">
                  {totalSubtasks > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(subtaskProgress)}% complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${subtaskProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

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
                  </div>

                  {showAddSubtask ? (
                    <AddSubtaskForm
                      onAdd={handleAddSubtask}
                      onCancel={() => setShowAddSubtask(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddSubtask(true)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4" />
                      Add subtask
                    </button>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-3">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {localTask.comments.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No comments yet. Be the first to comment!
                      </p>
                    ) : (
                      localTask.comments.map(comment => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          currentUserId={currentUserId}
                          onUpdate={handleUpdateComment}
                          onDelete={handleDeleteComment}
                        />
                      ))
                    )}
                  </div>

                  {showAddComment ? (
                    <AddCommentForm
                      onAdd={handleAddComment}
                      onCancel={() => setShowAddComment(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddComment(true)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      disabled={loading}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add comment
                    </button>
                  )}
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localTask.description && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {localTask.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Task Information</h4>
                    <div className="space-y-2 text-sm">
                      {localTask.assignedUserName && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Assigned to: {localTask.assignedUserName}</span>
                        </div>
                      )}
                      
                      {localTask.timeEstimateInMinutes && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Estimated: {Math.floor(localTask.timeEstimateInMinutes / 60)}h {localTask.timeEstimateInMinutes % 60}m
                          </span>
                        </div>
                      )}
                      
                      {localTask.timeSpentInMinutes > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Time spent: {Math.floor(localTask.timeSpentInMinutes / 60)}h {localTask.timeSpentInMinutes % 60}m
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dates</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Created: {format(new Date(localTask.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Updated: {format(new Date(localTask.updatedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      
                      {localTask.completedAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Completed: {format(new Date(localTask.completedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
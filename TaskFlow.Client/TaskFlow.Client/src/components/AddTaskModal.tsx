import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { calendarService, type CreateTaskRequest, type TaskDto } from '../services/calendarService';
import { type UpdateTaskRequest } from '../services/taskService';
import { projectService, type Project } from '../services/projectService';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  editTask?: TaskDto;
  onTaskSaved: () => void;
}

export default function AddTaskModal({ isOpen, onClose, selectedDate, editTask, onTaskSaved }: AddTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '',
    scheduledTime: '',
    timeEstimateInMinutes: undefined,
    tags: [],
    assignedUserId: undefined,
    projectId: undefined,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchProjects = async () => {
        try {
          const fetchedProjects = await projectService.getProjects();
          setProjects(fetchedProjects);
        } catch (err) {
          console.error('Error fetching projects:', err);
        }
      };

      fetchProjects();
    }
  }, [isOpen]);

  // Initialize form data when modal opens or edit task changes
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        // Editing existing task
        setFormData({
          title: editTask.title,
          description: editTask.description || '',
          priority: editTask.priority,
          status: editTask.status,
          dueDate: editTask.dueDate ? format(new Date(editTask.dueDate), 'yyyy-MM-dd') : '',
          scheduledTime: editTask.scheduledTime ? format(new Date(editTask.scheduledTime), "yyyy-MM-dd'T'HH:mm") : '',
          timeEstimateInMinutes: editTask.timeEstimateInMinutes,
          tags: editTask.tags,
          assignedUserId: editTask.assignedUserId,
          projectId: editTask.projectId,
        });
      } else {
        // Creating new task
        const defaultDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
        setFormData({
          title: '',
          description: '',
          priority: 'Medium',
          status: 'Pending',
          dueDate: defaultDate,
          scheduledTime: '',
          timeEstimateInMinutes: undefined,
          tags: [],
          assignedUserId: undefined,
          projectId: undefined,
        });
      }
      setError(null);
    }
  }, [isOpen, editTask, selectedDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'timeEstimateInMinutes' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const taskData = {
        ...formData,
        scheduledTime: formData.scheduledTime ? new Date(formData.scheduledTime).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      };

      if (editTask) {
        // Use UpdateTaskRequest for edits to preserve fields like assignedUserId
        const updateData: UpdateTaskRequest = {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          status: taskData.status,
          dueDate: taskData.dueDate,
          scheduledTime: taskData.scheduledTime,
          timeEstimateInMinutes: taskData.timeEstimateInMinutes,
          tags: taskData.tags,
          assignedUserId: taskData.assignedUserId,
          projectId: taskData.projectId,
        };
        await calendarService.updateTask(editTask.id, updateData);
      } else {
        await calendarService.createTask(taskData);
      }

      onTaskSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Task save error:', err);
      
      let errorMessage = 'An error occurred while saving the task';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        errorMessage = error?.response?.data?.message || error?.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editTask ? 'Edit Task' : 'Add New Task'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task description"
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Project */}
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Project
              </label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Scheduled Time
              </label>
              <input
                type="datetime-local"
                id="scheduledTime"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label htmlFor="timeEstimateInMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                Time Estimate (minutes)
              </label>
              <input
                type="number"
                id="timeEstimateInMinutes"
                name="timeEstimateInMinutes"
                value={formData.timeEstimateInMinutes || ''}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 60"
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags?.join(', ')}
                onChange={handleTagsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tags separated by commas"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (editTask ? 'Update Task' : 'Create Task')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import api from './api';
import type { ApiResponse } from './authService';
import type { 
  TaskDto, 
  CreateTaskRequest, 
  SubTaskDto, 
  CommentDto, 
  TaskTimelineDto,
  TaskRecurrenceDto,
  GitInfoDto,
  SubtaskRequest,
  CommentRequest
} from './calendarService';

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  scheduledTime?: string;
  timeEstimateInMinutes?: number;
  projectId?: string;
  assignedUserId?: string;
  tags?: string[];
  subtasks?: SubtaskRequest[];
  recurrence?: TaskRecurrenceDto;
  gitInfo?: GitInfoDto;
}

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  projectId?: string;
  assignedUserId?: string;
  tags?: string[];
  dueDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const taskService = {
  // Get all tasks with optional filtering
  async getTasks(params?: TaskQueryParams): Promise<TaskDto[]> {
    const response = await api.get<ApiResponse<PaginatedResponse<TaskDto>>>('/tasks', { params });
    
    if (response.data.success && response.data.data) {
      return response.data.data.items || [];
    }
    
    throw new Error(response.data.message || 'Failed to fetch tasks');
  },

  // Get paginated tasks with full pagination info
  async getPaginatedTasks(params?: TaskQueryParams): Promise<PaginatedResponse<TaskDto>> {
    const response = await api.get<ApiResponse<PaginatedResponse<TaskDto>>>('/tasks', { params });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch tasks');
  },

  // Get a specific task
  async getTask(id: string): Promise<TaskDto> {
    const response = await api.get<ApiResponse<TaskDto>>(`/tasks/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch task');
  },

  // Create a new task
  async createTask(task: CreateTaskRequest): Promise<TaskDto> {
    const response = await api.post<ApiResponse<TaskDto>>('/tasks', task);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to create task');
  },

  // Update a task
  async updateTask(id: string, task: UpdateTaskRequest): Promise<TaskDto> {
    const response = await api.put<ApiResponse<TaskDto>>(`/tasks/${id}`, task);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
     
    throw new Error(response.data.message || 'Failed to update task');
  },

  // Delete a task
  async deleteTask(id: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/tasks/${id}`);
    
    if (response.data.success) {
      return response.data.data || true;
    }
    
    throw new Error(response.data.message || 'Failed to delete task');
  },

  // Update task status
  async updateTaskStatus(id: string, status: string): Promise<TaskDto> {
    const response = await api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/status`, { status });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update task status');
  },

  // Complete/Uncomplete a task
  async toggleTaskCompletion(id: string): Promise<TaskDto> {
    const response = await api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/toggle-completion`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to toggle task completion');
  },

  // Get task timeline (today + upcoming)
  async getTaskTimeline(): Promise<TaskTimelineDto> {
    const response = await api.get<ApiResponse<TaskTimelineDto>>('/tasks/timeline');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch task timeline');
  },

  // Get today's tasks
  async getTodayTasks(): Promise<TaskDto[]> {
    const response = await api.get<ApiResponse<TaskDto[]>>('/tasks/today');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch today\'s tasks');
  },

  // Get upcoming tasks
  async getUpcomingTasks(days: number = 7): Promise<TaskDto[]> {
    const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/upcoming?days=${days}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch upcoming tasks');
  },

  // Get overdue tasks
  async getOverdueTasks(): Promise<TaskDto[]> {
    const response = await api.get<ApiResponse<TaskDto[]>>('/tasks/overdue');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch overdue tasks');
  },

  // Get tasks by project
  async getTasksByProject(projectId: string): Promise<TaskDto[]> {
    const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/project/${projectId}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch project tasks');
  },

  // Subtask Management
  async addSubtask(taskId: string, subtask: SubtaskRequest): Promise<SubTaskDto> {
    const response = await api.post<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks`, subtask);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to add subtask');
  },

  async updateSubtask(taskId: string, subtaskId: string, subtask: SubtaskRequest): Promise<SubTaskDto> {
    const response = await api.put<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks/${subtaskId}`, subtask);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update subtask');
  },

  async deleteSubtask(taskId: string, subtaskId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/tasks/${taskId}/subtasks/${subtaskId}`);
    
    if (response.data.success) {
      return response.data.data || true;
    }
    
    throw new Error(response.data.message || 'Failed to delete subtask');
  },

  async toggleSubtask(taskId: string, subtaskId: string): Promise<SubTaskDto> {
    const response = await api.patch<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to toggle subtask');
  },

  // Comment Management
  async addComment(taskId: string, comment: CommentRequest): Promise<CommentDto> {
    const response = await api.post<ApiResponse<CommentDto>>(`/tasks/${taskId}/comments`, comment);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to add comment');
  },

  async updateComment(taskId: string, commentId: string, comment: CommentRequest): Promise<CommentDto> {
    const response = await api.put<ApiResponse<CommentDto>>(`/tasks/${taskId}/comments/${commentId}`, comment);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update comment');
  },

  async deleteComment(taskId: string, commentId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/tasks/${taskId}/comments/${commentId}`);
    
    if (response.data.success) {
      return response.data.data || true;
    }
    
    throw new Error(response.data.message || 'Failed to delete comment');
  },

  // Time tracking
  async addTimeEntry(taskId: string, minutes: number, description?: string): Promise<TaskDto> {
    const response = await api.post<ApiResponse<TaskDto>>(`/tasks/${taskId}/time`, {
      minutes,
      description,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to add time entry');
  },
};
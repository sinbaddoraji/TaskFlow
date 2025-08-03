import api from './api';
import { format } from 'date-fns';
import { validateApiResponse, validateApiBooleanResponse, logApiCall } from '../utils/apiUtils';
import type { UpdateTaskRequest } from './taskService';

export interface TaskDto {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  scheduledTime?: string;
  timeEstimateInMinutes?: number;
  timeSpentInMinutes: number;
  projectId?: string;
  projectName?: string;
  assignedUserId: string;
  assignedUserName?: string;
  tags: string[];
  subtasks: SubTaskDto[];
  comments: CommentDto[];
  recurrence?: TaskRecurrenceDto;
  gitInfo?: GitInfoDto;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SubTaskDto {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecurrenceDto {
  type: string;
  interval: number;
  daysOfWeek?: string[];
  endDate?: string;
}

export interface GitInfoDto {
  repositoryUrl?: string;
  branch?: string;
  commitHash?: string;
  pullRequestUrl?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  scheduledTime?: string;
  timeEstimateInMinutes?: number;
  projectId?: string;
  assignedUserId?: string;
  tags?: string[];
  subtasks?: SubTaskDto[];
  recurrence?: TaskRecurrenceDto;
  gitInfo?: GitInfoDto;
}

export interface TaskTimelineDto {
  todayTasks: TaskDto[];
  upcomingTasks: TaskDto[];
}

export interface SubtaskRequest {
  title: string;
  completed?: boolean;
}

export interface CommentRequest {
  content: string;
}

export const calendarService = {
  // Get tasks for a specific month
  async getTasksByMonth(year: number, month: number): Promise<TaskDto[]> {
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/calendar/${year}/${month}`);
      
      if (response.data.success && response.data.data) {
        console.log('🔄 API Response - getTasksByMonth:', {
          url: `/tasks/calendar/${year}/${month}`,
          success: response.data.success,
          taskCount: response.data.data.length,
          statusBreakdown: response.data.data.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch tasks for the month');
    } catch (error) {
      console.error('Error fetching tasks by month:', error);
      throw error;
    }
  },

  // Get tasks for a specific week
  async getTasksByWeek(startDate: Date): Promise<TaskDto[]> {
    try {
      const formattedDate = format(startDate, 'yyyy-MM-dd');
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/calendar/week?startDate=${formattedDate}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch tasks for the week');
    } catch (error) {
      console.error('Error fetching tasks by week:', error);
      throw error;
    }
  },

  // Get tasks for a date range
  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<TaskDto[]> {
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      const response = await api.get<ApiResponse<TaskDto[]>>(
        `/tasks/calendar/range?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch tasks for the date range');
    } catch (error) {
      console.error('Error fetching tasks by date range:', error);
      throw error;
    }
  },

  // Get tasks for a specific date
  async getTasksByDate(date: Date): Promise<TaskDto[]> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/date/${formattedDate}`);
      
      if (response.data.success && response.data.data) {
        console.log('🔄 API Response - getTasksByDate:', {
          url: `/tasks/date/${formattedDate}`,
          date: formattedDate,
          success: response.data.success,
          taskCount: response.data.data.length,
          statusBreakdown: response.data.data.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          allStatuses: [...new Set(response.data.data.map(t => t.status))]
        });
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch tasks for the date');
    } catch (error) {
      console.error('Error fetching tasks by date:', error);
      throw error;
    }
  },

  // Get today's tasks
  async getTodayTasks(): Promise<TaskDto[]> {
    const url = '/tasks/today';
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>(url);
      const tasks = validateApiResponse(response, 'Failed to fetch today\'s tasks');
      
      logApiCall('GET', url, undefined, response);
      
      // Additional logging for task analysis
      if (tasks.length > 0) {
        console.log('📊 Task Analysis - Today\'s Tasks:', {
          taskCount: tasks.length,
          statusBreakdown: tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          allStatuses: [...new Set(tasks.map(t => t.status))]
        });
      }
      
      return tasks;
    } catch (error) {
      logApiCall('GET', url, undefined, undefined, error);
      throw error;
    }
  },

  // Get upcoming tasks
  async getUpcomingTasks(days: number = 7): Promise<TaskDto[]> {
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/upcoming?days=${days}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to fetch upcoming tasks');
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  },

  // Create a new task
  async createTask(task: CreateTaskRequest): Promise<TaskDto> {
    try {
      const response = await api.post<ApiResponse<TaskDto>>('/tasks', task);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to create task');
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Update a task
  async updateTask(id: string, task: UpdateTaskRequest): Promise<TaskDto> {
    const url = `/tasks/${id}`;
    try {
      const response = await api.put<ApiResponse<TaskDto>>(url, task);
      const updatedTask = validateApiResponse(response, `Failed to update task ${id}`);
      
      logApiCall('PUT', url, task, response);
      
      return updatedTask;
    } catch (error) {
      logApiCall('PUT', url, task, undefined, error);
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  },

  // Update task status
  async updateTaskStatus(id: string, status: string): Promise<TaskDto> {
    try {
      const response = await api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/status`, { status });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to update task status');
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  },

  // Complete a task
  async completeTask(id: string): Promise<TaskDto> {
    try {
      const response = await api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/complete`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to complete task');
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  },

  // Delete a task
  async deleteTask(id: string): Promise<boolean> {
    const url = `/tasks/${id}`;
    try {
      const response = await api.delete<ApiResponse<boolean>>(url);
      const result = validateApiBooleanResponse(response, `Failed to delete task ${id}`);
      
      logApiCall('DELETE', url, undefined, response);
      
      return result;
    } catch (error) {
      logApiCall('DELETE', url, undefined, undefined, error);
      console.error(`Error deleting task ${id}:`, error);
      throw error;
    }
  },

  // Subtask Management
  async addSubtask(taskId: string, title: string): Promise<SubTaskDto> {
    try {
      const response = await api.post<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks`, { title });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to add subtask');
    } catch (error) {
      console.error('Error adding subtask:', error);
      throw error;
    }
  },

  async updateSubtask(taskId: string, subtaskId: string, title: string, completed: boolean): Promise<SubTaskDto> {
    try {
      const response = await api.put<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks/${subtaskId}`, { title, completed });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to update subtask');
    } catch (error) {
      console.error('Error updating subtask:', error);
      throw error;
    }
  },

  async toggleSubtask(taskId: string, subtaskId: string): Promise<SubTaskDto> {
    try {
      const response = await api.patch<ApiResponse<SubTaskDto>>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to toggle subtask');
    } catch (error) {
      console.error('Error toggling subtask:', error);
      throw error;
    }
  },

  async deleteSubtask(taskId: string, subtaskId: string): Promise<boolean> {
    const url = `/tasks/${taskId}/subtasks/${subtaskId}`;
    try {
      const response = await api.delete<ApiResponse<boolean>>(url);
      const result = validateApiBooleanResponse(response, `Failed to delete subtask ${subtaskId}`);
      
      logApiCall('DELETE', url, undefined, response);
      
      return result;
    } catch (error) {
      logApiCall('DELETE', url, undefined, undefined, error);
      console.error(`Error deleting subtask ${subtaskId}:`, error);
      throw error;
    }
  },

  // Comment Management
  async addComment(taskId: string, content: string): Promise<CommentDto> {
    try {
      const response = await api.post<ApiResponse<CommentDto>>(`/tasks/${taskId}/comments`, { content });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to add comment');
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  async updateComment(taskId: string, commentId: string, content: string): Promise<CommentDto> {
    try {
      const response = await api.put<ApiResponse<CommentDto>>(`/tasks/${taskId}/comments/${commentId}`, { content });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || 'Failed to update comment');
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  async deleteComment(taskId: string, commentId: string): Promise<boolean> {
    const url = `/tasks/${taskId}/comments/${commentId}`;
    try {
      const response = await api.delete<ApiResponse<boolean>>(url);
      const result = validateApiBooleanResponse(response, `Failed to delete comment ${commentId}`);
      
      logApiCall('DELETE', url, undefined, response);
      
      return result;
    } catch (error) {
      logApiCall('DELETE', url, undefined, undefined, error);
      console.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }
};
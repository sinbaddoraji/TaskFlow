import api from './api';
import { format } from 'date-fns';

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
}

export const calendarService = {
  // Get tasks for a specific month
  async getTasksByMonth(year: number, month: number): Promise<TaskDto[]> {
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/calendar/${year}/${month}`);
      return response.data.data;
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
      return response.data.data;
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
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tasks by date range:', error);
      throw error;
    }
  },

  // Get today's tasks
  async getTodayTasks(): Promise<TaskDto[]> {
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>('/tasks/today');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
      throw error;
    }
  },

  // Get upcoming tasks
  async getUpcomingTasks(days: number = 7): Promise<TaskDto[]> {
    try {
      const response = await api.get<ApiResponse<TaskDto[]>>(`/tasks/upcoming?days=${days}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  },

  // Create a new task
  async createTask(task: CreateTaskRequest): Promise<TaskDto> {
    try {
      const response = await api.post<ApiResponse<TaskDto>>('/tasks', task);
      return response.data.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Update a task
  async updateTask(id: string, task: CreateTaskRequest): Promise<TaskDto> {
    try {
      const response = await api.put<ApiResponse<TaskDto>>(`/tasks/${id}`, task);
      return response.data.data;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Complete a task
  async completeTask(id: string): Promise<TaskDto> {
    try {
      const response = await api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/complete`);
      return response.data.data;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  },

  // Delete a task
  async deleteTask(id: string): Promise<boolean> {
    try {
      const response = await api.delete<ApiResponse<boolean>>(`/tasks/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};
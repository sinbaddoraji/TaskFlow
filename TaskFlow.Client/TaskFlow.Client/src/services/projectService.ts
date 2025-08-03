import api from './api';
import type { ApiResponse } from './authService';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  ownerId: string;
  ownerName?: string;
  isArchived: boolean;
  isPublic: boolean;
  members: ProjectMember[];
  tags: string[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
}

export interface ProjectMember {
  userId: string;
  userName?: string;
  userEmail?: string;
  role: string;
  joinedAt: string;
}

export interface ProjectSettings {
  allowPublicAccess: boolean;
  requireApprovalForTasks: boolean;
  defaultTaskPriority: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic?: boolean;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
  isPublic?: boolean;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get<ApiResponse<Project[]>>('/projects');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch projects');
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch project');
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>('/projects', data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to create project');
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    const response = await api.put<ApiResponse<Project>>(`/projects/${id}`, data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update project');
  },

  async deleteProject(id: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/projects/${id}`);
    
    if (response.data.success) {
      return response.data.data || true;
    }
    
    throw new Error(response.data.message || 'Failed to delete project');
  },

  async addMember(projectId: string, userId: string, role: string = 'Member'): Promise<ProjectMember> {
    const response = await api.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, {
      userId,
      role,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to add member');
  },

  async removeMember(projectId: string, userId: string): Promise<boolean> {
    const response = await api.delete<ApiResponse<boolean>>(`/projects/${projectId}/members/${userId}`);
    
    if (response.data.success) {
      return response.data.data || true;
    }
    
    throw new Error(response.data.message || 'Failed to remove member');
  },

  async updateMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const response = await api.put<ApiResponse<ProjectMember>>(`/projects/${projectId}/members/${userId}`, {
      role,
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update member role');
  },
};
using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Repositories.Interfaces;

public interface ITaskRepository : IBaseRepository<TaskItem>
{
    Task<List<TaskItem>> GetTasksByUserIdAsync(string userId);
    Task<List<TaskItem>> GetTasksByProjectIdAsync(string projectId);
    Task<List<TaskItem>> GetTodayTasksAsync(string userId);
    Task<List<TaskItem>> GetUpcomingTasksAsync(string userId, int days = 7);
    Task<List<TaskItem>> GetTasksByPriorityAsync(string userId, TaskPriority priority);
    Task<List<TaskItem>> GetTasksByStatusAsync(string userId, Models.Entities.TaskStatus status);
    Task<List<TaskItem>> GetOverdueTasksAsync(string userId);
    Task<List<TaskItem>> SearchTasksAsync(string userId, string searchTerm);
    Task<List<TaskItem>> GetTasksByTagsAsync(string userId, List<string> tags);
}
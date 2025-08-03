using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Repositories.Interfaces;

public interface IProjectRepository : IBaseRepository<Project>
{
    Task<List<Project>> GetProjectsByUserIdAsync(string userId);
    Task<List<Project>> GetPublicProjectsAsync();
    Task<Project?> GetProjectWithMembersAsync(string projectId);
}
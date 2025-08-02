using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Repositories.Implementations;

public class ProjectRepository : BaseRepository<Project>, IProjectRepository
{
    public ProjectRepository(MongoDbContext context) : base(context.Projects)
    {
    }

    public async Task<List<Project>> GetProjectsByUserIdAsync(string userId)
    {
        return await FindAsync(p => 
            p.OwnerId == userId || 
            p.Members.Any(m => m.UserId == userId)
        );
    }

    public async Task<Project?> GetProjectWithMembersAsync(string projectId)
    {
        return await GetByIdAsync(projectId);
    }

    public async Task<bool> IsUserMemberOfProjectAsync(string projectId, string userId)
    {
        var project = await GetByIdAsync(projectId);
        if (project == null) return false;
        
        return project.OwnerId == userId || 
               project.Members.Any(m => m.UserId == userId);
    }
}
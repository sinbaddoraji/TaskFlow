using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Repositories.Implementations;

public class ProjectRepository : BaseRepository<Project>, IProjectRepository
{
    public ProjectRepository(MongoDbContext context) 
        : base(context.Projects)
    {
    }

    public async Task<List<Project>> GetProjectsByUserIdAsync(string userId)
    {
        var filter = Builders<Project>.Filter.Or(
            Builders<Project>.Filter.Eq(p => p.OwnerId, userId),
            Builders<Project>.Filter.ElemMatch(p => p.Members, m => m.UserId == userId)
        );

        return await _collection
            .Find(filter)
            .SortByDescending(p => p.UpdatedAt)
            .ToListAsync();
    }

    public async Task<List<Project>> GetPublicProjectsAsync()
    {
        var filter = Builders<Project>.Filter.Eq(p => p.IsPublic, true);
        return await _collection
            .Find(filter)
            .SortByDescending(p => p.UpdatedAt)
            .ToListAsync();
    }

    public async Task<Project?> GetProjectWithMembersAsync(string projectId)
    {
        return await _collection
            .Find(p => p.Id == projectId)
            .FirstOrDefaultAsync();
    }
}
using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Repositories.Implementations;

public class TaskRepository : BaseRepository<TaskItem>, ITaskRepository
{
    public TaskRepository(MongoDbContext context) : base(context.Tasks)
    {
    }

    public async Task<List<TaskItem>> GetTasksByUserIdAsync(string userId)
    {
        return await FindAsync(t => t.AssignedUserId == userId);
    }

    public async Task<List<TaskItem>> GetTasksByProjectIdAsync(string projectId)
    {
        return await FindAsync(t => t.ProjectId == projectId);
    }

    public async Task<List<TaskItem>> GetTodayTasksAsync(string userId)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        
        return await FindAsync(t => 
            t.AssignedUserId == userId && 
            (
                (t.DueDate.HasValue && t.DueDate.Value.Date == today) ||
                (t.ScheduledTime.HasValue && t.ScheduledTime.Value >= today && t.ScheduledTime.Value < tomorrow)
            ) &&
            t.Status != Models.Entities.TaskStatus.Completed
        );
    }

    public async Task<List<TaskItem>> GetUpcomingTasksAsync(string userId, int days = 7)
    {
        var today = DateTime.UtcNow.Date;
        var futureDate = today.AddDays(days);
        
        return await FindAsync(t => 
            t.AssignedUserId == userId && 
            (
                (t.DueDate.HasValue && t.DueDate.Value.Date > today && t.DueDate.Value.Date <= futureDate) ||
                (t.ScheduledTime.HasValue && t.ScheduledTime.Value.Date > today && t.ScheduledTime.Value.Date <= futureDate)
            ) &&
            t.Status != Models.Entities.TaskStatus.Completed
        );
    }

    public async Task<List<TaskItem>> GetTasksByPriorityAsync(string userId, TaskPriority priority)
    {
        return await FindAsync(t => t.AssignedUserId == userId && t.Priority == priority);
    }

    public async Task<List<TaskItem>> GetTasksByStatusAsync(string userId, Models.Entities.TaskStatus status)
    {
        return await FindAsync(t => t.AssignedUserId == userId && t.Status == status);
    }

    public async Task<List<TaskItem>> GetOverdueTasksAsync(string userId)
    {
        var today = DateTime.UtcNow.Date;
        
        return await FindAsync(t => 
            t.AssignedUserId == userId && 
            t.DueDate.HasValue && 
            t.DueDate.Value.Date < today &&
            t.Status != Models.Entities.TaskStatus.Completed
        );
    }

    public async Task<List<TaskItem>> SearchTasksAsync(string userId, string searchTerm)
    {
        var filter = Builders<TaskItem>.Filter.And(
            Builders<TaskItem>.Filter.Eq(t => t.AssignedUserId, userId),
            Builders<TaskItem>.Filter.Or(
                Builders<TaskItem>.Filter.Regex(t => t.Title, new MongoDB.Bson.BsonRegularExpression(searchTerm, "i")),
                Builders<TaskItem>.Filter.Regex(t => t.Description, new MongoDB.Bson.BsonRegularExpression(searchTerm, "i"))
            )
        );

        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<TaskItem>> GetTasksByTagsAsync(string userId, List<string> tags)
    {
        return await FindAsync(t => 
            t.AssignedUserId == userId && 
            t.Tags.Any(tag => tags.Contains(tag))
        );
    }

    public async Task<List<TaskItem>> GetTasksByDateRangeAsync(string userId, DateTime startDate, DateTime endDate)
    {
        var startDateUtc = startDate.Date;
        var endDateUtc = endDate.Date.AddDays(1);
        
        return await FindAsync(t => 
            t.AssignedUserId == userId && 
            (
                (t.DueDate.HasValue && t.DueDate.Value >= startDateUtc && t.DueDate.Value < endDateUtc) ||
                (t.ScheduledTime.HasValue && t.ScheduledTime.Value >= startDateUtc && t.ScheduledTime.Value < endDateUtc)
            )
        );
    }

    public async Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        
        return await GetTasksByDateRangeAsync(userId, startDate, endDate);
    }

    public async Task<List<TaskItem>> GetTasksByWeekAsync(string userId, DateTime startDate)
    {
        var endDate = startDate.AddDays(6);
        
        return await GetTasksByDateRangeAsync(userId, startDate, endDate);
    }
}
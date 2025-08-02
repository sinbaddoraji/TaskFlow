using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskFlow.Api.Models.Entities;

public class TaskItem
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;
    
    [BsonElement("description")]
    public string? Description { get; set; }
    
    [BsonElement("priority")]
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    
    [BsonElement("status")]
    public TaskStatus Status { get; set; } = TaskStatus.Pending;
    
    [BsonElement("dueDate")]
    public DateTime? DueDate { get; set; }
    
    [BsonElement("scheduledTime")]
    public DateTime? ScheduledTime { get; set; }
    
    [BsonElement("timeEstimate")]
    public int? TimeEstimateInMinutes { get; set; }
    
    [BsonElement("timeSpent")]
    public int TimeSpentInMinutes { get; set; } = 0;
    
    [BsonElement("projectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ProjectId { get; set; }
    
    [BsonElement("assignedUserId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string AssignedUserId { get; set; } = string.Empty;
    
    [BsonElement("createdById")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CreatedById { get; set; } = string.Empty;
    
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();
    
    [BsonElement("subtasks")]
    public List<SubTask> Subtasks { get; set; } = new();
    
    [BsonElement("comments")]
    public List<Comment> Comments { get; set; } = new();
    
    [BsonElement("recurrence")]
    public TaskRecurrence? Recurrence { get; set; }
    
    [BsonElement("gitInfo")]
    public GitInfo? GitInfo { get; set; }
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }
}

public enum TaskPriority
{
    Low,
    Medium,
    High,
    Urgent
}

public enum TaskStatus
{
    Pending,
    InProgress,
    Completed,
    Cancelled,
    OnHold
}

public class SubTask
{
    [BsonElement("id")]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;
    
    [BsonElement("completed")]
    public bool Completed { get; set; } = false;
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Comment
{
    [BsonElement("id")]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;
    
    [BsonElement("authorId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string AuthorId { get; set; } = string.Empty;
    
    [BsonElement("authorName")]
    public string AuthorName { get; set; } = string.Empty;
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TaskRecurrence
{
    [BsonElement("type")]
    public RecurrenceType Type { get; set; }
    
    [BsonElement("interval")]
    public int Interval { get; set; } = 1;
    
    [BsonElement("daysOfWeek")]
    public List<DayOfWeek>? DaysOfWeek { get; set; }
    
    [BsonElement("endDate")]
    public DateTime? EndDate { get; set; }
}

public enum RecurrenceType
{
    Daily,
    Weekly,
    Monthly,
    Yearly
}

public class GitInfo
{
    [BsonElement("repositoryUrl")]
    public string? RepositoryUrl { get; set; }
    
    [BsonElement("branch")]
    public string? Branch { get; set; }
    
    [BsonElement("commitHash")]
    public string? CommitHash { get; set; }
    
    [BsonElement("pullRequestUrl")]
    public string? PullRequestUrl { get; set; }
}
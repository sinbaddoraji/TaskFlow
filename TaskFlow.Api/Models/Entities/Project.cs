using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskFlow.Api.Models.Entities;

public class Project
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("description")]
    public string? Description { get; set; }
    
    [BsonElement("color")]
    public string Color { get; set; } = "#3B82F6";
    
    [BsonElement("icon")]
    public string? Icon { get; set; }
    
    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;
    
    [BsonElement("teamId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? TeamId { get; set; }
    
    [BsonElement("isArchived")]
    public bool IsArchived { get; set; } = false;
    
    [BsonElement("isPublic")]
    public bool IsPublic { get; set; } = false;
    
    [BsonElement("members")]
    public List<ProjectMember> Members { get; set; } = new();
    
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();
    
    [BsonElement("settings")]
    public ProjectSettings Settings { get; set; } = new();
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ProjectMember
{
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("role")]
    public ProjectRole Role { get; set; } = ProjectRole.Member;
    
    [BsonElement("joinedAt")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public enum ProjectRole
{
    Member,
    Admin,
    Owner
}

public class ProjectSettings
{
    [BsonElement("allowPublicAccess")]
    public bool AllowPublicAccess { get; set; } = false;
    
    [BsonElement("requireApprovalForTasks")]
    public bool RequireApprovalForTasks { get; set; } = false;
    
    [BsonElement("defaultTaskPriority")]
    public TaskPriority DefaultTaskPriority { get; set; } = TaskPriority.Medium;
}
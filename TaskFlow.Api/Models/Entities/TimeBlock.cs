using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskFlow.Api.Models.Entities;

public class TimeBlock
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    [BsonElement("taskId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? TaskId { get; set; }
    
    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;
    
    [BsonElement("description")]
    public string? Description { get; set; }
    
    [BsonElement("startTime")]
    public DateTime StartTime { get; set; }
    
    [BsonElement("endTime")]
    public DateTime EndTime { get; set; }
    
    [BsonElement("type")]
    public TimeBlockType Type { get; set; } = TimeBlockType.Task;
    
    [BsonElement("status")]
    public TimeBlockStatus Status { get; set; } = TimeBlockStatus.Scheduled;
    
    [BsonElement("calendarEventId")]
    public string? CalendarEventId { get; set; }
    
    [BsonElement("actualStartTime")]
    public DateTime? ActualStartTime { get; set; }
    
    [BsonElement("actualEndTime")]
    public DateTime? ActualEndTime { get; set; }
    
    [BsonElement("focusMode")]
    public FocusModeSettings? FocusMode { get; set; }
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum TimeBlockType
{
    Task,
    Meeting,
    Focus,
    Break,
    Personal
}

public enum TimeBlockStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    Overrun
}

public class FocusModeSettings
{
    [BsonElement("pomodoroEnabled")]
    public bool PomodoroEnabled { get; set; } = false;
    
    [BsonElement("workDuration")]
    public int WorkDurationInMinutes { get; set; } = 25;
    
    [BsonElement("breakDuration")]
    public int BreakDurationInMinutes { get; set; } = 5;
    
    [BsonElement("longBreakDuration")]
    public int LongBreakDurationInMinutes { get; set; } = 15;
    
    [BsonElement("sessionsUntilLongBreak")]
    public int SessionsUntilLongBreak { get; set; } = 4;
    
    [BsonElement("blockDistractions")]
    public bool BlockDistractions { get; set; } = true;
    
    [BsonElement("blockedWebsites")]
    public List<string> BlockedWebsites { get; set; } = new();
}
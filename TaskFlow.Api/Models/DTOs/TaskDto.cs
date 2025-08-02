using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Models.DTOs;

public class TaskDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Pending";
    public DateTime? DueDate { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int? TimeEstimateInMinutes { get; set; }
    public int TimeSpentInMinutes { get; set; }
    public string? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string AssignedUserId { get; set; } = string.Empty;
    public string? AssignedUserName { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<SubTaskDto> Subtasks { get; set; } = new();
    public TaskRecurrenceDto? Recurrence { get; set; }
    public GitInfoDto? GitInfo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class SubTaskDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool Completed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaskRecurrenceDto
{
    public string Type { get; set; } = string.Empty;
    public int Interval { get; set; } = 1;
    public List<string>? DaysOfWeek { get; set; }
    public DateTime? EndDate { get; set; }
}

public class GitInfoDto
{
    public string? RepositoryUrl { get; set; }
    public string? Branch { get; set; }
    public string? CommitHash { get; set; }
    public string? PullRequestUrl { get; set; }
}

public class TaskTimelineDto
{
    public List<TaskDto> TodayTasks { get; set; } = new();
    public List<TaskDto> UpcomingTasks { get; set; } = new();
}
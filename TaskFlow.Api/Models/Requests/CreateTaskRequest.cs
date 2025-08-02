using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Models.Requests;

public class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Pending";
    public DateTime? DueDate { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int? TimeEstimateInMinutes { get; set; }
    public string? ProjectId { get; set; }
    public string? AssignedUserId { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<CreateSubTaskRequest> Subtasks { get; set; } = new();
    public TaskRecurrenceRequest? Recurrence { get; set; }
    public GitInfoRequest? GitInfo { get; set; }
}

public class CreateSubTaskRequest
{
    public string Title { get; set; } = string.Empty;
}

public class TaskRecurrenceRequest
{
    public string Type { get; set; } = string.Empty;
    public int Interval { get; set; } = 1;
    public List<string>? DaysOfWeek { get; set; }
    public DateTime? EndDate { get; set; }
}

public class GitInfoRequest
{
    public string? RepositoryUrl { get; set; }
    public string? Branch { get; set; }
    public string? CommitHash { get; set; }
    public string? PullRequestUrl { get; set; }
}
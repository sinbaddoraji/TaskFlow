using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Models.Requests;

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Priority { get; set; }
    public string? Status { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int? TimeEstimateInMinutes { get; set; }
    public string? ProjectId { get; set; }
    public string? AssignedUserId { get; set; }
    public List<string>? Tags { get; set; }
    public List<UpdateSubTaskRequest>? Subtasks { get; set; }
    public TaskRecurrenceRequest? Recurrence { get; set; }
    public GitInfoRequest? GitInfo { get; set; }
}

public class UpdateSubTaskRequest
{
    public string? Id { get; set; }
    public string? Title { get; set; }
    public bool? Completed { get; set; }
}
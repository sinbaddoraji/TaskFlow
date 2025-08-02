using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Models.DTOs;

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public string? Icon { get; set; }
    public string OwnerId { get; set; } = string.Empty;
    public string? OwnerName { get; set; }
    public bool IsArchived { get; set; }
    public bool IsPublic { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public ProjectSettingsDto Settings { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int TaskCount { get; set; }
}

public class ProjectMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string Role { get; set; } = "Member";
    public DateTime JoinedAt { get; set; }
}

public class ProjectSettingsDto
{
    public bool AllowPublicAccess { get; set; }
    public bool RequireApprovalForTasks { get; set; }
    public string DefaultTaskPriority { get; set; } = "Medium";
}
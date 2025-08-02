namespace TaskFlow.Api.Models.Requests;

public class CreateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public string? Icon { get; set; }
    public bool IsPublic { get; set; } = false;
    public List<string> Tags { get; set; } = new();
    public ProjectSettingsRequest Settings { get; set; } = new();
}

public class ProjectSettingsRequest
{
    public bool AllowPublicAccess { get; set; } = false;
    public bool RequireApprovalForTasks { get; set; } = false;
    public string DefaultTaskPriority { get; set; } = "Medium";
}
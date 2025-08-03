namespace TaskFlow.Api.Models.Requests;

public class UpdateProjectRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public bool? IsArchived { get; set; }
    public bool? IsPublic { get; set; }
    public List<string>? Tags { get; set; }
    public ProjectSettingsRequest? Settings { get; set; }
}

public class AddProjectMemberRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
}

public class UpdateProjectMemberRoleRequest
{
    public string Role { get; set; } = string.Empty;
}
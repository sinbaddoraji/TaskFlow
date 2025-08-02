using TaskFlow.Api.Models.DTOs;

namespace TaskFlow.Api.Models.Responses;

public class ProfileResponse
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ProfilePicture { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public UserPreferencesDto Preferences { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
    public ProfileStatistics Statistics { get; set; } = new();
}

public class ProfileStatistics
{
    public int TotalProjects { get; set; }
    public int ActiveTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
}

public class UserPreferencesDto
{
    public string Theme { get; set; } = "light";
    public string TimeFormat { get; set; } = "12h";
    public string StartOfWeek { get; set; } = "monday";
    public NotificationSettingsDto Notifications { get; set; } = new();
}

public class NotificationSettingsDto
{
    public bool Email { get; set; } = true;
    public bool Push { get; set; } = true;
    public bool TaskReminders { get; set; } = true;
}
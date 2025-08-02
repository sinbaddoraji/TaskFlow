namespace TaskFlow.Api.Models.DTOs;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ProfilePicture { get; set; }
    public UserPreferencesDto Preferences { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
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
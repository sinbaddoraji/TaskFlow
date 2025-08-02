using Microsoft.AspNetCore.Http;

namespace TaskFlow.Api.Models.Requests;

public class UpdateProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdatePreferencesRequest
{
    public string? Theme { get; set; }
    public string? TimeFormat { get; set; }
    public string? StartOfWeek { get; set; }
    public NotificationPreferences? Notifications { get; set; }
}

public class NotificationPreferences
{
    public bool? Email { get; set; }
    public bool? Push { get; set; }
    public bool? TaskReminders { get; set; }
}

public class UploadAvatarRequest
{
    public IFormFile File { get; set; } = null!;
}
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskFlow.Api.Models.Entities;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;
    
    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;
    
    [BsonElement("profilePicture")]
    public string? ProfilePicture { get; set; }
    
    [BsonElement("bio")]
    public string? Bio { get; set; }
    
    [BsonElement("phone")]
    public string? Phone { get; set; }
    
    [BsonElement("location")]
    public string? Location { get; set; }
    
    [BsonElement("website")]
    public string? Website { get; set; }
    
    [BsonElement("preferences")]
    public UserPreferences Preferences { get; set; } = new();
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
    
    // MFA Fields
    [BsonElement("mfaEnabled")]
    public bool MfaEnabled { get; set; } = false;
    
    [BsonElement("mfaSecret")]
    public string? MfaSecret { get; set; }
    
    [BsonElement("mfaBackupCodes")]
    public List<string> MfaBackupCodes { get; set; } = new();
    
    [BsonElement("mfaSetupCompleted")]
    public bool MfaSetupCompleted { get; set; } = false;
    
    [BsonElement("phoneNumber")]
    public string? PhoneNumber { get; set; }
    
    [BsonElement("phoneNumberVerified")]
    public bool PhoneNumberVerified { get; set; } = false;
    
    [BsonElement("lastPasswordChange")]
    public DateTime? LastPasswordChange { get; set; }
    
    [BsonElement("failedLoginAttempts")]
    public int FailedLoginAttempts { get; set; } = 0;
    
    [BsonElement("lockoutEndTime")]
    public DateTime? LockoutEndTime { get; set; }
}

public class UserPreferences
{
    [BsonElement("theme")]
    public string Theme { get; set; } = "light";
    
    [BsonElement("timeFormat")]
    public string TimeFormat { get; set; } = "12h";
    
    [BsonElement("startOfWeek")]
    public string StartOfWeek { get; set; } = "monday";
    
    [BsonElement("notifications")]
    public NotificationSettings Notifications { get; set; } = new();
}

public class NotificationSettings
{
    [BsonElement("email")]
    public bool Email { get; set; } = true;
    
    [BsonElement("push")]
    public bool Push { get; set; } = true;
    
    [BsonElement("taskReminders")]
    public bool TaskReminders { get; set; } = true;
}
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskFlow.Api.Models.Entities;

public class AuthAuditLog
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;
    
    [BsonElement("userId")]
    public string? UserId { get; set; }
    
    [BsonElement("email")]
    public string? Email { get; set; }
    
    [BsonElement("eventType")]
    public AuthEventType EventType { get; set; }
    
    [BsonElement("success")]
    public bool Success { get; set; }
    
    [BsonElement("failureReason")]
    public string? FailureReason { get; set; }
    
    [BsonElement("ipAddress")]
    public string? IpAddress { get; set; }
    
    [BsonElement("userAgent")]
    public string? UserAgent { get; set; }
    
    [BsonElement("deviceFingerprint")]
    public string? DeviceFingerprint { get; set; }
    
    [BsonElement("location")]
    public GeoLocation? Location { get; set; }
    
    [BsonElement("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum AuthEventType
{
    Login,
    LoginFailed,
    Logout,
    Register,
    RegisterFailed,
    PasswordChange,
    PasswordChangeFailed,
    PasswordReset,
    PasswordResetFailed,
    MfaEnabled,
    MfaDisabled,
    MfaVerified,
    MfaFailed,
    TokenRefresh,
    TokenRefreshFailed,
    AccountLocked,
    AccountUnlocked,
    SuspiciousActivity
}

public class GeoLocation
{
    [BsonElement("country")]
    public string? Country { get; set; }
    
    [BsonElement("city")]
    public string? City { get; set; }
    
    [BsonElement("latitude")]
    public double? Latitude { get; set; }
    
    [BsonElement("longitude")]
    public double? Longitude { get; set; }
}
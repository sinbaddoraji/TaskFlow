using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Services.Interfaces;

public interface IAuthAuditService
{
    Task LogEventAsync(
        AuthEventType eventType,
        bool success,
        string? userId = null,
        string? email = null,
        string? failureReason = null,
        string? ipAddress = null,
        string? userAgent = null,
        Dictionary<string, object>? metadata = null);
    
    Task<List<AuthAuditLog>> GetUserAuditLogsAsync(string userId, int limit = 100);
    Task<List<AuthAuditLog>> GetRecentFailedLoginsAsync(string email, TimeSpan timespan);
    Task<bool> HasSuspiciousActivityAsync(string userId, string ipAddress);
    Task<List<AuthAuditLog>> GetAuditLogsByIpAsync(string ipAddress, int limit = 100);
}
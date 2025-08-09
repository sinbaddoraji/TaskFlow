using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Services.Interfaces;

namespace TaskFlow.Api.Services.Implementations;

public class AuthAuditService : IAuthAuditService
{
    private readonly IMongoCollection<AuthAuditLog> _auditLogs;
    private readonly ILogger<AuthAuditService> _logger;
    
    public AuthAuditService(MongoDbContext dbContext, ILogger<AuthAuditService> logger)
    {
        _auditLogs = dbContext.Database.GetCollection<AuthAuditLog>("auth_audit_logs");
        _logger = logger;
        
        // Create indexes
        CreateIndexes();
    }
    
    private void CreateIndexes()
    {
        var indexKeys = Builders<AuthAuditLog>.IndexKeys;
        var indexes = new List<CreateIndexModel<AuthAuditLog>>
        {
            new(indexKeys.Ascending(x => x.UserId)),
            new(indexKeys.Ascending(x => x.Email)),
            new(indexKeys.Ascending(x => x.EventType)),
            new(indexKeys.Ascending(x => x.IpAddress)),
            new(indexKeys.Descending(x => x.CreatedAt)),
            new(indexKeys.Combine(
                indexKeys.Ascending(x => x.UserId),
                indexKeys.Descending(x => x.CreatedAt)
            )),
            new(indexKeys.Combine(
                indexKeys.Ascending(x => x.Email),
                indexKeys.Ascending(x => x.EventType),
                indexKeys.Descending(x => x.CreatedAt)
            ))
        };
        
        _auditLogs.Indexes.CreateMany(indexes);
    }
    
    public async Task LogEventAsync(
        AuthEventType eventType,
        bool success,
        string? userId = null,
        string? email = null,
        string? failureReason = null,
        string? ipAddress = null,
        string? userAgent = null,
        Dictionary<string, object>? metadata = null)
    {
        try
        {
            var auditLog = new AuthAuditLog
            {
                UserId = userId,
                Email = email,
                EventType = eventType,
                Success = success,
                FailureReason = failureReason,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Metadata = metadata,
                CreatedAt = DateTime.UtcNow
            };
            
            // Try to get geolocation (in production, use a proper IP geolocation service)
            if (!string.IsNullOrEmpty(ipAddress) && ipAddress != "::1" && ipAddress != "127.0.0.1")
            {
                // For now, just log the IP
                auditLog.Location = new GeoLocation { Country = "Unknown" };
            }
            
            await _auditLogs.InsertOneAsync(auditLog);
            
            // Log suspicious activities
            if (eventType == AuthEventType.LoginFailed && await IsSuspiciousFailedLoginPattern(email, ipAddress))
            {
                await LogEventAsync(
                    AuthEventType.SuspiciousActivity,
                    false,
                    userId,
                    email,
                    "Multiple failed login attempts detected",
                    ipAddress,
                    userAgent,
                    new Dictionary<string, object> { ["originalEvent"] = eventType.ToString() }
                );
            }
            
            _logger.LogInformation("Audit log created: {EventType} for user {UserId} from IP {IpAddress}",
                eventType, userId ?? "unknown", ipAddress ?? "unknown");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create audit log for event {EventType}", eventType);
        }
    }
    
    public async Task<List<AuthAuditLog>> GetUserAuditLogsAsync(string userId, int limit = 100)
    {
        return await _auditLogs
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }
    
    public async Task<List<AuthAuditLog>> GetRecentFailedLoginsAsync(string email, TimeSpan timespan)
    {
        var startTime = DateTime.UtcNow.Subtract(timespan);
        
        return await _auditLogs
            .Find(x => x.Email == email && 
                      x.EventType == AuthEventType.LoginFailed && 
                      x.CreatedAt >= startTime)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }
    
    public async Task<bool> HasSuspiciousActivityAsync(string userId, string ipAddress)
    {
        // Check for recent suspicious activity flags
        var recentSuspiciousActivity = await _auditLogs
            .Find(x => x.UserId == userId && 
                      x.EventType == AuthEventType.SuspiciousActivity &&
                      x.CreatedAt >= DateTime.UtcNow.AddHours(-24))
            .FirstOrDefaultAsync();
            
        if (recentSuspiciousActivity != null)
            return true;
        
        // Check for login from new location
        var userIpAddresses = await _auditLogs
            .Find(x => x.UserId == userId && 
                      x.EventType == AuthEventType.Login && 
                      x.Success == true)
            .Project(x => x.IpAddress)
            .ToListAsync();
        
        var uniqueIps = userIpAddresses.Distinct().Count();
        
        // If user has logged in from more than 5 different IPs in the last 24 hours
        if (uniqueIps > 5)
            return true;
        
        return false;
    }
    
    public async Task<List<AuthAuditLog>> GetAuditLogsByIpAsync(string ipAddress, int limit = 100)
    {
        return await _auditLogs
            .Find(x => x.IpAddress == ipAddress)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync();
    }
    
    private async Task<bool> IsSuspiciousFailedLoginPattern(string? email, string? ipAddress)
    {
        if (string.IsNullOrEmpty(email))
            return false;
            
        // Check for multiple failed attempts in short time
        var recentFailures = await GetRecentFailedLoginsAsync(email, TimeSpan.FromMinutes(15));
        
        // If more than 5 failed attempts in 15 minutes
        if (recentFailures.Count > 5)
            return true;
            
        // Check if same IP is trying multiple different emails
        if (!string.IsNullOrEmpty(ipAddress))
        {
            var ipAttempts = await _auditLogs
                .Find(x => x.IpAddress == ipAddress && 
                          x.EventType == AuthEventType.LoginFailed &&
                          x.CreatedAt >= DateTime.UtcNow.AddMinutes(-15))
                .Project(x => x.Email)
                .ToListAsync();
                
            var uniqueEmails = ipAttempts.Distinct().Count();
            
            // If same IP tried more than 3 different emails
            if (uniqueEmails > 3)
                return true;
        }
        
        return false;
    }
}
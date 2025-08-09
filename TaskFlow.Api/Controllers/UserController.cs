using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Services.Interfaces;
using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class UserController : BaseController
{
    private readonly IAuthAuditService _auditService;
    
    public UserController(
        ILogger<UserController> logger,
        IAuthAuditService auditService) : base(logger)
    {
        _auditService = auditService;
    }
    
    [HttpGet("security/audit-logs")]
    public async Task<ActionResult<ApiResponse<List<AuthAuditLog>>>> GetAuditLogs(
        [FromQuery] int limit = 50)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<List<AuthAuditLog>>.ErrorResult("User not authenticated"));
            }
            
            // Limit max results to 100
            limit = Math.Min(limit, 100);
            
            var auditLogs = await _auditService.GetUserAuditLogsAsync(userId, limit);
            
            return Ok(ApiResponse<List<AuthAuditLog>>.SuccessResult(
                auditLogs, 
                $"Retrieved {auditLogs.Count} audit log entries"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit logs");
            return StatusCode(500, ApiResponse<List<AuthAuditLog>>.ErrorResult("An error occurred while retrieving audit logs"));
        }
    }
    
    [HttpGet("security/login-activity")]
    public async Task<ActionResult<ApiResponse<object>>> GetLoginActivity()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("User not authenticated"));
            }
            
            var recentLogs = await _auditService.GetUserAuditLogsAsync(userId, 20);
            
            var loginActivity = new
            {
                RecentLogins = recentLogs
                    .Where(l => l.EventType == AuthEventType.Login && l.Success)
                    .Select(l => new
                    {
                        l.CreatedAt,
                        l.IpAddress,
                        l.UserAgent,
                        l.Location
                    })
                    .Take(10),
                FailedAttempts = recentLogs
                    .Where(l => l.EventType == AuthEventType.LoginFailed)
                    .Select(l => new
                    {
                        l.CreatedAt,
                        l.IpAddress,
                        l.FailureReason
                    })
                    .Take(5),
                SecurityEvents = recentLogs
                    .Where(l => l.EventType == AuthEventType.PasswordChange || 
                               l.EventType == AuthEventType.AccountLocked ||
                               l.EventType == AuthEventType.SuspiciousActivity)
                    .Select(l => new
                    {
                        l.EventType,
                        l.CreatedAt,
                        l.FailureReason
                    })
                    .Take(5)
            };
            
            return Ok(ApiResponse<object>.SuccessResult(loginActivity, "Login activity retrieved successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving login activity");
            return StatusCode(500, ApiResponse<object>.ErrorResult("An error occurred while retrieving login activity"));
        }
    }
}
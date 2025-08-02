using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace TaskFlow.Api.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected readonly ILogger _logger;

    protected BaseController(ILogger logger)
    {
        _logger = logger;
    }

    protected string? GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    protected string? GetCurrentUserEmail()
    {
        return User.FindFirst(ClaimTypes.Email)?.Value;
    }

    protected string? GetCurrentUserName()
    {
        return User.FindFirst(ClaimTypes.Name)?.Value;
    }

    protected bool IsAuthenticated()
    {
        return User.Identity?.IsAuthenticated ?? false;
    }
}
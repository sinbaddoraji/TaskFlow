using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Services.Interfaces;

namespace TaskFlow.Api.Filters;

public class ValidateCsrfTokenAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        // Skip CSRF validation for GET requests
        if (context.HttpContext.Request.Method.Equals("GET", StringComparison.OrdinalIgnoreCase))
        {
            base.OnActionExecuting(context);
            return;
        }
        
        var csrfService = context.HttpContext.RequestServices.GetRequiredService<ICsrfService>();
        var userId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(userId))
        {
            context.Result = new UnauthorizedObjectResult(
                ApiResponse<object>.ErrorResult("User not authenticated"));
            return;
        }
        
        // Try to get CSRF token from header first, then from form data
        var csrfToken = context.HttpContext.Request.Headers["X-XSRF-TOKEN"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(csrfToken))
        {
            context.Result = new BadRequestObjectResult(
                ApiResponse<object>.ErrorResult("CSRF token is required"));
            return;
        }
        
        if (!csrfService.ValidateToken(csrfToken, userId))
        {
            context.Result = new BadRequestObjectResult(
                ApiResponse<object>.ErrorResult("Invalid or expired CSRF token"));
            return;
        }
        
        base.OnActionExecuting(context);
    }
}
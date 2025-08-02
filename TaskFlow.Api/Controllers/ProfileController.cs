using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TaskFlow.Api.Models.Requests;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Services.Interfaces;
using TaskFlow.Api.Repositories.Interfaces;
using TaskFlow.Api.Models.Entities;
using BCrypt.Net;
using System.Security.Claims;
using FluentValidation;
using TaskFlow.Api.Validators;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ProfileController : BaseController
{
    private readonly IUserRepository _userRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IWebHostEnvironment _environment;
    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB
    private readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };

    public ProfileController(
        IUserRepository userRepository,
        IProjectRepository projectRepository,
        ITaskRepository taskRepository,
        IWebHostEnvironment environment,
        ILogger<ProfileController> logger)
        : base(logger)
    {
        _userRepository = userRepository;
        _projectRepository = projectRepository;
        _taskRepository = taskRepository;
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<ProfileResponse>>> GetProfile()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<ProfileResponse>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<ProfileResponse>.ErrorResult("User not found"));
            }

            // Get statistics
            var projects = await _projectRepository.GetAllAsync();
            var userProjects = projects.Where(p => p.OwnerId == userId || p.Members.Any(m => m.UserId == userId));
            var tasks = await _taskRepository.GetAllAsync();
            var userTasks = tasks.Where(t => t.AssignedUserId == userId || t.CreatedById == userId);
            
            var profile = new ProfileResponse
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                ProfilePicture = user.ProfilePicture,
                Bio = user.Bio,
                Phone = user.Phone,
                Location = user.Location,
                Website = user.Website,
                Preferences = new UserPreferencesDto
                {
                    Theme = user.Preferences.Theme,
                    TimeFormat = user.Preferences.TimeFormat,
                    StartOfWeek = user.Preferences.StartOfWeek,
                    Notifications = new NotificationSettingsDto
                    {
                        Email = user.Preferences.Notifications.Email,
                        Push = user.Preferences.Notifications.Push,
                        TaskReminders = user.Preferences.Notifications.TaskReminders
                    }
                },
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                IsActive = user.IsActive,
                Statistics = new ProfileStatistics
                {
                    TotalProjects = userProjects.Count(),
                    ActiveTasks = userTasks.Count(t => t.Status != TaskFlow.Api.Models.Entities.TaskStatus.Completed),
                    CompletedTasks = userTasks.Count(t => t.Status == TaskFlow.Api.Models.Entities.TaskStatus.Completed),
                    OverdueTasks = userTasks.Count(t => t.DueDate < DateTime.UtcNow && t.Status != TaskFlow.Api.Models.Entities.TaskStatus.Completed)
                }
            };

            return Ok(ApiResponse<ProfileResponse>.SuccessResult(profile, "Profile retrieved successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving profile");
            return StatusCode(500, ApiResponse<ProfileResponse>.ErrorResult("An error occurred while retrieving profile"));
        }
    }

    [HttpPut]
    public async Task<ActionResult<ApiResponse<ProfileResponse>>> UpdateProfile(UpdateProfileRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<ProfileResponse>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<ProfileResponse>.ErrorResult("User not found"));
            }

            // Update user properties
            user.Name = request.Name ?? user.Name;
            user.Bio = request.Bio;
            user.Phone = request.Phone;
            user.Location = request.Location;
            user.Website = request.Website;
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user.Id, user);

            return await GetProfile();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile");
            return StatusCode(500, ApiResponse<ProfileResponse>.ErrorResult("An error occurred while updating profile"));
        }
    }

    [HttpPost("avatar")]
    public async Task<ActionResult<ApiResponse<string>>> UploadAvatar([FromForm] UploadAvatarRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<string>.ErrorResult("User not authenticated"));
            }

            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<string>.ErrorResult("No file uploaded"));
            }

            if (request.File.Length > MaxFileSize)
            {
                return BadRequest(ApiResponse<string>.ErrorResult($"File size exceeds maximum allowed size of {MaxFileSize / 1024 / 1024}MB"));
            }

            var extension = Path.GetExtension(request.File.FileName).ToLower();
            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(ApiResponse<string>.ErrorResult($"Invalid file type. Allowed types: {string.Join(", ", AllowedExtensions)}"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("User not found"));
            }

            // Create uploads directory if it doesn't exist
            var uploadsDir = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", "avatars");
            Directory.CreateDirectory(uploadsDir);

            // Delete old avatar if exists
            if (!string.IsNullOrEmpty(user.ProfilePicture))
            {
                var oldPath = Path.Combine(_environment.WebRootPath ?? "wwwroot", user.ProfilePicture.TrimStart('/'));
                if (System.IO.File.Exists(oldPath))
                {
                    System.IO.File.Delete(oldPath);
                }
            }

            // Generate unique filename
            var fileName = $"{userId}_{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsDir, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.File.CopyToAsync(stream);
            }

            // Update user profile picture
            user.ProfilePicture = $"/uploads/avatars/{fileName}";
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user.Id, user);

            return Ok(ApiResponse<string>.SuccessResult(user.ProfilePicture, "Avatar uploaded successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading avatar");
            return StatusCode(500, ApiResponse<string>.ErrorResult("An error occurred while uploading avatar"));
        }
    }

    [HttpPut("password")]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword(ChangePasswordRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));
            }

            // Validate new password
            var validator = new PasswordValidator();
            var validationResult = await validator.ValidateAsync(request.NewPassword);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse<bool>.ErrorResult(errors));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<bool>.ErrorResult("User not found"));
            }

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(ApiResponse<bool>.ErrorResult("Current password is incorrect"));
            }

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user.Id, user);

            return Ok(ApiResponse<bool>.SuccessResult(true, "Password changed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while changing password"));
        }
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<ApiResponse<ProfileResponse>>> UpdatePreferences(UpdatePreferencesRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<ProfileResponse>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<ProfileResponse>.ErrorResult("User not found"));
            }

            // Update preferences
            if (!string.IsNullOrEmpty(request.Theme))
                user.Preferences.Theme = request.Theme;
            if (!string.IsNullOrEmpty(request.TimeFormat))
                user.Preferences.TimeFormat = request.TimeFormat;
            if (!string.IsNullOrEmpty(request.StartOfWeek))
                user.Preferences.StartOfWeek = request.StartOfWeek;
            
            if (request.Notifications != null)
            {
                if (request.Notifications.Email.HasValue)
                    user.Preferences.Notifications.Email = request.Notifications.Email.Value;
                if (request.Notifications.Push.HasValue)
                    user.Preferences.Notifications.Push = request.Notifications.Push.Value;
                if (request.Notifications.TaskReminders.HasValue)
                    user.Preferences.Notifications.TaskReminders = request.Notifications.TaskReminders.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user.Id, user);

            return await GetProfile();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating preferences");
            return StatusCode(500, ApiResponse<ProfileResponse>.ErrorResult("An error occurred while updating preferences"));
        }
    }
}

public class PasswordValidator : AbstractValidator<string>
{
    public PasswordValidator()
    {
        RuleFor(x => x)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters long")
            .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches(@"\d").WithMessage("Password must contain at least one number")
            .Matches(@"[!@#$%^&*(),.?"":{}|<>]").WithMessage("Password must contain at least one special character");
    }
}
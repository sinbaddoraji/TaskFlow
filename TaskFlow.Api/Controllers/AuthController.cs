using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TaskFlow.Api.Models.Requests;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Services.Interfaces;
using TaskFlow.Api.Repositories.Interfaces;
using TaskFlow.Api.Models.Entities;
using AutoMapper;
using TaskFlow.Api.Models.DTOs;
using TaskFlow.Api.Validators;
using OtpNet;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using TaskFlow.Api.Data.Configuration;
using System.Security.Claims;
using TaskFlow.Api.Filters;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController(
    IUserRepository userRepository,
    IJwtService jwtService,
    IMapper mapper,
    ILogger<AuthController> logger,
    IOptions<JwtSettings> jwtSettings,
    IPasswordService passwordService,
    IAuthAuditService auditService,
    ICsrfService csrfService)
    : BaseController(logger)
{
    private readonly JwtSettings _jwtSettings = jwtSettings.Value;
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(RegisterRequest request)
    {
        try
        {
            // Validate request
            var validator = new RegisterRequestValidator();
            var validationResult = await validator.ValidateAsync(request);
            
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult(errors));
            }
            
            // Check if user already exists
            if (await userRepository.EmailExistsAsync(request.Email))
            {
                await auditService.LogEventAsync(
                    AuthEventType.RegisterFailed,
                    false,
                    email: request.Email,
                    failureReason: "Email already exists",
                    ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers.UserAgent);
                
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("User with this email already exists"));
            }

            // Create new user
            var user = new User
            {
                Email = request.Email.ToLower().Trim(),
                Name = request.Name.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var createdUser = await userRepository.CreateAsync(user);
            
            // Generate token pair
            var (accessToken, refreshToken) = await jwtService.GenerateTokenPairAsync(
                createdUser, 
                Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent);
            
            var userDto = mapper.Map<UserDto>(createdUser);

            // Set httpOnly cookies and CSRF token
            SetAuthCookies(accessToken, refreshToken.Token, refreshToken.ExpiresAt);
            SetCsrfToken(createdUser.Id);
            
            var authResponse = new AuthResponse
            {
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                RefreshExpiresAt = refreshToken.ExpiresAt,
                User = userDto
            };
            
            // Log successful registration
            await auditService.LogEventAsync(
                AuthEventType.Register,
                true,
                userId: createdUser.Id,
                email: createdUser.Email,
                ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers.UserAgent);

            return Ok(ApiResponse<AuthResponse>.SuccessResult(authResponse, "User registered successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering user");
             return StatusCode(500, ApiResponse<AuthResponse>.ErrorResult("An error occurred during registration"));
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request)
    {
        try
        {
            // Validate request
            var validator = new LoginRequestValidator();
            var validationResult = await validator.ValidateAsync(request);
            
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult(errors));
            }
            
            // Find user by email
            var user = await userRepository.GetByEmailAsync(request.Email);    
            if (user == null)
            {
                await auditService.LogEventAsync(
                    AuthEventType.LoginFailed,
                    false,
                    email: request.Email,
                    failureReason: "User not found",
                    ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers.UserAgent);
                    
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Invalid email or password"));
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                // Increment failed login attempts
                user.FailedLoginAttempts++;
                await userRepository.UpdateAsync(user.Id, user);
                
                await auditService.LogEventAsync(
                    AuthEventType.LoginFailed,
                    false,
                    userId: user.Id,
                    email: user.Email,
                    failureReason: "Invalid password",
                    ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers.UserAgent);
                    
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Invalid email or password"));
            }

            // Check if user is active
            if (!user.IsActive)
            {
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Account is disabled"));
            }
            
            // Check for account lockout
            if (user.LockoutEndTime.HasValue && user.LockoutEndTime > DateTime.UtcNow)
            {
                var remainingTime = user.LockoutEndTime.Value - DateTime.UtcNow;
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult($"Account is locked. Try again in {Math.Ceiling(remainingTime.TotalMinutes)} minutes"));
            }
            
            // Reset failed attempts on successful password verification
            if (user.FailedLoginAttempts > 0)
            {
                user.FailedLoginAttempts = 0;
                user.LockoutEndTime = null;
                await userRepository.UpdateAsync(user.Id, user);
            }

            // Check if MFA is enabled
            if (user.MfaEnabled && user.MfaSetupCompleted)
            {
                // Return partial response requiring MFA
                var mfaResponse = new AuthResponse
                {
                    RequiresMfa = true,
                    MfaToken = GenerateTemporaryMfaToken(user.Id),
                    User = mapper.Map<UserDto>(user)
                };
                return Ok(ApiResponse<AuthResponse>.SuccessResult(mfaResponse, "MFA verification required"));
            }

            // Generate token pair
            var (accessToken, refreshToken) = await jwtService.GenerateTokenPairAsync(
                user, 
                Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent);
            
            var userDto = mapper.Map<UserDto>(user);

            // Set httpOnly cookies and CSRF token
            SetAuthCookies(accessToken, refreshToken.Token, refreshToken.ExpiresAt);
            SetCsrfToken(user.Id);
            
            var authResponse = new AuthResponse
            {
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                RefreshExpiresAt = refreshToken.ExpiresAt,
                User = userDto,
                RequiresMfa = false
            };
            
            // Log successful login
            await auditService.LogEventAsync(
                AuthEventType.Login,
                true,
                userId: user.Id,
                email: user.Email,
                ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers.UserAgent);

            return Ok(ApiResponse<AuthResponse>.SuccessResult(authResponse, "Login successful"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, ApiResponse<AuthResponse>.ErrorResult("An error occurred during login"));
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken()
    {
        try
        {
            // Debug: Log all cookies and headers received
            _logger.LogInformation("Refresh endpoint called. Cookies received: {Cookies}", 
                string.Join(", ", Request.Cookies.Select(c => $"{c.Key}={c.Value?.Substring(0, Math.Min(c.Value.Length, 20))}...")));
            _logger.LogInformation("Request headers: Origin={Origin}, Referer={Referer}, UserAgent={UserAgent}", 
                Request.Headers["Origin"], Request.Headers["Referer"], Request.Headers["User-Agent"]);
            
            // Get refresh token from cookie
            var refreshTokenFromCookie = Request.Cookies["RefreshToken"];
            if (string.IsNullOrEmpty(refreshTokenFromCookie))
            {
                _logger.LogWarning("No RefreshToken cookie found in request");
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Refresh token is required"));
            }

            var result = await jwtService.RefreshTokenAsync(
                refreshTokenFromCookie,
                Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent);
            
            if (result == null)
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("Invalid or expired refresh token"));
            }

            var (accessToken, refreshToken) = result.Value;
            var user = await userRepository.GetByIdAsync(refreshToken.UserId);
            var userDto = mapper.Map<UserDto>(user!);

            // Set httpOnly cookies and CSRF token
            SetAuthCookies(accessToken, refreshToken.Token, refreshToken.ExpiresAt);
            SetCsrfToken(user!.Id);
            
            var authResponse = new AuthResponse
            {
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                RefreshExpiresAt = refreshToken.ExpiresAt,
                User = userDto
            };

            return Ok(ApiResponse<AuthResponse>.SuccessResult(authResponse, "Token refreshed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return StatusCode(500, ApiResponse<AuthResponse>.ErrorResult("An error occurred while refreshing token"));
        }
    }
    
    [HttpPost("verify-mfa")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> VerifyMfa(MfaVerificationRequest request)
    {
        try
        {
            // Validate MFA token
            if (!ValidateTemporaryMfaToken(request.MfaToken, out var userId))
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("Invalid or expired MFA token"));
            }

            var user = await userRepository.GetByIdAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("User not found or inactive"));
            }

            if (!user.MfaEnabled || string.IsNullOrEmpty(user.MfaSecret))
            {
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("MFA is not enabled for this account"));
            }

            bool isValid = false;

            // Check if using backup code
            if (!string.IsNullOrEmpty(request.BackupCode))
            {
                // Verify backup code
                foreach (var hashedCode in user.MfaBackupCodes)
                {
                    if (BCrypt.Net.BCrypt.Verify(request.BackupCode, hashedCode))
                    {
                        isValid = true;
                        // Remove used backup code
                        user.MfaBackupCodes.Remove(hashedCode);
                        await userRepository.UpdateAsync(user.Id, user);
                        break;
                    }
                }
            }
            else if (!string.IsNullOrEmpty(request.Code))
            {
                // Verify TOTP code
                var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
                isValid = totp.VerifyTotp(request.Code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
            }

            if (!isValid)
            {
                // Increment failed attempts
                user.FailedLoginAttempts++;
                
                // Lock account after 5 failed attempts
                if (user.FailedLoginAttempts >= 5)
                {
                    user.LockoutEndTime = DateTime.UtcNow.AddMinutes(15);
                    
                    await auditService.LogEventAsync(
                        AuthEventType.AccountLocked,
                        false,
                        userId: user.Id,
                        email: user.Email,
                        failureReason: "Too many failed MFA attempts",
                        ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                        userAgent: Request.Headers.UserAgent);
                }
                
                await userRepository.UpdateAsync(user.Id, user);
                
                await auditService.LogEventAsync(
                    AuthEventType.MfaFailed,
                    false,
                    userId: user.Id,
                    email: user.Email,
                    failureReason: "Invalid verification code",
                    ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                    userAgent: Request.Headers.UserAgent);
                
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Invalid verification code"));
            }

            // Reset failed attempts
            user.FailedLoginAttempts = 0;
            user.LockoutEndTime = null;
            await userRepository.UpdateAsync(user.Id, user);

            // Generate full access token pair
            var (accessToken, refreshToken) = await jwtService.GenerateTokenPairAsync(
                user, 
                Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent);
            
            var userDto = mapper.Map<UserDto>(user);

            // Set httpOnly cookies and CSRF token
            SetAuthCookies(accessToken, refreshToken.Token, refreshToken.ExpiresAt);
            SetCsrfToken(user.Id);
            
            var authResponse = new AuthResponse
            {
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                RefreshExpiresAt = refreshToken.ExpiresAt,
                User = userDto,
                RequiresMfa = false
            };

            // Log successful MFA verification
            await auditService.LogEventAsync(
                AuthEventType.MfaVerified,
                true,
                userId: user.Id,
                email: user.Email,
                ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers.UserAgent,
                metadata: new Dictionary<string, object> { ["method"] = !string.IsNullOrEmpty(request.BackupCode) ? "backup_code" : "totp" });
            
            return Ok(ApiResponse<AuthResponse>.SuccessResult(authResponse, "MFA verification successful"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during MFA verification");
            return StatusCode(500, ApiResponse<AuthResponse>.ErrorResult("An error occurred during MFA verification"));
        }
    }
    
    private string GenerateTemporaryMfaToken(string userId)
    {
        // Create a temporary token valid for 5 minutes
        var expiry = DateTime.UtcNow.AddMinutes(5);
        var data = $"{userId}|{expiry:O}";
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtSettings.MfaSecretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var signature = Convert.ToBase64String(hash);
        
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{data}|{signature}"));
        return token;
    }
    
    private bool ValidateTemporaryMfaToken(string token, out string userId)
    {
        userId = string.Empty;
        
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = decoded.Split('|');
            
            if (parts.Length != 3)
                return false;
            
            var userIdPart = parts[0];
            var expiryPart = parts[1];
            var signature = parts[2];
            
            // Check expiry
            if (!DateTime.TryParse(expiryPart, out var expiry) || expiry < DateTime.UtcNow)
                return false;
            
            // Verify signature
            var data = $"{userIdPart}|{expiryPart}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtSettings.MfaSecretKey));
            var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            var expectedSignature = Convert.ToBase64String(expectedHash);
            
            if (signature != expectedSignature)
                return false;
            
            userId = userIdPart;
            return true;
        }
        catch
        {
            return false;
        }
    }


    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object>>> Logout(LogoutRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("User not authenticated"));
            }
            
            // Get refresh token from cookie
            var refreshTokenFromCookie = Request.Cookies["RefreshToken"];
            
            // Revoke the refresh token
            if (!string.IsNullOrEmpty(refreshTokenFromCookie))
            {
                await jwtService.RevokeRefreshTokenAsync(refreshTokenFromCookie);
            }
            
            // Optionally revoke all refresh tokens for the user
            if (request.RevokeAllTokens)
            {
                var refreshTokenRepository = HttpContext.RequestServices.GetRequiredService<IRefreshTokenRepository>();
                await refreshTokenRepository.RevokeAllUserTokensAsync(userId);
            }
            
            // Clear auth cookies
            ClearAuthCookies();
            
            // Log logout event
            await auditService.LogEventAsync(
                AuthEventType.Logout,
                true,
                userId: userId,
                ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers.UserAgent,
                metadata: new Dictionary<string, object> { ["revokeAllTokens"] = request.RevokeAllTokens });
            
            _logger.LogInformation("User {UserId} logged out", userId);
            return Ok(ApiResponse<object>.SuccessResult(new { }, "Logged out successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, ApiResponse<object>.ErrorResult("An error occurred during logout"));
        }
    }
    
    [HttpPost("change-password")]
    [Authorize]
    [ValidateCsrfToken]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword(ChangePasswordRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("User not authenticated"));
            }
            
            var user = await userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("User not found"));
            }
            
            // Verify current password
            if (!passwordService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Current password is incorrect"));
            }
            
            // Validate new password
            var (isValid, errors) = await passwordService.ValidatePasswordAsync(request.NewPassword, user);
            if (!isValid)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(string.Join("; ", errors)));
            }
            
            // Check password history
            var newPasswordHash = passwordService.HashPassword(request.NewPassword);
            if (await passwordService.IsPasswordInHistoryAsync(userId, newPasswordHash))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("This password has been used recently. Please choose a different password"));
            }
            
            // Update password
            user.PasswordHash = newPasswordHash;
            user.LastPasswordChange = DateTime.UtcNow;
            await userRepository.UpdateAsync(userId, user);
            
            // Add to password history
            await passwordService.AddPasswordToHistoryAsync(userId, newPasswordHash);
            
            // Revoke all refresh tokens for security
            var refreshTokenRepository = HttpContext.RequestServices.GetRequiredService<IRefreshTokenRepository>();
            await refreshTokenRepository.RevokeAllUserTokensAsync(userId);
            
            // Clear auth cookies
            ClearAuthCookies();
            
            // Log password change
            await auditService.LogEventAsync(
                AuthEventType.PasswordChange,
                true,
                userId: userId,
                email: user.Email,
                ipAddress: Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent: Request.Headers.UserAgent);
            
            _logger.LogInformation("Password changed for user {UserId}", userId);
            return Ok(ApiResponse<object>.SuccessResult(new { }, "Password changed successfully. Please log in again"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, ApiResponse<object>.ErrorResult("An error occurred while changing password"));
        }
    }
    
    private void SetAuthCookies(string accessToken, string refreshToken, DateTime refreshTokenExpiry)
    {
        var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
        
        // Log cookie setting for debugging
        _logger.LogInformation("Setting auth cookies. IsDevelopment: {IsDevelopment}, AccessTokenLength: {AccessTokenLength}, RefreshTokenLength: {RefreshTokenLength}",
            isDevelopment, accessToken?.Length ?? 0, refreshToken?.Length ?? 0);
        
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Always use Secure flag with SameSite=None
            SameSite = SameSiteMode.None, // Allow cross-origin for SPA
            Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
            Path = "/",
            IsEssential = true // Mark as essential for GDPR
        };
        
        Response.Cookies.Append("AccessToken", accessToken, cookieOptions);
        
        var refreshCookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Always use Secure flag with SameSite=None
            SameSite = SameSiteMode.None, // Allow cross-origin for SPA
            Expires = refreshTokenExpiry,
            Path = "/",
            IsEssential = true // Mark as essential for GDPR
        };
        
        Response.Cookies.Append("RefreshToken", refreshToken, refreshCookieOptions);
    }
    
    private void ClearAuthCookies()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/"
        };
        
        Response.Cookies.Delete("AccessToken", cookieOptions);
        Response.Cookies.Delete("RefreshToken", cookieOptions);
        Response.Cookies.Delete("XSRF-TOKEN");
    }
    
    private void SetCsrfToken(string userId)
    {
        var csrfToken = csrfService.GenerateToken(userId);
        csrfService.SetCsrfCookie(Response, csrfToken);
    }
}

public class MfaVerificationRequest
{
    public string MfaToken { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? BackupCode { get; set; }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class LogoutRequest
{
    public string? RefreshToken { get; set; }
    public bool RevokeAllTokens { get; set; } = false;
}
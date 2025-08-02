using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Models.Requests;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Services.Interfaces;
using TaskFlow.Api.Repositories.Interfaces;
using TaskFlow.Api.Models.Entities;
using BCrypt.Net;
using AutoMapper;
using TaskFlow.Api.Models.DTOs;
using FluentValidation;
using TaskFlow.Api.Validators;
using OtpNet;
using System.Security.Cryptography;
using System.Text;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : BaseController
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IMapper _mapper;

    public AuthController(
        IUserRepository userRepository,
        IJwtService jwtService,
        IMapper mapper,
        ILogger<AuthController> logger)
        : base(logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _mapper = mapper;
    }

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
            if (await _userRepository.EmailExistsAsync(request.Email))
            {
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

            var createdUser = await _userRepository.CreateAsync(user);
            var token = _jwtService.GenerateToken(createdUser);
            var userDto = _mapper.Map<UserDto>(createdUser);

            var authResponse = new AuthResponse
            {
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                User = userDto
            };

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
            var user = await _userRepository.GetByEmailAsync(request.Email);    
            if (user == null)
            {
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Invalid email or password"));
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
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
                await _userRepository.UpdateAsync(user.Id, user);
            }

            // Check if MFA is enabled
            if (user.MfaEnabled && user.MfaSetupCompleted)
            {
                // Return partial response requiring MFA
                var mfaResponse = new AuthResponse
                {
                    RequiresMfa = true,
                    MfaToken = GenerateTemporaryMfaToken(user.Id),
                    User = _mapper.Map<UserDto>(user)
                };
                return Ok(ApiResponse<AuthResponse>.SuccessResult(mfaResponse, "MFA verification required"));
            }

            // Generate token
            var token = _jwtService.GenerateToken(user);
            var userDto = _mapper.Map<UserDto>(user);

            var authResponse = new AuthResponse
            {
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                User = userDto,
                RequiresMfa = false
            };

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
            var authHeader = Request.Headers.Authorization.FirstOrDefault();
            if (authHeader == null || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("No valid token provided"));
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();
            var userId = _jwtService.GetUserIdFromToken(token);
            
            if (userId == null)
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("Invalid token"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(ApiResponse<AuthResponse>.ErrorResult("User not found or inactive"));
            }

            var newToken = _jwtService.GenerateToken(user);
            var userDto = _mapper.Map<UserDto>(user);

            var authResponse = new AuthResponse
            {
                Token = newToken,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
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

            var user = await _userRepository.GetByIdAsync(userId);
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
                        await _userRepository.UpdateAsync(user.Id, user);
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
                }
                
                await _userRepository.UpdateAsync(user.Id, user);
                return BadRequest(ApiResponse<AuthResponse>.ErrorResult("Invalid verification code"));
            }

            // Reset failed attempts
            user.FailedLoginAttempts = 0;
            user.LockoutEndTime = null;
            await _userRepository.UpdateAsync(user.Id, user);

            // Generate full access token
            var token = _jwtService.GenerateToken(user);
            var userDto = _mapper.Map<UserDto>(user);

            var authResponse = new AuthResponse
            {
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                User = userDto,
                RequiresMfa = false
            };

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
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes("your-mfa-secret-key")); // In production, use configuration
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
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes("your-mfa-secret-key")); // In production, use configuration
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
}

public class MfaVerificationRequest
{
    public string MfaToken { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? BackupCode { get; set; }
}
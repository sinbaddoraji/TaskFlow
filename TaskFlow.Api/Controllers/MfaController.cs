using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using TaskFlow.Api.Models.Responses;
using TaskFlow.Api.Repositories.Interfaces;
using System.Security.Claims;
using OtpNet;
using QRCoder;
using System.Text;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class MfaController : BaseController
{
    private readonly IUserRepository _userRepository;
    private const string Issuer = "TaskFlow";

    public MfaController(
        IUserRepository userRepository,
        ILogger<MfaController> logger)
        : base(logger)
    {
        _userRepository = userRepository;
    }

    [HttpPost("enable")]
    public async Task<ActionResult<ApiResponse<MfaSetupResponse>>> EnableMfa()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<MfaSetupResponse>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<MfaSetupResponse>.ErrorResult("User not found"));
            }

            if (user.MfaEnabled && user.MfaSetupCompleted)
            {
                return BadRequest(ApiResponse<MfaSetupResponse>.ErrorResult("MFA is already enabled for this account"));
            }

            // Generate secret key
            var key = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(key);

            // Save secret temporarily (not yet confirmed)
            user.MfaSecret = base32Secret;
            user.MfaEnabled = false; // Will be enabled after verification
            user.MfaSetupCompleted = false;
            await _userRepository.UpdateAsync(user.Id, user);

            // Generate QR code
            var qrCodeUrl = GenerateQrCodeUrl(user.Email, base32Secret);
            var qrCodeImage = GenerateQrCodeImage(qrCodeUrl);

            var response = new MfaSetupResponse
            {
                Secret = base32Secret,
                QrCodeImage = qrCodeImage,
                ManualEntryKey = FormatSecretForManualEntry(base32Secret)
            };

            return Ok(ApiResponse<MfaSetupResponse>.SuccessResult(response, "MFA setup initiated. Please scan the QR code with your authenticator app"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enabling MFA");
            return StatusCode(500, ApiResponse<MfaSetupResponse>.ErrorResult("An error occurred while enabling MFA"));
        }
    }

    [HttpPost("verify-setup")]
    public async Task<ActionResult<ApiResponse<MfaVerificationResponse>>> VerifyMfaSetup(VerifyMfaRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<MfaVerificationResponse>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<MfaVerificationResponse>.ErrorResult("User not found"));
            }

            if (string.IsNullOrEmpty(user.MfaSecret))
            {
                return BadRequest(ApiResponse<MfaVerificationResponse>.ErrorResult("MFA setup not initiated"));
            }

            // Verify TOTP code
            var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
            if (!totp.VerifyTotp(request.Code, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
            {
                return BadRequest(ApiResponse<MfaVerificationResponse>.ErrorResult("Invalid verification code"));
            }

            // Generate backup codes
            var backupCodes = GenerateBackupCodes(8);

            // Enable MFA
            user.MfaEnabled = true;
            user.MfaSetupCompleted = true;
            user.MfaBackupCodes = backupCodes.Select(BCrypt.Net.BCrypt.HashPassword).ToList();
            await _userRepository.UpdateAsync(user.Id, user);

            var response = new MfaVerificationResponse
            {
                BackupCodes = backupCodes,
                IsEnabled = true
            };

            return Ok(ApiResponse<MfaVerificationResponse>.SuccessResult(response, "MFA has been successfully enabled. Please save your backup codes"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying MFA setup");
            return StatusCode(500, ApiResponse<MfaVerificationResponse>.ErrorResult("An error occurred while verifying MFA setup"));
        }
    }

    [HttpPost("disable")]
    public async Task<ActionResult<ApiResponse<bool>>> DisableMfa(DisableMfaRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<bool>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<bool>.ErrorResult("User not found"));
            }

            if (!user.MfaEnabled)
            {
                return BadRequest(ApiResponse<bool>.ErrorResult("MFA is not enabled for this account"));
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest(ApiResponse<bool>.ErrorResult("Invalid password"));
            }

            // Disable MFA
            user.MfaEnabled = false;
            user.MfaSetupCompleted = false;
            user.MfaSecret = null;
            user.MfaBackupCodes.Clear();
            await _userRepository.UpdateAsync(user.Id, user);

            return Ok(ApiResponse<bool>.SuccessResult(true, "MFA has been disabled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disabling MFA");
            return StatusCode(500, ApiResponse<bool>.ErrorResult("An error occurred while disabling MFA"));
        }
    }

    [HttpPost("regenerate-backup-codes")]
    public async Task<ActionResult<ApiResponse<List<string>>>> RegenerateBackupCodes(RegenerateBackupCodesRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<List<string>>.ErrorResult("User not authenticated"));
            }

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<List<string>>.ErrorResult("User not found"));
            }

            if (!user.MfaEnabled)
            {
                return BadRequest(ApiResponse<List<string>>.ErrorResult("MFA is not enabled for this account"));
            }

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest(ApiResponse<List<string>>.ErrorResult("Invalid password"));
            }

            // Generate new backup codes
            var backupCodes = GenerateBackupCodes(8);
            user.MfaBackupCodes = backupCodes.Select(BCrypt.Net.BCrypt.HashPassword).ToList();
            await _userRepository.UpdateAsync(user.Id, user);

            return Ok(ApiResponse<List<string>>.SuccessResult(backupCodes, "New backup codes generated. Please save them securely"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error regenerating backup codes");
            return StatusCode(500, ApiResponse<List<string>>.ErrorResult("An error occurred while regenerating backup codes"));
        }
    }

    private string GenerateQrCodeUrl(string email, string secret)
    {
        return $"otpauth://totp/{Issuer}:{email}?secret={secret}&issuer={Issuer}";
    }

    private string GenerateQrCodeImage(string url)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(10);
        return $"data:image/png;base64,{Convert.ToBase64String(qrCodeBytes)}";
    }

    private string FormatSecretForManualEntry(string secret)
    {
        var formatted = new StringBuilder();
        for (int i = 0; i < secret.Length; i += 4)
        {
            if (i > 0) formatted.Append(' ');
            formatted.Append(secret.Substring(i, Math.Min(4, secret.Length - i)));
        }
        return formatted.ToString();
    }

    private List<string> GenerateBackupCodes(int count)
    {
        var codes = new List<string>();
        var random = new Random();
        
        for (int i = 0; i < count; i++)
        {
            var code = new StringBuilder();
            for (int j = 0; j < 8; j++)
            {
                code.Append(random.Next(0, 10));
            }
            codes.Add(code.ToString());
        }
        
        return codes;
    }
}

// Request/Response Models
public class VerifyMfaRequest
{
    public string Code { get; set; } = string.Empty;
}

public class DisableMfaRequest
{
    public string Password { get; set; } = string.Empty;
}

public class RegenerateBackupCodesRequest
{
    public string Password { get; set; } = string.Empty;
}

public class MfaSetupResponse
{
    public string Secret { get; set; } = string.Empty;
    public string QrCodeImage { get; set; } = string.Empty;
    public string ManualEntryKey { get; set; } = string.Empty;
}

public class MfaVerificationResponse
{
    public List<string> BackupCodes { get; set; } = new();
    public bool IsEnabled { get; set; }
}

public class MfaLoginRequest
{
    public string Code { get; set; } = string.Empty;
    public string? BackupCode { get; set; }
}
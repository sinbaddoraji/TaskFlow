using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Services.Interfaces;

namespace TaskFlow.Api.Services.Implementations;

public class CsrfService : ICsrfService
{
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<CsrfService> _logger;
    private const int TokenExpirationMinutes = 60;
    
    public CsrfService(
        IOptions<JwtSettings> jwtSettings,
        ILogger<CsrfService> logger)
    {
        _jwtSettings = jwtSettings.Value;
        _logger = logger;
    }
    
    public string GenerateToken(string userId)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var data = $"{userId}|{timestamp}";
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var signature = Convert.ToBase64String(hash);
        
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{data}|{signature}"));
        _logger.LogDebug("Generated CSRF token for user {UserId}", userId);
        
        return token;
    }
    
    public bool ValidateToken(string token, string userId)
    {
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var parts = decoded.Split('|');
            
            if (parts.Length != 3)
                return false;
            
            var tokenUserId = parts[0];
            var timestamp = parts[1];
            var signature = parts[2];
            
            // Verify user ID matches
            if (tokenUserId != userId)
            {
                _logger.LogWarning("CSRF token user ID mismatch");
                return false;
            }
            
            // Check token expiration
            if (long.TryParse(timestamp, out var tokenTimestamp))
            {
                var tokenTime = DateTimeOffset.FromUnixTimeSeconds(tokenTimestamp);
                if (DateTimeOffset.UtcNow.Subtract(tokenTime).TotalMinutes > TokenExpirationMinutes)
                {
                    _logger.LogWarning("CSRF token expired");
                    return false;
                }
            }
            else
            {
                return false;
            }
            
            // Verify signature
            var data = $"{tokenUserId}|{timestamp}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
            var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            var expectedSignature = Convert.ToBase64String(expectedHash);
            
            if (signature != expectedSignature)
            {
                _logger.LogWarning("CSRF token signature mismatch");
                return false;
            }
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating CSRF token");
            return false;
        }
    }
    
    public void SetCsrfCookie(HttpResponse response, string token)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = false, // Must be accessible by JavaScript
            Secure = true, // Always use Secure with SameSite=None
            SameSite = SameSiteMode.None, // Allow cross-origin for SPA
            Expires = DateTime.UtcNow.AddMinutes(TokenExpirationMinutes),
            Path = "/",
            IsEssential = true
        };
        
        response.Cookies.Append("XSRF-TOKEN", token, cookieOptions);
    }
}
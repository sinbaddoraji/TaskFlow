using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Services.Implementations;

public class JwtService : IJwtService
{
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<JwtService> _logger;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUserRepository _userRepository;

    public JwtService(
        IOptions<JwtSettings> jwtSettings, 
        ILogger<JwtService> logger,
        IRefreshTokenRepository refreshTokenRepository,
        IUserRepository userRepository)
    {
        _jwtSettings = jwtSettings.Value;
        _logger = logger;
        _refreshTokenRepository = refreshTokenRepository;
        _userRepository = userRepository;
    }

    public string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        _logger.LogInformation("Generated JWT for user {UserId}", user.Id);
        return tokenString;
    }

    public string? GetUserIdFromToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSettings.SecretKey);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            var userId = jwtToken.Claims.FirstOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value;
            _logger.LogInformation("Extracted user ID {UserId} from token", userId);
            return userId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract user ID from token");
            return null;
        }
    }

    public bool ValidateToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSettings.SecretKey);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            _logger.LogInformation("Token validation successful");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token validation failed");
            return false;
        }
    }

    public async Task<(string AccessToken, RefreshToken RefreshToken)> GenerateTokenPairAsync(
        User user, 
        string? ipAddress = null, 
        string? userAgent = null)
    {
        // Generate access token
        var accessToken = GenerateToken(user);
        
        // Generate refresh token
        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenHash = ComputeSha256Hash(refreshTokenValue);
        
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            TokenHash = refreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
            IpAddress = ipAddress,
            UserAgent = userAgent
        };
        
        // Save refresh token to database
        await _refreshTokenRepository.CreateAsync(refreshToken);
        
        _logger.LogInformation("Generated token pair for user {UserId}", user.Id);
        return (accessToken, refreshToken);
    }

    public async Task<(string AccessToken, RefreshToken RefreshToken)?> RefreshTokenAsync(
        string refreshToken, 
        string? ipAddress = null, 
        string? userAgent = null)
    {
        var tokenHash = ComputeSha256Hash(refreshToken);
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(tokenHash);
        
        if (storedToken == null)
        {
            _logger.LogWarning("Refresh token not found");
            return null;
        }
        
        if (!storedToken.IsActive)
        {
            // Token reuse detection - revoke all tokens for this user
            if (storedToken.RevokedAt.HasValue)
            {
                _logger.LogWarning("Attempted reuse of revoked refresh token for user {UserId}", storedToken.UserId);
                await _refreshTokenRepository.RevokeAllUserTokensAsync(storedToken.UserId);
            }
            return null;
        }
        
        // Get user
        var user = await _userRepository.GetByIdAsync(storedToken.UserId);
        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("User {UserId} not found or inactive", storedToken.UserId);
            return null;
        }
        
        // Generate new token pair
        var newAccessToken = GenerateToken(user);
        var newRefreshTokenValue = GenerateRefreshToken();
        var newRefreshTokenHash = ComputeSha256Hash(newRefreshTokenValue);
        
        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = newRefreshTokenValue,
            TokenHash = newRefreshTokenHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
            IpAddress = ipAddress,
            UserAgent = userAgent
        };
        
        // Save new refresh token
        await _refreshTokenRepository.CreateAsync(newRefreshToken);
        
        // Revoke old token
        await _refreshTokenRepository.RevokeTokenAsync(storedToken.Id, newRefreshToken.Id);
        
        _logger.LogInformation("Refreshed tokens for user {UserId}", user.Id);
        return (newAccessToken, newRefreshToken);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var tokenHash = ComputeSha256Hash(refreshToken);
        var storedToken = await _refreshTokenRepository.GetByTokenAsync(tokenHash);
        
        if (storedToken != null && storedToken.IsActive)
        {
            await _refreshTokenRepository.RevokeTokenAsync(storedToken.Id);
            _logger.LogInformation("Revoked refresh token for user {UserId}", storedToken.UserId);
        }
    }
    
    private string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
    
    private string ComputeSha256Hash(string rawData)
    {
        using var sha256Hash = SHA256.Create();
        var bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
        return Convert.ToBase64String(bytes);
    }
}
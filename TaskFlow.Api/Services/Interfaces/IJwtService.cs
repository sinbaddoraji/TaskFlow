using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Services.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    string? GetUserIdFromToken(string token);
    bool ValidateToken(string token);
    Task<(string AccessToken, RefreshToken RefreshToken)> GenerateTokenPairAsync(User user, string? ipAddress = null, string? userAgent = null);
    Task<(string AccessToken, RefreshToken RefreshToken)?> RefreshTokenAsync(string refreshToken, string? ipAddress = null, string? userAgent = null);
    Task RevokeRefreshTokenAsync(string refreshToken);
}
using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Repositories.Interfaces;

public interface IRefreshTokenRepository
{
    Task<RefreshToken> CreateAsync(RefreshToken refreshToken);
    Task<RefreshToken?> GetByTokenAsync(string tokenHash);
    Task<List<RefreshToken>> GetActiveTokensByUserIdAsync(string userId);
    Task RevokeTokenAsync(string tokenId, string? replacedByToken = null);
    Task RevokeAllUserTokensAsync(string userId);
    Task<int> DeleteExpiredTokensAsync();
}
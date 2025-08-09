using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Repositories.Implementations;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly IMongoCollection<RefreshToken> _refreshTokens;
    private readonly ILogger<RefreshTokenRepository> _logger;

    public RefreshTokenRepository(MongoDbContext dbContext, ILogger<RefreshTokenRepository> logger)
    {
        _refreshTokens = dbContext.Database.GetCollection<RefreshToken>("refresh_tokens");
        _logger = logger;
        
        // Create indexes
        CreateIndexes();
    }

    private void CreateIndexes()
    {
        var indexKeys = Builders<RefreshToken>.IndexKeys;
        var indexes = new List<CreateIndexModel<RefreshToken>>
        {
            new(indexKeys.Ascending(x => x.TokenHash), new CreateIndexOptions { Unique = true }),
            new(indexKeys.Ascending(x => x.UserId)),
            new(indexKeys.Ascending(x => x.ExpiresAt)),
            new(indexKeys.Ascending(x => x.CreatedAt))
        };
        
        _refreshTokens.Indexes.CreateMany(indexes);
    }

    public async Task<RefreshToken> CreateAsync(RefreshToken refreshToken)
    {
        await _refreshTokens.InsertOneAsync(refreshToken);
        _logger.LogInformation("Created refresh token for user {UserId}", refreshToken.UserId);
        return refreshToken;
    }

    public async Task<RefreshToken?> GetByTokenAsync(string tokenHash)
    {
        return await _refreshTokens.Find(x => x.TokenHash == tokenHash).FirstOrDefaultAsync();
    }

    public async Task<List<RefreshToken>> GetActiveTokensByUserIdAsync(string userId)
    {
        var filter = Builders<RefreshToken>.Filter.And(
            Builders<RefreshToken>.Filter.Eq(x => x.UserId, userId),
            Builders<RefreshToken>.Filter.Eq(x => x.RevokedAt, null),
            Builders<RefreshToken>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
        );
        
        return await _refreshTokens.Find(filter).ToListAsync();
    }

    public async Task RevokeTokenAsync(string tokenId, string? replacedByToken = null)
    {
        var update = Builders<RefreshToken>.Update
            .Set(x => x.RevokedAt, DateTime.UtcNow);
        
        if (!string.IsNullOrEmpty(replacedByToken))
        {
            update = update.Set(x => x.ReplacedByToken, replacedByToken);
        }
        
        await _refreshTokens.UpdateOneAsync(x => x.Id == tokenId, update);
        _logger.LogInformation("Revoked refresh token {TokenId}", tokenId);
    }

    public async Task RevokeAllUserTokensAsync(string userId)
    {
        var filter = Builders<RefreshToken>.Filter.And(
            Builders<RefreshToken>.Filter.Eq(x => x.UserId, userId),
            Builders<RefreshToken>.Filter.Eq(x => x.RevokedAt, null)
        );
        
        var update = Builders<RefreshToken>.Update.Set(x => x.RevokedAt, DateTime.UtcNow);
        
        var result = await _refreshTokens.UpdateManyAsync(filter, update);
        _logger.LogInformation("Revoked {Count} refresh tokens for user {UserId}", result.ModifiedCount, userId);
    }

    public async Task<int> DeleteExpiredTokensAsync()
    {
        var filter = Builders<RefreshToken>.Filter.Lt(x => x.ExpiresAt, DateTime.UtcNow.AddDays(-30));
        var result = await _refreshTokens.DeleteManyAsync(filter);
        
        _logger.LogInformation("Deleted {Count} expired refresh tokens", result.DeletedCount);
        return (int)result.DeletedCount;
    }
}
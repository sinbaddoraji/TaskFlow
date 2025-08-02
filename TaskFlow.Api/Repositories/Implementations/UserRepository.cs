using MongoDB.Driver;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;

namespace TaskFlow.Api.Repositories.Implementations;

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(MongoDbContext context) : base(context.Users)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await FindOneAsync(u => u.Email.ToLower() == email.ToLower());
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        var user = await GetByEmailAsync(email);
        return user != null;
    }

    public async Task<List<User>> SearchUsersAsync(string searchTerm, int limit = 10)
    {
        var filter = Builders<User>.Filter.Or(
            Builders<User>.Filter.Regex(u => u.Name, new MongoDB.Bson.BsonRegularExpression(searchTerm, "i")),
            Builders<User>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression(searchTerm, "i"))
        );

        return await _collection
            .Find(filter)
            .Limit(limit)
            .ToListAsync();
    }
}
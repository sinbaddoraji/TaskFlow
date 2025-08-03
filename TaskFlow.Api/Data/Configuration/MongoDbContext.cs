using MongoDB.Driver;
using TaskFlow.Api.Models.Entities;
using Microsoft.Extensions.Options;

namespace TaskFlow.Api.Data.Configuration;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<DatabaseSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    public IMongoCollection<TaskItem> Tasks => _database.GetCollection<TaskItem>("tasks");
    public IMongoCollection<TimeBlock> TimeBlocks => _database.GetCollection<TimeBlock>("timeblocks");
    public IMongoCollection<Project> Projects => _database.GetCollection<Project>("projects");
}
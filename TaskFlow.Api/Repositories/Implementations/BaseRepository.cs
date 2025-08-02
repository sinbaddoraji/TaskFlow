using MongoDB.Driver;
using TaskFlow.Api.Repositories.Interfaces;
using System.Linq.Expressions;
using MongoDB.Bson;

namespace TaskFlow.Api.Repositories.Implementations;

public abstract class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly IMongoCollection<T> _collection;

    protected BaseRepository(IMongoCollection<T> collection)
    {
        _collection = collection;
    }

    public virtual async Task<T?> GetByIdAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;
            
        var filter = Builders<T>.Filter.Eq("_id", ObjectId.Parse(id));
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public virtual async Task<List<T>> GetAllAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public virtual async Task<List<T>> FindAsync(Expression<Func<T, bool>> filter)
    {
        return await _collection.Find(filter).ToListAsync();
    }

    public virtual async Task<T?> FindOneAsync(Expression<Func<T, bool>> filter)
    {
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public virtual async Task<T> CreateAsync(T entity)
    {
        await _collection.InsertOneAsync(entity);
        return entity;
    }

    public virtual async Task<T> UpdateAsync(string id, T entity)
    {
        if (!ObjectId.TryParse(id, out _))
            throw new ArgumentException("Invalid ID format", nameof(id));
            
        var filter = Builders<T>.Filter.Eq("_id", ObjectId.Parse(id));
        await _collection.ReplaceOneAsync(filter, entity);
        return entity;
    }

    public virtual async Task<bool> DeleteAsync(string id)
    {
        if (!ObjectId.TryParse(id, out _))
            return false;
            
        var filter = Builders<T>.Filter.Eq("_id", ObjectId.Parse(id));
        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public virtual async Task<long> CountAsync(Expression<Func<T, bool>>? filter = null)
    {
        if (filter == null)
            return await _collection.CountDocumentsAsync(_ => true);
        
        return await _collection.CountDocumentsAsync(filter);
    }

    public virtual async Task<List<T>> GetPagedAsync(int page, int pageSize, Expression<Func<T, bool>>? filter = null)
    {
        var skip = (page - 1) * pageSize;
        
        if (filter == null)
        {
            return await _collection
                .Find(_ => true)
                .Skip(skip)
                .Limit(pageSize)
                .ToListAsync();
        }
        
        return await _collection
            .Find(filter)
            .Skip(skip)
            .Limit(pageSize)
            .ToListAsync();
    }
}
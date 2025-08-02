using System.Linq.Expressions;

namespace TaskFlow.Api.Repositories.Interfaces;

public interface IBaseRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id);
    Task<List<T>> GetAllAsync();
    Task<List<T>> FindAsync(Expression<Func<T, bool>> filter);
    Task<T?> FindOneAsync(Expression<Func<T, bool>> filter);
    Task<T> CreateAsync(T entity);
    Task<T> UpdateAsync(string id, T entity);
    Task<bool> DeleteAsync(string id);
    Task<long> CountAsync(Expression<Func<T, bool>>? filter = null);
    Task<List<T>> GetPagedAsync(int page, int pageSize, Expression<Func<T, bool>>? filter = null);
}
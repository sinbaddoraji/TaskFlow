using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Repositories.Interfaces;

public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
    Task<List<User>> SearchUsersAsync(string searchTerm, int limit = 10);
}
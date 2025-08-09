using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Services.Interfaces;

public interface IPasswordService
{
    Task<(bool IsValid, List<string> Errors)> ValidatePasswordAsync(string password, User? user = null);
    Task<bool> IsPasswordInHistoryAsync(string userId, string passwordHash);
    Task AddPasswordToHistoryAsync(string userId, string passwordHash);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
    bool IsPasswordExpired(User user);
    Task<string> GenerateSecurePasswordAsync();
}
using TaskFlow.Api.Models.Entities;

namespace TaskFlow.Api.Services.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    string? GetUserIdFromToken(string token);
    bool ValidateToken(string token);
}
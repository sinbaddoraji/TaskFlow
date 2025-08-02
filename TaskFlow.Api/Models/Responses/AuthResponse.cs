using TaskFlow.Api.Models.DTOs;

namespace TaskFlow.Api.Models.Responses;

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public UserDto User { get; set; } = new();
    public bool RequiresMfa { get; set; } = false;
    public string? MfaToken { get; set; }
}
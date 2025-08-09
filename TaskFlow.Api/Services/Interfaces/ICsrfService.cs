namespace TaskFlow.Api.Services.Interfaces;

public interface ICsrfService
{
    string GenerateToken(string userId);
    bool ValidateToken(string token, string userId);
    void SetCsrfCookie(HttpResponse response, string token);
}
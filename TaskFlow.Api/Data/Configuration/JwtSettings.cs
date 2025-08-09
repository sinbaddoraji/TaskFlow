namespace TaskFlow.Api.Data.Configuration;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationInMinutes { get; set; } = 60;
    public int RefreshTokenExpirationInDays { get; set; } = 7;
    public string MfaSecretKey { get; set; } = string.Empty;
    public int MfaTokenExpirationInMinutes { get; set; } = 5;
}
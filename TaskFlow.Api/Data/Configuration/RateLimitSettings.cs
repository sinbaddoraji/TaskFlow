namespace TaskFlow.Api.Data.Configuration;

public class RateLimitSettings
{
    public bool EnableEndpointRateLimiting { get; set; } = true;
    public bool StackBlockedRequests { get; set; } = false;
    public string RealIpHeader { get; set; } = "X-Real-IP";
    public string ClientIdHeader { get; set; } = "X-ClientId";
    public int HttpStatusCode { get; set; } = 429;
    public string RetryAfterHeader { get; set; } = "Retry-After";
    
    public GeneralRules GeneralRules { get; set; } = new();
    public EndpointRules EndpointRules { get; set; } = new();
}

public class GeneralRules
{
    public int PermitLimit { get; set; } = 1000;
    public string Period { get; set; } = "1h";
}

public class EndpointRules
{
    public RateLimitRule Login { get; set; } = new() { PermitLimit = 5, Period = "15m" };
    public RateLimitRule Register { get; set; } = new() { PermitLimit = 3, Period = "1h" };
    public RateLimitRule PasswordReset { get; set; } = new() { PermitLimit = 3, Period = "1h" };
    public RateLimitRule RefreshToken { get; set; } = new() { PermitLimit = 10, Period = "15m" };
}

public class RateLimitRule
{
    public int PermitLimit { get; set; }
    public string Period { get; set; } = string.Empty;
}
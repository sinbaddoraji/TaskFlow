namespace TaskFlow.Api.Data.Configuration;

public class PasswordPolicySettings
{
    public int MinimumLength { get; set; } = 8;
    public int MaximumLength { get; set; } = 128;
    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireDigit { get; set; } = true;
    public bool RequireSpecialCharacter { get; set; } = true;
    public string SpecialCharacters { get; set; } = "!@#$%^&*(),.?\":{}|<>";
    public int PasswordHistoryCount { get; set; } = 5;
    public int PasswordExpirationDays { get; set; } = 90;
    public bool PreventCommonPasswords { get; set; } = true;
    public bool PreventUserInfoInPassword { get; set; } = true;
    public int MaxConsecutiveCharacters { get; set; } = 3;
}
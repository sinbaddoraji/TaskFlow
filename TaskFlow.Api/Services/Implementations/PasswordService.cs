using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using TaskFlow.Api.Data.Configuration;
using TaskFlow.Api.Models.Entities;
using TaskFlow.Api.Repositories.Interfaces;
using TaskFlow.Api.Services.Interfaces;

namespace TaskFlow.Api.Services.Implementations;

public class PasswordService : IPasswordService
{
    private readonly PasswordPolicySettings _passwordPolicy;
    private readonly ILogger<PasswordService> _logger;
    private readonly HashSet<string> _commonPasswords;
    
    public PasswordService(
        IOptions<PasswordPolicySettings> passwordPolicy,
        ILogger<PasswordService> logger)
    {
        _passwordPolicy = passwordPolicy.Value;
        _logger = logger;
        
        // Load common passwords list (in production, load from file or database)
        _commonPasswords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "password", "123456", "password123", "12345678", "qwerty", "abc123",
            "monkey", "1234567", "letmein", "trustno1", "dragon", "baseball",
            "111111", "iloveyou", "master", "sunshine", "ashley", "bailey",
            "passw0rd", "shadow", "123123", "654321", "superman", "qazwsx"
        };
    }
    
    public async Task<(bool IsValid, List<string> Errors)> ValidatePasswordAsync(string password, User? user = null)
    {
        var errors = new List<string>();
        
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Password is required");
            return (false, errors);
        }
        
        // Length validation
        if (password.Length < _passwordPolicy.MinimumLength)
        {
            errors.Add($"Password must be at least {_passwordPolicy.MinimumLength} characters long");
        }
        
        if (password.Length > _passwordPolicy.MaximumLength)
        {
            errors.Add($"Password must not exceed {_passwordPolicy.MaximumLength} characters");
        }
        
        // Character requirements
        if (_passwordPolicy.RequireUppercase && !Regex.IsMatch(password, @"[A-Z]"))
        {
            errors.Add("Password must contain at least one uppercase letter");
        }
        
        if (_passwordPolicy.RequireLowercase && !Regex.IsMatch(password, @"[a-z]"))
        {
            errors.Add("Password must contain at least one lowercase letter");
        }
        
        if (_passwordPolicy.RequireDigit && !Regex.IsMatch(password, @"\d"))
        {
            errors.Add("Password must contain at least one digit");
        }
        
        if (_passwordPolicy.RequireSpecialCharacter && !Regex.IsMatch(password, $@"[{Regex.Escape(_passwordPolicy.SpecialCharacters)}]"))
        {
            errors.Add($"Password must contain at least one special character ({_passwordPolicy.SpecialCharacters})");
        }
        
        // Check for consecutive characters
        if (HasTooManyConsecutiveCharacters(password))
        {
            errors.Add($"Password must not contain more than {_passwordPolicy.MaxConsecutiveCharacters} consecutive identical characters");
        }
        
        // Check common passwords
        if (_passwordPolicy.PreventCommonPasswords && _commonPasswords.Contains(password))
        {
            errors.Add("This password is too common. Please choose a more unique password");
        }
        
        // Check if password contains user information
        if (_passwordPolicy.PreventUserInfoInPassword && user != null)
        {
            if (ContainsUserInfo(password, user))
            {
                errors.Add("Password must not contain your name, email, or other personal information");
            }
        }
        
        return (errors.Count == 0, errors);
    }
    
    public async Task<bool> IsPasswordInHistoryAsync(string userId, string passwordHash)
    {
        // This would be implemented with a password history repository
        // For now, returning false
        await Task.CompletedTask;
        return false;
    }
    
    public async Task AddPasswordToHistoryAsync(string userId, string passwordHash)
    {
        // This would be implemented with a password history repository
        await Task.CompletedTask;
        _logger.LogInformation("Added password to history for user {UserId}", userId);
    }
    
    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }
    
    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
    
    public bool IsPasswordExpired(User user)
    {
        if (_passwordPolicy.PasswordExpirationDays <= 0)
            return false;
            
        var lastPasswordChange = user.LastPasswordChange ?? user.CreatedAt;
        var expirationDate = lastPasswordChange.AddDays(_passwordPolicy.PasswordExpirationDays);
        
        return DateTime.UtcNow > expirationDate;
    }
    
    public async Task<string> GenerateSecurePasswordAsync()
    {
        const string uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lowercase = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        var special = _passwordPolicy.SpecialCharacters;
        
        var allChars = uppercase + lowercase + digits + special;
        var random = new Random();
        var password = new StringBuilder();
        
        // Ensure at least one character from each required category
        if (_passwordPolicy.RequireUppercase)
            password.Append(uppercase[random.Next(uppercase.Length)]);
        if (_passwordPolicy.RequireLowercase)
            password.Append(lowercase[random.Next(lowercase.Length)]);
        if (_passwordPolicy.RequireDigit)
            password.Append(digits[random.Next(digits.Length)]);
        if (_passwordPolicy.RequireSpecialCharacter)
            password.Append(special[random.Next(special.Length)]);
        
        // Fill the rest with random characters
        var remainingLength = Math.Max(_passwordPolicy.MinimumLength, 12) - password.Length;
        for (int i = 0; i < remainingLength; i++)
        {
            password.Append(allChars[random.Next(allChars.Length)]);
        }
        
        // Shuffle the password
        var shuffled = password.ToString().ToCharArray();
        for (int i = shuffled.Length - 1; i > 0; i--)
        {
            int j = random.Next(i + 1);
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }
        
        return new string(shuffled);
    }
    
    private bool HasTooManyConsecutiveCharacters(string password)
    {
        if (_passwordPolicy.MaxConsecutiveCharacters <= 0)
            return false;
            
        for (int i = 0; i < password.Length - _passwordPolicy.MaxConsecutiveCharacters; i++)
        {
            bool allSame = true;
            for (int j = 1; j <= _passwordPolicy.MaxConsecutiveCharacters; j++)
            {
                if (password[i] != password[i + j])
                {
                    allSame = false;
                    break;
                }
            }
            if (allSame)
                return true;
        }
        
        return false;
    }
    
    private bool ContainsUserInfo(string password, User user)
    {
        var lowerPassword = password.ToLower();
        
        // Check if password contains parts of email
        var emailParts = user.Email.Split('@')[0].Split('.');
        foreach (var part in emailParts)
        {
            if (part.Length > 3 && lowerPassword.Contains(part.ToLower()))
                return true;
        }
        
        // Check if password contains parts of name
        var nameParts = user.Name.Split(' ');
        foreach (var part in nameParts)
        {
            if (part.Length > 3 && lowerPassword.Contains(part.ToLower()))
                return true;
        }
        
        return false;
    }
}
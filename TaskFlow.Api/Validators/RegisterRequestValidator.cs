using FluentValidation;
using TaskFlow.Api.Models.Requests;
using System.Text.RegularExpressions;

namespace TaskFlow.Api.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MinimumLength(2).WithMessage("Name must be at least 2 characters")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters")
            .Matches(@"^[a-zA-Z\s'-]+$").WithMessage("Name can only contain letters, spaces, hyphens, and apostrophes");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters long")
            .MaximumLength(128).WithMessage("Password must not exceed 128 characters")
            .Must(BeAStrongPassword).WithMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*(),.?\":{}|<>)");
    }

    private bool BeAStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;

        // Check for at least one uppercase letter
        if (!Regex.IsMatch(password, @"[A-Z]"))
            return false;

        // Check for at least one lowercase letter
        if (!Regex.IsMatch(password, @"[a-z]"))
            return false;

        // Check for at least one digit
        if (!Regex.IsMatch(password, @"\d"))
            return false;

        // Check for at least one special character
        if (!Regex.IsMatch(password, @"[!@#$%^&*(),.?"":{}|<>]"))
            return false;

        return true;
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required");
    }
}
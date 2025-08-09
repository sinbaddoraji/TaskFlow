# Security Setup Instructions

## Critical Security Configuration

### 1. Environment Variables Setup

**IMPORTANT**: Never commit secrets to version control. Use environment variables for all sensitive configuration.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate secure JWT secret keys (minimum 32 characters):
   ```bash
   # Generate JWT secret key
   openssl rand -base64 32
   
   # Generate MFA secret key  
   openssl rand -base64 32
   ```

3. Update `.env` with your generated keys:
   ```env
   JWTSETTINGS__SECRETKEY=your-generated-jwt-key-here
   JWTSETTINGS__MFASECRETKEY=your-generated-mfa-key-here
   ```

### 2. Production Security Checklist

- [ ] JWT secrets are stored in secure environment variables or key vault
- [ ] MFA secret key is different from JWT secret
- [ ] Database connection strings don't contain credentials in appsettings.json
- [ ] CORS origins are restricted to known frontend domains
- [ ] HTTPS is enforced in production
- [ ] Sensitive request/response data is not logged
- [ ] Log files are secured and rotated

### 3. Development vs Production

**Development**:
- Uses local MongoDB
- Allows localhost CORS origins
- More verbose logging for debugging

**Production**:
- Must use secure secret management
- Restrict CORS to production frontend domains
- Minimal logging of sensitive data
- Enable HTTPS-only cookies

### 4. Security Features Implemented

✅ **Authentication & Authorization**:
- JWT access tokens with short expiration (15 minutes)
- Secure refresh token rotation
- Multi-factor authentication (TOTP + backup codes)
- Account lockout after failed attempts
- Password policy enforcement
- Password history tracking

✅ **API Security**:
- HttpOnly, Secure cookies for tokens
- CSRF protection
- Request rate limiting
- Comprehensive audit logging
- Input validation

✅ **Data Protection**:
- Password hashing with BCrypt
- Refresh token hashing (SHA-256)
- Sensitive data excluded from logs
- Token reuse detection

### 5. Immediate Actions Required

1. **Remove hardcoded secrets**: ✅ Completed
2. **Set up environment variables**: Follow steps above
3. **Secure log files**: Ensure log directory has proper permissions
4. **Review CORS origins**: Update for your production domains

### 6. Monitoring & Alerts

Monitor these security events:
- Failed login attempts
- Account lockouts
- Token reuse attempts
- MFA failures
- Password changes
- Privilege escalations

Log files are stored in `logs/` directory with JSON formatting for easy parsing.
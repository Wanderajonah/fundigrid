using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private const int MaxAttempts = 5;
    private const int LockoutMinutes = 10;
    private const int MaxBatches = 3;

    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword("not-a-real-password-0", 10);

    private readonly FundiGridDbContext _db;
    private readonly OtpService _otp;
    private readonly AuditService _audit;
    private readonly UserMapping _mapping;
    private readonly UserCache _cache;

    public AuthController(
        FundiGridDbContext db,
        OtpService otp,
        AuditService audit,
        UserMapping mapping,
        UserCache cache)
    {
        _db = db;
        _otp = otp;
        _audit = audit;
        _mapping = mapping;
        _cache = cache;
    }

    public sealed class LoginRequest
    {
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Password { get; set; }
    }

    public sealed class SendOtpRequest
    {
        public string? Phone { get; set; }
        public string? Purpose { get; set; }
    }

    public sealed class VerifyRegisterRequest
    {
        public string? Phone { get; set; }
        public string? Code { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
    }

    public sealed class ForgotPasswordRequest
    {
        public string? Phone { get; set; }
    }

    public sealed class ResetPasswordRequest
    {
        public string? Phone { get; set; }
        public string? Code { get; set; }
        public string? Password { get; set; }
    }

    public sealed class ChangePasswordRequest
    {
        public string? CurrentPassword { get; set; }
        public string? Password { get; set; }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] LoginRequest? body,
        CancellationToken ct)
    {
        body ??= new LoginRequest();
        var email = (body.Email ?? "").Trim().ToLowerInvariant();
        var phone = UserMapping.NormalisePhone(body.Phone);
        var password = body.Password ?? "";
        var viaPhone = string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(phone);

        if (string.IsNullOrEmpty(email) && string.IsNullOrEmpty(phone))
        {
            throw ApiException.BadRequest("Phone or email is required");
        }
        if (string.IsNullOrEmpty(password))
        {
            throw ApiException.BadRequest("Password is required");
        }

        var user = viaPhone
            ? await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone, ct)
            : await FindByEmailAsync(email, ct);

        if (viaPhone && user is not null)
        {
            if (user.PasswordBlocked)
            {
                await _audit.RecordAsync(HttpContext, user, "auth.login_blocked", "auth",
                    summary: "Sign-in blocked: too many failed attempts",
                    meta: new { identifier = phone, reason = "password_blocked" }, ct: ct);
                return StatusCode(403, new
                {
                    success = false,
                    code = "PASSWORD_BLOCKED",
                    message = "Password sign-in is blocked after too many attempts. Use Forgot Password to reset it.",
                });
            }

            if (user.LockedUntil is { } lockedUntil && lockedUntil > DateTime.UtcNow)
            {
                var retryAfter = (int)Math.Ceiling((lockedUntil - DateTime.UtcNow).TotalSeconds);
                await _audit.RecordAsync(HttpContext, user, "auth.login_blocked", "auth",
                    summary: "Sign-in blocked: account temporarily locked",
                    meta: new { identifier = phone, reason = "locked" }, ct: ct);
                return StatusCode(429, new
                {
                    success = false,
                    code = "LOCKED",
                    retryAfterSeconds = retryAfter,
                    attemptsRemaining = 0,
                    message = $"Too many wrong attempts. Try again in {Math.Ceiling(retryAfter / 60.0)} minute(s), or reset your password now.",
                });
            }
        }

        var ok = user is not null
            && !string.IsNullOrEmpty(user.Password)
            && BCrypt.Net.BCrypt.Verify(password, string.IsNullOrEmpty(user.Password) ? DummyHash : user.Password);

        if (!ok)
        {
            await _audit.RecordAsync(HttpContext, user, "auth.login_failed", "auth",
                actorName: viaPhone ? phone : email,
                summary: $"Failed sign-in attempt via {(viaPhone ? "phone" : "email")}",
                meta: new { identifier = viaPhone ? phone : email }, ct: ct);

            if (viaPhone && user is not null && string.IsNullOrEmpty(user.Password))
            {
                return StatusCode(401, new
                {
                    success = false,
                    code = "PASSWORD_NOT_SET",
                    message = "This account has no password yet. Use Forgot Password to set one.",
                });
            }

            var handle = viaPhone ? "phone" : "email";

            if (viaPhone && user is not null && !string.IsNullOrEmpty(user.Password))
            {
                var attempts = (user.FailedLoginAttempts) + 1;
                if (attempts >= MaxAttempts)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockedUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                    user.LockoutBatches += 1;
                    if (user.LockoutBatches >= MaxBatches) user.PasswordBlocked = true;
                }
                else
                {
                    user.FailedLoginAttempts = attempts;
                }
                await _db.SaveChangesAsync(ct);
                _cache.Invalidate(user.Id);

                if (attempts >= MaxAttempts)
                {
                    var blocked = user.PasswordBlocked;
                    return StatusCode(429, new
                    {
                        success = false,
                        code = blocked ? "PASSWORD_BLOCKED" : "LOCKED",
                        retryAfterSeconds = LockoutMinutes * 60,
                        attemptsRemaining = 0,
                        message = blocked
                            ? $"Password sign-in is blocked after {MaxBatches} rounds of {MaxAttempts} wrong attempts. Use Forgot Password to reset it."
                            : $"Too many wrong attempts. Sign-in is disabled for {LockoutMinutes} minutes — or reset your password now.",
                    });
                }

                var remaining = MaxAttempts - attempts;
                return StatusCode(401, new
                {
                    success = false,
                    code = "INVALID_CREDENTIALS",
                    attemptsRemaining = remaining,
                    message = $"Invalid {handle} or password. {remaining} attempt{(remaining == 1 ? "" : "s")} left before a {LockoutMinutes}-minute lock.",
                });
            }

            return StatusCode(401, new
            {
                success = false,
                code = "INVALID_CREDENTIALS",
                message = $"Invalid {handle} or password",
            });
        }

        if (!string.IsNullOrEmpty(user!.Status) && user.Status != "active")
        {
            await _audit.RecordAsync(HttpContext, user, "auth.login_blocked", "auth",
                summary: "Sign-in blocked: account is inactive",
                meta: new { identifier = viaPhone ? phone : email, reason = "inactive" }, ct: ct);
            return StatusCode(403, new
            {
                success = false,
                message = "This account is inactive. Contact the administrator.",
            });
        }

        if (viaPhone && (user.FailedLoginAttempts != 0 || user.LockedUntil is not null
            || user.LockoutBatches != 0 || user.PasswordBlocked))
        {
            user.FailedLoginAttempts = 0;
            user.LockedUntil = null;
            user.LockoutBatches = 0;
            user.PasswordBlocked = false;
            await _db.SaveChangesAsync(ct);
            _cache.Invalidate(user.Id);
        }

        await _audit.RecordAsync(HttpContext, user, "auth.login", "auth",
            summary: $"Signed in via {(viaPhone ? "phone" : "email")}",
            meta: new { identifier = viaPhone ? phone : email, role = user.Role }, ct: ct);

        return Ok(await _mapping.SessionAsync(user, ct));
    }

    [HttpPost("otp/send")]
    public async Task<IActionResult> SendOtp(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] SendOtpRequest? body,
        CancellationToken ct)
    {
        body ??= new SendOtpRequest();
        var phone = UserMapping.NormalisePhone(body.Phone);
        if (string.IsNullOrEmpty(phone)) throw ApiException.BadRequest("Phone is required");

        var purpose = body.Purpose is "register" or "reset" ? body.Purpose : "register";
        var result = await _otp.SendOtpAsync(phone, purpose, ct);
        if (!result.Success)
        {
            return StatusCode(502, new
            {
                success = false,
                message = result.Message ?? "Could not send the verification SMS.",
            });
        }

        return Ok(new
        {
            success = true,
            code = result.Code,
            devMode = result.DevMode,
        });
    }

    [HttpPost("otp/verify-register")]
    public async Task<IActionResult> VerifyRegister(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] VerifyRegisterRequest? body,
        CancellationToken ct)
    {
        body ??= new VerifyRegisterRequest();
        var phone = UserMapping.NormalisePhone(body.Phone);
        var code = body.Code ?? "";
        if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(code))
        {
            throw ApiException.BadRequest("Phone and code are required");
        }

        var verified = await _otp.VerifyOtpAsync(phone, code, "register", ct);
        if (!verified.Success) throw ApiException.BadRequest(verified.Message ?? "Invalid code.");

        if (!string.IsNullOrEmpty(body.Password))
        {
            var policy = PasswordPolicy.Validate(body.Password);
            if (!policy.Ok) throw ApiException.BadRequest(policy.Message);
        }

        var (user, existed) = await EnsureAccountAsync(phone, body, ct);

        await _audit.RecordAsync(HttpContext, user,
            existed ? "auth.login" : "auth.register", "auth",
            summary: existed ? "Signed in after OTP verification" : "Registered a new account",
            meta: new { phone, role = user.Role }, ct: ct);

        var session = await _mapping.SessionAsync(user, ct);
        return Ok(new
        {
            success = session.Success,
            token = session.Token,
            passwordWeak = session.PasswordWeak,
            hasPassword = session.HasPassword,
            user = session.User,
            accountExisted = existed,
        });
    }

    [HttpPost("password/forgot")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ForgotPasswordRequest? body,
        CancellationToken ct)
    {
        body ??= new ForgotPasswordRequest();
        var phone = UserMapping.NormalisePhone(body.Phone);
        if (string.IsNullOrEmpty(phone)) throw ApiException.BadRequest("Phone is required");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone, ct);
        if (user is not null && !string.IsNullOrEmpty(user.Password))
        {
            var result = await _otp.SendOtpAsync(phone, "reset", ct);
            if (!result.Success)
            {
                return StatusCode(502, new
                {
                    success = false,
                    message = result.Message ?? "Could not send the verification SMS.",
                });
            }
            await _audit.RecordAsync(HttpContext, user, "auth.password_reset_requested", "auth",
                summary: "Requested a password reset code", meta: new { phone }, ct: ct);
        }

        return Ok(new { success = true });
    }

    [HttpPost("password/reset")]
    public async Task<IActionResult> ResetPassword(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ResetPasswordRequest? body,
        CancellationToken ct)
    {
        body ??= new ResetPasswordRequest();
        var phone = UserMapping.NormalisePhone(body.Phone);
        var code = body.Code ?? "";
        if (string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(code))
        {
            throw ApiException.BadRequest("Phone and code are required");
        }

        var policy = PasswordPolicy.Validate(body.Password);
        if (!policy.Ok) throw ApiException.BadRequest(policy.Message);

        var verified = await _otp.VerifyOtpAsync(phone, code, "reset", ct);
        if (!verified.Success) throw ApiException.BadRequest(verified.Message ?? "Invalid code.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone, ct);
        if (user is null) throw ApiException.NotFound("User not found");

        user.Password = BCrypt.Net.BCrypt.HashPassword(body.Password!, 10);
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        user.LockoutBatches = 0;
        user.PasswordBlocked = false;
        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(user.Id);

        await _audit.RecordAsync(HttpContext, user, "auth.password_reset", "auth",
            summary: "Reset password with a verification code", meta: new { phone }, ct: ct);

        return Ok(await _mapping.SessionAsync(user, ct));
    }

    [HttpPost("password")]
    [Protect]
    public async Task<IActionResult> ChangePassword(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ChangePasswordRequest? body,
        CancellationToken ct)
    {
        body ??= new ChangePasswordRequest();
        var policy = PasswordPolicy.Validate(body.Password);
        if (!policy.Ok) throw ApiException.BadRequest(policy.Message);

        var current = HttpContext.CurrentUser();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == current.Id, ct)
            ?? throw ApiException.NotFound("User not found");

        if (!string.IsNullOrEmpty(user.Password))
        {
            var ok = !string.IsNullOrEmpty(body.CurrentPassword)
                && BCrypt.Net.BCrypt.Verify(body.CurrentPassword, user.Password);
            if (!ok) throw new ApiException(401, "Current password is incorrect");
        }

        user.Password = BCrypt.Net.BCrypt.HashPassword(body.Password!, 10);
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        user.LockoutBatches = 0;
        user.PasswordBlocked = false;
        await _db.SaveChangesAsync(ct);
        _cache.Invalidate(user.Id);

        await _audit.RecordAsync(HttpContext, user, "auth.password_change", "auth",
            summary: "Changed account password", ct: ct);

        return Ok(await _mapping.SessionAsync(user, ct));
    }

    private async Task<User?> FindByEmailAsync(string email, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(email)) return null;
        var exact = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (exact is not null) return exact;
        return await _db.Users.FirstOrDefaultAsync(u => u.Email != null && EF.Functions.ILike(u.Email, email), ct);
    }

    private async Task<(User User, bool Existed)> EnsureAccountAsync(
        string phone, VerifyRegisterRequest body, CancellationToken ct)
    {
        var requestedRole = body.Role == "fundi" ? "fundi" : "customer";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone, ct);
        var existed = true;

        if (user is not null)
        {
            var blankName = string.IsNullOrEmpty(user.FullName);
            if (!string.IsNullOrEmpty(body.FirstName) && blankName)
            {
                user.FirstName = (body.FirstName ?? "").Trim();
                user.LastName = (body.LastName ?? "").Trim();
            }
            if (!string.IsNullOrEmpty(body.Email) && string.IsNullOrEmpty(user.Email))
            {
                user.Email = (body.Email ?? "").Trim().ToLowerInvariant();
            }
            if (!user.OnboardingComplete && requestedRole != user.Role)
            {
                user.Role = requestedRole;
            }
        }
        else
        {
            existed = false;
            user = new User
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = (body.FirstName ?? "").Trim(),
                LastName = (body.LastName ?? "").Trim(),
                Phone = phone,
                Email = string.IsNullOrEmpty(body.Email) ? null : (body.Email ?? "").Trim().ToLowerInvariant(),
                Password = string.IsNullOrEmpty(body.Password) ? "" : BCrypt.Net.BCrypt.HashPassword(body.Password, 10),
                Role = requestedRole,
                PhoneVerified = true,
                Status = "active",
            };
            _db.Users.Add(user);
        }

        await _db.SaveChangesAsync(ct);

        if (user.Role == "fundi")
        {
            var hasProfile = await _db.FundiProfiles.AnyAsync(p => p.UserId == user.Id, ct);
            if (!hasProfile)
            {
                _db.FundiProfiles.Add(new FundiProfile
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = user.Id,
                    Skills = user.Skills,
                });
                await _db.SaveChangesAsync(ct);
            }
        }

        return (user, existed);
    }
}

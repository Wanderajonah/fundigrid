using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class GoogleAuthController : ControllerBase
{
    private readonly FundiGridDbContext _db;
    private readonly UserMapping _mapping;
    private readonly AuditService _audit;
    private readonly IConfiguration _config;

    public GoogleAuthController(
        FundiGridDbContext db,
        UserMapping mapping,
        AuditService audit,
        IConfiguration config)
    {
        _db = db;
        _mapping = mapping;
        _audit = audit;
        _config = config;
    }

    public sealed class GoogleRequest
    {
        public string? IdToken { get; set; }
    }

    [HttpPost("google")]
    public async Task<IActionResult> Google(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] GoogleRequest? body,
        CancellationToken ct)
    {
        var idToken = body?.IdToken;
        if (string.IsNullOrEmpty(idToken)) throw ApiException.BadRequest("idToken required");

        var clientId = _config["GOOGLE_WEB_CLIENT_ID"];
        if (string.IsNullOrEmpty(clientId))
        {
            throw new ApiException(500, "Google sign-in is not configured");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId },
            });
        }
        catch (InvalidJwtException)
        {
            throw new ApiException(401, "Invalid Google token");
        }

        var googleId = payload.Subject;
        var email = payload.Email?.Trim().ToLowerInvariant();
        var name = payload.Name ?? "";
        var picture = payload.Picture ?? "";

        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId, ct);
        var created = false;

        if (user is null)
        {
            user = string.IsNullOrEmpty(email)
                ? null
                : await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

            if (user is not null)
            {
                user.GoogleId = googleId;
                if (!string.IsNullOrEmpty(picture)) user.ProfilePhoto = picture;
                await _db.SaveChangesAsync(ct);
            }
            else
            {
                var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                created = true;
                user = new User
                {
                    Id = Guid.NewGuid().ToString(),
                    FirstName = parts.Length > 0 ? parts[0] : "",
                    LastName = parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : "",
                    Email = email,
                    GoogleId = googleId,
                    ProfilePhoto = picture,
                    Role = "customer",
                    PhoneVerified = true,
                    OnboardingComplete = false,
                    Status = "active",
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync(ct);
            }
        }

        await _audit.RecordAsync(HttpContext, user,
            created ? "auth.register" : "auth.login", "auth",
            summary: created ? "Registered with Google" : "Signed in with Google",
            meta: new { provider = "google", email }, ct: ct);

        var session = await _mapping.SessionAsync(user, ct);
        return Ok(new
        {
            success = true,
            token = session.Token,
            passwordWeak = session.PasswordWeak,
            hasPassword = session.HasPassword,
            user = session.User,
        });
    }
}

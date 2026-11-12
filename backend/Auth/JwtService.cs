using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using Microsoft.IdentityModel.Tokens;

namespace FundiGrid.Api.Auth;

/// <summary>
/// Issues and validates the same JWT the Node backend used: HS256, claims
/// `id` and `role`, 30-day expiry. Existing client sessions therefore keep
/// working after the cutover as long as JWT_SECRET is unchanged.
/// </summary>
public sealed class JwtService
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);
    private readonly SymmetricSecurityKey _key;

    static JwtService()
    {
        // Keep claim names exactly as signed (`id`, `role`) instead of the
        // legacy WS-Federation URIs the handler maps them to by default.
        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
        JwtSecurityTokenHandler.DefaultOutboundClaimTypeMap.Clear();
    }

    public JwtService(IConfiguration config)
    {
        var secret = config["JWT_SECRET"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException("JWT_SECRET is required.");
        }
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    }

    public string Sign(User user)
    {
        var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: new[]
            {
                new Claim("id", user.Id),
                new Claim("role", user.Role),
            },
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.Add(Lifetime),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string Id, string Role) Verify(string token)
    {
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _key,
                ClockSkew = TimeSpan.Zero,
            }, out _);

            var id = principal.FindFirst("id")?.Value;
            var role = principal.FindFirst("role")?.Value ?? "";
            if (string.IsNullOrEmpty(id))
            {
                throw new ApiException(401, "Not authorized", "INVALID_TOKEN");
            }
            return (id, role);
        }
        catch (SecurityTokenExpiredException)
        {
            throw new ApiException(401, "Your session has expired. Please sign in again.", "TOKEN_EXPIRED");
        }
        catch (ApiException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new ApiException(401, "Not authorized", "INVALID_TOKEN");
        }
    }
}

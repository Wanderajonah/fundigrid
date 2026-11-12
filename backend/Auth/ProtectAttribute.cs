using FundiGrid.Api.Exceptions;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FundiGrid.Api.Auth;

/// <summary>
/// Replaces the Express `protect` middleware. Runs as an authorization filter
/// so authentication is checked before model binding (matching the old
/// middleware order). Optionally requires a role, like `requireAdmin` /
/// `requireFundi` did.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class ProtectAttribute : Attribute, IAsyncAuthorizationFilter
{
    public const string UserItemKey = "FundiGrid.CurrentUser";
    public const string TokenItemKey = "FundiGrid.Token";

    private readonly string? _role;

    public ProtectAttribute(string? role = null)
    {
        _role = role;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        var header = http.Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            throw new ApiException(401, "Not authorized, no token", "NO_TOKEN");
        }

        var token = header["Bearer ".Length..].Trim();
        var jwt = http.RequestServices.GetRequiredService<JwtService>();
        var cache = http.RequestServices.GetRequiredService<UserCache>();

        var (id, _) = jwt.Verify(token);
        var user = await cache.FindAsync(id, http.RequestAborted);
        if (user is null)
        {
            throw new ApiException(401, "User not found", "USER_NOT_FOUND");
        }

        if (_role == "admin" && user.Role != "admin")
        {
            throw new ApiException(403, "Admin account required");
        }
        if (_role == "fundi" && user.Role != "fundi")
        {
            throw new ApiException(403, "Fundi account required");
        }

        http.Items[UserItemKey] = user;
        http.Items[TokenItemKey] = token;
    }
}

public static class HttpContextUserExtensions
{
    public static Entities.User CurrentUser(this HttpContext context)
    {
        return context.Items[ProtectAttribute.UserItemKey] as Entities.User
            ?? throw new ApiException(401, "Not authorized", "NO_TOKEN");
    }

    public static Entities.User? TryCurrentUser(this HttpContext context)
    {
        return context.Items[ProtectAttribute.UserItemKey] as Entities.User;
    }
}

using FundiGrid.Api.Exceptions;

namespace FundiGrid.Api.Middleware;

/// <summary>
/// Mirrors the Node error handler: JSON `{ success, code?, message }` with the
/// status carried by the exception, and 500 for anything unexpected.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client went away; nothing to write.
        }
        catch (ApiException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message, ex.Code);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error on {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteAsync(context, 500, "Internal server error", null);
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message, string? code)
    {
        if (context.Response.HasStarted) return;
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            code,
            message,
        });
    }
}

namespace FundiGrid.Api.Exceptions;

/// <summary>Application error that maps to an HTTP status and optional machine code.</summary>
public sealed class ApiException : Exception
{
    public int StatusCode { get; }
    public string? Code { get; }

    public ApiException(int statusCode, string message, string? code = null) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public static ApiException BadRequest(string message, string? code = null) => new(400, message, code);
    public static ApiException Unauthorized(string message, string? code = null) => new(401, message, code);
    public static ApiException Forbidden(string message, string? code = null) => new(403, message, code);
    public static ApiException NotFound(string message, string? code = null) => new(404, message, code);
}

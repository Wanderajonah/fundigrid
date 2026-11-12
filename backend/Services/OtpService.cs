using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Services;

public sealed record OtpSendResult(bool Success, string? Code = null, bool DevMode = false, string? Message = null);

/// <summary>Phone OTP issuance and verification (register + reset purposes).</summary>
public sealed class OtpService
{
    private const int ExpiryMinutes = 5;
    private const int MaxAttempts = 5;

    private readonly FundiGridDbContext _db;
    private readonly SmsService _sms;
    private readonly IConfiguration _config;
    private readonly IHostEnvironment _env;
    private readonly ILogger<OtpService> _logger;

    public OtpService(
        FundiGridDbContext db,
        SmsService sms,
        IConfiguration config,
        IHostEnvironment env,
        ILogger<OtpService> logger)
    {
        _db = db;
        _sms = sms;
        _config = config;
        _env = env;
        _logger = logger;
    }

    public (bool Configured, bool Production, bool DevMode) Channel()
    {
        var configured = _sms.IsConfigured;
        var production = _env.IsProduction()
            || string.Equals(_config["RENDER"], "true", StringComparison.OrdinalIgnoreCase);
        var devMode = string.Equals(_config["COMMS_DEV_MODE"], "true", StringComparison.OrdinalIgnoreCase)
            && !(production && configured);
        return (configured, production, devMode);
    }

    public static string GenerateCode() => Random.Shared.Next(1000, 10000).ToString();

    public async Task<OtpSendResult> SendOtpAsync(string phone, string purpose, CancellationToken ct = default)
    {
        var code = GenerateCode();
        var codeHash = BCrypt.Net.BCrypt.HashPassword(code, 10);
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(ExpiryMinutes);

        var existing = await _db.Otps.FirstOrDefaultAsync(o => o.Phone == phone && o.Purpose == purpose, ct);
        if (existing is null)
        {
            _db.Otps.Add(new Otp
            {
                Id = Guid.NewGuid().ToString(),
                Phone = phone,
                Purpose = purpose,
                CodeHash = codeHash,
                ExpiresAt = expiresAt,
                Attempts = 0,
                LastSentAt = now,
            });
        }
        else
        {
            existing.CodeHash = codeHash;
            existing.ExpiresAt = expiresAt;
            existing.Attempts = 0;
            existing.LastSentAt = now;
        }
        await _db.SaveChangesAsync(ct);

        var channel = Channel();
        if (channel.DevMode)
        {
            if (channel.Production)
            {
                _logger.LogWarning("[otp] RUNNING IN DEV OTP FALLBACK IN PRODUCTION — configure COMMS_* so codes go out by SMS.");
            }
            LogCode(phone, purpose, code, "DEV OTP");
            return new OtpSendResult(true, code, DevMode: true);
        }

        var logOtp = !string.Equals(_config["COMMS_LOG_OTP"], "false", StringComparison.OrdinalIgnoreCase);
        if (logOtp)
        {
            LogCode(phone, purpose, code, channel.Configured ? "OTP (SMS sent + logged)" : "OTP (logged, no provider)");
        }

        if (channel.Configured)
        {
            var message = $"Your FundiGrid verification code is: {code}. Valid for {ExpiryMinutes} minutes.";
            var sent = await _sms.SendSmsAsync(phone, message, ct);
            if (sent.Success) return new OtpSendResult(true);
            _logger.LogError("[otp] SMS to {Phone} failed: {Message}", phone, sent.Message);
            return new OtpSendResult(false, Message: "Could not send the verification SMS. Please try again.");
        }

        if (logOtp)
        {
            _logger.LogWarning("[otp] SMS provider is not configured — the printed code above is the only delivery channel.");
            return new OtpSendResult(true, DevMode: true);
        }

        return new OtpSendResult(false, Message: "SMS provider is not configured.");
    }

    public async Task<(bool Success, string? Message)> VerifyOtpAsync(
        string phone, string code, string purpose, CancellationToken ct = default)
    {
        var record = await _db.Otps.FirstOrDefaultAsync(o => o.Phone == phone && o.Purpose == purpose, ct);
        if (record is null) return (false, "No OTP found. Request a new one.");
        if (record.ExpiresAt < DateTime.UtcNow) return (false, "OTP expired. Request a new one.");
        if (record.Attempts >= MaxAttempts) return (false, "Too many attempts. Request a new OTP.");

        var match = BCrypt.Net.BCrypt.Verify(code, record.CodeHash);
        if (!match)
        {
            record.Attempts += 1;
            await _db.SaveChangesAsync(ct);
            return (false, "Invalid code.");
        }

        _db.Otps.Remove(record);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    private void LogCode(string phone, string purpose, string code, string label)
    {
        _logger.LogInformation(
            "\n─────────────────────────────────────────────\n  [{Label}] {Phone} ({Purpose})\n  Code: {Code}   (valid {Minutes} min)\n─────────────────────────────────────────────",
            label, phone, purpose, code, ExpiryMinutes);
    }
}

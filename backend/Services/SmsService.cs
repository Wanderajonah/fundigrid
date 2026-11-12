using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace FundiGrid.Api.Services;

public sealed record SmsResult(bool Success, string? Message = null, JsonElement? Data = null, bool Configured = true);

/// <summary>eGoSMS JSON gateway, same contract the Node backend used.</summary>
public sealed class SmsService
{
    private const string DefaultEndpoint = "https://comms.egosms.co/api/v1/json";
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<SmsService> _logger;

    public SmsService(IConfiguration config, IHttpClientFactory httpFactory, ILogger<SmsService> logger)
    {
        _config = config;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_config["COMMS_ENDPOINT"])
        && !string.IsNullOrWhiteSpace(_config["COMMS_USERNAME"])
        && !string.IsNullOrWhiteSpace(_config["COMMS_API_KEY"]);

    public static string NormalizeNumber(string? phone)
    {
        var cleaned = (phone ?? "").Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
        if (cleaned.StartsWith('+')) cleaned = cleaned[1..];
        if (cleaned.StartsWith('0')) cleaned = "256" + cleaned[1..];
        return cleaned;
    }

    private string Endpoint => (_config["COMMS_ENDPOINT"] ?? DefaultEndpoint).TrimEnd('/');

    public async Task<SmsResult> SendSmsAsync(string phone, string message, CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            return new SmsResult(false, "SMS provider not configured", Configured: false);
        }

        var number = NormalizeNumber(phone);
        if (!System.Text.RegularExpressions.Regex.IsMatch(number, @"^\d{9,15}$"))
        {
            return new SmsResult(false, $"Invalid phone number: {phone}");
        }

        var payload = new
        {
            method = "SendSms",
            userdata = new
            {
                username = _config["COMMS_USERNAME"],
                password = _config["COMMS_API_KEY"],
            },
            walletType = "Local",
            msgdata = new[]
            {
                new
                {
                    number,
                    message,
                    senderid = _config["COMMS_SENDER_ID"] ?? "FundiGrid",
                    priority = "1",
                },
            },
        };

        try
        {
            var (statusCode, data) = await PostAsync(payload, ct);
            var status = data is { ValueKind: JsonValueKind.Object } d && d.TryGetProperty("Status", out var s)
                ? s.ToString()
                : "";
            var ok = statusCode is >= 200 and < 300 && string.Equals(status, "ok", StringComparison.OrdinalIgnoreCase);
            if (ok) return new SmsResult(true, Data: data);

            var detail = ProviderMessage(data) ?? $"HTTP {statusCode}";
            _logger.LogError("[egoSms] send failed ({Status}): {Detail}", statusCode, detail);
            return new SmsResult(false, detail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[egoSms] send error");
            return new SmsResult(false, ex.Message);
        }
    }

    private async Task<(int StatusCode, JsonElement? Data)> PostAsync(object payload, CancellationToken ct)
    {
        var client = _httpFactory.CreateClient("sms");
        var timeout = int.TryParse(_config["COMMS_TIMEOUT_MS"], out var ms) ? ms : 15000;
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromMilliseconds(timeout));

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await client.PostAsync(Endpoint, content, cts.Token);
        var raw = await response.Content.ReadAsStringAsync(cts.Token);

        JsonElement? parsed = null;
        try
        {
            parsed = JsonSerializer.Deserialize<JsonElement>(raw);
        }
        catch
        {
            // Keep the raw text as a JSON string so callers can still show it.
            parsed = JsonSerializer.SerializeToElement(raw);
        }

        return ((int)response.StatusCode, parsed);
    }

    private static string? ProviderMessage(JsonElement? data)
    {
        if (data is not { } d) return null;
        if (d.ValueKind == JsonValueKind.Object)
        {
            if (d.TryGetProperty("Message", out var m)) return m.ToString();
            if (d.TryGetProperty("message", out var m2)) return m2.ToString();
            return null;
        }
        var text = d.ValueKind == JsonValueKind.String ? d.GetString() : d.ToString();
        return text is null ? null : text[..Math.Min(text.Length, 300)];
    }
}

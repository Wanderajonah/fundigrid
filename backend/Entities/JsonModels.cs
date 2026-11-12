using System.Text.Json;
using System.Text.Json.Serialization;

namespace FundiGrid.Api.Entities;

/// <summary>{lat,lng} object stored in the jsonb `location` columns.</summary>
public sealed class Location
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lng")]
    public double Lng { get; set; }

    public static Location Zero => new() { Lat = 0, Lng = 0 };
}

/// <summary>Rate-card fallback stored on a booking's `estimate` jsonb column.</summary>
public sealed class Estimate
{
    public string Category { get; set; } = "";
    public double Labour { get; set; }
    public double Materials { get; set; }
    public double ServiceFee { get; set; }
    public double Total { get; set; }
    public string Currency { get; set; } = "UGX";
    public string Source { get; set; } = "rate_card";
    public string CreatedAt { get; set; } = "";
}

/// <summary>One entry in the legacy dispatch list on a booking.</summary>
public sealed class NotifiedFundi
{
    public string FundiId { get; set; } = "";
    public string? NotifiedAt { get; set; }
    public double? DistanceKm { get; set; }
}

/// <summary>Opaque JSON column helper used where the payload shape is free-form.</summary>
public static class JsonColumns
{
    public static JsonDocument EmptyObject { get; } = JsonDocument.Parse("{}");
    public static JsonDocument EmptyArray { get; } = JsonDocument.Parse("[]");

    public static JsonDocument Parse(string json)
    {
        return JsonDocument.Parse(string.IsNullOrWhiteSpace(json) ? "null" : json);
    }
}

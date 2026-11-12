using FundiGrid.Api.Entities;

namespace FundiGrid.Api.Services;

/// <summary>
/// Rate-card job costs. The fundi quotes the real price; these rates exist only
/// as the amount payment falls back to when nothing was agreed.
/// </summary>
public static class EstimateService
{
    private sealed record Rate(double Labour, double Materials);

    private static readonly Dictionary<string, Rate> RateCard = new(StringComparer.OrdinalIgnoreCase)
    {
        ["plumbing"] = new(120000, 80000),
        ["electrical"] = new(130000, 90000),
        ["carpentry"] = new(110000, 70000),
        ["masonry"] = new(100000, 120000),
        ["painting"] = new(90000, 60000),
        ["cleaning"] = new(60000, 20000),
        ["gardening"] = new(70000, 30000),
        ["welding"] = new(120000, 100000),
    };

    private static readonly Rate DefaultRate = new(100000, 60000);
    private const double ServiceFeeRate = 0.05;
    private const double MinServiceFee = 10000;

    private static Rate RateFor(string? category)
    {
        var key = (category ?? "").Trim().ToLowerInvariant();
        if (RateCard.TryGetValue(key, out var exact)) return exact;

        var hit = RateCard.Keys.FirstOrDefault(k => key.Contains(k) || k.Contains(key));
        return hit is not null ? RateCard[hit] : DefaultRate;
    }

    public static Estimate BuildEstimate(string? category)
    {
        var label = (category ?? "").Trim();
        var rate = RateFor(label);
        var subtotal = rate.Labour + rate.Materials;
        var serviceFee = Math.Max(MinServiceFee, Math.Round(subtotal * ServiceFeeRate, MidpointRounding.AwayFromZero));

        return new Estimate
        {
            Category = label,
            Labour = rate.Labour,
            Materials = rate.Materials,
            ServiceFee = serviceFee,
            Total = subtotal + serviceFee,
            Currency = "UGX",
            Source = "rate_card",
            CreatedAt = DateTime.UtcNow.ToString("O"),
        };
    }

    public static Estimate EstimateFor(Booking booking)
    {
        if (booking.Estimate is { Total: > 0 } stored) return stored;
        return BuildEstimate(booking.Category);
    }
}

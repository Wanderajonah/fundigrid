using System.Text.Json;

namespace FundiGrid.Api.Entities;

public sealed class Wallet
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public double Balance { get; set; }
    public double HeldBalance { get; set; }
    public string Currency { get; set; } = "UGX";
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Transaction
{
    public string Id { get; set; } = "";
    public string WalletId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "";
    public double Amount { get; set; }
    public string Currency { get; set; } = "UGX";
    public string? Reference { get; set; }
    public string Description { get; set; } = "";
    public string Status { get; set; } = "completed";
    public string? RelatedBooking { get; set; }
    public string? RelatedUser { get; set; }
    public double BalanceBefore { get; set; }
    public double BalanceAfter { get; set; }
    public string PaymentMethod { get; set; } = "";
    public JsonDocument Metadata { get; set; } = JsonColumns.EmptyObject;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

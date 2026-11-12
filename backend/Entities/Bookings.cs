using System.Text.Json;

namespace FundiGrid.Api.Entities;

public sealed class Booking
{
    public string Id { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string? FundiId { get; set; }
    public string FundiName { get; set; } = "";
    public DateTime? ScheduledFor { get; set; }
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public string Address { get; set; } = "";
    public Location Location { get; set; } = Location.Zero;
    public string Status { get; set; } = "PENDING";
    public string? CancelledBy { get; set; }
    public string? CancellationReason { get; set; }
    public string? DisputeReason { get; set; }
    public List<NotifiedFundi> NotifiedFundis { get; set; } = new();
    public double CurrentFundiIndex { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? OnTheWayAt { get; set; }
    public DateTime? ArrivedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool ClientCompleted { get; set; }
    public bool FundiCompleted { get; set; }
    public DateTime? ClientCompletedAt { get; set; }
    public DateTime? FundiCompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public JsonDocument FundiLocation { get; set; } = JsonColumns.EmptyObject;
    public string[] Images { get; set; } = Array.Empty<string>();
    public double EstimatedDuration { get; set; } = 60;
    public double? ActualDuration { get; set; }
    public Estimate? Estimate { get; set; }
    public double? ProposedPrice { get; set; }
    public string? ProposedBy { get; set; }
    public bool ClientPriceAgreed { get; set; }
    public bool FundiPriceAgreed { get; set; }
    public double? AgreedPrice { get; set; }
    public bool PriceAgreed { get; set; }
    public string PaymentStatus { get; set; } = "unpaid";
    public DateTime? EscrowHeldAt { get; set; }
    public DateTime? EscrowReleasedAt { get; set; }
    public double? EscrowAmount { get; set; }
    public double ClientFee { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Job
{
    public string Id { get; set; } = "";
    public string CustomerId { get; set; } = "";
    public string? FundiId { get; set; }
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public Location Location { get; set; } = Location.Zero;
    public string ImageUrl { get; set; } = "";
    public double QuoteAmount { get; set; }
    public string Status { get; set; } = "open";
    public string Address { get; set; } = "";
    public double Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Review
{
    public string Id { get; set; } = "";
    public string FundiId { get; set; } = "";
    public string CustomerId { get; set; } = "";
    public string? JobId { get; set; }
    public double Rating { get; set; }
    public string Comment { get; set; } = "";
    public string[] PhotoUrls { get; set; } = Array.Empty<string>();
    public string Service { get; set; } = "";
    public double Amount { get; set; }
    public string? BookingId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

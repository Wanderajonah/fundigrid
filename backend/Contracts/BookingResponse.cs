using System.Text.Json;
using FundiGrid.Api.Entities;

namespace FundiGrid.Api.Contracts;

/// <summary>Clean camelCase booking payload (no snake_case columns).</summary>
public sealed class BookingResponse
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
    public string Status { get; set; } = "";
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
    public JsonDocument FundiLocation { get; set; } = JsonDocument.Parse("{}");
    public string[] Images { get; set; } = Array.Empty<string>();
    public double EstimatedDuration { get; set; }
    public double? ActualDuration { get; set; }
    public Estimate? Estimate { get; set; }
    public double? ProposedPrice { get; set; }
    public string? ProposedBy { get; set; }
    public bool ClientPriceAgreed { get; set; }
    public bool FundiPriceAgreed { get; set; }
    public double? AgreedPrice { get; set; }
    public bool PriceAgreed { get; set; }
    public string PaymentStatus { get; set; } = "";
    public DateTime? EscrowHeldAt { get; set; }
    public DateTime? EscrowReleasedAt { get; set; }
    public double? EscrowAmount { get; set; }
    public double ClientFee { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static BookingResponse From(Booking b)
    {
        return new BookingResponse
        {
            Id = b.Id,
            ClientId = b.ClientId,
            FundiId = b.FundiId,
            FundiName = b.FundiName,
            ScheduledFor = b.ScheduledFor,
            Category = b.Category,
            Description = b.Description,
            Address = b.Address,
            Location = b.Location,
            Status = b.Status,
            CancelledBy = b.CancelledBy,
            CancellationReason = b.CancellationReason,
            DisputeReason = b.DisputeReason,
            NotifiedFundis = b.NotifiedFundis,
            CurrentFundiIndex = b.CurrentFundiIndex,
            ExpiresAt = b.ExpiresAt,
            AcceptedAt = b.AcceptedAt,
            OnTheWayAt = b.OnTheWayAt,
            ArrivedAt = b.ArrivedAt,
            StartedAt = b.StartedAt,
            CompletedAt = b.CompletedAt,
            ClientCompleted = b.ClientCompleted,
            FundiCompleted = b.FundiCompleted,
            ClientCompletedAt = b.ClientCompletedAt,
            FundiCompletedAt = b.FundiCompletedAt,
            CancelledAt = b.CancelledAt,
            FundiLocation = b.FundiLocation,
            Images = b.Images,
            EstimatedDuration = b.EstimatedDuration,
            ActualDuration = b.ActualDuration,
            Estimate = b.Estimate,
            ProposedPrice = b.ProposedPrice,
            ProposedBy = b.ProposedBy,
            ClientPriceAgreed = b.ClientPriceAgreed,
            FundiPriceAgreed = b.FundiPriceAgreed,
            AgreedPrice = b.AgreedPrice,
            PriceAgreed = b.PriceAgreed,
            PaymentStatus = b.PaymentStatus,
            EscrowHeldAt = b.EscrowHeldAt,
            EscrowReleasedAt = b.EscrowReleasedAt,
            EscrowAmount = b.EscrowAmount,
            ClientFee = b.ClientFee,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt,
        };
    }
}

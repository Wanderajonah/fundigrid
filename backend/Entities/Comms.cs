using System.Text.Json;

namespace FundiGrid.Api.Entities;

public sealed class Conversation
{
    public string Id { get; set; } = "";
    public string[] Participants { get; set; } = Array.Empty<string>();
    public string? BookingId { get; set; }
    public string Type { get; set; } = "booking";
    public string LastMessage { get; set; } = "";
    public string? LastSenderId { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Message
{
    public string Id { get; set; } = "";
    public string ConversationId { get; set; } = "";
    public string SenderId { get; set; } = "";
    public string Text { get; set; } = "";
    public string? ImageUrl { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Notification
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "system";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public JsonDocument Data { get; set; } = JsonColumns.EmptyObject;
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class AdminNotification
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "info";
    public string Message { get; set; } = "";
    public string? RelatedId { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class PlatformSettings
{
    public string Id { get; set; } = "";
    public string AdminName { get; set; } = "Admin User";
    public string AdminEmail { get; set; } = "admin@ufundi.com";
    public string AdminRole { get; set; } = "Super Admin";
    public double CommissionRate { get; set; }
    public double ClientFeeRate { get; set; } = 5;
    public double MinJobAmount { get; set; } = 500;
    public double ServiceRadius { get; set; } = 25;
    public string AutoApprovalFundis { get; set; } = "10 successful jobs";
    public string DisputeResolution { get; set; } = "48 hours";
    public JsonDocument Notifications { get; set; } = JsonColumns.EmptyArray;
    public JsonDocument PaymentIntegrations { get; set; } = JsonColumns.EmptyArray;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class AuditLog
{
    public string Id { get; set; } = "";
    public string? ActorId { get; set; }
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string Action { get; set; } = "";
    public string Category { get; set; } = "users";
    public string EntityType { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string Summary { get; set; } = "";
    public string IpAddress { get; set; } = "";
    public string UserAgent { get; set; } = "";
    public JsonDocument Meta { get; set; } = JsonColumns.EmptyObject;
    public DateTime CreatedAt { get; set; }
}

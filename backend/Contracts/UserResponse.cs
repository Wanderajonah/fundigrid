using System.Text.Json;
using FundiGrid.Api.Entities;

namespace FundiGrid.Api.Contracts;

/// <summary>
/// The cleaned user payload. camelCase on the wire (default JSON policy), no
/// password, no `_meta`, and every optional field present as null rather than
/// omitted. Fundi-only extras are null for other roles.
/// </summary>
public sealed class UserResponse
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Name { get; set; } = "";
    public string Gender { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Role { get; set; } = "";
    public bool FundiEnabled { get; set; }
    public bool PhoneVerified { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string ProfilePhoto { get; set; } = "";
    public string CoverPhoto { get; set; } = "";
    public bool OnboardingComplete { get; set; }
    public bool IsOnline { get; set; }
    public Location Location { get; set; } = Location.Zero;
    public string LocationLabel { get; set; } = "";
    public string Address { get; set; } = "";
    public string District { get; set; } = "";
    public string Country { get; set; } = "";
    public double SearchRadiusKm { get; set; }
    public string Status { get; set; } = "";
    public string[] Skills { get; set; } = Array.Empty<string>();
    public double Experience { get; set; }
    public string Bio { get; set; } = "";
    public string[] PortfolioImages { get; set; } = Array.Empty<string>();
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public string AvailableStartTime { get; set; } = "";
    public string AvailableEndTime { get; set; } = "";
    public double ServiceRadius { get; set; }
    public string[] VerificationDocs { get; set; } = Array.Empty<string>();
    public JsonDocument Referees { get; set; } = JsonDocument.Parse("[]");
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Fundi profile extras.
    public double? Rating { get; set; }
    public double? ReviewCount { get; set; }
    public bool? Verified { get; set; }
    public string? VerificationStatus { get; set; }
    public string? VerificationNote { get; set; }
    public bool? IsAvailable { get; set; }
}

public sealed class SessionResponse
{
    public bool Success { get; set; } = true;
    public string Token { get; set; } = "";
    public bool PasswordWeak { get; set; }
    public bool HasPassword { get; set; }
    public UserResponse User { get; set; } = new();
}

using System.Text.Json;

namespace FundiGrid.Api.Entities;

public sealed class User
{
    public string Id { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Gender { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Password { get; set; } = "";
    public string Role { get; set; } = "customer";
    public bool FundiEnabled { get; set; }
    public bool PhoneVerified { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string ProfilePhoto { get; set; } = "";
    public string CoverPhoto { get; set; } = "";
    public string? GoogleId { get; set; }
    public bool OnboardingComplete { get; set; }
    public bool IsOnline { get; set; }
    public string? SocketId { get; set; }
    public Location Location { get; set; } = Location.Zero;
    public string LocationLabel { get; set; } = "";
    public string Address { get; set; } = "";
    public string District { get; set; } = "";
    public string Country { get; set; } = "";
    public double SearchRadiusKm { get; set; } = 10;
    public string Status { get; set; } = "active";
    public string[] Skills { get; set; } = Array.Empty<string>();
    public double Experience { get; set; }
    public string Bio { get; set; } = "";
    public string[] PortfolioImages { get; set; } = Array.Empty<string>();
    public string[] AvailableDays { get; set; } = Array.Empty<string>();
    public string AvailableStartTime { get; set; } = "";
    public string AvailableEndTime { get; set; } = "";
    public double ServiceRadius { get; set; } = 10;
    public string[] VerificationDocs { get; set; } = Array.Empty<string>();
    public JsonDocument Referees { get; set; } = JsonColumns.EmptyArray;
    public JsonDocument Meta { get; set; } = JsonColumns.EmptyObject;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Password sign-in lockout state.
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }
    public int LockoutBatches { get; set; }
    public bool PasswordBlocked { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public sealed class FundiProfile
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string[] Skills { get; set; } = Array.Empty<string>();
    public double Experience { get; set; }
    public double Rating { get; set; }
    public double JobsCompleted { get; set; }
    public bool Verified { get; set; }
    public string VerificationStatus { get; set; } = "unverified";
    public string[] VerificationDocs { get; set; } = Array.Empty<string>();
    public string VerificationNotes { get; set; } = "";
    public DateTime? RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string[] PortfolioImages { get; set; } = Array.Empty<string>();
    public JsonDocument CurrentLocation { get; set; } = JsonColumns.EmptyObject;
    public bool IsAvailable { get; set; } = true;
    public bool AvailableForNegotiation { get; set; }
    public string Bio { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class Otp
{
    public string Id { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Purpose { get; set; } = "register";
    public string CodeHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public double Attempts { get; set; }
    public DateTime LastSentAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class EmailOtp
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Purpose { get; set; } = "login";
    public string CodeHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public double Attempts { get; set; }
    public DateTime LastSentAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

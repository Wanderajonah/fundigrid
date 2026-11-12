using FundiGrid.Api.Auth;
using FundiGrid.Api.Contracts;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Services;

/// <summary>Maps database rows to the public API shape and builds sessions.</summary>
public sealed class UserMapping
{
    private readonly FundiGridDbContext _db;
    private readonly JwtService _jwt;

    public UserMapping(FundiGridDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public static string NormalisePhone(string? value)
    {
        var digits = new string((value ?? "").Where(char.IsDigit).ToArray());
        if (digits.StartsWith("256")) return digits;
        if (digits.StartsWith('0')) return "256" + digits[1..];
        if (digits.Length == 9) return "256" + digits;
        return digits;
    }

    public static UserResponse ToResponse(User user, FundiProfile? profile = null)
    {
        var response = new UserResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Name = user.FullName,
            Gender = user.Gender,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            FundiEnabled = user.FundiEnabled,
            PhoneVerified = user.PhoneVerified,
            DateOfBirth = user.DateOfBirth,
            ProfilePhoto = user.ProfilePhoto,
            CoverPhoto = user.CoverPhoto,
            OnboardingComplete = user.OnboardingComplete,
            IsOnline = user.IsOnline,
            Location = user.Location,
            LocationLabel = user.LocationLabel,
            Address = user.Address,
            District = user.District,
            Country = user.Country,
            SearchRadiusKm = user.SearchRadiusKm,
            Status = user.Status,
            Skills = user.Skills,
            Experience = user.Experience,
            Bio = user.Bio,
            PortfolioImages = user.PortfolioImages,
            AvailableDays = user.AvailableDays,
            AvailableStartTime = user.AvailableStartTime,
            AvailableEndTime = user.AvailableEndTime,
            ServiceRadius = user.ServiceRadius,
            VerificationDocs = user.VerificationDocs,
            Referees = user.Referees,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
        };

        if (user.Role == "fundi" && profile is not null)
        {
            response.Rating = profile.Rating;
            response.ReviewCount = profile.JobsCompleted;
            response.Verified = profile.Verified;
            response.VerificationStatus = profile.VerificationStatus;
            response.VerificationNote = profile.VerificationNotes;
            response.IsAvailable = profile.IsAvailable;
            if (!string.IsNullOrEmpty(profile.Bio)) response.Bio = profile.Bio;
        }

        return response;
    }

    public async Task<UserResponse> ToResponseAsync(User user, CancellationToken ct = default)
    {
        FundiProfile? profile = null;
        if (user.Role == "fundi")
        {
            profile = await _db.FundiProfiles.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        }
        return ToResponse(user, profile);
    }

    public async Task<SessionResponse> SessionAsync(User user, CancellationToken ct = default)
    {
        return new SessionResponse
        {
            Token = _jwt.Sign(user),
            PasswordWeak = PasswordPolicy.IsWeak(user.Password),
            HasPassword = !string.IsNullOrEmpty(user.Password),
            User = await ToResponseAsync(user, ct),
        };
    }
}

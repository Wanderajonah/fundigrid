using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/reviews")]
public sealed class ReviewsController : ControllerBase
{
    private readonly FundiGridDbContext _db;

    public ReviewsController(FundiGridDbContext db)
    {
        _db = db;
    }

    public sealed class CreateReviewRequest
    {
        public string? BookingId { get; set; }
        public string? FundiId { get; set; }
        public double? Rating { get; set; }
        public string? Comment { get; set; }
        public string? Service { get; set; }
    }

    [HttpGet("{fundiId}")]
    [Protect]
    public async Task<IActionResult> List(string fundiId, CancellationToken ct)
    {
        var rows = await _db.Reviews.AsNoTracking()
            .Where(r => r.FundiId == fundiId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return Ok(new { success = true, reviews = rows.Select(ToDto) });
    }

    [HttpPost]
    [Protect]
    public async Task<IActionResult> Create(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CreateReviewRequest? body,
        CancellationToken ct)
    {
        body ??= new CreateReviewRequest();
        var stars = body.Rating ?? double.NaN;
        if (!double.IsFinite(stars) || stars < 1 || stars > 5)
        {
            throw ApiException.BadRequest("Choose a rating between 1 and 5 stars.");
        }

        var user = HttpContext.CurrentUser();
        var targetFundiId = body.FundiId ?? "";
        var serviceName = (body.Service ?? "")[..Math.Min((body.Service ?? "").Length, 120)];
        double amount = 0;
        Booking? booking = null;

        if (!string.IsNullOrEmpty(body.BookingId))
        {
            booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == body.BookingId, ct);
            if (booking is null) throw ApiException.NotFound("Booking not found.");
            if (booking.ClientId != user.Id) throw new ApiException(403, "You can only review your own jobs.");
            if (booking.Status == "CANCELLED") throw ApiException.BadRequest("Cancelled jobs cannot be reviewed.");
            if (!string.IsNullOrEmpty(booking.FundiId)) targetFundiId = booking.FundiId;
            if (string.IsNullOrEmpty(serviceName))
            {
                serviceName = (booking.Category ?? "")[..Math.Min((booking.Category ?? "").Length, 120)];
            }
            amount = booking.AgreedPrice ?? 0;
        }

        if (string.IsNullOrEmpty(targetFundiId))
        {
            throw ApiException.BadRequest("There is no fundi to review.");
        }

        var fundi = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetFundiId, ct);
        if (fundi is null || fundi.Role != "fundi") throw ApiException.BadRequest("Fundi not found.");

        var comment = (body.Comment ?? "")[..Math.Min((body.Comment ?? "").Length, 2000)];
        var bookingId = string.IsNullOrEmpty(body.BookingId) ? null : body.BookingId;

        Review? existing = null;
        if (bookingId is not null)
        {
            existing = await _db.Reviews.FirstOrDefaultAsync(r =>
                r.CustomerId == user.Id && r.FundiId == targetFundiId && r.BookingId == bookingId, ct);
        }

        Review review;
        if (existing is not null)
        {
            existing.Rating = stars;
            existing.Comment = comment;
            existing.Service = serviceName;
            existing.UpdatedAt = DateTime.UtcNow;
            review = existing;
        }
        else
        {
            review = new Review
            {
                Id = Guid.NewGuid().ToString(),
                FundiId = targetFundiId,
                CustomerId = user.Id,
                JobId = null,
                Rating = stars,
                Comment = comment,
                Service = serviceName,
                Amount = amount,
                BookingId = bookingId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Reviews.Add(review);
        }

        await _db.SaveChangesAsync(ct);

        var average = await RecomputeRatingAsync(targetFundiId, ct);
        return Ok(new { success = true, review = ToDto(review), rating = average });
    }

    private async Task<double> RecomputeRatingAsync(string fundiId, CancellationToken ct)
    {
        var ratings = await _db.Reviews.AsNoTracking()
            .Where(r => r.FundiId == fundiId)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        var rating = ratings.Count == 0 ? 0 : ratings.Sum() / ratings.Count;

        var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == fundiId, ct);
        if (profile is not null)
        {
            profile.Rating = rating;
            profile.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.FundiProfiles.Add(new FundiProfile
            {
                Id = Guid.NewGuid().ToString(),
                UserId = fundiId,
                Rating = rating,
            });
        }

        await _db.SaveChangesAsync(ct);
        return rating;
    }

    private static object ToDto(Review r) => new
    {
        id = r.Id,
        fundiId = r.FundiId,
        customerId = r.CustomerId,
        jobId = r.JobId,
        rating = r.Rating,
        comment = r.Comment,
        photoUrls = r.PhotoUrls,
        service = r.Service,
        amount = r.Amount,
        bookingId = r.BookingId,
        createdAt = r.CreatedAt,
        updatedAt = r.UpdatedAt,
    };
}

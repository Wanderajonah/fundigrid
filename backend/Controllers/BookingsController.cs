using System.Text.Json;
using FundiGrid.Api.Auth;
using FundiGrid.Api.Contracts;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/bookings")]
public sealed class BookingsController : ControllerBase
{
    private static readonly string[] FundiStatuses = { "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED" };
    private static readonly string[] FlowStatuses = { "PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED" };
    private static readonly string[] TerminalStatuses = { "CANCELLED", "DISPUTED", "COMPLETED" };
    private static readonly string[] SimulationFlow = { "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED" };

    private readonly FundiGridDbContext _db;
    private readonly AuditService _audit;
    private readonly IConfiguration _config;

    public BookingsController(FundiGridDbContext db, AuditService audit, IConfiguration config)
    {
        _db = db;
        _audit = audit;
        _config = config;
    }

    [HttpGet("fundi/bookings")]
    [Protect("fundi")]
    public async Task<IActionResult> FundiBookings(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var rows = await _db.Bookings.AsNoTracking()
            .Where(b => b.FundiId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(ct);
        return Ok(new { success = true, bookings = rows.Select(BookingResponse.From) });
    }

    [HttpGet("fundi/bookings/{id}")]
    [Protect("fundi")]
    public async Task<IActionResult> FundiBooking(string id, CancellationToken ct)
    {
        var booking = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) throw ApiException.NotFound("Booking not found");

        var userId = HttpContext.CurrentUser().Id;
        if (!string.IsNullOrEmpty(booking.FundiId) && booking.FundiId != userId)
        {
            throw new ApiException(403, "Not your booking");
        }

        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpPost("fundi/accept")]
    [Protect("fundi")]
    public async Task<IActionResult> Accept(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        if (booking.Status != "PENDING") throw ApiException.BadRequest("Booking not available");

        var user = HttpContext.CurrentUser();
        if (!string.IsNullOrEmpty(booking.FundiId) && booking.FundiId != user.Id)
        {
            throw new ApiException(403, "This booking was requested from another fundi");
        }

        booking.FundiId = user.Id;
        booking.FundiName = string.IsNullOrEmpty(user.FullName) ? booking.FundiName : user.FullName;
        booking.Status = "ACCEPTED";
        booking.AcceptedAt = DateTime.UtcNow;
        booking.ExpiresAt = null;
        await _db.SaveChangesAsync(ct);

        return Ok(new { success = true, message = "Booking accepted" });
    }

    [HttpPost("fundi/decline")]
    [Protect("fundi")]
    public async Task<IActionResult> Decline(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        var user = HttpContext.CurrentUser();
        if (!string.IsNullOrEmpty(booking.FundiId) && booking.FundiId != user.Id)
        {
            throw new ApiException(403, "This booking was requested from another fundi");
        }

        booking.Status = "CANCELLED";
        booking.CancelledBy = "FUNDI";
        booking.CancelledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { success = true, message = "Booking declined" });
    }

    [HttpPut("fundi/status")]
    [Protect("fundi")]
    public async Task<IActionResult> FundiStatus(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var status = Str(body, "status") ?? "";
        if (!FundiStatuses.Contains(status)) throw ApiException.BadRequest("Invalid status");

        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        var user = HttpContext.CurrentUser();
        if (booking.FundiId != user.Id) throw new ApiException(403, "Not your booking");
        if (TerminalStatuses.Contains(booking.Status))
        {
            throw ApiException.BadRequest($"Job is already {booking.Status}.");
        }
        if (status == "IN_PROGRESS" && !booking.PriceAgreed)
        {
            return StatusCode(409, new
            {
                success = false,
                message = "Send your quote and get the client's agreement before starting the job.",
            });
        }

        var fromStatus = booking.Status;
        var now = DateTime.UtcNow;
        if (status == "COMPLETED")
        {
            if (booking.FundiCompleted)
            {
                throw ApiException.BadRequest("Already marked as finished — waiting for the client to confirm.");
            }
            if (booking.Status != "IN_PROGRESS")
            {
                throw ApiException.BadRequest("Start the job before marking it finished.");
            }
            booking.FundiCompleted = true;
            booking.FundiCompletedAt = now;
        }
        else
        {
            if (booking.FundiCompleted)
            {
                return StatusCode(409, new
                {
                    success = false,
                    message = "The job is finished and waiting for the client to confirm.",
                });
            }
            booking.Status = status;
            if (status == "ON_THE_WAY") booking.OnTheWayAt = now;
            if (status == "ARRIVED") booking.ArrivedAt = now;
            if (status == "IN_PROGRESS") booking.StartedAt = now;
        }

        await _db.SaveChangesAsync(ct);

        await _audit.RecordAsync(HttpContext, user,
            status == "COMPLETED" ? "booking.fundi_finished" : "booking.status_changed",
            "bookings", "booking", booking.Id,
            status == "COMPLETED"
                ? $"Marked {OrDefault(booking.Category, "a job")} as finished"
                : $"Moved {OrDefault(booking.Category, "a job")} to {status}",
            new { from = fromStatus, to = status, category = booking.Category ?? "" }, ct: ct);

        return Ok(new
        {
            success = true,
            booking = BookingResponse.From(booking),
            status = booking.Status,
        });
    }

    [HttpPost("client/confirm-completion")]
    [Protect]
    public async Task<IActionResult> ConfirmCompletion(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct, "Booking not found");
        var user = HttpContext.CurrentUser();
        if (booking.ClientId != user.Id) throw new ApiException(403, "Not your booking");
        if (booking.Status == "COMPLETED") throw ApiException.BadRequest("This job is already completed.");
        if (booking.Status != "IN_PROGRESS" || !booking.FundiCompleted)
        {
            return StatusCode(409, new
            {
                success = false,
                message = "You can confirm completion once the fundi marks the work as finished.",
            });
        }

        var now = DateTime.UtcNow;
        booking.Status = "COMPLETED";
        booking.CompletedAt = now;
        booking.ClientCompleted = true;
        booking.ClientCompletedAt = now;
        booking.FundiCompleted = true;
        booking.FundiCompletedAt ??= now;

        if (!string.IsNullOrEmpty(booking.FundiId))
        {
            var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == booking.FundiId, ct);
            if (profile is not null)
            {
                profile.JobsCompleted = (profile.JobsCompleted) + 1;
            }
            else
            {
                _db.FundiProfiles.Add(new FundiProfile
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = booking.FundiId,
                    JobsCompleted = 1,
                });
            }
        }

        await _db.SaveChangesAsync(ct);

        await _audit.RecordAsync(HttpContext, user, "booking.completed", "bookings",
            "booking", booking.Id,
            $"Confirmed completion of {OrDefault(booking.Category, "a job")}",
            new { category = booking.Category ?? "", fundiId = booking.FundiId }, ct: ct);

        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpPost("fundi/quote")]
    [Protect("fundi")]
    public async Task<IActionResult> Quote(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        var user = HttpContext.CurrentUser();
        if (booking.FundiId != user.Id) throw new ApiException(403, "Not your booking");
        if (TerminalStatuses.Contains(booking.Status))
        {
            throw ApiException.BadRequest($"Job is already {booking.Status}.");
        }

        var amount = Num(body, "amount");
        if (amount is null || !double.IsFinite(amount.Value) || amount.Value <= 0)
        {
            throw ApiException.BadRequest("Enter the amount to quote");
        }
        var price = Math.Round(amount.Value, MidpointRounding.AwayFromZero);

        booking.ProposedPrice = price;
        booking.ProposedBy = "FUNDI";
        booking.ClientPriceAgreed = false;
        booking.FundiPriceAgreed = false;
        booking.PriceAgreed = false;
        booking.AgreedPrice = null;
        await _db.SaveChangesAsync(ct);

        await _audit.RecordAsync(HttpContext, user, "booking.quoted", "bookings",
            "booking", booking.Id,
            $"Quoted {price} for {OrDefault(booking.Category, "a job")}",
            new { amount = price, category = booking.Category ?? "" }, ct: ct);

        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpPost("client/price-response")]
    [Protect]
    public async Task<IActionResult> PriceResponse(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        var user = HttpContext.CurrentUser();
        if (booking.ClientId != user.Id) throw new ApiException(403, "Not your booking");

        var action = Str(body, "action");
        if (action is not ("accept" or "decline"))
        {
            throw ApiException.BadRequest("Action must be accept or decline");
        }
        if (!(booking.ProposedPrice is > 0))
        {
            throw ApiException.BadRequest("There is no quote to respond to");
        }

        if (action == "decline")
        {
            booking.ProposedPrice = null;
            booking.ProposedBy = null;
            booking.ClientPriceAgreed = false;
            booking.FundiPriceAgreed = false;
            booking.PriceAgreed = false;
            booking.AgreedPrice = null;
            await _db.SaveChangesAsync(ct);

            await _audit.RecordAsync(HttpContext, user, "booking.quote_declined", "bookings",
                "booking", booking.Id,
                $"Declined the quote on {OrDefault(booking.Category, "a job")}",
                new { amount = booking.ProposedPrice, category = booking.Category ?? "" }, ct: ct);

            return Ok(new { success = true, booking = BookingResponse.From(booking) });
        }

        var agreed = Math.Round(booking.ProposedPrice!.Value, MidpointRounding.AwayFromZero);
        booking.ClientPriceAgreed = true;
        booking.FundiPriceAgreed = true;
        booking.PriceAgreed = true;
        booking.AgreedPrice = agreed;
        await _db.SaveChangesAsync(ct);

        await _audit.RecordAsync(HttpContext, user, "booking.price_agreed", "bookings",
            "booking", booking.Id,
            $"Agreed {agreed} for {OrDefault(booking.Category, "a job")}",
            new { amount = agreed, category = booking.Category ?? "", proposedBy = booking.ProposedBy ?? "FUNDI" }, ct: ct);

        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpGet("client/bookings")]
    [Protect]
    public async Task<IActionResult> ClientBookings(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var rows = await _db.Bookings.AsNoTracking()
            .Where(b => b.ClientId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(ct);
        return Ok(new { success = true, bookings = rows.Select(BookingResponse.From) });
    }

    [HttpPost("client/create")]
    [Protect]
    public async Task<IActionResult> Create(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var fundiId = Str(body, "fundiId");
        User? fundi = null;
        var fundiName = "";

        if (!string.IsNullOrEmpty(fundiId))
        {
            fundi = await _db.Users.FirstOrDefaultAsync(u => u.Id == fundiId, ct);
            if (fundi is null || fundi.Role != "fundi" || fundi.Status != "active")
            {
                throw ApiException.BadRequest("Fundi not found or unavailable");
            }
            var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == fundi.Id, ct);
            if (profile is null || !profile.Verified)
            {
                throw ApiException.BadRequest("This fundi has not been verified yet");
            }
            fundiName = fundi.FullName;
        }

        var category = (Str(body, "category") ?? "").Trim();
        if (string.IsNullOrEmpty(category) && fundi is { Skills.Length: > 0 })
        {
            category = (fundi.Skills[0] ?? "").Trim();
        }

        DateTime? scheduled = null;
        if (Has(body, "scheduledFor") && !string.IsNullOrEmpty(Str(body, "scheduledFor")))
        {
            scheduled = ParseDate(Str(body, "scheduledFor"), "Invalid scheduled date/time");
        }

        var now = DateTime.UtcNow;
        var booking = new Booking
        {
            Id = Guid.NewGuid().ToString(),
            ClientId = HttpContext.CurrentUser().Id,
            FundiId = string.IsNullOrEmpty(fundiId) ? null : fundiId,
            FundiName = fundiName,
            ScheduledFor = scheduled,
            Category = category,
            Description = Str(body, "description") ?? "",
            Address = Str(body, "address") ?? "",
            Location = ParseLocation(body),
            Images = StringArray(body, "images"),
            EstimatedDuration = Num(body, "estimatedDuration") is { } duration && double.IsFinite(duration) && duration != 0 ? duration : 60,
            Estimate = EstimateService.BuildEstimate(category),
            Status = "PENDING",
            PaymentStatus = "unpaid",
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync(ct);

        await _audit.RecordAsync(HttpContext, HttpContext.CurrentUser(), "booking.created", "bookings",
            "booking", booking.Id,
            $"Booked {OrDefault(category, "a service")}{(string.IsNullOrEmpty(fundiName) ? "" : $" with {fundiName}")}",
            new { category, fundiId }, ct: ct);

        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpPost("client/select-fundi")]
    [Protect]
    public async Task<IActionResult> SelectFundi(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        var booking = await FindBookingAsync(Str(body, "bookingId"), ct, "Request not found");
        var user = HttpContext.CurrentUser();
        if (booking.ClientId != user.Id) throw new ApiException(403, "Not your request");
        if (TerminalStatuses.Contains(booking.Status))
        {
            throw ApiException.BadRequest($"Job is already {booking.Status}.");
        }

        var fundiId = Str(body, "fundiId");
        if (string.IsNullOrEmpty(fundiId)) throw ApiException.BadRequest("Choose a fundi first");

        var fundi = await _db.Users.FirstOrDefaultAsync(u => u.Id == fundiId, ct);
        if (fundi is null || fundi.Role != "fundi" || fundi.Status != "active")
        {
            throw ApiException.BadRequest("Fundi not found or unavailable");
        }
        var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == fundi.Id, ct);
        if (profile is null || !profile.Verified)
        {
            throw ApiException.BadRequest("This fundi has not been verified yet");
        }

        if (Has(body, "scheduledFor") && !string.IsNullOrEmpty(Str(body, "scheduledFor")))
        {
            booking.ScheduledFor = ParseDate(Str(body, "scheduledFor"), "Invalid scheduled date/time");
        }

        booking.FundiId = fundiId;
        booking.FundiName = !string.IsNullOrEmpty(fundi.FullName)
            ? fundi.FullName
            : (!string.IsNullOrEmpty(fundi.Phone) ? fundi.Phone : (fundi.Email ?? "Your fundi"));
        if (Has(body, "description")) booking.Description = Str(body, "description") ?? "";
        if (Has(body, "address")) booking.Address = Str(body, "address") ?? "";

        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true, booking = BookingResponse.From(booking) });
    }

    [HttpGet("progress/{id}")]
    [Protect]
    public async Task<IActionResult> Progress(string id, CancellationToken ct)
    {
        var booking = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) throw ApiException.NotFound("Request not found");

        var user = HttpContext.CurrentUser();
        var involved = booking.ClientId == user.Id || booking.FundiId == user.Id || user.Role == "admin";
        if (!involved) throw new ApiException(403, "Not your request");

        return Ok(new
        {
            success = true,
            booking = BookingResponse.From(booking),
            ready = true,
            steps = ProgressSteps(booking),
        });
    }

    [HttpPost("simulate/advance")]
    [Protect]
    public async Task<IActionResult> SimulateAdvance(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] JsonElement body,
        CancellationToken ct)
    {
        if (!string.Equals(_config["COMMS_DEV_MODE"], "true", StringComparison.OrdinalIgnoreCase))
        {
            throw ApiException.NotFound("Not found");
        }

        var booking = await FindBookingAsync(Str(body, "bookingId"), ct);
        var user = HttpContext.CurrentUser();
        var isAssignedFundi = user.Role == "fundi" && booking.FundiId == user.Id;
        if (!isAssignedFundi && user.Role != "admin")
        {
            throw new ApiException(403, "Only the fundi can move a job along");
        }
        if (TerminalStatuses.Contains(booking.Status))
        {
            throw ApiException.BadRequest($"Job is already {booking.Status}.");
        }
        if (booking.FundiCompleted)
        {
            throw ApiException.BadRequest("Finished — waiting for the client to confirm.");
        }

        var index = Array.IndexOf(SimulationFlow, booking.Status);
        var nextStatus = index >= 0 && index + 1 < SimulationFlow.Length ? SimulationFlow[index + 1] : "ACCEPTED";
        if (nextStatus == "IN_PROGRESS" && !booking.PriceAgreed)
        {
            return StatusCode(409, new
            {
                success = false,
                message = "Agree a price with the client before starting the job.",
            });
        }

        var now = DateTime.UtcNow;
        if (nextStatus == "COMPLETED")
        {
            booking.FundiCompleted = true;
            booking.FundiCompletedAt = now;
        }
        else
        {
            booking.Status = nextStatus;
        }

        if (nextStatus == "ACCEPTED") booking.AcceptedAt = now;
        if (nextStatus == "ON_THE_WAY") booking.OnTheWayAt = now;
        if (nextStatus == "ARRIVED") booking.ArrivedAt = now;
        if (nextStatus == "IN_PROGRESS") booking.StartedAt = now;

        if (nextStatus == "ARRIVED" && !booking.PriceAgreed && !(booking.ProposedPrice is > 0))
        {
            var quoted = EstimateService.EstimateFor(booking).Total;
            booking.ProposedPrice = quoted;
            booking.AgreedPrice = quoted;
            booking.PriceAgreed = true;
            booking.ProposedBy = "FUNDI";
            booking.ClientPriceAgreed = true;
            booking.FundiPriceAgreed = true;
        }

        var job = booking.Location is { } loc && Math.Abs(loc.Lat) > 0 ? loc : null;
        if (job is not null && nextStatus is "ON_THE_WAY" or "ARRIVED")
        {
            var spread = nextStatus == "ON_THE_WAY" ? 0.02 : 0.002;
            booking.FundiLocation = JsonSerializer.SerializeToDocument(new
            {
                lat = job.Lat + spread,
                lng = job.Lng + spread * 0.8,
            });
        }
        else if (job is not null && nextStatus is "IN_PROGRESS" or "COMPLETED")
        {
            booking.FundiLocation = JsonSerializer.SerializeToDocument(new { lat = job.Lat, lng = job.Lng });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true, status = nextStatus, booking = BookingResponse.From(booking) });
    }

    private async Task<Booking> FindBookingAsync(string? id, CancellationToken ct, string message = "Booking not found")
    {
        if (string.IsNullOrEmpty(id)) throw ApiException.NotFound(message);
        return await _db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct)
            ?? throw ApiException.NotFound(message);
    }

    private static string OrDefault(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value;

    private static object ProgressSteps(Booking b)
    {
        var index = Array.IndexOf(FlowStatuses, b.Status);
        bool Past(string status) => index >= Array.IndexOf(FlowStatuses, status);
        var accepted = b.AcceptedAt is not null || Past("ACCEPTED");
        var started = b.StartedAt is not null || Past("IN_PROGRESS");
        var completed = b.Status == "COMPLETED" || b.CompletedAt is not null;

        var steps = new[]
        {
            new { key = "submitted", label = "Request submitted", at = (DateTime?)b.CreatedAt, done = true },
            new { key = "fundi", label = "Fundi chosen", at = b.AcceptedAt, done = !string.IsNullOrEmpty(b.FundiId) },
            new { key = "accepted", label = "Fundi accepted", at = b.AcceptedAt, done = accepted },
            new { key = "priced", label = "Price agreed", at = (DateTime?)null, done = b.PriceAgreed },
            new { key = "started", label = "Work started", at = b.StartedAt, done = started },
            new { key = "completed", label = "Job completed", at = b.CompletedAt ?? b.FundiCompletedAt, done = completed },
        };

        var current = steps.FirstOrDefault(s => !s.done);
        return steps.Select(s => new
        {
            s.key,
            s.label,
            s.at,
            s.done,
            status = s.done ? "completed" : ReferenceEquals(s, current) ? "current" : "pending",
        });
    }

    private static bool Has(JsonElement body, string name) =>
        body.ValueKind == JsonValueKind.Object && body.TryGetProperty(name, out _);

    private static string? Str(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var value)) return null;
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? "",
            JsonValueKind.Null => "",
            _ => value.ToString(),
        };
    }

    private static double? Num(JsonElement body, string name)
    {
        if (body.ValueKind != JsonValueKind.Object || !body.TryGetProperty(name, out var value)) return null;
        if (value.ValueKind == JsonValueKind.Number) return value.GetDouble();
        if (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), out var parsed)) return parsed;
        return double.NaN;
    }

    private static string[] StringArray(JsonElement body, string name)
    {
        if (!Has(body, name)) return Array.Empty<string>();
        var value = body.GetProperty(name);
        if (value.ValueKind != JsonValueKind.Array) return Array.Empty<string>();
        return value.EnumerateArray()
            .Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? "" : e.ToString())
            .ToArray();
    }

    private static Location ParseLocation(JsonElement body)
    {
        if (!Has(body, "location")) return Location.Zero;
        try
        {
            return JsonSerializer.Deserialize<Location>(body.GetProperty("location").GetRawText(),
                new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? Location.Zero;
        }
        catch (JsonException)
        {
            throw ApiException.BadRequest("location must be an object");
        }
    }

    private static DateTime ParseDate(string? value, string message)
    {
        if (DateTimeOffset.TryParse(value, out var parsed)) return parsed.UtcDateTime;
        throw ApiException.BadRequest(message);
    }
}

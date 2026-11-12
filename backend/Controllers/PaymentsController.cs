using System.Text.Json;
using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private static readonly Dictionary<string, string> Methods = new(StringComparer.OrdinalIgnoreCase)
    {
        ["mtn"] = "MTN Mobile Money",
        ["airtel"] = "Airtel Money",
        ["cash"] = "Cash",
    };

    private readonly FundiGridDbContext _db;

    public PaymentsController(FundiGridDbContext db)
    {
        _db = db;
    }

    public sealed class PayRequest
    {
        public string? BookingId { get; set; }
        public string? Method { get; set; }
        public string? Phone { get; set; }
        public double? Amount { get; set; }
    }

    [HttpPost("pay")]
    [Protect]
    public async Task<IActionResult> Pay(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] PayRequest? body,
        CancellationToken ct)
    {
        body ??= new PayRequest();
        if (string.IsNullOrEmpty(body.BookingId)) throw ApiException.BadRequest("bookingId is required");

        var methodKey = (body.Method ?? "mtn").ToLowerInvariant();
        if (!Methods.TryGetValue(methodKey, out var label))
        {
            throw ApiException.BadRequest("Choose MTN, Airtel or Cash.");
        }

        var client = HttpContext.CurrentUser();
        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == body.BookingId, ct);
        if (booking is null) throw ApiException.NotFound("Booking not found");
        if (booking.ClientId != client.Id) throw new ApiException(403, "Not your booking");

        // Paying twice must never charge twice — return the receipt instead.
        var existing = await FindPaymentAsync(booking.Id, client.Id, ct);
        if (existing is not null)
        {
            return Ok(new { success = true, alreadyPaid = true, receipt = Receipt(existing, booking) });
        }

        if (booking.Status != "COMPLETED")
        {
            throw ApiException.BadRequest("You can pay once the job is completed.");
        }

        var payable = AgreedAmount(booking);
        if (payable <= 0) payable = body.Amount ?? 0;
        if (!double.IsFinite(payable) || payable <= 0)
        {
            throw ApiException.BadRequest("Enter the amount to pay.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var now = DateTime.UtcNow;
        var reference = MakeReference();
        var clientWallet = await FindOrCreateWalletAsync(client.Id, ct);
        var fundiWallet = string.IsNullOrEmpty(booking.FundiId)
            ? null
            : await FindOrCreateWalletAsync(booking.FundiId, ct);

        // Persist new wallets first: transactions reference them and EF does
        // not know the insert ordering without configured relationships.
        await _db.SaveChangesAsync(ct);

        // SIMULATION: a gateway would confirm this charge before we record it.
        var paymentTxn = new Transaction
        {
            Id = Guid.NewGuid().ToString(),
            WalletId = clientWallet.Id,
            UserId = client.Id,
            Type = "payment",
            Amount = payable,
            Currency = "UGX",
            Reference = reference,
            Description = $"Payment for {booking.Category}",
            Status = "completed",
            RelatedBooking = booking.Id,
            RelatedUser = booking.FundiId,
            BalanceBefore = clientWallet.Balance,
            BalanceAfter = clientWallet.Balance,
            PaymentMethod = label,
            Metadata = JsonSerializer.SerializeToDocument(new
            {
                phone = body.Phone ?? "",
                simulated = true,
            }),
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Transactions.Add(paymentTxn);

        if (fundiWallet is not null)
        {
            var before = fundiWallet.Balance;
            var after = before + payable;
            fundiWallet.Balance = after;
            fundiWallet.UpdatedAt = now;

            _db.Transactions.Add(new Transaction
            {
                Id = Guid.NewGuid().ToString(),
                WalletId = fundiWallet.Id,
                UserId = booking.FundiId!,
                Type = "payment_received",
                Amount = payable,
                Currency = "UGX",
                // References are unique across the table — credit gets its own suffix.
                Reference = $"{reference}-R",
                Description = $"Payment from client for {booking.Category}",
                Status = "completed",
                RelatedBooking = booking.Id,
                RelatedUser = client.Id,
                BalanceBefore = before,
                BalanceAfter = after,
                PaymentMethod = label,
                Metadata = JsonSerializer.SerializeToDocument(new { simulated = true }),
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        booking.PaymentStatus = "released";
        booking.EscrowHeldAt = now;
        booking.EscrowReleasedAt = now;
        booking.EscrowAmount = payable;
        booking.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new { success = true, receipt = Receipt(paymentTxn, booking) });
    }

    [HttpGet("{bookingId}")]
    [Protect]
    public async Task<IActionResult> ReceiptFor(string bookingId, CancellationToken ct)
    {
        var client = HttpContext.CurrentUser();
        var booking = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking is null) throw ApiException.NotFound("Booking not found");
        if (booking.ClientId != client.Id) throw new ApiException(403, "Not your booking");

        var txn = await FindPaymentAsync(booking.Id, client.Id, ct);
        if (txn is null) throw ApiException.NotFound("No payment for this job yet.");

        return Ok(new { success = true, receipt = Receipt(txn, booking) });
    }

    private async Task<Transaction?> FindPaymentAsync(string bookingId, string clientId, CancellationToken ct)
    {
        return await _db.Transactions.AsNoTracking().FirstOrDefaultAsync(t =>
            t.RelatedBooking == bookingId && t.UserId == clientId && t.Type == "payment", ct);
    }

    private async Task<Wallet> FindOrCreateWalletAsync(string userId, CancellationToken ct)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet is not null) return wallet;

        wallet = new Wallet
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.Wallets.Add(wallet);
        return wallet;
    }

    private static double AgreedAmount(Booking booking)
    {
        var value = booking.AgreedPrice ?? booking.ProposedPrice ?? 0;
        if (double.IsFinite(value) && value > 0) return value;
        var estimated = EstimateService.EstimateFor(booking).Total;
        return double.IsFinite(estimated) && estimated > 0 ? estimated : 0;
    }

    private static object Receipt(Transaction txn, Booking booking)
    {
        var phone = "";
        if (txn.Metadata.RootElement.ValueKind == JsonValueKind.Object
            && txn.Metadata.RootElement.TryGetProperty("phone", out var phoneValue))
        {
            phone = phoneValue.GetString() ?? "";
        }
        var simulated = txn.Metadata.RootElement.ValueKind == JsonValueKind.Object
            && txn.Metadata.RootElement.TryGetProperty("simulated", out var sim)
            && sim.ValueKind == JsonValueKind.True;

        return new
        {
            reference = txn.Reference,
            method = string.IsNullOrEmpty(txn.PaymentMethod) ? "Payment" : txn.PaymentMethod,
            amount = txn.Amount,
            currency = string.IsNullOrEmpty(txn.Currency) ? "UGX" : txn.Currency,
            status = "paid",
            paidAt = txn.CreatedAt,
            bookingId = booking.Id,
            fundiName = booking.FundiName ?? "",
            category = booking.Category ?? "",
            phone,
            simulated,
        };
    }

    private static string MakeReference()
    {
        var stamp = ToBase36(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        var rand = ToBase36(Random.Shared.Next(0, 1_679_616)).PadLeft(4, '0');
        return $"FG-{stamp}-{rand}";
    }

    private static string ToBase36(long value)
    {
        const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (value == 0) return "0";
        var builder = new System.Text.StringBuilder();
        while (value > 0)
        {
            builder.Insert(0, chars[(int)(value % 36)]);
            value /= 36;
        }
        return builder.ToString();
    }
}

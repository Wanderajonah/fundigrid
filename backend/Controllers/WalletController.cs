using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/wallet")]
public sealed class WalletController : ControllerBase
{
    private readonly FundiGridDbContext _db;

    public WalletController(FundiGridDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Protect]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet is null)
        {
            wallet = new Wallet
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new
        {
            success = true,
            wallet = new
            {
                id = wallet.Id,
                userId = wallet.UserId,
                balance = wallet.Balance,
                heldBalance = wallet.HeldBalance,
                currency = wallet.Currency,
                status = wallet.Status,
                createdAt = wallet.CreatedAt,
                updatedAt = wallet.UpdatedAt,
            },
        });
    }

    [HttpGet("transactions")]
    [Protect]
    public async Task<IActionResult> Transactions(CancellationToken ct)
    {
        var userId = HttpContext.CurrentUser().Id;
        var rows = await _db.Transactions.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        return Ok(new
        {
            success = true,
            transactions = rows.Select(t => new
            {
                id = t.Id,
                walletId = t.WalletId,
                userId = t.UserId,
                type = t.Type,
                amount = t.Amount,
                currency = t.Currency,
                reference = t.Reference,
                description = t.Description,
                status = t.Status,
                relatedBooking = t.RelatedBooking,
                relatedUser = t.RelatedUser,
                balanceBefore = t.BalanceBefore,
                balanceAfter = t.BalanceAfter,
                paymentMethod = t.PaymentMethod,
                metadata = t.Metadata,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt,
            }),
        });
    }
}

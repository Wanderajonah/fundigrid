using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/platform-settings")]
public sealed class PlatformSettingsController : ControllerBase
{
    private readonly FundiGridDbContext _db;

    public PlatformSettingsController(FundiGridDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var settings = await _db.PlatformSettings.FirstOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = new PlatformSettings { Id = Guid.NewGuid().ToString() };
            _db.PlatformSettings.Add(settings);
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new
        {
            commissionRate = settings.CommissionRate,
            clientFeeRate = settings.ClientFeeRate,
            minJobAmount = settings.MinJobAmount,
            serviceRadius = settings.ServiceRadius,
            adminName = settings.AdminName,
            adminEmail = settings.AdminEmail,
            autoApprovalFundis = settings.AutoApprovalFundis,
            disputeResolution = settings.DisputeResolution,
            notifications = settings.Notifications,
            paymentIntegrations = settings.PaymentIntegrations,
            currency = "UGX",
        });
    }
}

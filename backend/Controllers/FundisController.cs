using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Exceptions;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/fundis")]
public sealed class FundisController : ControllerBase
{
    private readonly FundiService _fundis;
    private readonly FundiGridDbContext _db;

    public FundisController(FundiService fundis, FundiGridDbContext db)
    {
        _fundis = fundis;
        _db = db;
    }

    [HttpGet]
    [Protect]
    public async Task<IActionResult> List(
        [FromQuery] string? lat,
        [FromQuery] string? lng,
        [FromQuery] string? radius,
        [FromQuery] string? category,
        [FromQuery] string? area,
        CancellationToken ct)
    {
        var rows = await _fundis.ListFundisAsync(lat, lng, radius, category, area, ct);
        return Ok(new { success = true, fundis = rows });
    }

    [HttpGet("{id}")]
    [Protect]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var fundi = await _fundis.GetFundiAsync(id, ct);
        if (fundi is null) throw ApiException.NotFound("Fundi not found");

        // Only a client who actually booked this fundi gets the number to call.
        var clientId = HttpContext.CurrentUser().Id;
        var hasBooked = await _db.Bookings.AsNoTracking()
            .AnyAsync(b => b.ClientId == clientId && b.FundiId == fundi.Id, ct);
        if (hasBooked)
        {
            fundi.Phone = await _db.Users.AsNoTracking()
                .Where(u => u.Id == fundi.Id)
                .Select(u => u.Phone)
                .FirstOrDefaultAsync(ct);
        }

        return Ok(new { success = true, fundi });
    }
}

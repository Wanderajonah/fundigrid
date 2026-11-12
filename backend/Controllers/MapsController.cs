using FundiGrid.Api.Auth;
using FundiGrid.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FundiGrid.Api.Controllers;

[ApiController]
[Route("api/maps")]
public sealed class MapsController : ControllerBase
{
    private readonly FundiService _fundis;

    public MapsController(FundiService fundis)
    {
        _fundis = fundis;
    }

    [HttpGet("nearby-fundis")]
    [Protect]
    public async Task<IActionResult> Nearby(
        [FromQuery] string? lat,
        [FromQuery] string? lng,
        [FromQuery] string? radius,
        [FromQuery] string? category,
        [FromQuery] string? area,
        CancellationToken ct)
    {
        var rows = await _fundis.ListFundisAsync(lat, lng, radius ?? "10", category, area, ct);
        return Ok(new { success = true, fundis = rows });
    }
}

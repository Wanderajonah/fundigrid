using Npgsql;

namespace FundiGrid.Api.Data;

/// <summary>
/// Applies `sql/schema.sql` (idempotent) so the hand-written Postgres schema
/// stays the single source of truth instead of EF Core migrations.
/// </summary>
public static class SchemaMigrator
{
    public static async Task ApplyAsync(string connectionString, string contentRoot, ILogger logger, CancellationToken ct = default)
    {
        var path = Path.Combine(contentRoot, "sql", "schema.sql");
        if (!File.Exists(path))
        {
            logger.LogWarning("Schema file not found at {Path}; skipping migration", path);
            return;
        }

        var sql = await File.ReadAllTextAsync(path, ct);
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(sql, conn)
        {
            CommandTimeout = 120,
        };
        await cmd.ExecuteNonQueryAsync(ct);
        logger.LogInformation("Schema applied from {Path}", path);
    }
}

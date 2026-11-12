using Npgsql;

namespace FundiGrid.Api.Data;

/// <summary>
/// Resolves the Postgres connection string. Accepts either the .NET-native
/// `ConnectionStrings:Default` setting or the `DATABASE_URL` URI the Node
/// backend used, so deployment config can stay familiar.
/// </summary>
public static class ConnectionStringFactory
{
    public static string Resolve(IConfiguration config)
    {
        var direct = config.GetConnectionString("Default");
        if (!string.IsNullOrWhiteSpace(direct)) return Tune(direct);

        var url = config["DATABASE_URL"];
        if (!string.IsNullOrWhiteSpace(url)) return Tune(FromUri(url));

        throw new InvalidOperationException(
            "No database configured. Set ConnectionStrings__Default or DATABASE_URL.");
    }

    public static string FromUri(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);
        var database = uri.AbsolutePath.Trim('/');
        if (string.IsNullOrEmpty(database)) database = "postgres";

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = database,
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
        };

        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var sslMode = query["sslmode"] ?? query["ssl mode"];
        if (!string.IsNullOrEmpty(sslMode))
        {
            builder.SslMode = sslMode.ToLowerInvariant() switch
            {
                "disable" => SslMode.Disable,
                "allow" => SslMode.Allow,
                "prefer" => SslMode.Prefer,
                "require" => SslMode.Require,
                "verify-ca" => SslMode.VerifyCA,
                "verify-full" => SslMode.VerifyFull,
                _ => SslMode.Prefer,
            };
        }
        else if (uri.Host.Contains("supabase", StringComparison.OrdinalIgnoreCase))
        {
            builder.SslMode = SslMode.Require;
        }

        return builder.ConnectionString;
    }

    /// <summary>
    /// Supabase's transaction-mode pooler (port 6543) cannot keep server-side
    /// prepared statements between transactions. Disable them when that port is
    /// used so EF Core queries do not fail under load.
    /// </summary>
    private static string Tune(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        if (builder.Port == 6543)
        {
            builder.MaxAutoPrepare = 0;
            builder.NoResetOnClose = true;
        }
        builder.ApplicationName ??= "FundiGrid.Api";
        return builder.ConnectionString;
    }
}

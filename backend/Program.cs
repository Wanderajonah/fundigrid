using System.Text.Json;
using System.Text.Json.Serialization;
using DotNetEnv;
using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Hubs;
using FundiGrid.Api.Middleware;
using FundiGrid.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Npgsql;

// Local development keeps using backend/.env, like the Node backend did.
// Explicit environment variables win over the file so deployments and test
// runs can override without editing secrets.
Env.Load(options: new LoadOptions(clobberExistingVars: false));

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var connectionString = ConnectionStringFactory.Resolve(builder.Configuration);

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<FundiGridDbContext>((sp, options) =>
    options.UseNpgsql(sp.GetRequiredService<NpgsqlDataSource>()));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<UserCache>();
builder.Services.AddScoped<UserMapping>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<SmsService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<FundiService>();
builder.Services.AddHttpClient();
builder.Services.AddSignalR().AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = context.ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .FirstOrDefault(m => !string.IsNullOrWhiteSpace(m)) ?? "Invalid request";
        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { success = false, message });
    };
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddHostedService<AdminSeeder>();

var app = builder.Build();

// `dotnet run -- --migrate` applies sql/schema.sql and exits.
if (args.Contains("--migrate"))
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    await SchemaMigrator.ApplyAsync(connectionString, app.Environment.ContentRootPath, logger);
    return;
}

if (string.Equals(builder.Configuration["RUN_MIGRATIONS"], "true", StringComparison.OrdinalIgnoreCase))
{
    await SchemaMigrator.ApplyAsync(
        connectionString,
        app.Environment.ContentRootPath,
        app.Services.GetRequiredService<ILogger<Program>>());
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors();

var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (Directory.Exists(uploadsPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads",
    });
}

app.MapControllers();
app.MapHub<RealtimeHub>("/hubs/realtime");

app.MapGet("/api/health", (IConfiguration config) =>
{
    var smsConfigured = !string.IsNullOrWhiteSpace(config["COMMS_ENDPOINT"])
        && !string.IsNullOrWhiteSpace(config["COMMS_USERNAME"])
        && !string.IsNullOrWhiteSpace(config["COMMS_API_KEY"]);
    var production = app.Environment.IsProduction()
        || string.Equals(config["RENDER"], "true", StringComparison.OrdinalIgnoreCase);
    var devMode = string.Equals(config["COMMS_DEV_MODE"], "true", StringComparison.OrdinalIgnoreCase)
        && !(production && smsConfigured);

    return Results.Json(new
    {
        status = "ok",
        service = "Ufundi API",
        features = new
        {
            auth = true,
            otp = true,
            maps = !string.IsNullOrWhiteSpace(config["GOOGLE_MAPS_API_KEY"]),
            ai = true,
            aiVision = false,
            bookings = true,
            chat = true,
            socket = true,
            wallet = true,
        },
        sms = new
        {
            configured = smsConfigured,
            devMode,
            logOtp = !string.Equals(config["COMMS_LOG_OTP"], "false", StringComparison.OrdinalIgnoreCase),
        },
    });
});

app.Run();

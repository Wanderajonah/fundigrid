using FundiGrid.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Data;

public sealed class FundiGridDbContext : DbContext
{
    public FundiGridDbContext(DbContextOptions<FundiGridDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<FundiProfile> FundiProfiles => Set<FundiProfile>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Otp> Otps => Set<Otp>();
    public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();
    public DbSet<PlatformSettings> PlatformSettings => Set<PlatformSettings>();
    public DbSet<AdminNotification> AdminNotifications => Set<AdminNotification>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Every table has database defaults for created_at/updated_at, but EF
    /// includes the CLR default (DateTime.MinValue) in INSERTs, which Postgres
    /// stores as -infinity. Stamp them here so inserts and updates are correct.
    /// </summary>
    private void StampTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;

            var type = entry.Entity.GetType();
            if (entry.State == EntityState.Added)
            {
                var created = type.GetProperty("CreatedAt");
                if (created?.PropertyType == typeof(DateTime)
                    && created.GetValue(entry.Entity) is DateTime c
                    && c == default)
                {
                    created.SetValue(entry.Entity, now);
                }
            }

            var updated = type.GetProperty("UpdatedAt");
            if (updated?.PropertyType == typeof(DateTime))
            {
                updated.SetValue(entry.Entity, now);
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        ConfigureUser(b);
        ConfigureFundiProfile(b);
        ConfigureBooking(b);
        ConfigureJob(b);
        ConfigureConversation(b);
        ConfigureMessage(b);
        ConfigureReview(b);
        ConfigureWallet(b);
        ConfigureTransaction(b);
        ConfigureOtp(b);
        ConfigureEmailOtp(b);
        ConfigurePlatformSettings(b);
        ConfigureAdminNotification(b);
        ConfigureNotification(b);
        ConfigureAuditLog(b);
    }

    private static void ConfigureUser(ModelBuilder b)
    {
        var e = b.Entity<User>();
        e.ToTable("users");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.FirstName).HasColumnName("firstName");
        e.Property(x => x.LastName).HasColumnName("lastName");
        e.Property(x => x.Gender).HasColumnName("gender");
        e.Property(x => x.Email).HasColumnName("email");
        e.Property(x => x.Phone).HasColumnName("phone");
        e.Property(x => x.Password).HasColumnName("password");
        e.Property(x => x.Role).HasColumnName("role");
        e.Property(x => x.FundiEnabled).HasColumnName("fundiEnabled");
        e.Property(x => x.PhoneVerified).HasColumnName("phoneVerified");
        e.Property(x => x.DateOfBirth).HasColumnName("dateOfBirth");
        e.Property(x => x.ProfilePhoto).HasColumnName("profilePhoto");
        e.Property(x => x.CoverPhoto).HasColumnName("coverPhoto");
        e.Property(x => x.GoogleId).HasColumnName("googleId");
        e.Property(x => x.OnboardingComplete).HasColumnName("onboardingComplete");
        e.Property(x => x.IsOnline).HasColumnName("isOnline");
        e.Property(x => x.SocketId).HasColumnName("socketId");
        e.Property(x => x.Location).HasColumnName("location").HasColumnType("jsonb");
        e.Property(x => x.LocationLabel).HasColumnName("locationLabel");
        e.Property(x => x.Address).HasColumnName("address");
        e.Property(x => x.District).HasColumnName("district");
        e.Property(x => x.Country).HasColumnName("country");
        e.Property(x => x.SearchRadiusKm).HasColumnName("searchRadiusKm");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.Skills).HasColumnName("skills").HasColumnType("text[]");
        e.Property(x => x.Experience).HasColumnName("experience");
        e.Property(x => x.Bio).HasColumnName("bio");
        e.Property(x => x.PortfolioImages).HasColumnName("portfolioImages").HasColumnType("text[]");
        e.Property(x => x.AvailableDays).HasColumnName("availableDays").HasColumnType("text[]");
        e.Property(x => x.AvailableStartTime).HasColumnName("availableStartTime");
        e.Property(x => x.AvailableEndTime).HasColumnName("availableEndTime");
        e.Property(x => x.ServiceRadius).HasColumnName("serviceRadius");
        e.Property(x => x.VerificationDocs).HasColumnName("verificationDocs").HasColumnType("text[]");
        e.Property(x => x.Referees).HasColumnName("referees").HasColumnType("jsonb");
        e.Property(x => x.Meta).HasColumnName("_meta").HasColumnType("jsonb");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.Property(x => x.FailedLoginAttempts).HasColumnName("failedLoginAttempts");
        e.Property(x => x.LockedUntil).HasColumnName("lockedUntil");
        e.Property(x => x.LockoutBatches).HasColumnName("lockoutBatches");
        e.Property(x => x.PasswordBlocked).HasColumnName("passwordBlocked");
        e.Ignore(x => x.FullName);
        e.HasIndex(x => x.Role).HasDatabaseName("users_role_status_idx");
    }

    private static void ConfigureFundiProfile(ModelBuilder b)
    {
        var e = b.Entity<FundiProfile>();
        e.ToTable("fundiprofiles");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.UserId).HasColumnName("userId");
        e.Property(x => x.Skills).HasColumnName("skills").HasColumnType("text[]");
        e.Property(x => x.Experience).HasColumnName("experience");
        e.Property(x => x.Rating).HasColumnName("rating");
        e.Property(x => x.JobsCompleted).HasColumnName("jobsCompleted");
        e.Property(x => x.Verified).HasColumnName("verified");
        e.Property(x => x.VerificationStatus).HasColumnName("verificationStatus");
        e.Property(x => x.VerificationDocs).HasColumnName("verificationDocs").HasColumnType("text[]");
        e.Property(x => x.VerificationNotes).HasColumnName("verificationNotes");
        e.Property(x => x.RequestedAt).HasColumnName("requestedAt");
        e.Property(x => x.ReviewedAt).HasColumnName("reviewedAt");
        e.Property(x => x.PortfolioImages).HasColumnName("portfolioImages").HasColumnType("text[]");
        e.Property(x => x.CurrentLocation).HasColumnName("currentLocation").HasColumnType("jsonb");
        e.Property(x => x.IsAvailable).HasColumnName("isAvailable");
        e.Property(x => x.AvailableForNegotiation).HasColumnName("availableForNegotiation");
        e.Property(x => x.Bio).HasColumnName("bio");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.UserId).IsUnique().HasDatabaseName("fundiprofiles_user_uq");
    }

    private static void ConfigureBooking(ModelBuilder b)
    {
        var e = b.Entity<Booking>();
        e.ToTable("bookings");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.ClientId).HasColumnName("clientId");
        e.Property(x => x.FundiId).HasColumnName("fundiId");
        e.Property(x => x.FundiName).HasColumnName("fundiName");
        e.Property(x => x.ScheduledFor).HasColumnName("scheduledFor");
        e.Property(x => x.Category).HasColumnName("category");
        e.Property(x => x.Description).HasColumnName("description");
        e.Property(x => x.Address).HasColumnName("address");
        e.Property(x => x.Location).HasColumnName("location").HasColumnType("jsonb");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.CancelledBy).HasColumnName("cancelledBy");
        e.Property(x => x.CancellationReason).HasColumnName("cancellationReason");
        e.Property(x => x.DisputeReason).HasColumnName("disputeReason");
        e.Property(x => x.NotifiedFundis).HasColumnName("notifiedFundis").HasColumnType("jsonb");
        e.Property(x => x.CurrentFundiIndex).HasColumnName("currentFundiIndex");
        e.Property(x => x.ExpiresAt).HasColumnName("expiresAt");
        e.Property(x => x.AcceptedAt).HasColumnName("acceptedAt");
        e.Property(x => x.OnTheWayAt).HasColumnName("onTheWayAt");
        e.Property(x => x.ArrivedAt).HasColumnName("arrivedAt");
        e.Property(x => x.StartedAt).HasColumnName("startedAt");
        e.Property(x => x.CompletedAt).HasColumnName("completedAt");
        e.Property(x => x.ClientCompleted).HasColumnName("clientCompleted");
        e.Property(x => x.FundiCompleted).HasColumnName("fundiCompleted");
        e.Property(x => x.ClientCompletedAt).HasColumnName("clientCompletedAt");
        e.Property(x => x.FundiCompletedAt).HasColumnName("fundiCompletedAt");
        e.Property(x => x.CancelledAt).HasColumnName("cancelledAt");
        e.Property(x => x.FundiLocation).HasColumnName("fundiLocation").HasColumnType("jsonb");
        e.Property(x => x.Images).HasColumnName("images").HasColumnType("text[]");
        e.Property(x => x.EstimatedDuration).HasColumnName("estimatedDuration");
        e.Property(x => x.ActualDuration).HasColumnName("actualDuration");
        e.Property(x => x.Estimate).HasColumnName("estimate").HasColumnType("jsonb");
        e.Property(x => x.ProposedPrice).HasColumnName("proposedPrice");
        e.Property(x => x.ProposedBy).HasColumnName("proposedBy");
        e.Property(x => x.ClientPriceAgreed).HasColumnName("clientPriceAgreed");
        e.Property(x => x.FundiPriceAgreed).HasColumnName("fundiPriceAgreed");
        e.Property(x => x.AgreedPrice).HasColumnName("agreedPrice");
        e.Property(x => x.PriceAgreed).HasColumnName("priceAgreed");
        e.Property(x => x.PaymentStatus).HasColumnName("paymentStatus");
        e.Property(x => x.EscrowHeldAt).HasColumnName("escrowHeldAt");
        e.Property(x => x.EscrowReleasedAt).HasColumnName("escrowReleasedAt");
        e.Property(x => x.EscrowAmount).HasColumnName("escrowAmount");
        e.Property(x => x.ClientFee).HasColumnName("clientFee");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureJob(ModelBuilder b)
    {
        var e = b.Entity<Job>();
        e.ToTable("jobs");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.CustomerId).HasColumnName("customerId");
        e.Property(x => x.FundiId).HasColumnName("fundiId");
        e.Property(x => x.Description).HasColumnName("description");
        e.Property(x => x.Category).HasColumnName("category");
        e.Property(x => x.Location).HasColumnName("location").HasColumnType("jsonb");
        e.Property(x => x.ImageUrl).HasColumnName("imageUrl");
        e.Property(x => x.QuoteAmount).HasColumnName("quoteAmount");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.Address).HasColumnName("address");
        e.Property(x => x.Amount).HasColumnName("amount");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureConversation(ModelBuilder b)
    {
        var e = b.Entity<Conversation>();
        e.ToTable("conversations");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.Participants).HasColumnName("participants").HasColumnType("text[]");
        e.Property(x => x.BookingId).HasColumnName("bookingId");
        e.Property(x => x.Type).HasColumnName("type");
        e.Property(x => x.LastMessage).HasColumnName("lastMessage");
        e.Property(x => x.LastSenderId).HasColumnName("lastSenderId");
        e.Property(x => x.LastMessageAt).HasColumnName("lastMessageAt");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureMessage(ModelBuilder b)
    {
        var e = b.Entity<Message>();
        e.ToTable("messages");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.ConversationId).HasColumnName("conversationId");
        e.Property(x => x.SenderId).HasColumnName("senderId");
        e.Property(x => x.Text).HasColumnName("text");
        e.Property(x => x.ImageUrl).HasColumnName("imageUrl");
        e.Property(x => x.Read).HasColumnName("read");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureReview(ModelBuilder b)
    {
        var e = b.Entity<Review>();
        e.ToTable("reviews");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.FundiId).HasColumnName("fundiId");
        e.Property(x => x.CustomerId).HasColumnName("customerId");
        e.Property(x => x.JobId).HasColumnName("jobId");
        e.Property(x => x.Rating).HasColumnName("rating");
        e.Property(x => x.Comment).HasColumnName("comment");
        e.Property(x => x.PhotoUrls).HasColumnName("photoUrls").HasColumnType("text[]");
        e.Property(x => x.Service).HasColumnName("service");
        e.Property(x => x.Amount).HasColumnName("amount");
        e.Property(x => x.BookingId).HasColumnName("bookingId");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureWallet(ModelBuilder b)
    {
        var e = b.Entity<Wallet>();
        e.ToTable("wallets");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.UserId).HasColumnName("userId");
        e.Property(x => x.Balance).HasColumnName("balance");
        e.Property(x => x.HeldBalance).HasColumnName("heldBalance");
        e.Property(x => x.Currency).HasColumnName("currency");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.UserId).IsUnique().HasDatabaseName("wallets_userId_key");
    }

    private static void ConfigureTransaction(ModelBuilder b)
    {
        var e = b.Entity<Transaction>();
        e.ToTable("transactions");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.WalletId).HasColumnName("walletId");
        e.Property(x => x.UserId).HasColumnName("userId");
        e.Property(x => x.Type).HasColumnName("type");
        e.Property(x => x.Amount).HasColumnName("amount");
        e.Property(x => x.Currency).HasColumnName("currency");
        e.Property(x => x.Reference).HasColumnName("reference");
        e.Property(x => x.Description).HasColumnName("description");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.RelatedBooking).HasColumnName("relatedBooking");
        e.Property(x => x.RelatedUser).HasColumnName("relatedUser");
        e.Property(x => x.BalanceBefore).HasColumnName("balanceBefore");
        e.Property(x => x.BalanceAfter).HasColumnName("balanceAfter");
        e.Property(x => x.PaymentMethod).HasColumnName("paymentMethod");
        e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureOtp(ModelBuilder b)
    {
        var e = b.Entity<Otp>();
        e.ToTable("otps");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.Phone).HasColumnName("phone");
        e.Property(x => x.Purpose).HasColumnName("purpose");
        e.Property(x => x.CodeHash).HasColumnName("codeHash");
        e.Property(x => x.ExpiresAt).HasColumnName("expiresAt");
        e.Property(x => x.Attempts).HasColumnName("attempts");
        e.Property(x => x.LastSentAt).HasColumnName("lastSentAt");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => new { x.Phone, x.Purpose }).IsUnique();
    }

    private static void ConfigureEmailOtp(ModelBuilder b)
    {
        var e = b.Entity<EmailOtp>();
        e.ToTable("email_otps");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.Email).HasColumnName("email");
        e.Property(x => x.Purpose).HasColumnName("purpose");
        e.Property(x => x.CodeHash).HasColumnName("codeHash");
        e.Property(x => x.ExpiresAt).HasColumnName("expiresAt");
        e.Property(x => x.Attempts).HasColumnName("attempts");
        e.Property(x => x.LastSentAt).HasColumnName("lastSentAt");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => new { x.Email, x.Purpose }).IsUnique();
    }

    private static void ConfigurePlatformSettings(ModelBuilder b)
    {
        var e = b.Entity<PlatformSettings>();
        e.ToTable("platform_settings");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.AdminName).HasColumnName("adminName");
        e.Property(x => x.AdminEmail).HasColumnName("adminEmail");
        e.Property(x => x.AdminRole).HasColumnName("adminRole");
        e.Property(x => x.CommissionRate).HasColumnName("commissionRate");
        e.Property(x => x.ClientFeeRate).HasColumnName("clientFeeRate");
        e.Property(x => x.MinJobAmount).HasColumnName("minJobAmount");
        e.Property(x => x.ServiceRadius).HasColumnName("serviceRadius");
        e.Property(x => x.AutoApprovalFundis).HasColumnName("autoApprovalFundis");
        e.Property(x => x.DisputeResolution).HasColumnName("disputeResolution");
        e.Property(x => x.Notifications).HasColumnName("notifications").HasColumnType("jsonb");
        e.Property(x => x.PaymentIntegrations).HasColumnName("paymentIntegrations").HasColumnType("jsonb");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureAdminNotification(ModelBuilder b)
    {
        var e = b.Entity<AdminNotification>();
        e.ToTable("admin_notifications");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.Type).HasColumnName("type");
        e.Property(x => x.Message).HasColumnName("message");
        e.Property(x => x.RelatedId).HasColumnName("relatedId");
        e.Property(x => x.Read).HasColumnName("read");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureNotification(ModelBuilder b)
    {
        var e = b.Entity<Notification>();
        e.ToTable("notifications");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.UserId).HasColumnName("userId");
        e.Property(x => x.Type).HasColumnName("type");
        e.Property(x => x.Title).HasColumnName("title");
        e.Property(x => x.Body).HasColumnName("body");
        e.Property(x => x.Data).HasColumnName("data").HasColumnType("jsonb");
        e.Property(x => x.Read).HasColumnName("read");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
    }

    private static void ConfigureAuditLog(ModelBuilder b)
    {
        var e = b.Entity<AuditLog>();
        e.ToTable("audit_logs");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()::text");
        e.Property(x => x.ActorId).HasColumnName("actorId");
        e.Property(x => x.ActorName).HasColumnName("actorName");
        e.Property(x => x.ActorRole).HasColumnName("actorRole");
        e.Property(x => x.Action).HasColumnName("action");
        e.Property(x => x.Category).HasColumnName("category");
        e.Property(x => x.EntityType).HasColumnName("entityType");
        e.Property(x => x.EntityId).HasColumnName("entityId");
        e.Property(x => x.Summary).HasColumnName("summary");
        e.Property(x => x.IpAddress).HasColumnName("ipAddress");
        e.Property(x => x.UserAgent).HasColumnName("userAgent");
        e.Property(x => x.Meta).HasColumnName("meta").HasColumnType("jsonb");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
    }
}

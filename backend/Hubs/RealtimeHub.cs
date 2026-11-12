using System.Collections.Concurrent;
using FundiGrid.Api.Auth;
using FundiGrid.Api.Data;
using FundiGrid.Api.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FundiGrid.Api.Hubs;

/// <summary>
/// Realtime transport replacing Socket.IO. Method names and server event names
/// are preserved (via [HubMethodName]) so the mobile client only swaps the
/// transport library.
/// </summary>
public sealed class RealtimeHub : Hub
{
    private const string UserIdKey = "FundiGrid.SocketUser";
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> Rooms = new();

    private readonly FundiGridDbContext _db;
    private readonly JwtService _jwt;
    private readonly ILogger<RealtimeHub> _logger;

    public RealtimeHub(FundiGridDbContext db, JwtService jwt, ILogger<RealtimeHub> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    private string? UserId => Context.Items.TryGetValue(UserIdKey, out var value) ? value as string : null;

    private static string UserRoom(string userId) => $"user:{userId}";
    private static string ConversationRoom(string conversationId) => $"conversation:{conversationId}";

    public override async Task OnConnectedAsync()
    {
        var token = ReadToken();
        if (string.IsNullOrEmpty(token))
        {
            Context.Abort();
            return;
        }

        try
        {
            var (id, _) = _jwt.Verify(token);
            var exists = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == id);
            if (!exists)
            {
                Context.Abort();
                return;
            }
            Context.Items[UserIdKey] = id;
            await Groups.AddToGroupAsync(Context.ConnectionId, UserRoom(id));
        }
        catch
        {
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var room in Rooms.Values)
        {
            room.TryRemove(Context.ConnectionId, out _);
        }

        if (UserId is { } userId)
        {
            try
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user is not null && user.SocketId == Context.ConnectionId)
                {
                    user.IsOnline = false;
                    user.SocketId = null;
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "disconnect handling failed for {UserId}", userId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    [HubMethodName("user_connect")]
    public async Task UserConnect()
    {
        if (UserId is not { } userId) return;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            await Clients.Caller.SendAsync("error", new { message = "User not found" });
            return;
        }

        user.IsOnline = true;
        user.SocketId = Context.ConnectionId;
        await _db.SaveChangesAsync();

        await Groups.AddToGroupAsync(Context.ConnectionId, UserRoom(userId));

        if (user.Role != "fundi") return;

        var pending = await _db.Bookings.AsNoTracking()
            .Where(b => b.Status == "PENDING" && b.FundiId == userId)
            .ToListAsync();

        foreach (var booking in pending)
        {
            var notified = booking.NotifiedFundis;
            if (notified.Count > 0)
            {
                var current = notified[^1];
                if (current is null || current.FundiId != userId) continue;
            }

            var timeLeft = booking.ExpiresAt is { } expiresAt
                ? Math.Max(0, (int)(expiresAt - DateTime.UtcNow).TotalSeconds)
                : 0;

            var client = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == booking.ClientId);

            await Clients.Caller.SendAsync("booking_request", new
            {
                bookingId = booking.Id,
                category = booking.Category,
                description = booking.Description,
                address = booking.Address,
                location = booking.Location,
                clientName = client?.FullName ?? "",
                clientPhone = client?.Phone ?? "",
                expiresAt = booking.ExpiresAt,
                timeLeft,
            });
        }
    }

    [HubMethodName("update_location")]
    public async Task UpdateLocation(double? lat, double? lng, string? bookingId)
    {
        if (UserId is not { } userId || lat is null || lng is null) return;
        if (lat == 0 || lng == 0) return;

        var profile = await _db.FundiProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile is not null)
        {
            profile.CurrentLocation = System.Text.Json.JsonSerializer.SerializeToDocument(new { lat, lng });
        }

        if (!string.IsNullOrEmpty(bookingId))
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking is not null && booking.FundiId == userId
                && booking.Status is "ON_THE_WAY" or "ARRIVED")
            {
                var now = DateTime.UtcNow;
                booking.FundiLocation = System.Text.Json.JsonSerializer.SerializeToDocument(new
                {
                    lat,
                    lng,
                    updatedAt = now,
                });
                await _db.SaveChangesAsync();

                await Clients.Group(UserRoom(booking.ClientId)).SendAsync("fundi_location", new
                {
                    bookingId = booking.Id,
                    lat,
                    lng,
                    updatedAt = now,
                });
                return;
            }
        }

        await _db.SaveChangesAsync();
    }

    [HubMethodName("accept_booking")]
    public async Task AcceptBooking(string? bookingId)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(bookingId)) return;

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking is null)
        {
            await Clients.Caller.SendAsync("error", new { message = "Booking not found" });
            return;
        }

        if (booking.Status == "ACCEPTED" && booking.FundiId == userId)
        {
            await Clients.Caller.SendAsync("booking_accepted", new { bookingId = booking.Id });
            return;
        }

        if (booking.Status != "PENDING")
        {
            await Clients.Caller.SendAsync("error", new { message = "Booking not available" });
            return;
        }

        var notifiedDirectly = booking.FundiId == userId;
        var wasNotified = booking.NotifiedFundis.Any(n => n.FundiId == userId);
        if (!notifiedDirectly && !wasNotified)
        {
            await Clients.Caller.SendAsync("error", new { message = "You were not notified for this booking" });
            return;
        }

        var fundi = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (fundi is null) return;

        booking.FundiId = userId;
        booking.FundiName = fundi.FullName;
        booking.Status = "ACCEPTED";
        booking.AcceptedAt = DateTime.UtcNow;
        booking.ExpiresAt = null;
        await _db.SaveChangesAsync();

        await Clients.Group(UserRoom(booking.ClientId)).SendAsync("booking_accepted", new
        {
            bookingId = booking.Id,
            fundiName = fundi.FullName,
            fundiPhone = fundi.Phone,
        });

        try
        {
            var participants = new[] { booking.ClientId, userId }.OrderBy(p => p, StringComparer.Ordinal).ToArray();
            var conversations = await _db.Conversations
                .Where(c => c.Type == "booking")
                .ToListAsync();
            var conversation = conversations.FirstOrDefault(c =>
            {
                var pair = c.Participants.OrderBy(p => p, StringComparer.Ordinal).ToArray();
                return pair.Length == 2 && pair[0] == participants[0] && pair[1] == participants[1];
            });

            if (conversation is null)
            {
                conversation = new Conversation
                {
                    Id = Guid.NewGuid().ToString(),
                    Participants = participants,
                    BookingId = booking.Id,
                    Type = "booking",
                };
                _db.Conversations.Add(conversation);
                await _db.SaveChangesAsync();
            }

            var payload = new { conversationId = conversation.Id, bookingId = booking.Id };
            await Clients.Group(UserRoom(booking.ClientId)).SendAsync("conversation_created", payload);
            await Clients.Caller.SendAsync("conversation_created", payload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating conversation on accept");
        }

        await Clients.Caller.SendAsync("booking_accepted", new { bookingId = booking.Id });
    }

    [HubMethodName("decline_booking")]
    public async Task DeclineBooking(string? bookingId)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(bookingId)) return;

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking is null || booking.Status != "PENDING")
        {
            await Clients.Caller.SendAsync("error", new { message = "Booking not available" });
            return;
        }

        var notifiedDirectly = booking.FundiId == userId;
        var wasNotified = booking.NotifiedFundis.Any(n => n.FundiId == userId);
        if (!notifiedDirectly && !wasNotified)
        {
            await Clients.Caller.SendAsync("error", new { message = "You were not notified for this booking" });
            return;
        }

        // sendToNextFundi is a stub in the original backend: cancel instead.
        booking.Status = "CANCELLED";
        booking.CancelledBy = "FUNDI";
        booking.CancelledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await Clients.Caller.SendAsync("booking_declined", new { bookingId = booking.Id });
    }

    [HubMethodName("negotiate_price")]
    public async Task NegotiatePrice(string? bookingId, double? price, string? action)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(bookingId)) return;

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return;

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking is null)
        {
            await Clients.Caller.SendAsync("error", new { message = "Booking not found" });
            return;
        }

        var role = user.Role == "fundi" ? "fundi" : "customer";
        switch (action)
        {
            case "propose":
                booking.ProposedPrice = price;
                booking.ProposedBy = role == "fundi" ? "FUNDI" : "CLIENT";
                break;
            case "accept":
                if (role == "fundi") booking.FundiPriceAgreed = true;
                else booking.ClientPriceAgreed = true;
                if (booking.FundiPriceAgreed && booking.ClientPriceAgreed)
                {
                    booking.PriceAgreed = true;
                    booking.AgreedPrice = booking.ProposedPrice;
                }
                break;
            case "reject":
                booking.ProposedPrice = null;
                booking.ProposedBy = null;
                booking.ClientPriceAgreed = false;
                booking.FundiPriceAgreed = false;
                break;
        }

        await _db.SaveChangesAsync();

        await Clients.Caller.SendAsync("price_update", new
        {
            bookingId = booking.Id,
            proposedPrice = booking.ProposedPrice,
            proposedBy = booking.ProposedBy,
            clientPriceAgreed = booking.ClientPriceAgreed,
            fundiPriceAgreed = booking.FundiPriceAgreed,
            priceAgreed = booking.PriceAgreed,
            agreedPrice = booking.AgreedPrice,
        });
    }

    [HubMethodName("join_user_room")]
    public async Task JoinUserRoom()
    {
        if (UserId is { } userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserRoom(userId));
        }
    }

    [HubMethodName("join_conversation")]
    public async Task JoinConversation(string? conversationId)
    {
        if (UserId is null || string.IsNullOrEmpty(conversationId)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, ConversationRoom(conversationId));
        Rooms.GetOrAdd(conversationId, _ => new ConcurrentDictionary<string, byte>())[Context.ConnectionId] = 0;
    }

    [HubMethodName("leave_conversation")]
    public async Task LeaveConversation(string? conversationId)
    {
        if (string.IsNullOrEmpty(conversationId)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ConversationRoom(conversationId));
        if (Rooms.TryGetValue(conversationId, out var room)) room.TryRemove(Context.ConnectionId, out _);
    }

    [HubMethodName("send_message")]
    public async Task SendMessage(string? conversationId, string? text, string? imageUrl)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(conversationId)) return;
        var trimmed = text?.Trim() ?? "";
        if (trimmed.Length == 0 && string.IsNullOrEmpty(imageUrl)) return;

        var conversation = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation is null)
        {
            await Clients.Caller.SendAsync("error", new { message = "Conversation not found" });
            return;
        }
        if (!conversation.Participants.Contains(userId))
        {
            await Clients.Caller.SendAsync("error", new { message = "Access denied" });
            return;
        }

        var message = new Message
        {
            Id = Guid.NewGuid().ToString(),
            ConversationId = conversationId,
            SenderId = userId,
            Text = trimmed,
            ImageUrl = string.IsNullOrEmpty(imageUrl) ? null : imageUrl,
        };
        _db.Messages.Add(message);

        conversation.LastMessage = string.IsNullOrEmpty(imageUrl) ? trimmed : "\uD83D\uDCF7 Photo";
        conversation.LastSenderId = userId;
        conversation.LastMessageAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var sender = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

        await Clients.Group(ConversationRoom(conversationId)).SendAsync("new_message", new
        {
            message = new
            {
                id = message.Id,
                conversationId = message.ConversationId,
                senderId = new { id = userId, name = sender?.FullName ?? "", role = sender?.Role ?? "" },
                text = message.Text,
                imageUrl = message.ImageUrl,
                read = message.Read,
                createdAt = message.CreatedAt,
                updatedAt = message.UpdatedAt,
            },
            conversationId,
        });

        var recipientId = conversation.Participants.FirstOrDefault(p => p != userId);
        if (!string.IsNullOrEmpty(recipientId))
        {
            var recipient = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == recipientId);
            var inRoom = !string.IsNullOrEmpty(recipient?.SocketId)
                && Rooms.TryGetValue(conversationId, out var room)
                && room.ContainsKey(recipient.SocketId);
            if (!inRoom)
            {
                await Clients.Group(UserRoom(recipientId)).SendAsync("new_message_notification", new
                {
                    senderId = userId,
                    senderName = sender?.FullName ?? "New message",
                    conversationId,
                    text = trimmed,
                    imageUrl,
                });
            }
        }
    }

    [HubMethodName("typing_start")]
    public async Task TypingStart(string? conversationId)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(conversationId)) return;
        await Clients.GroupExcept(ConversationRoom(conversationId), Context.ConnectionId)
            .SendAsync("user_typing", new { conversationId, userId });
    }

    [HubMethodName("typing_stop")]
    public async Task TypingStop(string? conversationId)
    {
        if (UserId is not { } userId || string.IsNullOrEmpty(conversationId)) return;
        await Clients.GroupExcept(ConversationRoom(conversationId), Context.ConnectionId)
            .SendAsync("user_stopped_typing", new { conversationId, userId });
    }

    private string? ReadToken()
    {
        var http = Context.GetHttpContext();
        if (http is null) return null;

        var header = http.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return header["Bearer ".Length..].Trim();
        }

        var query = http.Request.Query["access_token"].ToString();
        return string.IsNullOrEmpty(query) ? null : query;
    }
}

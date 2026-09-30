const { setIo, notifyFundiLocation, notifyNewMessage } = require("../services/notificationService");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FundiProfile = require("../models/FundiProfile");
const Booking = require("../models/Booking");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

function initializeSocket(httpServer) {
  const io = require("socket.io")(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Set io instance in notification service
  setIo(io);

  // Authenticate every socket connection by verifying the JWT supplied in the
  // handshake. The authenticated user id is derived server-side from the token
  // and is NEVER taken from client-sent data, preventing identity hijacking.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) {
        return next(new Error("Invalid token"));
      }
      User.findById(decoded.id)
        .then((user) => {
          if (!user) {
            return next(new Error("User not found"));
          }
          socket.userId = decoded.id;
          return next();
        })
        .catch(() => next(new Error("Authentication failed")));
    } catch (error) {
      return next(new Error("Invalid token"));
    }
  });
  
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Bind the socket to its verified user room immediately on connection.
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    
    // Handle user connection with authentication
    socket.on("user_connect", async (data) => {
      try {
        // The userId is always taken from the verified JWT (socket.userId),
        // never from the client payload. The incoming data may repeat the id
        // but it is ignored here for security.
        const userId = socket.userId;
        if (!userId) return;

        const updated = await User.findByIdAndUpdate(userId, {
          isOnline: true,
          socketId: socket.id
        });
        if (!updated) {
          console.warn(`user_connect: user ${userId} not found; ignoring`);
          socket.emit("error", { message: "User not found" });
          return;
        }

        socket.join(`user:${userId}`);
        console.log(`User ${userId} connected with socket ${socket.id}`);

        // Check for pending bookings if this is a fundi
        const user = await User.findById(userId);
        if (user && user.role === "fundi") {
          const pendingBookings = await Booking.find({
            status: "PENDING",
            fundiId: userId
          });
          await pendingBookings.populate("clientId");

          pendingBookings.forEach(booking => {
            // If the request went through dispatch, only re-deliver it while
            // THIS fundi is still the one being notified. Direct bookings
            // (fundiId set at creation, no dispatch list) always qualify.
            const notified = booking.notifiedFundis || [];
            if (notified.length) {
              const current = notified[notified.length - 1];
              if (!current || String(current.fundiId) !== String(userId)) return;
            }
            const timeLeft = booking.expiresAt ? new Date(booking.expiresAt) - new Date() : 0;
            socket.emit("booking_request", {
              bookingId: booking.id,
              category: booking.category,
              description: booking.description,
              address: booking.address,
              location: booking.location,
              clientName: booking.clientId?.name || "",
              clientPhone: booking.clientId?.phone || "",
              expiresAt: booking.expiresAt,
              timeLeft: Math.max(0, Math.floor(timeLeft / 1000))
            });
          });
        }
      } catch (error) {
        console.error("Error handling user_connect:", error);
      }
    });
    
    // Handle fundi location updates during active job
    socket.on("update_location", async (data) => {
      try {
        const { lat, lng, bookingId } = data;
        if (!socket.userId || !lat || !lng) return;
        
        // Update fundi's current location in profile
        await FundiProfile.findOneAndUpdate(
          { userId: socket.userId },
          {
            currentLocation: { lat, lng },
            updatedAt: new Date()
          }
        );
        
        // If this is during an active booking, update booking location and notify client
        if (bookingId) {
          const booking = await Booking.findById(bookingId);
          if (booking && booking.fundiId && String(booking.fundiId) === String(socket.userId)) {
            if (booking.status === "ON_THE_WAY" || booking.status === "ARRIVED") {
              booking.fundiLocation = { lat, lng, updatedAt: new Date() };
              await booking.save();
              
              // Send live location to client
              await notifyFundiLocation(booking.clientId, {
                bookingId: booking.id,
                lat,
                lng,
                updatedAt: new Date()
              });
            }
          }
        }
      } catch (error) {
        console.error("Error handling update_location:", error);
      }
    });
    
    // Handle fundi accepting booking
    socket.on("accept_booking", async (data) => {
      try {
        const { bookingId } = data;
        if (!socket.userId || !bookingId) return;
        
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          socket.emit("error", { message: "Booking not found" });
          return;
        }

        // Idempotent: if the booking was already accepted by this fundi (e.g.
        // the REST accept fired first and this socket event is the duplicate),
        // do not treat it as an error and do not re-notify the client.
        if (
          booking.status === "ACCEPTED" &&
          booking.fundiId &&
          String(booking.fundiId) === String(socket.userId)
        ) {
          socket.emit("booking_accepted", { bookingId: booking.id });
          return;
        }

        if (booking.status !== "PENDING") {
          socket.emit("error", { message: "Booking not available" });
          return;
        }

        // The fundi qualifies if they were notified through dispatch, or if the
        // booking was requested from them directly (fundiId set at creation).
        const notifiedDirectly = booking.fundiId && String(booking.fundiId) === String(socket.userId);
        const wasNotified = (booking.notifiedFundis || []).some(
          n => String(n.fundiId) === String(socket.userId)
        );

        if (!notifiedDirectly && !wasNotified) {
          socket.emit("error", { message: "You were not notified for this booking" });
          return;
        }
        
        // Update booking
        booking.fundiId = socket.userId;
        booking.status = "ACCEPTED";
        booking.acceptedAt = new Date();
        booking.expiresAt = null; // Clear expiry timer
        await booking.save();
        
        // Notify client
        const fundi = await User.findById(socket.userId);
        const { notifyClient } = require("../services/notificationService");
        await notifyClient(booking.clientId, "booking_accepted", {
          bookingId: booking.id,
          fundiName: fundi.name,
          fundiPhone: fundi.phone
        });
        
        // Auto-create a conversation between client and fundi (one per pair of
        // users — a later booking reuses the existing chat, not a new one).
        try {
          const participants = [booking.clientId.toString(), socket.userId].sort();
          const existing = await Conversation.find({ type: "booking" });
          const conversation =
            existing.find((c) => {
              const pair = Array.isArray(c.participants) ? [...c.participants].map(String).sort() : [];
              return pair.length === 2 && pair[0] === participants[0] && pair[1] === participants[1];
            }) ||
            (await Conversation.create({
              participants,
              bookingId: booking.id,
              type: "booking"
            }));
          // Notify both participants to join the conversation room
          io.to(`user:${booking.clientId}`).emit("conversation_created", {
            conversationId: conversation.id,
            bookingId: booking.id
          });
          socket.emit("conversation_created", {
            conversationId: conversation.id,
            bookingId: booking.id
          });
        } catch (convError) {
          console.error("Error creating conversation on accept:", convError);
        }

        socket.emit("booking_accepted", { bookingId: booking.id });
        console.log(`Booking ${bookingId} accepted by fundi ${socket.userId}`);
        
      } catch (error) {
        console.error("Error handling accept_booking:", error);
        socket.emit("error", { message: "Failed to accept booking" });
      }
    });
    
    // Handle fundi declining booking
    socket.on("decline_booking", async (data) => {
      try {
        const { bookingId } = data;
        if (!socket.userId || !bookingId) return;
        
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== "PENDING") {
          socket.emit("error", { message: "Booking not available" });
          return;
        }
        
        // The fundi qualifies if they were notified through dispatch, or if the
        // booking was requested from them directly.
        const notifiedDirectly = booking.fundiId && String(booking.fundiId) === String(socket.userId);
        const wasNotified = (booking.notifiedFundis || []).some(
          n => String(n.fundiId) === String(socket.userId)
        );

        if (!notifiedDirectly && !wasNotified) {
          socket.emit("error", { message: "You were not notified for this booking" });
          return;
        }
        
        // Move to next fundi (falls back to cancelling if none are left)
        const { sendToNextFundi } = require("../services/bookingService");
        const advanced = await sendToNextFundi(booking);
        if (!advanced) {
          await Booking.findByIdAndUpdate(booking.id, {
            status: "CANCELLED",
            cancelledBy: "FUNDI",
            cancelledAt: new Date().toISOString()
          });
        }

        socket.emit("booking_declined", { bookingId: booking.id });
        console.log(`Booking ${bookingId} declined by fundi ${socket.userId}`);
        
      } catch (error) {
        console.error("Error handling decline_booking:", error);
        socket.emit("error", { message: "Failed to decline booking" });
      }
    });
    
    // Handle price negotiation
    socket.on("negotiate_price", async (data) => {
      try {
        const { bookingId, price, action } = data;
        if (!socket.userId || !bookingId) return;

        const user = await User.findById(socket.userId);
        if (!user) return;

        const role = user.role === "fundi" ? "fundi" : "customer";
        const { negotiatePrice } = require("../services/bookingService");
        const booking = await negotiatePrice(bookingId, socket.userId, role, { price, action });

        socket.emit("price_update", {
          bookingId: booking.id,
          proposedPrice: booking.proposedPrice,
          proposedBy: booking.proposedBy,
          clientPriceAgreed: booking.clientPriceAgreed,
          fundiPriceAgreed: booking.fundiPriceAgreed,
          priceAgreed: booking.priceAgreed,
          agreedPrice: booking.agreedPrice
        });
      } catch (error) {
        console.error("Error handling negotiate_price:", error);
        socket.emit("error", { message: error.message || "Failed to update price" });
      }
    });

    // Join user-specific room for targeted notifications. The room is derived
    // from the verified token identity (socket.userId), not client-supplied data.
    socket.on("join_user_room", () => {
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }
    });

    // Chat: Join a conversation room
    socket.on("join_conversation", (data) => {
      const { conversationId } = data;
      if (!conversationId || !socket.userId) return;
      socket.join(`conversation:${conversationId}`);
    });

    // Chat: Leave a conversation room
    socket.on("leave_conversation", (data) => {
      const { conversationId } = data;
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // Chat: Send a message (real-time)
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, text, imageUrl } = data;
        if (!conversationId || !socket.userId) return;
        if (!text?.trim() && !imageUrl) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }
        if (!conversation.participants.some(p => p.toString() === socket.userId)) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        const message = await Message.create({
          conversationId,
          senderId: socket.userId,
          text: text?.trim() || "",
          imageUrl: imageUrl || null
        });

        conversation.lastMessage = imageUrl ? "\uD83D\uDCF7 Photo" : (text?.trim() || "");
        conversation.lastSenderId = socket.userId;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const stored = await Message.findById(message.id);
        if (!stored) {
          socket.emit("error", { message: "Message not found" });
          return;
        }
        const senderUser = (await User.findById(socket.userId)) || null;
        const populated = { ...stored, senderId: senderUser ? { id: senderUser.id, name: senderUser.name, role: senderUser.role } : stored.senderId };

        // Emit to all participants in the conversation room
        io.to(`conversation:${conversationId}`).emit("new_message", {
          message: populated,
          conversationId
        });

        // If the other participant is not currently viewing this thread, save
        // a bell notification so they still see the message when they return.
        const recipientId = (conversation.participants || []).find(
          (p) => p.toString() !== socket.userId
        );
        if (recipientId) {
          const recipient = await User.findById(recipientId);
          const inRoom =
            recipient?.socketId &&
            Boolean(
              io.sockets.adapter.rooms.get(`conversation:${conversationId}`)?.has(recipient.socketId)
            );
          if (!inRoom) {
            await notifyNewMessage(recipientId, {
              senderId: socket.userId,
              senderName: senderUser?.name || "New message",
              conversationId,
              text,
              imageUrl,
            });
          }
        }
      } catch (error) {
        console.error("Error sending chat message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Chat: Typing indicators
    socket.on("typing_start", (data) => {
      const { conversationId } = data;
      if (!conversationId || !socket.userId) return;
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        conversationId,
        userId: socket.userId
      });
    });

    socket.on("typing_stop", (data) => {
      const { conversationId } = data;
      if (!conversationId || !socket.userId) return;
      socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      try {
        if (socket.userId) {
          const updated = await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            socketId: null
          });
          if (!updated) {
            console.warn(`disconnect: user ${socket.userId} not found; skipping`);
            return;
          }
          console.log(`User ${socket.userId} disconnected`);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
  
  return io;
}

module.exports = initializeSocket;

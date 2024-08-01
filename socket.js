const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const moment = require("moment");

const server = http.createServer(app);

// Set up Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// Create a Map to track user IDs and their socket IDs
const userSocketMap = new Map();

// Middleware to authenticate and associate user IDs
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  const username = socket.handshake.auth.username;
  if (userId && username) {
    socket.userId = userId;
    socket.username = username;
    next();
  } else {
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket) => {
  try {
    console.log(`User ${socket.userId} connected with socket ID ${socket.id}`);
    userSocketMap.set(socket.userId, socket.id);

    // Handle sending messages
    socket.on("SEND_MESSAGE", async ({ receiverId, message, messageId }) => {

      const receiverSocketId = userSocketMap.get(receiverId);
      if (receiverSocketId) {
        const now = moment();
        const formattedDate = now.format("D MMMM YYYY hh:mm A");
        io.to(receiverSocketId).emit("receive_message", {
          message,
          sender: socket.userId,
          username: socket.username,
          time: formattedDate,
        });
      } else {
        socket.emit("UPDATE_MESSAGE_STATUS", { messageId, status: "unread" });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      userSocketMap.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    });
  } catch (error) {
    console.error("Error handling connection:", error);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

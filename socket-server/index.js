const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let viewerCount = 0;

io.on("connection", (socket) => {
  viewerCount++;
  io.emit("viewer-count", viewerCount);
  console.log(`User connected (${viewerCount} total)`);

  // Host sync controls
  socket.on("sync", (data) => {
    // data: { action: 'play' | 'pause' | 'seek', videoTime: number }
    socket.broadcast.emit("sync", data);
  });

  // Chat messages
  socket.on("chat-message", (message) => {
    io.emit("chat-message", message);
  });

  // Reactions
  socket.on("reaction", (reaction) => {
    io.emit("reaction", reaction);
  });

  // Question submission
  socket.on("submit-question", (question) => {
    // Forward to host only (host joins a 'host' room)
    io.to("host").emit("new-question", question);
  });

  // Host room join
  socket.on("join-as-host", () => {
    socket.join("host");
    console.log("Host connected");
  });

  socket.on("disconnect", () => {
    viewerCount--;
    io.emit("viewer-count", viewerCount);
    console.log(`User disconnected (${viewerCount} total)`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io sync server running on port ${PORT}`);
});

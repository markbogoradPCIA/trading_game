const express = require("express");

const http = require("http");

const { Server } = require("socket.io");

const path = require("path");
const QRCode = require("qrcode");
const { RoomManager, getPublicState } = require("./lib/room-manager");



const app = express();

const server = http.createServer(app);

const io = new Server(server);



const rooms = new RoomManager();

const hostRooms = new Map();

const playerRooms = new Map();



app.use(express.static(path.join(__dirname)));



app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/join-qr/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      res.status(400).send("Invalid PIN");
      return;
    }

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const joinUrl = `${proto}://${host}/player.html?pin=${code}`;

    const png = await QRCode.toBuffer(joinUrl, {
      type: "png",
      width: 240,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#e2e8f0", light: "#111827" },
    });

    res.type("png").set("Cache-Control", "no-store").send(png);
  } catch (err) {
    next(err);
  }
});



function emitRoom(code) {

  const room = rooms.getRoom(code);

  if (!room) return;



  io.to(`room:${code}`).emit("room:update", getPublicState(room));



  io.to(`host:${code}`).emit("host:update", getPublicState(room, { forHost: true }));



  for (const player of room.players.values()) {

    io.to(player.socketId).emit("player:update", {

      ...getPublicState(room, { playerId: player.id }),

      playerId: player.id,

      color: player.color,

    });

  }

}



function bindRoomTimer(code) {

  const room = rooms.getRoom(code);

  if (!room) return;



  room.onTradeTimerExpired = () => {

    emitRoom(code);

  };

}



function beginTradePhase(code) {

  const timerResult = rooms.startTradeTimer(code);

  if (timerResult.error) return timerResult;

  bindRoomTimer(code);

  return timerResult;

}



function maybeAutoCloseTrading(code) {

  const room = rooms.getRoom(code);

  if (!room || room.subPhase !== "trade") return false;



  const allConfirmed =

    room.players.size > 0 && [...room.players.values()].every((p) => p.confirmed);



  if (!allConfirmed) return false;



  const result = rooms.showStandings(code);

  if (result.error) return false;

  emitRoom(code);

  return true;

}



io.on("connection", (socket) => {

  socket.on("host:create", () => {

    const room = rooms.createRoom(socket.id);

    hostRooms.set(socket.id, room.code);

    socket.join(`host:${room.code}`);

    socket.join(`room:${room.code}`);

    bindRoomTimer(room.code);

    socket.emit("host:created", {

      code: room.code,

      joinUrl: `/player.html?pin=${room.code}`,

      state: getPublicState(room, { forHost: true }),

    });

  });



  socket.on("player:join", ({ code, name }, ack) => {

    const result = rooms.joinRoom(code, name, socket.id);

    if (result.error) {

      ack?.({ ok: false, error: result.error });

      return;

    }



    playerRooms.set(socket.id, code);

    socket.join(`room:${code}`);

    ack?.({

      ok: true,

      playerId: result.player.id,

      color: result.player.color,

      state: getPublicState(result.room, { playerId: result.player.id }),

    });

    emitRoom(code);

  });



  socket.on("host:start", () => {

    const code = hostRooms.get(socket.id);

    const result = rooms.startGame(code);

    if (result.error) {

      socket.emit("host:error", result.error);

      return;

    }

    emitRoom(code);

  });



  socket.on("host:reveal", () => {

    const code = hostRooms.get(socket.id);

    const result = rooms.revealHeadline(code);

    if (result.error) {

      socket.emit("host:error", result.error);

      return;

    }

    beginTradePhase(code);

    emitRoom(code);

  });



  socket.on("player:submit", ({ exposure }, ack) => {

    const code = playerRooms.get(socket.id);

    const result = rooms.submitExposure(code, socket.id, exposure);

    if (result.error) {

      ack?.({ ok: false, error: result.error });

      return;

    }

    ack?.({ ok: true });

    emitRoom(code);

    maybeAutoCloseTrading(code);

  });



  socket.on("host:standings", () => {

    const code = hostRooms.get(socket.id);

    const result = rooms.showStandings(code);

    if (result.error) {

      socket.emit("host:error", result.error);

      return;

    }

    emitRoom(code);

  });



  socket.on("host:next", () => {

    const code = hostRooms.get(socket.id);

    const result = rooms.nextDay(code);

    if (result.error) {

      socket.emit("host:error", result.error);

      return;

    }

    emitRoom(code);

  });



  socket.on("disconnect", () => {

    const removed = rooms.removePlayer(socket.id);

    hostRooms.delete(socket.id);

    playerRooms.delete(socket.id);

    if (removed && !removed.closed) {

      emitRoom(removed.code);

    }

  });

});



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

  console.log(`Pipeline Pulse running at http://localhost:${PORT}`);

});



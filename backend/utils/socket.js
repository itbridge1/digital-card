const { Server } = require("socket.io");

let ioInstance = null;
let readerBridgeSocket = null;

function logSocket(...args) {
  console.log("[socket]", ...args);
}

function normalizeIncomingTag(payload = {}) {
  if (typeof payload === "string") {
    const tag = payload.trim().toUpperCase();
    return tag || null;
  }

  const nested = payload.data || payload.card || payload.tag || {};
  const raw =
    payload.tag_id ||
    payload.tagId ||
    payload.uid ||
    payload.card_uid ||
    nested.tag_id ||
    nested.tagId ||
    nested.uid ||
    nested.card_uid;

  const tag = String(raw || "")
    .trim()
    .toUpperCase();
  return tag || null;
}

function normalizeFromArgs(args = []) {
  for (const arg of args) {
    const tagId = normalizeIncomingTag(arg);
    if (tagId) return tagId;
  }
  return null;
}

function relayScan(tagId, extra = {}) {
  if (!ioInstance || !tagId) return;

  const basePayload = {
    tag_id: tagId,
    ...extra,
    timestamp: new Date().toISOString(),
  };

  ioInstance.emit("nfc_scan", basePayload);
  ioInstance.emit("nfc_update", {
    event: extra.event || "nfc_scanned",
    ...basePayload,
  });

  logSocket(
    `relayed scan tag_id=${tagId} event=${basePayload.event || "nfc_scanned"}`,
  );
}

function getReaderBridgeUrl() {
  if (process.env.READER_SOCKET_URL) {
    return process.env.READER_SOCKET_URL;
  }

  const apiPort = String(process.env.PORT || "5000");
  // If API is not on 3001, try legacy reader server at 3001.
  if (apiPort !== process.env.READER_SOCKET_PORT && process.env.READER_SOCKET_PORT ) {
    return "http://localhost:" + process.env.READER_SOCKET_PORT;
  }

  return null;
}

function initLegacyReaderBridge() {
  const bridgeUrl = getReaderBridgeUrl();
  if (!bridgeUrl) return;

  let ioClient;
  try {
    // Optional dependency for bridging from external reader socket server.
    ioClient = require("socket.io-client");
  } catch (error) {
    logSocket("reader bridge disabled: socket.io-client not installed");
    return;
  }

  readerBridgeSocket = ioClient.io(bridgeUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
  });

  const forward = (fallbackEvent, args) => {
    const tagId = normalizeFromArgs(args);
    if (!tagId) return;
    relayScan(tagId, {
      event: fallbackEvent,
      source: "legacy-reader-bridge",
    });
  };

  readerBridgeSocket.on("connect", () => {
    logSocket(`reader bridge connected -> ${bridgeUrl}`);
  });

  readerBridgeSocket.on("connect_error", (err) => {
    logSocket(`reader bridge connect_error -> ${bridgeUrl}: ${err.message}`);
  });

  readerBridgeSocket.on("disconnect", (reason) => {
    logSocket(`reader bridge disconnected: ${reason}`);
  });

  readerBridgeSocket.on("nfc_scan", (...args) => forward("nfc_scanned", args));
  readerBridgeSocket.on("scan", (...args) => forward("nfc_scanned", args));
  readerBridgeSocket.on("card", (...args) => forward("nfc_scanned", args));
  readerBridgeSocket.on("tag", (...args) => forward("nfc_scanned", args));
  readerBridgeSocket.on("nfc_read", (...args) => forward("nfc_scanned", args));
  readerBridgeSocket.on("nfc_update", (...args) =>
    forward("nfc_scanned", args),
  );
  readerBridgeSocket.onAny((eventName, ...args) => {
    if (["connect_response"].includes(eventName)) return;
    forward(eventName || "nfc_scanned", args);
  });
}

function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    logSocket(`client connected: ${socket.id}`);

    socket.emit("connect_response", {
      status: "connected",
      message: "Socket connected",
      timestamp: new Date().toISOString(),
    });

    const acceptAndRelay = (args = [], fallbackEvent = "nfc_scanned") => {
      const tagId = normalizeFromArgs(args);
      if (!tagId) return;

      const firstPayload = args[0] || {};
      relayScan(tagId, {
        event: firstPayload.event || fallbackEvent,
        source: firstPayload.source || "reader",
      });
    };

    socket.on("nfc_scan", (...args) => acceptAndRelay(args, "nfc_scanned"));
    socket.on("scan", (...args) => acceptAndRelay(args, "nfc_scanned"));
    socket.on("card", (...args) => acceptAndRelay(args, "nfc_scanned"));
    socket.on("tag", (...args) => acceptAndRelay(args, "nfc_scanned"));
    socket.on("nfc_read", (...args) => acceptAndRelay(args, "nfc_scanned"));
    socket.on("nfc_update", (...args) => acceptAndRelay(args, "nfc_scanned"));

    socket.on("disconnect", () => {
      logSocket(`client disconnected: ${socket.id}`);
    });

    socket.onAny((eventName, ...args) => {
      if (
        [
          "nfc_scan",
          "scan",
          "card",
          "tag",
          "nfc_read",
          "nfc_update",
          "connect_response",
        ].includes(eventName)
      ) {
        return;
      }
      acceptAndRelay(args, eventName || "nfc_scanned");
    });
  });

  initLegacyReaderBridge();

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function broadcastNfcRegistration(payload) {
  if (!ioInstance) return;

  ioInstance.emit("nfc_update", {
    event: "card_registered",
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  initSocket,
  getIO,
  broadcastNfcRegistration,
};

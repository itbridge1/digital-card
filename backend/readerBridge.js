require("dotenv").config();

let NFC;
try {
  ({ NFC } = require("nfc-pcsc"));
} catch (error) {
  console.error(
    "[reader] nfc-pcsc is not installed. Run npm install in backend.",
  );
  process.exit(1);
}

const { io } = require("socket.io-client");

const SOCKET_URL =
  process.env.SOCKET_URL || `http://localhost:${process.env.PORT || 5001}`;
const TAG_WRITE_BASE_URL = (
  process.env.TAG_WRITE_BASE_URL ||
  `http://localhost:${process.env.PORT || 5001}/card`
).replace(/\/$/, "");
const nfc = new NFC();
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
});

let lastTag = null;
let lastAt = 0;
const activeCardsByTag = new Map();
const pendingUrlByTag = new Map();
const writeInProgressByTag = new Map();

function buildNdefUriTlv(url) {
  const uri = String(url || "").trim();

  let prefixCode = 0x00;
  let remainder = uri;
  if (uri.startsWith("https://www.")) {
    prefixCode = 0x02;
    remainder = uri.slice("https://www.".length);
  } else if (uri.startsWith("https://")) {
    prefixCode = 0x04;
    remainder = uri.slice("https://".length);
  } else if (uri.startsWith("http://www.")) {
    prefixCode = 0x01;
    remainder = uri.slice("http://www.".length);
  } else if (uri.startsWith("http://")) {
    prefixCode = 0x03;
    remainder = uri.slice("http://".length);
  }

  const remainderBytes = Buffer.from(remainder, "utf8");
  const payload = Buffer.concat([Buffer.from([prefixCode]), remainderBytes]);
  const ndefRecord = Buffer.concat([
    Buffer.from([0xd1, 0x01, payload.length, 0x55]),
    payload,
  ]);

  if (ndefRecord.length > 0xfe) {
    throw new Error("URL too long for NDEF short record");
  }

  return Buffer.concat([
    Buffer.from([0x03, ndefRecord.length]),
    ndefRecord,
    Buffer.from([0xfe]),
  ]);
}

async function writeUrlToCard(reader, fullUrl) {
  const tlv = buildNdefUriTlv(fullUrl);
  const paddedLength = Math.ceil(tlv.length / 4) * 4;
  const data = Buffer.alloc(paddedLength, 0x00);
  tlv.copy(data);

  const startPage = 4;
  for (let offset = 0; offset < data.length; offset += 4) {
    const page = startPage + offset / 4;
    const chunk = data.slice(offset, offset + 4);
    await reader.write(page, chunk, 4);
  }
}

async function tryWriteForTag(tagId) {
  const activeCard = activeCardsByTag.get(tagId);
  const pendingUrl = pendingUrlByTag.get(tagId);
  if (!activeCard || !pendingUrl) return;

  if (writeInProgressByTag.get(tagId)) return;
  writeInProgressByTag.set(tagId, true);

  try {
    await writeUrlToCard(activeCard.reader, pendingUrl);
    console.log(`[reader] wrote URL to tag ${tagId}: ${pendingUrl}`);
    pendingUrlByTag.delete(tagId);
  } catch (error) {
    console.error(
      `[reader] failed writing URL to tag ${tagId}: ${error.message}`,
    );
  } finally {
    writeInProgressByTag.delete(tagId);
  }
}

function shouldEmit(tagId) {
  const now = Date.now();
  if (lastTag === tagId && now - lastAt < 1200) return false;
  lastTag = tagId;
  lastAt = now;
  return true;
}

function emitScan(tagId, readerName) {
  if (!tagId || !shouldEmit(tagId)) return;

  const payload = {
    tag_id: tagId,
    tagId,
    uid: tagId,
    reader: readerName,
    source: "nfc-pcsc-reader",
    status: "detected",
    timestamp: new Date().toISOString(),
  };

  socket.emit("nfc_scan", payload);
  socket.emit("nfc_update", payload);
  socket.emit("scan", payload);

  console.log(`[reader] emitted tag ${tagId} -> ${SOCKET_URL}`);
}

socket.on("connect", () => {
  console.log(`[reader] socket connected: ${SOCKET_URL}`);
});

socket.on("connect_error", (err) => {
  console.error(`[reader] socket connect error: ${err.message}`);
});

socket.on("nfc_update", async (payload = {}) => {
  if (!["card_registered", "card_updated"].includes(payload?.event)) return;

  const tagId = String(payload.tag_id || payload.tagId || "")
    .trim()
    .toUpperCase();
  const shortCode = String(payload.url || "").trim();
  if (!tagId || !shortCode) return;

  const targetUrl = `${TAG_WRITE_BASE_URL}/${encodeURIComponent(shortCode)}`;
  pendingUrlByTag.set(tagId, targetUrl);
  await tryWriteForTag(tagId);
});

nfc.on("reader", (reader) => {
  console.log(`[reader] device ready: ${reader.reader.name}`);

  reader.on("card", async (card) => {
    const uid = String(card.uid || "").toUpperCase();
    if (!uid) return;
    console.log(`[reader] card detected: ${uid}`);
    activeCardsByTag.set(uid, { reader, card, seenAt: Date.now() });

    emitScan(uid, reader.reader.name);
    await tryWriteForTag(uid);
  });

  reader.on("card.off", (card) => {
    const uid = String(card.uid || "").toUpperCase();
    if (uid) {
      activeCardsByTag.delete(uid);
    }
    console.log(`[reader] card removed: ${card.uid || "-"}`);
  });

  reader.on("error", (err) => {
    console.error(`[reader] reader error: ${err.message}`);
  });
});

nfc.on("error", (err) => {
  console.error(`[reader] nfc error: ${err.message}`);
});

process.on("SIGINT", () => {
  console.log("\n[reader] shutting down...");
  socket.close();
  process.exit(0);
});

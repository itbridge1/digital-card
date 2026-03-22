const { Card, CardRegister, Tenant, User } = require("../models");
const { broadcastNfcRegistration } = require("./socket");

function generateRandomString(length = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

function normalizeTagId(tagId) {
  return String(tagId || "")
    .trim()
    .toUpperCase();
}

function buildBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  return `http://localhost:${process.env.PORT || 5000}`;
}

function buildRedirectUrl(tagId) {
  return `t/${encodeURIComponent(tagId)}`;
}

function buildDefaultBusinessUrl(tagId) {
  const frontendBase = (
    process.env.FRONTEND_URL || "http://localhost:3030/card/"
  ).replace(/\/$/, "");
  return `${frontendBase}/${encodeURIComponent(tagId)}`;
}

async function registerNfcCard({
  tagId,
  tenantId,
  userId,
  businessUrl,
  redirectUrl,
  status = "registered",
  metadata = {},
  actorUserId,
  actorRole,
}) {
  if (actorRole !== "admin") {
    const err = new Error("Only admin users can register NFC cards");
    err.statusCode = 403;
    throw err;
  }

  const normalizedTagId = normalizeTagId(tagId);
  if (!normalizedTagId) {
    const err = new Error("tagId is required");
    err.statusCode = 400;
    throw err;
  }

  if (!tenantId) {
    const err = new Error("tenantId is required");
    err.statusCode = 400;
    throw err;
  }

  const tenant = await Tenant.findOne({
    where: { tenantId: String(tenantId).toUpperCase(), isActive: true },
  });
  if (!tenant) {
    const err = new Error("Tenant not found or inactive");
    err.statusCode = 404;
    throw err;
  }

  let assignedUser = null;
  if (userId) {
    assignedUser = await User.findOne({
      where: {
        id: userId,
        tenantId: tenant.tenantId,
        isActive: true,
      },
    });

    if (!assignedUser) {
      const err = new Error("Selected user not found for this tenant");
      err.statusCode = 400;
      throw err;
    }
  }

  const allowedStatuses = ["registered", "unregistered", "blocked"];
  if (!allowedStatuses.includes(status)) {
    const err = new Error(
      "status must be registered, unregistered, or blocked",
    );
    err.statusCode = 400;
    throw err;
  }

  const existingRegister = await CardRegister.findOne({
    where: { tagId: normalizedTagId },
  });

  // IMPORTANT: If already registered, keep same URL (do not recreate).
  const shortCode = existingRegister?.url || (await generateUniqueShortCode());

  let card = await Card.findOne({ where: { tagId: normalizedTagId } });
  if (!card) {
    card = await Card.create({
      tenantId: tenant.tenantId,
      tagId: normalizedTagId,
      businessUrl: businessUrl || buildDefaultBusinessUrl(normalizedTagId),
      metadata: {
        ...(metadata || {}),
        shortCode,
        createdBy: actorUserId || null,
      },
    });
  } else {
    card.tenantId = tenant.tenantId;
    card.businessUrl =
      businessUrl ||
      card.businessUrl ||
      buildDefaultBusinessUrl(normalizedTagId);
    card.metadata = {
      ...(card.metadata || {}),
      ...(metadata || {}),
      shortCode,
      updatedBy: actorUserId || null,
    };
    await card.save();
  }

  const finalRedirectUrl =
    typeof redirectUrl === "undefined"
      ? buildRedirectUrl(card.tagId)
      : redirectUrl;

  let cardRegister;
  if (existingRegister) {
    existingRegister.status = status;
    existingRegister.url = existingRegister.url || shortCode;
    existingRegister.redirectUrl = finalRedirectUrl || null;
    existingRegister.tenantId = tenant.tenantId;
    existingRegister.userId = assignedUser ? assignedUser.id : null;
    existingRegister.cardId = card.id;
    cardRegister = await existingRegister.save();
  } else {
    cardRegister = await CardRegister.create({
      tagId: normalizedTagId,
      status,
      url: shortCode,
      redirectUrl: finalRedirectUrl || null,
      tenantId: tenant.tenantId,
      userId: assignedUser ? assignedUser.id : null,
      cardId: card.id,
    });
  }

  broadcastNfcRegistration({
    tag_id: cardRegister.tagId,
    status: cardRegister.status,
    url: shortCode,
    redirect_url: cardRegister.redirectUrl,
    tenant_id: cardRegister.tenantId,
    user_id: cardRegister.userId,
  });

  return {
    card,
    cardRegister,
    shortCode,
    redirectUrl: cardRegister.redirectUrl,
  };
}

async function generateUniqueShortCode(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = generateRandomString(4);
    const exists = await CardRegister.findOne({ where: { url: candidate } });
    if (!exists) return candidate;
  }

  const err = new Error("Unable to generate unique short URL. Retry.");
  err.statusCode = 500;
  throw err;
}

module.exports = {
  generateRandomString,
  normalizeTagId,
  buildRedirectUrl,
  registerNfcCard,
};

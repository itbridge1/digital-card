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

function isMetadataTooLarge(metadata, maxBytes = 256 * 1024) {
  try {
    return Buffer.byteLength(JSON.stringify(metadata || {}), "utf8") > maxBytes;
  } catch {
    return true;
  }
}

function buildDefaultBusinessUrl(tagId) {
  const tagWriteBase = (process.env.TAG_WRITE_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  if (tagWriteBase) {
    return `${tagWriteBase}/${encodeURIComponent(tagId)}`;
  }

  const frontendBase = (
    process.env.FRONTEND_URL || "http://localhost:3030"
  ).replace(/\/$/, "");
  return `${frontendBase}/view/${encodeURIComponent(tagId)}`;
}

function normalizeRegistrationStatus(status = "registered") {
  const value = String(status || "registered")
    .trim()
    .toLowerCase();

  if (value === "active") return "registered";
  if (value === "inactive") return "unregistered";
  if (value === "blocked") return "blocked";
  return value;
}

async function resolveTenant(tenantId) {
  const raw = String(tenantId || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const byNumericId = await Tenant.findOne({
      where: {
        id: Number(raw),
        isActive: true,
      },
    });

    if (byNumericId) return byNumericId;
  }

  return Tenant.findOne({
    where: {
      tenantId: raw.toUpperCase(),
      isActive: true,
    },
  });
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
  actorTenantId,
}) {
  if (actorRole !== "admin" && actorRole !== "manager") {
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

  const tenantLookupId = tenantId || actorTenantId;
  const tenant = await resolveTenant(tenantLookupId);
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

  const normalizedStatus = normalizeRegistrationStatus(status);
  const allowedStatuses = ["registered", "unregistered", "blocked"];
  if (!allowedStatuses.includes(normalizedStatus)) {
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

  const resolvedPublicUrl = `${(process.env.FRONTEND_URL || "http://localhost:3030").replace(/\/$/, "")}/view/${encodeURIComponent(normalizedTagId)}`;

  let card = await Card.findOne({ where: { tagId: normalizedTagId } });
  if (!card) {
    const safeMetadata = isMetadataTooLarge(metadata) ? {} : metadata || {};
    card = await Card.create({
      tenantId: tenant.tenantId,
      tagId: normalizedTagId,
      businessUrl: businessUrl || buildDefaultBusinessUrl(normalizedTagId),
      publicUrl: resolvedPublicUrl,
      metadata: {
        ...(safeMetadata || {}),
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
    card.publicUrl = card.publicUrl || resolvedPublicUrl;

    if (
      metadata &&
      Object.keys(metadata).length > 0 &&
      !isMetadataTooLarge(metadata)
    ) {
      card.metadata = {
        ...(card.metadata || {}),
        ...(metadata || {}),
        updatedBy: actorUserId || null,
      };
    }

    await card.save();
  }

  const finalRedirectUrl =
    typeof redirectUrl === "undefined"
      ? null
      : String(redirectUrl || "").trim() || null;

  let cardRegister;
  if (existingRegister) {
    existingRegister.status = normalizedStatus;
    existingRegister.url = existingRegister.url || shortCode;
    existingRegister.redirectUrl = finalRedirectUrl || null;
    existingRegister.tenantId = tenant.tenantId;
    existingRegister.userId = assignedUser ? assignedUser.id : null;
    existingRegister.cardId = card.id;
    cardRegister = await existingRegister.save();
  } else {
    cardRegister = await CardRegister.create({
      tagId: normalizedTagId,
      status: normalizedStatus,
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

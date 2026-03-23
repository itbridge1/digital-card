const express = require("express");
const router = express.Router();
const { Card, CardRegister } = require("../models");
const { Op } = require("sequelize");

function toAbsoluteRedirect(target) {
  const value = String(target || "").trim();
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `/${value.replace(/^\/+/, "")}`;
}

function renderUnassignedPage(identifier) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Card Unassigned</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 60px 24px; background: #f8fafc; }
          .box { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; box-shadow: 0 6px 24px rgba(0,0,0,0.08); }
          h1 { color: #1f2937; margin-bottom: 12px; }
          p { color: #4b5563; line-height: 1.6; }
          .tag { margin-top: 18px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Card is unassigned</h1>
          <p>Please contact the administration team to activate or assign this card.</p>
          <div class="tag">Card: ${identifier}</div>
        </div>
      </body>
    </html>
  `;
}

async function findRegistrationByTagOrCode(rawIdentifier) {
  const identifier = String(rawIdentifier || "").trim();
  if (!identifier) return null;

  const asTag = identifier.toUpperCase();

  return CardRegister.findOne({
    where: {
      [require("sequelize").Op.or]: [{ tagId: asTag }, { url: identifier }],
    },
  });
}

/**
 * Global Redirector Endpoint
 * GET /t/:tagId
 *
 * This is the most important endpoint - the short URL encoded on NFC chips
 * Example: https://tap.io/t/A1B2C3D4
 */
router.get("/cardData/:tagId", async (req, res) => {
  const rawValue = req.params.tagId;
  const tagId = rawValue.toUpperCase();

  const registration = await CardRegister.findOne({
    where: {
      [Op.or]: [{ tagId: tagId }, { url: rawValue }],
    },
  });

  if (registration && registration.status !== "registered") {
    return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Card Not Active</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #e67e22; }
            </style>
          </head>
          <body>
            <h1>Card is ${registration.status}</h1>
            <p>This NFC card cannot be used right now.</p>
            <p>Please contact the Administration</p>
          </body>
        </html>
      `);
  }
  if (registration && registration.redirectUrl == null) {
    return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Card Not Active</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #e67e22; }
            </style>
          </head>
          <body>
            <h1>Card is ${registration.status}</h1>
            <p>This NFC card cannot be used right now.</p>
            <p>Please contact the Administration</p>
          </body>
        </html>
      `);
  }

  // Find the card by tag ID
  const card = await Card.findOne({
    [Op.or]: [
      { tagId: tagId, isActive: true },
      { url: rawValue, isActive: true },
    ],
  });

  if (!card) {
    return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Card Not Found</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>Card Not Found</h1>
            <p>This NFC tag is not registered in the system.</p>
            <p>Please contact the Administration</p>
          </body>
        </html>
      `);
  }

  // Increment tap count and record timestamp (non-blocking)
  card.recordTap().catch((err) => {
    console.error("Failed to record tap:", err);
  });

  const redirectTarget = registration?.redirectUrl || card.businessUrl;

  // Redirect to the business URL / registration redirect URL
  if (
    redirectTarget.startsWith("http://") ||
    redirectTarget.startsWith("https://")
  ) {
    return res.redirect(redirectTarget);
  }

  return res.redirect(`/${String(redirectTarget).replace(/^\/+/, "")}`);
  // } catch (error) {
  //   console.error("Redirect error:", error);
  //   res.status(500).send(`
  //     <!DOCTYPE html>
  //     <html>
  //       <head>
  //         <title>Error</title>
  //         <style>
  //           body { font-family: Arial; text-align: center; padding: 50px; }
  //           h1 { color: #e74c3c; }
  //         </style>
  //       </head>
  //       <body>
  //         <h1>Oops! Something went wrong</h1>
  //         <p>Please try again later.</p>
  //       </body>
  //     </html>
  //   `);
  // }
});

/**
 * Card Redirect Endpoint
 * GET /card/:identifier
 * - identifier can be tagId or short code
 * - if redirect_url exists -> redirect
 * - if redirect_url is null -> show unassigned page
 */
router.get("/cardData/:identifier", async (req, res) => {
  try {
    const identifier = String(req.params.identifier || "").trim();
    if (!identifier) {
      return res.status(400).send(renderUnassignedPage("UNKNOWN"));
    }

    const registration = await findRegistrationByTagOrCode(identifier);

    if (!registration) {
      return res.status(404).send(renderUnassignedPage(identifier));
    }

    if (registration.status !== "registered") {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Card Not Active</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #e67e22; }
            </style>
          </head>
          <body>
            <h1>Card is ${registration.status}</h1>
            <p>This NFC card cannot be used right now.</p>
            <p>Card: ${registration.tagId}</p>
          </body>
        </html>
      `);
    }

    const redirectTarget = toAbsoluteRedirect(registration.redirectUrl);
    if (!redirectTarget) {
      return res.status(200).send(renderUnassignedPage(registration.tagId));
    }

    Card.findOne({ where: { tagId: registration.tagId, isActive: true } })
      .then((card) => card?.recordTap())
      .catch((err) => console.error("Failed to record tap:", err));

    return res.redirect(redirectTarget);
  } catch (error) {
    console.error("Card redirect error:", error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1>Oops! Something went wrong</h1>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;

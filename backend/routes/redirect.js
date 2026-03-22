const express = require("express");
const router = express.Router();
const { Card, CardRegister } = require("../models");

/**
 * Global Redirector Endpoint
 * GET /t/:tagId
 *
 * This is the most important endpoint - the short URL encoded on NFC chips
 * Example: https://tap.io/t/A1B2C3D4
 */
router.get("/:tagId", async (req, res) => {
  try {
    const tagId = req.params.tagId.toUpperCase();

    const registration = await CardRegister.findOne({
      where: { tagId },
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
            <p>Tag ID: ${tagId}</p>
          </body>
        </html>
      `);
    }

    // Find the card by tag ID
    const card = await Card.findOne({
      where: {
        tagId: tagId,
        isActive: true,
      },
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
            <p>Tag ID: ${tagId}</p>
          </body>
        </html>
      `);
    }

    // Increment tap count and record timestamp (non-blocking)
    card.recordTap().catch((err) => {
      console.error("Failed to record tap:", err);
    });

    // Log the tap for analytics
    console.log(
      `Tap recorded - Tag: ${card.tagId}, Tenant: ${card.tenantId}, Count: ${card.tapCount + 1}`,
    );

    const redirectTarget = registration?.redirectUrl || card.businessUrl;

    // Redirect to the business URL / registration redirect URL
    if (
      redirectTarget.startsWith("http://") ||
      redirectTarget.startsWith("https://")
    ) {
      return res.redirect(redirectTarget);
    }

    return res.redirect(`/${String(redirectTarget).replace(/^\/+/, "")}`);
  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send(`
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

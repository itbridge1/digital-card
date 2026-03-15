const express = require('express');
const router = express.Router();
const Card = require('../models/Card');

/**
 * Global Redirector Endpoint
 * GET /t/:tagId
 * 
 * This is the most important endpoint - the short URL encoded on NFC chips
 * Example: https://tap.io/t/A1B2C3D4
 */
router.get('/:tagId', async (req, res) => {
  try {
    // Decode the tagId from URL
    const tagId = decodeURIComponent(req.params.tagId).toUpperCase();

    // Find the card by tag ID
    const card = await Card.findOne({ 
      tagId: tagId,
      isActive: true 
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
    card.recordTap().catch(err => {
      console.error('Failed to record tap:', err);
    });

    // Log the tap for analytics
    console.log(`Tap recorded - Tag: ${card.tagId}, Tenant: ${card.tenantId}, Count: ${card.tapCount + 1}`);

    // Redirect to the business URL
    res.redirect(card.businessUrl);

  } catch (error) {
    console.error('Redirect error:', error);
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

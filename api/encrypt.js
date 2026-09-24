// api/encrypt.js

const fernet = require("fernet");

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests allowed",
    });
  }

  const {
    action,
    token,
    payload,

    // Used for purchase verification
    product_permalink,
    referrer,
  } = req.body || {};

  // ============================================================
  // LOAD SECRETS
  // ============================================================

  const fernetSecret = process.env.FERNET_SECRET;

  if (!fernetSecret) {
    return res.status(500).json({
      error: "Server missing encryption key",
    });
  }

  const gumroadAccessToken = process.env.GUMROAD_ACCESS_TOKEN;

  // ============================================================
  // FERNET
  // ============================================================

  const secret = new fernet.Secret(fernetSecret);

  try {
    // ==========================================================
    // ENCRYPT
    // ==========================================================

    if (action === "encrypt") {
      const dataToEncrypt =
        payload || {
          name: "armx",
          amount: 65,
        };

      const jsonString = JSON.stringify(dataToEncrypt);

      const fToken = new fernet.Token({
        secret: secret,
      });

      const encryptedToken = fToken.encode(jsonString);

      return res.status(200).json({
        token: encryptedToken,
        result: encryptedToken,
      });
    }

    // ==========================================================
    // DECRYPT
    // ==========================================================

    if (action === "decrypt") {
      if (!token) {
        return res.status(400).json({
          error: "No token provided",
        });
      }

      const fToken = new fernet.Token({
        secret: secret,
        token: token,
        ttl: 0,
      });

      const decryptedString = fToken.decode();
      const parsedObject = JSON.parse(decryptedString);

      return res.status(200).json({
        result: parsedObject,
      });
    }

    // ==========================================================
    // CHECK GUMROAD PURCHASE
    // ==========================================================

    if (action === "checkPurchase") {
      if (!gumroadAccessToken) {
        return res.status(500).json({
          error: "Server missing Gumroad access token",
        });
      }

      if (!product_permalink) {
        return res.status(400).json({
          error: "product_permalink is required",
        });
      }

      if (!referrer) {
        return res.status(400).json({
          error: "referrer is required",
        });
      }

      // --------------------------------------------------------
      // Call Gumroad API
      // --------------------------------------------------------

      const gumroadResponse = await fetch(
        "https://api.gumroad.com/v2/sales",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${gumroadAccessToken}`,
          },
        }
      );

      if (!gumroadResponse.ok) {
        console.error(
          "Gumroad API error:",
          gumroadResponse.status,
          gumroadResponse.statusText
        );

        return res.status(502).json({
          error: "Gumroad API request failed",
          status: gumroadResponse.status,
        });
      }

      const gumroadData = await gumroadResponse.json();

      if (!gumroadData.success || !gumroadData.sales) {
        return res.status(200).json({
          purchased: false,
        });
      }

      // --------------------------------------------------------
      // Find matching sale
      // --------------------------------------------------------

      const matchingSale = gumroadData.sales.find((sale) => {
        const isCorrectProduct =
          sale.product_permalink === product_permalink ||
          sale.product_permalink?.includes(product_permalink);

        const hasMatchingReferrer =
          sale.referrer === referrer;

        return (
          isCorrectProduct &&
          hasMatchingReferrer
        );
      });

      // --------------------------------------------------------
      // Purchase found
      // --------------------------------------------------------

      if (matchingSale) {
        return res.status(200).json({
          purchased: true,

          // Only return information that your frontend needs.
          product_permalink:
            matchingSale.product_permalink,

          sale_id: matchingSale.id || null,
        });
      }

      // --------------------------------------------------------
      // No matching purchase
      // --------------------------------------------------------

      return res.status(200).json({
        purchased: false,
      });
    }

    // ==========================================================
    // INVALID ACTION
    // ==========================================================

    return res.status(400).json({
      error: "Invalid action specified",
    });
  } catch (error) {
    console.error("API Error:", error);

    return res.status(500).json({
      error: "Request failed",
    });
  }
}

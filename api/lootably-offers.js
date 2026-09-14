const API_KEY = process.env.LOOTABLY_API_KEY;
const PLACEMENT_ID = process.env.LOOTABLY_PLACEMENT_ID;
const ENDPOINT = "https://api.lootably.com/api/v2/offers/get";

function clientIP(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
}

function normalize(o) {
  const base = {
    network: "lootably",
    id: `lootably:${o.offerID}`,
    offerID: o.offerID,
    type: o.type,
    name: o.name,
    description: o.description,
    image: o.image,
    link: o.link,
    categories: o.categories || [],
    devices: o.devices || [],
    countries: o.countries || [],
    conversionRate: o.conversionRate ?? null,
    paymentModel: o.paymentModel || null,
    previewURL: o.previewURL || null,
    creatives: o.extraCreatives || [],
  };

  if (o.type === "multistep") {
    const goals = (o.goals || []).map((g) => ({
      goalID: g.goalID,
      description: g.description,
      revenue: g.revenue,
      points: g.currencyReward,
    }));
    return {
      ...base,
      goals,
      points: goals.reduce((sum, g) => sum + (Number(g.points) || 0), 0),
      revenue: goals.reduce((sum, g) => sum + (Number(g.revenue) || 0), 0),
      variable: false,
      repeatable: false,
    };
  }

  const variable = o.currencyReward === "variable" || o.revenue === "variable";
  return {
    ...base,
    points: variable ? null : Number(o.currencyReward),
    revenue: variable ? null : Number(o.revenue),
    variable,
    repeatable: Boolean(o.multipleConversionsAllowed),
  };
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (!API_KEY || !PLACEMENT_ID) {
    res.status(500).json({ error: "lootably not configured" });
    return;
  }

  const passID = String(req.query.passID || "").trim();
  if (!passID) {
    res.status(400).json({ error: "passID required" });
    return;
  }

  const body = {
    apiKey: API_KEY,
    placementID: PLACEMENT_ID,
    countries: ["US"],
    userData: {
      userID: passID,
      userAgentHeader: req.headers["user-agent"] || "",
      ipAddress: clientIP(req),
    },
  };

  if (req.query.categories) {
    body.categories = String(req.query.categories).split(",").map((s) => s.trim()).filter(Boolean);
  }

  try {
    const upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await upstream.json();

    if (!upstream.ok || !json.success) {
      console.error("lootably offers error", json);
      res.status(502).json({ error: "lootably request failed", requestID: json && json.data && json.data.requestID });
      return;
    }

    const offers = (json.data.offers || []).map(normalize);
    offers.sort((a, b) => (b.points || 0) - (a.points || 0));

    res.status(200).json({ requestID: json.data.requestID, count: offers.length, offers });
  } catch (err) {
    console.error("lootably offers failed", err);
    res.status(500).json({ error: "internal error" });
  }
};

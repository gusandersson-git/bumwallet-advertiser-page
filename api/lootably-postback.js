const crypto = require("crypto");

const SECRET = process.env.LOOTABLY_POSTBACK_SECRET;

function verifyHash(q) {
  const expected = crypto
    .createHash("sha256")
    .update(String(q.userID) + String(q.ip) + String(q.revenue) + String(q.currencyReward) + SECRET)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(q.hash || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function alreadyProcessed(transactionID) {
  return false;
}

async function recordTransaction(tx) {
}

async function creditUser(passID, points) {
}

async function debitUser(passID, points) {
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/plain");

  if (!SECRET) {
    res.status(500).send("0");
    return;
  }

  const q = req.method === "POST" ? { ...req.query, ...(req.body || {}) } : req.query;

  const required = ["userID", "transactionID", "ip", "revenue", "currencyReward", "status", "hash"];
  for (const key of required) {
    if (q[key] === undefined || q[key] === "") {
      res.status(400).send("0");
      return;
    }
  }

  if (!verifyHash(q)) {
    res.status(403).send("0");
    return;
  }

  const points = Number(q.currencyReward);
  const revenue = Number(q.revenue);
  const status = String(q.status);
  const passID = String(q.userID);
  const transactionID = String(q.transactionID);

  if (!Number.isFinite(points) || !Number.isFinite(revenue) || (status !== "1" && status !== "0")) {
    res.status(400).send("0");
    return;
  }

  try {
    const dedupeKey = `lootably:${transactionID}:${status}`;
    if (await alreadyProcessed(dedupeKey)) {
      res.status(200).send("1");
      return;
    }

    if (status === "1") {
      await creditUser(passID, points);
    } else {
      await debitUser(passID, points);
    }

    await recordTransaction({
      key: dedupeKey,
      network: "lootably",
      transactionID,
      passID,
      points,
      revenue,
      status: status === "1" ? "credited" : "chargeback",
      offerID: q.offerID || null,
      offerName: q.offerName || null,
      goalID: q.goalID || null,
      ip: String(q.ip),
      receivedAt: new Date().toISOString(),
    });

    res.status(200).send("1");
  } catch (err) {
    console.error("lootably postback failed", err);
    res.status(500).send("0");
  }
};

const crypto = require("crypto");

const BASE = "https://offerwall.me";

function credentials() {
  const publicKey = process.env.OFFERWALLME_API_KEY;
  const bearerToken = process.env.OFFERWALLME_BEARER_TOKEN;
  const secret = process.env.OFFERWALLME_SECRET;
  if (!publicKey || !bearerToken || !secret) {
    throw new Error("OFFERWALLME_API_KEY, OFFERWALLME_BEARER_TOKEN and OFFERWALLME_SECRET must be set in Vercel environment variables.");
  }
  return { publicKey, bearerToken, secret };
}

function signUser(publicKey, userId, secret, lifetimeSeconds = 3600) {
  const expires = String(Math.floor(Date.now() / 1000) + lifetimeSeconds);
  const message = ["offerwall-user-v1", publicKey, userId, expires].join("\n");
  const signature = crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
  return { identityExpires: expires, identitySignature: signature };
}

function signedOfferwallUrl(userId) {
  const { publicKey, secret } = credentials();
  const sig = signUser(publicKey, userId, secret);
  const qs = new URLSearchParams(sig).toString();
  return `${BASE}/offerwall/${encodeURIComponent(publicKey)}/${encodeURIComponent(userId)}?${qs}`;
}

async function listOffers({ userId, ip, country }) {
  const { publicKey, bearerToken, secret } = credentials();
  const sig = signUser(publicKey, userId, secret);
  const params = new URLSearchParams({
    api: publicKey,
    token: bearerToken,
    id: userId,
    ip,
    country,
    ...sig
  });
  const upstream = await fetch(`${BASE}/offerapi.php?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
  const text = await upstream.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const err = new Error("Upstream returned non JSON");
    err.httpCode = upstream.status;
    err.raw = text.slice(0, 500);
    throw err;
  }
  return data;
}

function verifyPostback(query) {
  const { secret } = credentials();
  const userId = String(query.subId ?? "");
  const transId = String(query.transId ?? "");
  const reward = String(query.reward ?? "");
  const expected = crypto.createHash("md5").update(userId + transId + reward + secret).digest("hex");
  const given = String(query.signature ?? "");
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

module.exports = { signUser, signedOfferwallUrl, listOffers, verifyPostback };

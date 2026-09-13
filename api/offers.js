module.exports = async (req, res) => {
  const apiKey = process.env.OFFERWALLME_API_KEY;
  const token = process.env.OFFERWALLME_BEARER_TOKEN;
  if (!apiKey || !token) {
    res.status(500).json({ status: 500, error: "OFFERWALLME_API_KEY and OFFERWALLME_BEARER_TOKEN are not set in Vercel environment variables." });
    return;
  }

  const id = String(req.query.id || "").trim();
  let country = String(req.query.country || "US").trim().toUpperCase();
  if (!/^[A-Za-z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ status: 400, error: "Invalid user id." });
    return;
  }
  if (!/^[A-Z]{2}$/.test(country)) country = "US";

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? String(forwarded).split(",")[0] : req.headers["x-real-ip"] || req.socket.remoteAddress || "").trim();

  const params = new URLSearchParams({ api: apiKey, token, id, ip, country });
  const url = "https://offerwall.me/offerapi.php?" + params.toString();

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ status: 502, error: "Upstream returned non JSON", http_code: upstream.status, raw: text.slice(0, 500) });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ status: 502, error: "Upstream request failed: " + err.message });
  }
};

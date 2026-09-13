const { listOffers } = require("../lib/offerwallme");

module.exports = async (req, res) => {
  const id = String(req.query.id || "").trim();
  let country = String(req.query.country || "US").trim().toUpperCase();
  if (!/^[A-Za-z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ status: 400, error: "Invalid user id." });
    return;
  }
  if (!/^[A-Z]{2}$/.test(country)) country = "US";

  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? String(forwarded).split(",")[0] : req.headers["x-real-ip"] || req.socket.remoteAddress || "").trim();

  try {
    const data = await listOffers({ userId: id, ip, country });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    if (err.httpCode) {
      res.status(502).json({ status: 502, error: err.message, http_code: err.httpCode, raw: err.raw });
      return;
    }
    res.status(500).json({ status: 500, error: err.message });
  }
};

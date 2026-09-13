module.exports = async (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? String(forwarded).split(",")[0].trim() : req.socket.remoteAddress;

  console.log("offerwall postback", JSON.stringify({
    time: new Date().toISOString(),
    method: req.method,
    query: req.query,
    body: req.body || null,
    ip
  }));

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send("OK");
};

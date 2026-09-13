const { verifyPostback } = require("../lib/offerwallme");

module.exports = async (req, res) => {
  const params = { ...(req.query || {}), ...(typeof req.body === "object" && req.body ? req.body : {}) };
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? String(forwarded).split(",")[0].trim() : req.socket.remoteAddress;

  let valid = false;
  try {
    valid = verifyPostback(params);
  } catch (err) {
    console.error("offerwall postback config error", err.message);
  }

  console.log("offerwall postback", JSON.stringify({
    time: new Date().toISOString(),
    valid,
    userId: params.subId,
    transId: params.transId,
    reward: params.reward,
    payout: params.payout,
    status: params.status,
    userIp: params.userIp,
    country: params.country,
    ip
  }));

  res.setHeader("Content-Type", "text/plain");
  if (!valid) {
    res.status(403).send("ERROR: Signature doesn't match");
    return;
  }
  res.status(200).send("ok");
};

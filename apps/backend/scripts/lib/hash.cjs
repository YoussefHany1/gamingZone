const crypto = require("crypto");

function sha1Id(value, length = 36) {
  return crypto
    .createHash("sha1")
    .update(String(value))
    .digest("hex")
    .substring(0, length);
}

module.exports = {
  sha1Id,
};

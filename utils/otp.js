const crypto = require("crypto");

function generateOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

function otpError(stored, input) {
    if (!stored) {
        return "Send a new OTP first.";
    }
    if (String(stored.listingId) !== String(input.listingId)) {
        return "Send a new OTP for this listing.";
    }
    if (stored.mobile !== input.mobile || stored.email !== String(input.email).toLowerCase()) {
        return "Mobile or email changed. Send a new OTP.";
    }
    if (Date.now() > stored.expiresAt) {
        return "OTP expired. Send a new one.";
    }
    if (stored.code !== String(input.code || "").trim()) {
        return "OTP is incorrect.";
    }
    return "";
}

module.exports = { generateOtp, otpError };

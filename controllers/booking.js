const twilio = require("twilio");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { generateOtp, otpError } = require("../utils/otp");

function stayFrom(body) {
    const checkIn = new Date(`${body.checkIn}T00:00:00`);
    const checkOut = new Date(`${body.checkOut}T00:00:00`);
    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return { checkIn, checkOut, nights };
}

function toSmsNumber(mobile) {
    const digits = String(mobile).replace(/\D/g, "");
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    if (digits.length > 10) {
        return `+${digits}`;
    }
    return "";
}

async function sendSms(mobile, message, trialTemplate) {
    if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN ||
        !process.env.TWILIO_PHONE_NUMBER
    ) {
        const error = new Error("Twilio credentials are missing in .env.");
        throw error;
    }

    const to = toSmsNumber(mobile);
    if (!to) {
        throw new Error("Mobile number is not valid.");
    }

    const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
    const from = process.env.TWILIO_PHONE_NUMBER;
    const attempts = [
        { body: message, from, to },
        { body: message, to },
    ];

    if (trialTemplate) {
        attempts.push({ body: trialTemplate, to });
        attempts.push({ body: trialTemplate, from, to });
    }

    let lastError;
    for (const fields of attempts) {
        try {
            let sent = await client.messages.create(fields);
            if (fields.body !== message && sent.sid) {
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    if (sent.body && !/^sms_/.test(sent.body)) {
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    sent = await client.messages(sent.sid).fetch();
                }
            }
            return {
                trial: fields.body !== message,
                delivered: sent.body || "",
            };
        } catch (err) {
            lastError = err;
            console.log("Twilio attempt failed", err.code || "", err.message);
            const authFailure = err.status === 401 || /authenticate/i.test(err.message || "");
            if (authFailure) {
                throw err;
            }
        }
    }

    throw lastError;
}

function invoiceBody(booking, kind) {
    const listing = booking.listing?.title || "your stay";
    const checkIn = booking.checkIn.toLocaleDateString("en-IN");
    const checkOut = booking.checkOut.toLocaleDateString("en-IN");
    const lines = [
        kind === "confirmed" ? "Wanderlust invoice" : "Wanderlust cancellation invoice",
        `Listing: ${listing}`,
        `Guest: ${booking.firstName} ${booking.lastName}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Nights: ${booking.nights}`,
        `Amount: Rs ${booking.amount}`,
        `Status: ${booking.status}`,
    ];

    if (booking.paymentMethod === "cod") {
        lines.push("Payment: Cash on delivery");
    } else if (booking.razorpayPaymentId) {
        lines.push(`Payment: ${booking.razorpayPaymentId}`);
    }
    if (booking.refundId) {
        lines.push(`Refund: ${booking.refundId}`);
    }
    if (kind === "cancelled") {
        lines.push("No payment was captured.");
    }
    if (kind === "refunded") {
        lines.push("Refund has been started.");
    }

    return lines.join(". ");
}

async function datesClash(listingId, checkIn, checkOut) {
    return Booking.findOne({
        listing: listingId,
        status: { $in: ["paid", "confirmed"] },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
    });
}

module.exports.renderBookForm = async (req, res) => {
    const { id } = req.params;
    const stay = await Listing.findById(id).populate("owner");

    if (!stay) {
        req.flash("error", "Listing Does Not Exist!!");
        return res.redirect("/listing");
    }

    const booked = await Booking.find({
        listing: stay._id,
        status: { $in: ["paid", "confirmed"] },
    }).select("checkIn checkOut");

    res.render("bookings/new.ejs", {
        stay,
        booked,
        guest: req.user,
    });
};

module.exports.sendBookingOtp = async (req, res) => {
    const mobile = String(req.body.mobile || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!/^[6-9]\d{9}$/.test(mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            ok: false,
            message: "Enter a valid mobile number and email before sending the OTP.",
        });
    }

    const code = generateOtp();
    req.session.bookingOtp = {
        listingId: req.params.id,
        mobile,
        email,
        code,
        verified: false,
        expiresAt: Date.now() + 5 * 60 * 1000,
    };

    const finish = (payload) => {
        req.session.save(() => res.status(payload.ok ? 200 : 500).json(payload));
    };

    try {
        const result = await sendSms(
            mobile,
            `Your Wanderlust OTP is ${code}. It expires in 5 minutes.`,
            "sms_2fa"
        );
        if (result.trial) {
            const smsCode = String(result.delivered).match(/\b(\d{4,8})\b/);
            if (!smsCode) {
                delete req.session.bookingOtp;
                return finish({
                    ok: false,
                    message: "SMS gaya, lekin usme OTP code nahi mila. Twilio trial template check karo.",
                });
            }
            req.session.bookingOtp.code = smsCode[1];
        }
        finish({
            ok: true,
            message: "OTP mobile par chala gaya. SMS wala code likho, phir Verify OTP dabao.",
        });
    } catch (err) {
        console.log("Twilio OTP failed", err.message);
        delete req.session.bookingOtp;
        finish({ ok: false, message: err.message });
    }
};

module.exports.verifyBookingOtp = async (req, res) => {
    const mobile = String(req.body.mobile || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.otp || "").trim();
    const mismatch = otpError(req.session.bookingOtp, {
        listingId: req.params.id,
        mobile,
        email,
        code,
    });

    if (mismatch) {
        if (req.session.bookingOtp) {
            req.session.bookingOtp.verified = false;
        }
        return req.session.save(() => res.status(400).json({ ok: false, message: mismatch }));
    }

    req.session.bookingOtp.verified = true;
    req.session.save(() => res.json({ ok: true, message: "OTP sahi hai." }));
};

module.exports.createBooking = async (req, res) => {
    const { id } = req.params;
    const stay = await Listing.findById(id);

    if (!stay) {
        req.flash("error", "Listing Does Not Exist!!");
        return res.redirect("/listing");
    }

    const details = req.body.booking;
    if (!req.session.bookingOtp?.verified) {
        req.flash("error", "Pehle Verify OTP dabao.");
        return res.redirect(`/listing/${id}/book`);
    }

    const mismatch = otpError(req.session.bookingOtp, {
        listingId: id,
        mobile: details.mobile,
        email: details.email,
        code: details.otp,
    });

    if (mismatch) {
        req.flash("error", mismatch);
        return res.redirect(`/listing/${id}/book`);
    }

    const { checkIn, checkOut, nights } = stayFrom(details);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || nights < 1) {
        req.flash("error", "Choose a check-out date after the check-in date.");
        return res.redirect(`/listing/${id}/book`);
    }

    if (checkIn < today) {
        req.flash("error", "Check-in date cannot be in the past.");
        return res.redirect(`/listing/${id}/book`);
    }

    const clash = await datesClash(stay._id, checkIn, checkOut);
    if (clash) {
        req.flash("error", "Those dates are already booked. Pick different dates.");
        return res.redirect(`/listing/${id}/book`);
    }

    const amount = nights * stay.price;
    const booking = new Booking({
        listing: stay._id,
        user: req.user._id,
        owner: stay.owner,
        firstName: details.firstName,
        lastName: details.lastName,
        mobile: details.mobile,
        email: details.email,
        checkIn,
        checkOut,
        nights,
        pricePerNight: stay.price,
        amount,
        paymentMethod: "cod",
        status: "confirmed",
    });

    await booking.save();
    delete req.session.bookingOtp;
    booking.listing = stay;

    try {
        await sendSms(booking.mobile, invoiceBody(booking, "confirmed"), "sms_order_confirmation");
    } catch (err) {
        console.log("Twilio invoice failed", err.message);
    }

    req.flash("success", "Booking confirmed. Pay cash on delivery. Invoice sent by SMS.");
    res.redirect("/bookings");
};

module.exports.index = async (req, res) => {
    const made = await Booking.find({ user: req.user._id })
        .populate("listing")
        .populate("owner")
        .sort({ createdAt: -1 });

    const received = await Booking.find({ owner: req.user._id })
        .populate("listing")
        .populate("user")
        .sort({ createdAt: -1 });

    res.render("bookings/index.ejs", { made, received });
};

module.exports.cancelBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate("listing");

    if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/bookings");
    }

    const isGuest = booking.user.equals(req.user._id);
    const isOwner = booking.owner.equals(req.user._id);

    if (!isGuest && !isOwner) {
        req.flash("error", "You cannot cancel this booking.");
        return res.redirect("/bookings");
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
        req.flash("error", "This booking is already closed.");
        return res.redirect("/bookings");
    }

    booking.status = "cancelled";
    await booking.save();

    let sent = false;
    try {
        sent = await sendSms(booking.mobile, invoiceBody(booking, "cancelled"), "sms_account_alerts");
    } catch (err) {
        console.log("Twilio invoice failed", err.message);
    }

    req.flash("success", sent
        ? "Booking cancelled. Cancellation invoice sent by SMS."
        : "Booking cancelled. Twilio could not send the invoice SMS.");
    res.redirect("/bookings");
};

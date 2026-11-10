const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapasync");
const ExpressError = require("../utils/Expresserror");
const { bookingSchema } = require("../schema");
const { isLoggedIn } = require("../middleware");
const bookingController = require("../controllers/booking");

const validateBooking = (req, res, next) => {
    const { error } = bookingSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

router.get(
    "/listing/:id/book",
    isLoggedIn,
    wrapAsync(bookingController.renderBookForm)
);

router.post(
    "/listing/:id/otp",
    isLoggedIn,
    wrapAsync(bookingController.sendBookingOtp)
);

router.post(
    "/listing/:id/otp/verify",
    isLoggedIn,
    wrapAsync(bookingController.verifyBookingOtp)
);

router.post(
    "/listing/:id/book",
    isLoggedIn,
    validateBooking,
    wrapAsync(bookingController.createBooking)
);

router.get(
    "/bookings",
    isLoggedIn,
    wrapAsync(bookingController.index)
);

router.post(
    "/bookings/:id/cancel",
    isLoggedIn,
    wrapAsync(bookingController.cancelBooking)
);

module.exports = router;

const express = require("express");
const router = express.Router({ mergeParams: true });
const { reviewSchema } = require("../schema.js");
const Review = require("../models/review.js");
const review = require("../models/review.js");
const wrapAsync = require("../utils/wrapasync");
const ExpressError = require("../utils/Expresserror");
const listing = require("../models/listing");
const { isLoggedIn, isReviewAuthor } = require("../middleware.js");
const reveiwController=require("../controllers/review.js");
const validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

// POST REVIEW ROUTE
router.post(
    "/",
    isLoggedIn,
    validateReview,
    wrapAsync(reveiwController.addReview)
);

// DELETE REVIEW ROUTE
router.delete(
    "/:reviewsId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reveiwController.eleteReview)
);

module.exports = router;
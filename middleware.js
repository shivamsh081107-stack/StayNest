const listing = require("./models/listing");
const review = require("./models/review");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        console.log("Saving redirect URL:", req.originalUrl);
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "you must be logged in");
        return res.redirect("/login");
    }

    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    console.log("Session redirect URL:", req.session.redirectUrl);

    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    let Listing = await listing.findById(id);

    if (!Listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the owner of this listing");
        return res.redirect(`/listing/${id}`);
    }

    next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
    let { id, reviewsId } = req.params;

    let Review = await review.findById(reviewsId);

    if (!Review) {
        req.flash("error", "Review does not exist");
        return res.redirect(`/listing/${id}`);
    }

    if (!Review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "you are not the author of this review");
        return res.redirect(`/listing/${id}`);
    }

    next();
};
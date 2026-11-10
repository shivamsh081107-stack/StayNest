const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapasync");
const ExpressError = require("../utils/Expresserror");
const { listingSchema } = require("../schema.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listing.js");

const multer = require("multer");
const { storage } = require("../Cloudconfig.js");

const upload = multer({ storage });


// ================= VALIDATE LISTING =================

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details
            .map((el) => el.message)
            .join(",");

        throw new ExpressError(400, errMsg);
    }

    next();
};


// ================= ALL LISTINGS =================

router
    .route("/")
    .get(
        wrapAsync(listingController.index)
    )
    .post(
        isLoggedIn,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.createListing)
    );


// ================= NEW LISTING =================

router.get(
    "/new",
    isLoggedIn,
    listingController.renderNewForm
);


// ================= SINGLE LISTING =================

router
    .route("/:id")
    .get(
        wrapAsync(listingController.showListing)
    )
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isLoggedIn,
        isOwner,
        wrapAsync(listingController.deleteListing)
    );


// ================= EDIT LISTING =================

router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.editListing)
);


module.exports = router;
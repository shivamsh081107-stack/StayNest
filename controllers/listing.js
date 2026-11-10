const listing = require("../models/listing");
const ExpressError = require("../utils/Expresserror");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

const geocodingClient = mbxGeocoding({
    accessToken: mapToken
});

const CATEGORY_BY_TITLE = {
    "Cozy Beachfront Cottage": ["Trending", "Beaches"],
    "Modern Loft in Downtown": ["Iconic Cities", "Rooms"],
    "Mountain Retreat": ["Trending", "Mountains"],
    "Historic Villa in Tuscany": ["Rooms", "Trending"],
    "Secluded Treehouse Getaway": ["Camping"],
    "Beachfront Paradise": ["Beaches"],
    "Rustic Cabin by the Lake": ["Mountains"],
    "Luxury Penthouse with City Views": ["Iconic Cities", "Trending"],
    "Ski-In/Ski-Out Chalet": ["Arctic", "Mountains"],
    "Safari Lodge in the Serengeti": ["Farms"],
    "Historic Canal House": ["Iconic Cities"],
    "Private Island Retreat": ["Beaches", "Trending"],
    "Charming Cottage in the Cotswolds": ["Farms", "Rooms"],
    "Historic Brownstone in Boston": ["Iconic Cities"],
    "Beachfront Bungalow in Bali": ["Beaches"],
    "Mountain View Cabin in Banff": ["Mountains"],
    "Art Deco Apartment in Miami": ["Iconic Cities", "Beaches"],
    "Tropical Villa in Phuket": ["Amazing pools", "Beaches"],
    "Historic Castle in Scotland": ["Castles", "Trending"],
    "Desert Oasis in Dubai": ["Iconic Cities"],
    "Rustic Log Cabin in Montana": ["Mountains", "Camping"],
    "Beachfront Villa in Greece": ["Beaches"],
    "Eco-Friendly Treehouse Retreat": ["Camping"],
    "Historic Cottage in Charleston": ["Rooms"],
    "Modern Apartment in Tokyo": ["Iconic Cities"],
    "Lakefront Cabin in New Hampshire": ["Mountains"],
    "Luxury Villa in the Maldives": ["Amazing pools", "Beaches", "Trending"],
    "Ski Chalet in Aspen": ["Arctic", "Mountains"],
    "Secluded Beach House in Costa Rica": ["Beaches"],
};

function categoriesFor(item) {
    if (CATEGORY_BY_TITLE[item.title]) {
        return CATEGORY_BY_TITLE[item.title];
    }

    const text = `${item.title} ${item.description} ${item.location}`.toLowerCase();
    const cats = [];

    if (/castle/.test(text)) cats.push("Castles");
    if (/ski|arctic|snow/.test(text)) cats.push("Arctic");
    if (/beach|island|coast/.test(text)) cats.push("Beaches");
    if (/mountain|cabin|lake/.test(text)) cats.push("Mountains");
    if (/pool/.test(text)) cats.push("Amazing pools");
    if (/camp|treehouse|safari/.test(text)) cats.push("Camping");
    if (/farm|cottage/.test(text)) cats.push("Farms");
    if (/city|loft|apartment|downtown|penthouse/.test(text)) cats.push("Iconic Cities");
    if (/room|villa|house|bungalow|chalet/.test(text)) cats.push("Rooms");
    if ((item.price || 0) >= 2500) cats.push("Trending");
    if (!cats.length) cats.push("Rooms");

    return [...new Set(cats)];
}

// ================= INDEX =================

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports.index = async (req, res) => {
    const search = String(req.query.q || "").trim();
    const query = search
        ? { title: { $regex: escapeRegex(search), $options: "i" } }
        : {};
    const alllisting = await listing.find(query);
    const countries = [...new Set(alllisting.map((item) => item.country).filter(Boolean))].sort();

    res.render("listing/index.ejs", {
        alllisting,
        countries,
        categoriesFor,
        search,
    });
};


// ================= NEW FORM =================

module.exports.renderNewForm = (req, res) => {
    res.render("listing/new.ejs");
};


// ================= CREATE LISTING =================

module.exports.createListing = async (req, res, next) => {

    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
    }).send();

    console.log("LOCATION:", req.body.listing.location);
    console.log("MAPBOX RESPONSE:", response.body.features[0]);

    let {
        title,
        description,
        price,
        country,
        location
    } = req.body.listing;

    const newlisting = new listing({
        title,
        description,

        image: {
            filename: req.file.filename,
            url: req.file.path
        },

        price,
        country,
        location
    });

    newlisting.owner = req.user._id;

    newlisting.geometry = {
        type: "Point",
        coordinates: response.body.features[0].geometry.coordinates
    };

    console.log("GEOMETRY BEFORE SAVE:", newlisting.geometry);

    await newlisting.save();

    req.flash("success", "New listing created");

    res.redirect("/listing");
};


// ================= SHOW LISTING =================

module.exports.showListing = async (req, res) => {

    let { id } = req.params;

    const FListing = await listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("owner");

    if (!FListing) {
        req.flash(
            "error",
            "Listing Does Not Exist!!"
        );

        return res.redirect("/listing");
    }

    // Fix old listings having empty coordinates
    if (
        !FListing.geometry ||
        !FListing.geometry.coordinates ||
        FListing.geometry.coordinates.length === 0
    ) {

        let response = await geocodingClient.forwardGeocode({
            query: FListing.location,
            limit: 1
        }).send();

        if (response.body.features.length > 0) {

            FListing.geometry = {
                type: "Point",
                coordinates: response.body.features[0].geometry.coordinates
            };

            await FListing.save();
        }
    }

    res.render("listing/show.ejs", {
        FListing
    });
};


// ================= EDIT FORM =================

module.exports.editListing = async (req, res) => {

    let { id } = req.params;

    const FListing = await listing.findById(id);

    if (!FListing) {
        req.flash(
            "error",
            "Listing Does Not Exist!!"
        );

        return res.redirect("/listing");
    }

    return res.render("listing/edit.ejs", {
        FListing
    });
};


// ================= UPDATE LISTING =================

module.exports.updateListing = async (req, res) => {

    if (!req.body.listing) {
        throw new ExpressError(
            400,
            "Send valid data for listing"
        );
    }

    let { id } = req.params;

    let updatedListing = await listing.findByIdAndUpdate(
        id,
        {
            ...req.body.listing
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (req.file) {

        let url = req.file.path;
        let filename = req.file.filename;

        updatedListing.image = {
            url,
            filename
        };

        await updatedListing.save();
    }

    req.flash(
        "success",
        "Listing Updated!!"
    );

    res.redirect(`/listing/${id}`);
};


// ================= DELETE LISTING =================

module.exports.deleteListing = async (req, res) => {

    let { id } = req.params;

    await listing.findByIdAndDelete(id);

    req.flash(
        "success",
        "Listing Deleted!!"
    );

    res.redirect("/listing");
};
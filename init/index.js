if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const initdata = require("./data");
const listing = require("../models/listing.js");
const User = require("../models/user.js");

const geocodingClient = mbxGeocoding({
    accessToken: process.env.MAP_TOKEN,
});

async function geometryFor(place) {
    try {
        const response = await geocodingClient
            .forwardGeocode({
                query: place,
                limit: 1,
            })
            .send();

        const feature = response.body.features[0];
        if (feature) {
            return {
                type: "Point",
                coordinates: feature.geometry.coordinates,
            };
        }
    } catch (err) {
        console.log("geocode failed for", place);
    }

    return {
        type: "Point",
        coordinates: [77.209, 28.6139],
    };
}

async function main() {
    await mongoose.connect(process.env.ATLAS_DBURL);
    console.log("connection succesfull");

    let owner = await User.findOne();
    if (!owner) {
        const user = new User({
            email: "demo@wanderlust.com",
            username: "demo",
        });
        owner = await User.register(user, "demo1234");
        console.log("demo user created");
    }

    await listing.deleteMany({});

    const data = [];
    for (const obj of initdata.data) {
        data.push({
            ...obj,
            owner: owner._id,
            geometry: await geometryFor(`${obj.location}, ${obj.country}`),
        });
    }

    await listing.insertMany(data);
    console.log(`data was initialized: ${data.length} listings`);
    await mongoose.connection.close();
}

main().catch((err) => {
    console.log(err);
    process.exit(1);
});

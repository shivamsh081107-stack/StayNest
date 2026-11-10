const joi=require("joi");
module.exports.listingSchema=joi.object({
    listing: joi.object({
        title:joi.string().required(),
        description:joi.string().required(),
        location:joi.string().required(),
        country:joi.string().required(),
        price:joi.number().required().min(0),
        image: joi.string().allow("",null)
    }).required()
})
module.exports.bookingSchema=joi.object({
    booking: joi.object({
        firstName: joi.string().trim().required(),
        lastName: joi.string().trim().required(),
        mobile: joi.string().trim().pattern(/^[6-9]\d{9}$/).required(),
        email: joi.string().trim().email().required(),
        otp: joi.string().trim().pattern(/^\d{6}$/).required(),
        paymentMethod: joi.string().valid("cod").required(),
        checkIn: joi.string().required(),
        checkOut: joi.string().required(),
    }).required(),
});
module.exports.reviewSchema=joi.object({
    review:joi.object({
  rating:joi.number().required().min(1).max(5),
  comment:joi.string().required(),
    }).required(),
})
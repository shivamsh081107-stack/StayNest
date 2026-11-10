const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: "listing",
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        mobile: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
        },
        checkIn: {
            type: Date,
            required: true,
        },
        checkOut: {
            type: Date,
            required: true,
        },
        nights: {
            type: Number,
            required: true,
            min: 1,
        },
        pricePerNight: {
            type: Number,
            required: true,
            min: 0,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        paymentMethod: {
            type: String,
            enum: ["cod"],
            default: "cod",
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "paid", "cancelled", "refunded"],
            default: "pending",
        },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        razorpaySignature: String,
        refundId: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);

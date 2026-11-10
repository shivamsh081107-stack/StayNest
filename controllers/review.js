const Review=require("../models/review");
const listing=require("../models/listing");
module.exports.addReview=async (req, res) => {
    let Flisting = await listing.findById(req.params.id);

    let newReview = new Review(req.body.review);

    newReview.author = req.user._id;

    Flisting.reviews.push(newReview);

    await newReview.save();
    await Flisting.save();

    req.flash("success", " New Review Created!!");

    res.redirect(`/listing/${Flisting._id}`);
}
module.exports.deleteReview=async (req, res, next) => {

    let { id, reviewsId } = req.params;

    await listing.findByIdAndUpdate(
        id,
        { $pull: { reviews: reviewsId } }
    );

    await Review.findByIdAndDelete(reviewsId);

    req.flash("success", " Review Deleted!!");

    res.redirect(`/listing/${id}`);
}
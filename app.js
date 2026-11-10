if(process.env.NODE_ENV!="production"){
    require('dotenv').config();
}

const express=require("express");
const app=express();
const port=process.env.PORT || 3050;
const path=require("path");
const methodoverride=require("method-override");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodoverride("_method"));

const mongoose = require('mongoose');
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/Expresserror");

const listings=require("./routes/listing.js");
const bookingRouter=require("./routes/booking.js");
const reviewrouter=require("./routes/review.js");

const session=require("express-session");
const flash=require("connect-flash");
const { MongoStore } = require("connect-mongo");
const passport=require("passport");
const localStrategy=require("passport-local");
const User =require("./models/user.js");
const userRouter=require("./routes/user.js");

const dbUrl=process.env.ATLAS_DBURL;

app.engine('ejs', ejsMate);

main().then((res)=>{
    console.log("connection succesfull");
})
.catch(err => console.log(err));

async function main() {
    await mongoose.connect(dbUrl);
}

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
});

store.on("error",(err)=>{
    console.log("error in mongo session store",err);
});

const sessionOption={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:new Date(Date.now()+7*24*60*60*1000),
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    },
};

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

/* 
app.get("/demouser",async(req,res)=>{
    let fakeuser=new User({
        email:"student@gmail.com",
        username:"delta-student"
    });

    await User.register(fakeuser,"helloworld");
});
*/

app.get("/", (req, res) => {
    res.redirect("/listing");
});

app.use("/listing",listings);
app.use("/", bookingRouter);

app.use("/listing/:id/reviews",reviewrouter);

app.use("/",userRouter);

app.use((req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
});

app.use((err,req,res,next)=>{
    if (res.headersSent) {
        console.error(err);
        return;
    }

    let{
        statuscode=500,
        message="Something went wrong"
    }=err;

    res.status(statuscode).render("listing/error.ejs",{message});
});

app.listen(port, "0.0.0.0", () => {
    console.log(`app is listening on port ${port}`);
});
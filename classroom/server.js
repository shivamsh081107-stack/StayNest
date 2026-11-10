const express=require("express");
const app=express();
const session=require("express-session");
const cookieParser=require("cookie-parser");
const flash=require("connect-flash");
const path=require("path");
app.use(cookieParser());
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
const sessionOption={
    secret:"mysupersecretstring",
    resave:false,
    saveUninitialized:true,
};
app.use(session(sessionOption));
app.use(flash());
app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    next();
})
app.get("/register",(req,res)=>{
    let {name="anonymous"}=req.query;
    req.session.name=name;
    if(name=="anonymous"){
        req.flash("error","user not registered");
    } else{
        req.flash("success","user registered successfully");
    }
    res.redirect("/hello");
})
app.get("/hello",(req,res)=>{
    res.render("page.ejs",{name:req.session.name});
})
/* app.get("/reqcount",(req,res)=>{
    if(req.session.count){
        req.session.count++;
    } else{
        req.session.count=1;
    }
    res.send(`you sent a request ${req.session.count} times`);
}) */
app.get("/test",(req,res)=>{
    res.send("test succesfull!");
});
app.listen(3050,()=>{
    console.log("server is listening to 3050");
})
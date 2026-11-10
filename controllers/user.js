const User=require("../models/user");

module.exports.loginForm=(req,res)=>{

    res.render("users/login.ejs");

}

module.exports.login=async(req,res)=>{

    req.flash("success","Welcome back to wanderlust ");

    const redirectUrl = res.locals.redirectUrl || "/listing";

    res.redirect(redirectUrl);

}

module.exports.logout=(req,res,next)=>{

    req.logout((err)=>{

        if(err){

            return next(err);

        }

        req.flash("success","you are logged out! ");

        res.redirect("/listing");

    })

}

module.exports.singupForm=(req,res)=>{

    res.render("users/signup.ejs");

}

module.exports.signup=async(req,res,next)=>{

    try{

        let{username,email,password}=req.body;

        const newUser=new User({email,username});

        const registeredUser=await User.register(newUser,password);

        req.login(registeredUser,(err)=>{

            if(err){

                return next(err)

            }

            req.flash("success","welcome to Wanderlust");

            res.redirect("/listing");

        })

    } catch(err){

       req.flash("error",err.message);

       res.redirect("/signup");

    }

}
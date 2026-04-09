const ExpressError = require("./utils/ExpressError.js");
const Project = require("./models/project.js");
const User = require("./models/user.js");
const Material = require("./models/inventory.js");
const { projectSchema, materialSchema } = require("./schema.js");

module.exports.validateProject = (req, res, next) => {
  let { error } = projectSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.validateMaterial = (req, res, next) => {
  let { error } = materialSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.isLoggedIn = (req, res, next) => {
  if(!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to go forward");
    return res.redirect("/login");
  }
  next();
};

module.exports.isOwner = async(req, res, next) => {
  if(!res.locals.currUser.role == ("Admin" || "Project_Manager")) {
    req.flash("error", "You are not Admin or Project Manager");
    return res.redirect("/project");
  }
  next();
};

module.exports.isAccess = async(req, res, next) => {
  if(!res.locals.currUser.role == ("Admin" || "Site_Manager")) {
    req.flash("error", "You are not Admin or Site Manager");
    return res.redirect("/inventory/material");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if(req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};
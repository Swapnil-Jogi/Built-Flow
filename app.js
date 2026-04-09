if(process.env.NODE_ENV != "production") {
  require('dotenv').config();
}

const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const multer  = require('multer');
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const wrapAsync = require("./utils/wrapAsync.js");
const { validateProject, validateMaterial } = require("./middleware.js");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user.js");
const { saveRedirectUrl } = require("./middleware.js");
const { isLoggedIn, isOwner, isAccess } = require("./middleware.js");

const MONGO_URL = process.env.Mongo_Url;

main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
    await mongoose.connect(MONGO_URL);
}


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.engine("ejs", ejsMate);
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));

const Project = require("./models/project.js");
const Material = require("./models/inventory.js");

const sessionOptions = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user; 
  next();
});

//Start Routes
app.get("/", (req, res) => {
    res.render("frontend/index.ejs");
});

app.get("/dashboard", (req, res) => {
    res.render("frontend/dashboard.ejs");
});

//Projects Routes
app.get("/project", isLoggedIn, wrapAsync(async(req, res) => {
    const allProjects = await Project.find({});
    res.render("frontend/projects/index.ejs", { allProjects });
}));

app.get("/project/new", (req, res) => {
    res.render("frontend/projects/new.ejs");
});

app.post("/project", isOwner, upload.single("Project[image]"), validateProject, wrapAsync(async(req, res) => {
    let url = req.file.path;
    let filename = req.file.filename;
    let newProject = new Project(req.body.Project);

    newProject.image = { url, filename };

    let saveProject = await newProject.save();
    console.log(saveProject);
    req.flash("success", "New Project is created");
    res.redirect("/project");
}));

app.get("/project/:id", wrapAsync(async(req, res) => {
    let { id } = req.params;
    const project = await Project.findById(id);
    if(!project) {
      req.flash("error", "Project you requested for does not exist");
      return res.redirect("/project");
    }
    res.render("frontend/projects/show.ejs", { project });
}));

app.get("/project/:id/edit", wrapAsync(async(req, res) => {
    let { id } = req.params;
    const project = await Project.findById(id);

    if(!project) {
      req.flash("error", "Project you requested for does not exist");
      return res.redirect("/project");
    }

    let originalImageUrl = project.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("frontend/projects/edit.ejs", { project, originalImageUrl });
}));

app.put("/project/:id", isOwner, upload.single("Project[image]"), validateProject, wrapAsync(async(req, res) => {
    let { id } = req.params;
    let project = await Project.findByIdAndUpdate(id, {...req.body.Project});

    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        project.image = { url, filename };

        await project.save();
    }
    req.flash("success", "Project Updated");
    res.redirect(`/project/${id}`);
}));

app.delete("/project/:id", isOwner, wrapAsync(async(req, res) => {
    let { id } = req.params;
    let deleteProject = await Project.findByIdAndDelete(id);
    console.log(deleteProject);
    req.flash("success", "Project Deleted!");
    res.redirect("/project");
}));


//Users Routes
app.get("/signup", (req, res) => {
  res.render("frontend/users/signup.ejs");
});

app.post("/signup", wrapAsync(async(req, res) => {
  try {
        let {username, email, password, role} = req.body;
        const newUser = new User({email, username, role});
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Built-Flow!");
            res.redirect("/dashboard");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}));

app.get("/login", (req, res) => {
  res.render("frontend/users/login.ejs");
});

app.post("/login", saveRedirectUrl, passport.authenticate("local", { failureRedirect: '/login', failureFlash: true}), wrapAsync(async(req, res) => {
  req.flash("success", "Welcome to Built-Flow!");
  let redirectUrl = res.locals.redirectUrl || "/dashboard";
  res.redirect(redirectUrl);
}));

app.get("/logout", (req, res) => {
  req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You Logged out !");
        res.redirect("/dashboard");
    });
});


//Inventory Routes
app.get("/inventory/dashboard", isLoggedIn, wrapAsync(async(req, res) => {
  const count = await Material.countDocuments();
  const totalStock = await Material.aggregate([{ $group: {_id: null, qnt: { $sum: "$stock" }}}]);
  const Total = totalStock[0].qnt;
  const rev = await Material.aggregate([{ $group: {_id: null, rev: { $sum: "$price"}}}]);
  const revenue = rev[0].rev;
  const allmaterial = await Material.find({}, "name");
  res.render("frontend/inventory/dashboard.ejs", { count, Total, revenue, allmaterial });
}));

app.get("/inventory/material", isLoggedIn, wrapAsync(async(req, res) => {
  const allMaterials = await Material.find({});
  res.render("frontend/inventory/materials/index.ejs", { allMaterials });
}));

app.get("/inventory/material/new", (req, res) => {
  res.render("frontend/inventory/materials/new.ejs");
});

app.post("/inventory/material", isAccess, validateMaterial, wrapAsync(async(req, res) => {
  let newMaterial = new Material(req.body.Material);
  let saveMaterial = await newMaterial.save();
  console.log(saveMaterial);
  req.flash("success", "New Material is Added");
  res.redirect("/inventory/material");
}));

app.get("/inventory/material/order/:id", wrapAsync(async(req, res) => {
  let { id } = req.params;
  const material = await Material.findById(id);
  res.render("frontend/inventory/materials/placeorder.ejs", { material });
}));

app.get("/inventory/material/:id/edit", wrapAsync(async(req, res) => {
  let { id } = req.params;
  const material = await Material.findById(id);
  if(!material) {
    req.flash("error", "material you requested for does not exist");
    return res.redirect("/inventory/material");
  }
  res.render("frontend/inventory/materials/edit.ejs", { material });
}));

app.put("/inventory/material/:id", isAccess, validateMaterial, wrapAsync(async(req, res) => {
  let { id } = req.params;
  let material = await Material.findByIdAndUpdate(id, {...req.body.Material});

  req.flash("success", "Material Updated");
  res.redirect("/inventory/material");
}));

app.delete("/inventory/material/:id", isAccess, wrapAsync(async(req, res) => {
  let { id } = req.params;
  let deleteMaterial = await Material.findByIdAndDelete(id);
  console.log(deleteMaterial);
  req.flash("success", "Material Deleted!");
  res.redirect("/inventory/material");
}));

//Inventory Order: 
app.get("/inventory/order", isLoggedIn, wrapAsync(async(req, res) => {
  const allMaterials = await Material.find({});
  if(!allMaterials) {
    req.flash("error", "You don't place any order");
  }
  res.render("frontend/inventory/orders/order.ejs", { allMaterials });
}));

//Inventory Payment: 
app.get("/inventory/payment", isLoggedIn, (req, res) => {
  res.render("frontend/inventory/payments/payment.ejs");
});

//Contact Us
app.get("/contactus", (req, res) => {
  res.render("frontend/contactus.ejs");
});

//Learn More
app.get("/learnmore", (req, res) => {
  res.render("frontend/learnmore.ejs");
});

app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  let { statusCode=500, message="Something went wrong" } = err;
  res.status(statusCode).render("error.ejs", { message });
  // res.status(statusCode).send(message);
});

app.listen(port, () => {
    console.log(`app is listening on ${port}`);
});
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate'); //ejs-mate creates reusable code that will meet our goal to reduce duplicating code.
const session = require('express-session'); //session is a middleware that will allow us to store data on the client side.
const flash = require('connect-flash'); //allows the developers to send a message whenever a user is redirecting to a specified web-page. 
const ExpressError = require('./utils/ExpressError'); //ExpressError is a class that will allow us to create a new error object.
const methodOverride = require('method-override'); //method-override allows us to use PUT and DELETE requests.
const passport = require('passport'); //passport is a middleware that will allow us to authenticate users.
const LocalStrategy = require('passport-local'); //passport-local is a strategy that will allow us to authenticate users using a username and password.
const User = require('./models/user');
const userRoutes = require('./routes/users');
const MongoDBStore = require("connect-mongo"); //connect-mongo is a package that will allow us to store our session data in our MongoDB database.
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/hackathon'; //dbUrl is a variable that will store the database url. If the environment variable DB_URL is not defined, then the database url will be set to the local database url.

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true, 
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = MongoDBStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash()); ////allows us to send a message to the user whenever they are redirected to a new page.

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
//write all the routes here
app.use('/', userRoutes);

app.get('/', (req, res) => {
    res.render('home');
})

//to check error
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Hii 🚀 Serving on port ${port}`)
})
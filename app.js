// Library dependencies
const express        = require('express'),                // server
      app            = express(),                         // instantiate the server
    //   bodyParser     = require('body-parser'),            // helps parse requests --> deprecated, now this module is built-in to express.
	  mongoose       = require('mongoose'),               // for using mongoDB with javascript/node
	  mongoSanitize  = require('express-mongo-sanitize'), // for sanitizing inputs
      passport       = require('passport'),               // user authentication framework
      LocalStrategy  = require('passport-local'),         // connects node app to passport
	  methodOverride = require('method-override'),        // lets us redefine HTML form GET and POST methods as PUT, DELETE, etc
      path           = require("path"),                   
	  favicon        = require("serve-favicon");          //
require('dotenv').config();                               // allows environment variables to be read from a .env file

// Mongoose config

mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(process.env.DATABASEURL, {
	user: process.env.DB_USER,
	pass: process.env.DB_PASS,
	useNewUrlParser: true,
	useCreateIndex: true
}).catch(err =>{
	console.log("Error: "+ err.message);
});

// ======
// Models
// ======

const User = require('./api/user/user');

// ================================
// Express (app = express()) config
// ================================

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(methodOverride("_method"));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Favicon handling
app.use(favicon(path.join(__dirname, 'public/assets', 'magnova_favicon.png')));

// ======================
// Passport configuration
// ======================

app.use(require('express-session')({
	secret: "Redacted is a lesbian icon",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.clientIP = req.headers["x-forwarded-for"]?.split(',').shift() || req.socket?.remoteAddress;
	next();
});

// Change Views directory dynamically (for if I want to add in the kanban stuff) (i don't understand how this works yet)
app.use(function(req, res, next){
	if(req.path.slice(0, 7) === "/kanban") app.set('views', path.join(__dirname, '/views/kanban'));
	else app.set('views', path.join(__dirname, '/views'));
	next();
});

// ====== 
// Routes
// ======

const indexRoutes   = require('./routes/index'),
	  wikiRoutes	= require('./routes/wiki'),
	  issueRoutes	= require('./routes/issue'),
	  authRoutes	= require('./routes/auth'),
	  userRoutes	= require("./routes/users"),
      talkRoutes    = require("./routes/talk");


app.use('/', indexRoutes);
app.use('/wiki', wikiRoutes);
app.use('/issue', issueRoutes);
app.use('/auth', authRoutes),
app.use("/users", userRoutes);
app.use("/talk", talkRoutes);

// wild card route: 
app.all('*', (req, res, next) => {
	res.status(404).send(`Can't find ${req.originalUrl} on this Server!`);
	next();
});



let port = process.env.PORT || 3000;
let host = "0.0.0.0";
app.listen(port, host, () => {
	console.log(`Magnova server listening on port ${port}`);
});

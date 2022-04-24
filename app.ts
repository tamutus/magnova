// side-effect imports
//@ts-ignore
import 'dotenv/config';                             // load env from .env files

// library imports
import express from 'express';                      // server
import favicon from 'serve-favicon';                // presumably serves the favicon
import {
  Strategy as LocalStrategy,                        // connects app to passport
} from 'passport-local';
import methodOverride from 'method-override';       // lets us redefine HTML form GET and POST
                                                    //   as PUT, DELETE, etc
import mongoose from 'mongoose';                    // mongoDB driver
import mongoSanitize from 'express-mongo-sanitize'; // sanitizes inputs
import passport from 'passport';                    // user auth framework
import path from 'path';                            // convenient, cross platform paths

// local imports
import { expectEnv } from '@/util';                 // crash if env isn't present

// models
import User from '@/api/user/user';

// routes
import indexRoutes from './routes/index';
import wikiRoutes	from './routes/wiki';
import issueRoutes from './routes/issue';
import authRoutes	from './routes/auth';
import userRoutes	from './routes/users';
import talkRoutes from './routes/talk';
import projectRoutes from './routes/project';
import taskRoutes from './routes/task';
import locationRoutes from './routes/locations';

// ===============
// Mongoose config
// ===============

mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(expectEnv('DATABASEURL'), {
	user: expectEnv('DB_USER'),
	pass: expectEnv('DB_PASS'),
	useNewUrlParser: true,
	useCreateIndex: true
});

// ================================
// Express (app = express()) config
// ================================

const app = express();

// Limit increased from default of 1Mb to 5 to handle geojson geometry.
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({extended: true, limit: '5mb'}));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Favicon handling
app.use(favicon(path.join(__dirname, 'public/assets', 'magnova_favicon.png')));

// ======================
// Passport configuration
// ======================

app.use(require('express-session')({
	secret: expectEnv('SESSION_SECRET'),
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// The authenticate, serializeUser, and deserializeUser methods are added by
// an untyped library plugin
//@ts-ignore
passport.use(new LocalStrategy(User.authenticate()));
//@ts-ignore
passport.serializeUser(User.serializeUser());
//@ts-ignore
passport.deserializeUser(User.deserializeUser());

// Exposes session details to the ejs rendering engine
app.use((req, res, next) => {
	res.locals.currentUser = req.user;
  res.locals.currentURL = req.url;
  res.locals.currentHost = req.get('host');
  const xff = req.headers['x-forwarded-for'];
	res.locals.clientIP = (Array.isArray(xff) ? xff[0] : xff) || req.socket?.remoteAddress;
	next();
});
// For CORS
app.use((_req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
// Change Views directory dynamically (for if I want to add in the kanban stuff) (i don't understand how this works yet)
// app.use(function(req, res, next){
// 	if(req.path.slice(0, 7) === '/kanban') app.set('views', path.join(__dirname, '/views/kanban'));
// 	else app.set('views', path.join(__dirname, '/views'));
// 	next();
// });

// ======
// Routes
// ======

app.use('/', indexRoutes);
app.use('/wiki', wikiRoutes);
app.use('/issue', issueRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/talk', talkRoutes);
app.use('/project', projectRoutes);
app.use('/task', taskRoutes);
app.use('/locations', locationRoutes);

// wild card route: 
app.all('*', (req, res, next) => {
	res.status(404).send(`Can't find ${req.originalUrl} on this Server!`);
	next();
});

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
	console.log(`Magnova server listening on port ${port}`);
});


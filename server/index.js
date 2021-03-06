"use strict";
/**
 * Created by darryl on 2016-11-23.
 */

// ---- REQUIRES ---- //

// HTTP server using Express to handle incoming requests
let express         = require('express');
let path            = require('path');
let logger          = require('morgan');        // helps log all requests
let cookieParser    = require('cookie-parser'); // for handling cookies
let bodyParser      = require('body-parser');   // for parsing request URL
let session         = require('express-session');
let MongoDBStore    = require('connect-mongodb-session')(session);

let api = require('./app/chord_api').router;


// ---- CONSTANTS ----//

const cookieSecret = "myTotallySecretSecret";



// ---- SETUP ---- //

let app = express();

// Setup session store backend
let store = new MongoDBStore({
        uri: 'mongodb://localhost:27017/chordpro',
        collection: 'mySessions'
    });

// set up logger and parsers
app.use(logger('dev')); // set up logger and parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(cookieSecret));

// Setup session
app.use(require('express-session')({
    secret: cookieSecret,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    },
    name: "sessionid",
    store: store,
    // Boilerplate options, see:
    // * https://www.npmjs.com/package/express-session#resave
    // * https://www.npmjs.com/package/express-session#saveuninitialized
    resave: true,
    saveUninitialized: true,
    unset: 'destroy'
}));

// Set a logged in variable on every connection if not set
app.use(function(req, res, next) {
    if (typeof (req.session.loggedin) === "undefined")
        req.session.loggedin = false;
    next();
});

// My ReST API
app.use('/api', api);

// Static route for client-side code generated by Angular
app.use('/',express.static(__dirname+'/../chord-sheet/dist'));
app.get('/*', function(req, res) {res.sendFile(path.join(__dirname+'/../chord-sheet/dist','index.html'))});

// Function to handle client errors
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Base error handler
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    next();
});


// ---- START SERVER ---- //

app.listen(8080, function () {
    console.log('Server listening on port 8080!');
});


module.exports = app;
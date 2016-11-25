/**
 * Created by darryl on 2016-11-24.
 */

// ---- REQUIRES ---- //
var express     = require('express');
var router      = express.Router({ mergeParams: true });
var bcrypt      = require('bcrypt');

// Setup db models
var User        = require('./../models/user-model');
var UserCookies = require('./../models/usercookie-model');


// ---- CONSTANTS ---- //
const saltRound = 10;


// ---- ROUTES ---- //

// Login user
router.post("/login", function(req, res, next) {
    var token = req.cookies.token;
    var username = req.body.username;
    var password = req.body.password;

    // Common callbacks
    var badToken    = function(){res.send({success: false})};
    var goodToken   = function(user){res.send({success: true, username: user.username, firstname: user.firstname, lastname: user.lastname})};


    // Login by token
    if (token) {
        getTokenOwner(token, badToken, goodToken);
    }

    // Login by user/pass
    else if (username && password) {

        var comparefunc = function(users) {
            // Make sure a user was returned
            if(users.length == 0) badToken();
            else {
                var user = users[0];
                console.log(user.password);
                console.log(password);

                // Compare the passed password and the hashed password for validity.
                bcrypt.compare(password, user.password, function (err, bRes) {
                    if (bRes == true) {
                        // Set the cookie before sending the success response
                        var setCookie = function(cookie) {
                            res.cookie('token', cookie.token, {maxAge: 1000 * 60 * 60 * 24}); // Expires in 24 hrs. // TODO: Cookie security!
                            goodToken(user);
                        };

                        // Generate and store a new cookie
                        setToken(user.username, function(err){res.send({success: false, reason: err})}, setCookie)
                    }
                    else res.send({success: false});
                });
            }
        };

        getUserInfo(username, true, badToken, comparefunc, false);
    }
    // Bad form, reject
    else {
        res.status(400).send({success: false});
    }
});

// Create new user
router.post('/', function(req, res, next) {
    var createUser = function (users) {          // TODO: Refactor with user-exists to avoid repetition.
        if (users.length != 0) res.send({success: false, reason: "User already exists."});
        else {
            // Hash password
            bcrypt.hash(req.body.password, saltRound, function (err, hash) {
                if (err) {res.status(500).send({success: false, reason: "Hashing error."})}
                else {
                    user.password = hash;
                    user.save(function(err, mongoRes){
                        if (!err) res.send({success: true});
                        else res.status(500).send({success: false, reason: "Error saving new user."});
                    });
                }
            });
        }
    };

    // Create user and set up initial info
    var user = new User();
    user.username = req.body.username;
    user.firstname = req.body.firstname;
    user.lastname = req.body.lastname;

    // Create user if does not already exist
    getUserInfo(user.username, false, function(){res.status(500).send({success: false, reason: "Problem accessing DB."})}, createUser);
});


router.route('/:username')
    // Get user information
    .get(function (req, res, next) {
        var username = req.params.username;

        getUserInfo(
            username,
            false,
            function (err) {
                res.status(500).send(err)
            },
            function (users) {
                res.send(users)
            }
        );
    })

    // Update user information
    .post(function (req, res, next) {        // TODO: No permission controls yet!

        // Get the variables. If they don't exist or are empty, they will be ignored.
        var username = req.params.username;
        var password = req.body.password;
        var firstname = req.body.firstname;
        var lastname = req.body.lastname;

        // Update the user data and re-input
        var update = function (users) {
            if (users.length == 0) res.send({success: false, reason: "User not found."});
            else {
                var user = users[0];
                user.password = (!password || bcrypt.compareSync(password, user.password)) ? user.password : bcrypt.hashSync(password, saltRound);
                user.firstname = (!firstname) ? user.firstname : firstname;
                user.lastname = (!lastname) ? user.lastname : lastname;

                // Save the modified user
                user.save(function (err, uRes) {
                    if (!err) res.send({success: true});
                    else res.status(500).send({success: false, reason: "DB update failed."});
                });
            }
        };

        getUserInfo(username, true, function (err) {
            res.status(500).send({success: false, more: err})
        }, update, false);
    })

    // Delete user
    .delete(function (req, res, next) {      // TODO: No permission controls yet!
        var username = req.params.username;

        // Get user, and delete.
        getUserInfo(username, false, null, null, true).remove().exec();

        // Tell user success
        res.send({success: true});
    });


// ---- HELPER FUNCTIONS ---- //

/** Gets the information for a specified user.
 *
 * @param username          The user to retrieve.
 * @param addpass           Specify if the password should be retrieved as well.
 * @param failure           function(err) called when the function fails. Contains error text. Can be null.
 * @param success           function(user) called when the function succeeds. Contains a list of user objects. Can be null.
 * @param returnQueryObj    Specifies if the mongoose object should be returned instead of executing. failure/success not called if true.
 * @returns {*|void|SchemaType|Query}   Returns void, or Query when returnQueryObj == true
 */
var getUserInfo = function(username, addpass, failure, success, returnQueryObj) {
    var selectStmt = (addpass)? "username firstname lastname password": "username firstname lastname";

    var query = User.find({})
        .where("username").equals(username)
        .limit(1)
        .select(selectStmt);

    // Return query if requested, otherwise execute
    if (returnQueryObj)
        return query;
    else query.exec(function (err, users) {
        if (err) failure("Query failed.");
        else success(users);
    });
};

/** Sets a new cookie for a user.
 *
 * @param username  The username to get the new cookie.
 * @param failure   function(err) Called when setting the cookie fails. Usually contains error text.
 * @param success   function(user) Called when setting cookie suceeds. Contains cookie object.
 */
var setToken = function(username, failure, success) {
    // Create token
    var newCookie = new UserCookies();
    newCookie.token = getRandomInt();
    newCookie.owner = username;

    // Save cookie
    newCookie.save(function(err, res){
        if (!err) success(res);
        else failure("Token could not be saved.");
    });
};

/** Get user associated with token.
 *
 * @param token     The token to search for.
 * @param failure   function(err) Called when finding the cookie owner details fails. Contains error text.
 * @param success   function(user) Called when finding the cookie owner succeeds. Contains the owner's details.
 */
var getTokenOwner = function(token, failure, success) {
    // Check returned token for validity, and ensure user still exists
    var stillExists = function(tokenEntry) {
        if (tokenEntry.length == 0) failure("No token found.");
        else if (tokenEntry.length > 1) failure("Duplicate tokens were generated.");
        else {
            var tokenE = tokenEntry[0];

            // Ensure user still exists
            var userExists = function(users) {
                if(users.length != 1) failure("User for token does not exist.");
                else success(users[0]);
            };

            getUserInfo(tokenE.owner, false, failure, userExists, false);
        }
    };

    // Get token
    UserCookies.find({})
        .where('token').equals(token)
        .select('owner')
        .exec(function(err, tokenEntry) {
           if (err) failure("Error connecting to DB for token search.");
           else stillExists(tokenEntry);
        });
};

/** Get a random int between 0 and 9999999999 (exclusive).
 *
 * @returns {number}
 */
var getRandomInt = function () {
    min = 0;
    max = 9999999999;
    return Math.floor(Math.random() * (max - min)) + min;
};

module.exports = router;
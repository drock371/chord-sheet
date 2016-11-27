/**
 * Created by darryl on 2016-11-24.
 */

// ---- REQUIRES ---- //
var express             = require('express');
var router              = express.Router({ mergeParams: true });
var getTokenOwner       = require('./users').getTokenOwner;
var sanitize            = require('../chord_api').sanitize;
var ChordproValid       = require('../models/chordpro-validation/chordpro-validator.service');
var isNullOrUndefined   = require('util').isNullOrUndefined;

// Setup db models
var ChordSheet  = require('./../models/chordsheet-model');


// ---- HELPERS ---- //

// Consutructs the data and returns results to client
var matchFuncBase = function (req, res, next) {
    return function (matchParam) {
        // Find chord sheet stats
        ChordSheet.aggregate([
            {
                $match: matchParam
            },
            {
                $group: {
                    _id: {owner: "$owner", songtitle: "$songtitle"},
                    latestRevision: {$max: "$revision"},
                    revisionCount: {$sum: 1},
                }
            }
        ]).then(stats => {
            // Find chord sheets
            ChordSheet.aggregate([{$match: matchParam}]).then(
                // Send stats and results
                results => res.send({metadata: stats, results: results}),
                err => res.status(500).send(err));
        }, err => res.status(500).send(err));
    }
};


// ---- ROUTES ---- //

router.route('/')
    // Get all chordsheets
    .get(function(req, res, next) {

        var token = req.signedCookies.token;
        var matchFunc = matchFuncBase(req,res,next);

        // Change behaviour if the user is logged in or not
        if (token) {
            getTokenOwner(token)
                .then(
                    // Find chord sheets that the user owns or are public, along with stats
                    user => matchFunc({$or: [{'owner': user.username}, {'private': false}]}),
                    err => res.status(500).send(err.message)
                );
        } else {
            // Find public chord sheets
            matchFunc({private: false});
        }
    })

    // Create new chordsheet/upload revision
    .post(function(req, res, next) {
        var token = req.signedCookies.token;

        // Chordsheets can't be made if you're not logged in.
        if (!token) {
            res.status(401).send({success: false, reason: "Unauthorized"});
            return;
        }

        // Get requesting user info
        getTokenOwner(token).then(
            function(user) {
                // Ensure that all necessary data exists
                if (!req.body.songtitle || isNullOrUndefined(req.body.private) || !req.body.contents) {
                    res.status(400).send({success: false, reason: "Missing mandatory parameter."});
                    return;
                }

                // Create new sheet and populate with data
                var sheet       = new ChordSheet();
                sheet.songtitle = sanitize(req.body.songtitle);
                sheet.private   = Boolean(req.body.private);
                sheet.owner     = sanitize(user.username);
                sheet.contents  = sanitize(req.body.contents);

                // Validate user chordsheet
                var validator = new ChordproValid.ChordproValidatorService();
                var results = validator.validate(sheet.contents);

                // Stop if errors found
                if (results.errors.length > 0) {
                    res.status(400).send({success: false, reason: "Invalid ChordPro format."});
                    return;
                }

                // Save sheet
                sheet.save(function(err, save){
                    if (!err) res.send({success: true});
                    else res.status(500).send({success: false, reason: err});
                });
            },
            err => res.status(401).send({success: false, reason: "Invalid or expired token."})
        );
    });

router.route('/:songtitle')
    // Get a single collection of chordsheets.
    .get(function(req, res, next) {
        var songtitle = sanitize(req.params.songtitle);
        var token = req.signedCookies.token;
        var matchFunc = matchFuncBase(req,res,next);

        // Change behaviour if the user is logged in or not
        if (token) {
            getTokenOwner(token)
                .then(
                    // Find chord sheets that the user owns or are public, along with stats
                    user => matchFunc({songtitle: songtitle, $or: [{'owner': user.username}, {'private': false}]}),
                    err => res.status(500).send(err.message)
                );
        } else {
            // Find public chord sheets
            matchFunc({songtitle: songtitle, private: false});
        }
    })

    // Delete a chordsheet and all revisions.
    .delete(function(req, res, next) {
        var songtitle = sanitize(req.params.songtitle);
        var token = req.signedCookies.token;

        // Chordsheets can't be made if you're not logged in.
        if (!token) {
            res.status(401).send({success: false, reason: "Unauthorized"});
            return;
        }

        // Get requesting user info
        getTokenOwner(token).then(
            function(user) {
                // Delete matching songs
                ChordSheet.find({owner: sanitize(user.username), songtitle: sanitize(songtitle)}).remove().exec();

                // Tell user success
                res.send({success: true});
            },
            err => res.status(401).send({success: false, reason: "Invalid or expired token."})
        );
    });

router.route('/:username/:songtitle')
    //Get a single chordsheet from a single user
    .get(function(req, res, next) {
        var username = sanitize(req.params.username);
        var songtitle = sanitize(req.params.songtitle);
        var token = req.signedCookies.token;
        var matchFunc = matchFuncBase(req,res,next);

        // Change behaviour if the user is logged in or not
        if (token) {
            getTokenOwner(token)
                .then(
                    // Find chord sheets that the user owns or are public, along with stats
                    user => matchFunc({owner: username, songtitle: songtitle, $or: [{'owner': user.username}, {'private': false}]}),
                    err => res.status(500).send(err.message)
                );
        } else {
            // Find public chord sheets
            matchFunc({owner: username, songtitle: songtitle, private: false});
        }
    });

module.exports = router;
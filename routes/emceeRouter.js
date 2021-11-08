/** emceeRouter.js
 * This is a non-GUI entry point that receives game parameters (keys).
 * Also, inserts the game record into the DB and passes the game key back to the caller.
 */

let express = require('express');
let router = express.Router();
let {Client} = require('pg');
let db = require("../lib/DbUpdate.js")
// returns emcee.html (with some dynamically generated js script), emcess.js
router.get('/', function (req, res, next) {
    "use strict";
    const gameId = parseInt(req.query.gameId);
    console.log('game:' + gameId);
    // read SYNCHRONOUS the game parameters from the DB
    const paramsPromise = db.readGame(gameId);
    paramsPromise.then( params => {
        console.log(`gameType: ${params[0]}`);
        console.log(`qfId: ${params[1]}`);
        console.log(`pfId: ${params[2]}`);
        let gameType = params[0];
        switch (gameType) {  // map to strings
            case 0: gameType = 'PR'; break;
            case 1: gameType = 'OLR'; break;
            case 2: gameType = 'CR'; break;
        }
        const qfId = params[1];
        const falsyString = '';
        const pfId = (gameType === 'CR')? params[2] : 0;
        // Declare game parameters, then return emcee.html, emcee.js
        res.render('emcee', {gameId: gameId, gameType: gameType, questionFileId: qfId, playerFileId: pfId,
            questionFileAbsPath: falsyString, playerFileAbsPath: falsyString,
            urlEndGame: process.env.URLENDGAME, urlGameSummary: process.env.URLGAMESUMMARY});
    });
});

module.exports = router;
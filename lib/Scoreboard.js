/**
 * ScoreBoard.js - maintain the state of the scoreboard:
 *                 1. current players
 *                 2. "buzzer" status
 *                 3. score for the round
 */
"use strict";

let PrGame = require('./PrGame');
let OlrGame = require('./OlrGame');
let CrGame = require('./CrGame');
let winston = require('../node_modules/winston');


let playerList; // array of {'name': name, 'buzzer': null, 'score': 0,
                //            'selected': false,'registered': true}
let buzzOrder;  // order of buzzing in
let numberIncorrect; // number of incorrect answers during round.
let status;     // string describing the status of the round
let game;       // game being played.  Needed for scoring.
let roomNum;    // room # (number) for game.
let sbCallback; // call back for scoreboard update.
let markCallback; // call back for marking button update.
let logger = winston.loggers.get('application'); // for logging

// constructor
function Scoreboard(type, num, cb1, cb2) {
    if (type === "PR") {
        game = new PrGame();
    } else if (type === "OLR") {
        game = new OlrGame();
    } else if (type === "CR") {
        game = new CrGame();
    } else {
        logger.error("Scoreboard: Bad game type");
        throw TypeError("Unknown game type");
    }    
    playerList = []; // for CrGame the player list is initialized in init().
    buzzOrder = 1;
    numberIncorrect = 0;
    roomNum = num;
    sbCallback = cb1;  // save the scoreboard callback
    markCallback = cb2; // save the marking callback
}
// local methods (but not private.)
/**
 * Emit event that updates the Admin and Projector scoreboards.
 */
function emitScoreboardUpdate() {
    sbCallback(roomNum, status, playerList);
}
/**
 * Emit event that tells Admin the state of the marking buttons.
 * @param enable true => disable marking buttons; false => enable marking buttons
 */
function emitMarkingButtonsUpdate(enable) {
    markCallback(roomNum, enable);
}

/**
 * Update the player's score
 * @param index of player in playerList
 * @param score new score for player
 */
function updatePlayerScore(index, score) {
    let e = playerList[index];
    e.score = score;
    playerList[index] = e;
}
/**
 * Find the selected player.  Expect 0 or 1 selected.
 */
function findSelectedPlayer() {
    let index = -1;
    for (let i = 0; i < playerList.length; i++) {
        if (playerList[i].selected) {
            index = i;
            break;
        }
    }
    return index;
}
/**
 * Clear the selected player.  Expect 0 or 1.
 */
function clearSelectedPlayer() {
    let index = findSelectedPlayer();
    if (index >= 0) {
        playerList[index].selected = false;
    }
}
/**
 * Clear the buzzer information.
 */
function clearBuzzerColumn() {
    playerList.forEach(function (e, i, a) {
        a[i] = {name: e.name, buzzer: null, score: e.score, selected: e.selected, registered: e.registered};
    });
    clearSelectedPlayer();
    buzzOrder = 1;
}
/**
 * Player buzzes with answer - used for testing only.
 */
function autoMarkAnswer() {
    // TODO: used for testing
}
/**
 * Add the player to the playerList.
 */
function addPlayer(name) {
    playerList.push({name: name, buzzer: null, score: 0, selected: false, registered: true});
}
// public methods
/**
 * Get the type of game being played.
 */
Scoreboard.prototype.getType = function () {
    return game.getType();
}
/**
 * Initialize the scoreboard with the player list.
 * @param initPlayerList - for PR and OLR games this is [], for CR games this is ranked player list
 */
Scoreboard.prototype.initScoreboard = function(initPlayerList) {
    status = "<p>Ready for player registration.<p/>"
    game.initGame(initPlayerList);
    // initialize the round.  This is a NOOP for PR and OLR game, but significant for CR game.
    playerList = game.initRound(playerList);
    emitScoreboardUpdate();
}
/**
 * Deregister (change statue) the player.
 * 7/23/2020 - Changed logic. Only change the player's status (RED), but do not
 * remove player from game.  The status change notifies the emcee that the player
 * has disconnected. The player is NOT removed from the playerList.
 */
Scoreboard.prototype.deregisterPlayer = function (name) {
    let playerIndex = -1;
    for (let i = 0; i < playerList.length; i++) {
        if (playerList[i].name.toUpperCase() === name.toUpperCase()) {
            playerIndex = i;
            break;
        }
    }
    // delete the deregistered player only if the player is found
    if (playerIndex >= 0) {
        playerList[playerIndex].registered = false;
    }
    emitScoreboardUpdate();
};
/**
 * Register (add) player for the game or Countdown round.
 * 7/23/2020 - Changed logic.  No longer sensitive to type of game.
 * If player name is already in the playerList, assume that this is
 * a reconnection. Otherwise, it's a brand new player.
 */
Scoreboard.prototype.registerPlayer = function (name) {
    let reconnected = false;
    for (let i = 0; i < playerList.length; i++) {
        if (playerList[i].name.toUpperCase() === name.toUpperCase()) {
            playerList[i].registered = true;
            reconnected = true;
        }
    }
    if (!reconnected) {
        // accept any player anytime for Open Lightning Round
        addPlayer(name);
        reconnected = true;
    }
    emitScoreboardUpdate();
    return reconnected;
};
/**
 * Mark player correct.
 */
Scoreboard.prototype.markCorrect = function () {
    let playerIndex = findSelectedPlayer();
    if (playerIndex < 0) {
        logger.error("Scoreboard: Bad player index");
        // prevent blowup by exiting. Without returning an error is thrown and 
        // admin2 disconnects.
        return;
    }
    let playerName = playerList[playerIndex].name;
    let playerScore = game.scoreCorrectAnswer(playerName);
    updatePlayerScore(playerIndex, playerScore);
    // getRoundInfo checks if the game is over of if the round is over
    status = game.getRoundInfo();
    // and will change the info accordingly.
    if (game.isGameOver()) {
        game.getWinner();
    } else {
        if (game.isRoundOver()) {
            playerList = game.initRound(playerList);
        }
    }
//  common to all games
    emitMarkingButtonsUpdate(true);
    clearBuzzerColumn();
    emitScoreboardUpdate();
}
/**
 * Mark player incorrect.
 */
Scoreboard.prototype.markIncorrect = function () {
    let playerIndex = findSelectedPlayer();
    if (playerIndex < 0) {
        logger.error("Scoreboard: Bad player index");
        // prevent blowup by exiting. Without return here, an error is thrown and
        // admin2 disconnects.
        return;
    }
    let playerName = playerList[playerIndex].name;
    game.scoreIncorrectAnswer(playerName);
    if (playerIndex >= 0) {
        // remove selection
        playerList[playerIndex].selected = false;
        // Move onto the next buzzer (may not be found).
        let buzzer = playerList[playerIndex].buzzer + 1;
        for (let i = 0; i < playerList.length; i++) {
            if (playerList[i].buzzer === buzzer) {
                playerList[i].selected = true;
            }
        }
    }
    numberIncorrect++;
    emitScoreboardUpdate();
}
/**
 * Record player buzz.
 */
Scoreboard.prototype.recordBuzz = function (name, answer) {
    playerList.forEach(function(e,i,a) {
        if (e.name.toUpperCase() === name.toUpperCase()) {
            if (!e.buzzer) { // only new "buzzers" are falsy
                if (buzzOrder === 1) {
                    playerList[i].selected = true;
                    // Now enable the marking buttons.
                    emitMarkingButtonsUpdate(false);
                } else if (numberIncorrect+1 === buzzOrder) {
                    // This selects the player who buzzes late after all previous buzzers answered incorrectly.
                    playerList[i].selected = true;
                } // else logic below is faulty.
                //   else {
                //     logger.error("SOMEBODY BUZZED - don't know who")
                // }
                if (answer) {
                    // test player buzzes w/ answer
                    automarkAnswer(answer);
                }
                e.buzzer = buzzOrder;
                buzzOrder++;
            }
        }
    });
    emitScoreboardUpdate();
}
/**
 *
 */
Scoreboard.prototype.askQuestion = function () {
    game.initQuestion();
    numberIncorrect = 0;
    // Wait until someone buzzes in.
    emitMarkingButtonsUpdate(true);
    clearBuzzerColumn();
    status = game.getRoundInfo();
    emitScoreboardUpdate();
}

module.exports = Scoreboard;

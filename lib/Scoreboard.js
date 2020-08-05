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
let logger = winston.loggers.get('application'); // for logging

// instance variables
// let playerList; // array of Object: {'name': name, 'buzzer': null, 'score': 0,
//                 //                   'selected': false,'registered': true}
// let buzzOrder;  // Number: order of buzzing in
// let numberIncorrect; // Number: number of incorrect answers during round.
// let status;     // String: display status of the round
// let game;       // Object: game being played, e.g. PR, OLR, CR
// let roomNum;    // Number: room # for game.
// let sbCallback; // Function: call back for scoreboard update.
// let markCallback; // Function: call back for marking button update.

// constructor
function Scoreboard(type, num, cb1, cb2) {
    if (type === "PR") {
        this.game = new PrGame();
    } else if (type === "OLR") {
        this.game = new OlrGame();
    } else if (type === "CR") {
        this.game = new CrGame();
    } else {
        logger.error("Scoreboard: Bad game type");
        throw TypeError("Unknown game type");
    }    
    this.playerList = []; // for CrGame the player list is initialized in init().
    this.buzzOrder = 1;
    this.numberIncorrect = 0;
    this.status = "";
    this.roomNum = num;
    this.sbCallback = cb1;  // save the scoreboard callback
    this.markCallback = cb2; // save the marking callback
}
// local methods (but not private.)
/**
 * Emit event that updates the Admin and Projector scoreboards.
 */
function emitScoreboardUpdate(self) {
    self.sbCallback(self.roomNum, self.status, self.playerList);
}
/**
 * Emit event that tells Admin the state of the marking buttons.
 * @param enable true => disable marking buttons; false => enable marking buttons
 */
function emitMarkingButtonsUpdate(self, enable) {
    self.markCallback(self.roomNum, enable);
}

/**
 * Update the player's score
 * @param index of player in playerList
 * @param score new score for player
 */
function updatePlayerScore(self, index, score) {
    let e = self.playerList[index];
    e.score = score;
    self.playerList[index] = e;
}
/**
 * Find the selected player.  Expect 0 or 1 selected.
 */
function findSelectedPlayer(self) {
    let index = -1;
    for (let i = 0; i < self.playerList.length; i++) {
        if (self.playerList[i].selected) {
            index = i;
            break;
        }
    }
    return index;
}
/**
 * Clear the selected player.  Expect 0 or 1.
 */
function clearSelectedPlayer(self) {
    let index = findSelectedPlayer(self);
    if (index >= 0) {
        self.playerList[index].selected = false;
    }
}
/**
 * Clear the buzzer information.
 */
function clearBuzzerColumn(self) {
    self.playerList.forEach(function (e, i, a) {
        a[i] = {name: e.name, buzzer: null, score: e.score, selected: e.selected, registered: e.registered};
    });
    clearSelectedPlayer(self);
    self.buzzOrder = 1;
}
/**
 * Player buzzes with answer - used for testing only.
 */
function autoMarkAnswer(self) {
    // TODO: used for testing
}
/**
 * Add the player to the playerList.
 */
function addPlayer(self, name) {
    self.playerList.push({name: name, buzzer: null, score: 0, selected: false, registered: true});
}
// public methods
/**
 * Get the type of game being played.
 */
Scoreboard.prototype.getType = function () {
    return this.game.getType();
}
/**
 * Initialize the scoreboard with the player list.
 * @param initPlayerList - for PR and OLR games this is [], for CR games this is ranked player list
 */
Scoreboard.prototype.initScoreboard = function(initPlayerList) {
    this.status = "<p>Ready for player registration.<p/>"
    this.game.initGame(initPlayerList);
    // initialize the round.  This is a NOOP for PR and OLR game, but significant for CR game.
    this.playerList = this.game.initRound(this.playerList);
    emitScoreboardUpdate(this);
}
/**
 * Deregister (change statue) the player.
 * 7/23/2020 - Changed logic. Only change the player's status (RED), but do not
 * remove player from game.  The status change notifies the emcee that the player
 * has disconnected. The player is NOT removed from the playerList.
 */
Scoreboard.prototype.deregisterPlayer = function (name) {
    let playerIndex = -1;
    for (let i = 0; i < this.playerList.length; i++) {
        if (this.playerList[i].name.toUpperCase() === name.toUpperCase()) {
            playerIndex = i;
            break;
        }
    }
    // delete the deregistered player only if the player is found
    if (playerIndex >= 0) {
        this.playerList[playerIndex].registered = false;
    }
    emitScoreboardUpdate(this);
};
/**
 * Register (add) player for the game or Countdown round.
 * 7/23/2020 - Changed logic.  No longer sensitive to type of game.
 * If player name is already in the playerList, assume that this is
 * a reconnection. Otherwise, it's a brand new player.
 */
Scoreboard.prototype.registerPlayer = function (name) {
    let reconnected = false;
    for (let i = 0; i < this.playerList.length; i++) {
        if (this.playerList[i].name.toUpperCase() === name.toUpperCase()) {
            this.playerList[i].registered = true;
            reconnected = true;
        }
    }
    if (!reconnected) {
        // accept any player anytime for Open Lightning Round
        addPlayer(this, name);
        reconnected = true;
    }
    emitScoreboardUpdate(this);
    return reconnected;
};
/**
 * Mark player correct.
 */
Scoreboard.prototype.markCorrect = function () {
    let playerIndex = findSelectedPlayer(this);
    if (playerIndex < 0) {
        logger.error("Scoreboard: Bad player index");
        // This is triggered by emcee clicking "Incorrect" multiple times.
        // The first click clears the selection, so the second click gets bad playerIndex.
        return;
    }
    let playerName = this.playerList[playerIndex].name;
    let playerScore = this.game.scoreCorrectAnswer(playerName);
    updatePlayerScore(this, playerIndex, playerScore);
    // getRoundInfo checks if the game is over of if the round is over
    this.status = this.game.getRoundInfo();
    // and will change the info accordingly.
    if (this.game.isGameOver()) {
        this.game.getWinner();
    } else {
        if (this.game.isRoundOver()) {
            playerList = this.game.initRound(this.playerList);
        }
    }
//  common to all games
    emitMarkingButtonsUpdate(this,true);
    clearBuzzerColumn(this);
    emitScoreboardUpdate(this);
}
/**
 * Mark player incorrect.
 */
Scoreboard.prototype.markIncorrect = function () {
    let playerIndex = findSelectedPlayer(this);
    if (playerIndex < 0) {
        logger.error("Scoreboard: Bad player index");
        // This is triggered by emcee clicking "Incorrect" multiple times.
        // The first click clears the selection, so the second click gets bad playerIndex.
        return;
    }
    let playerName = this.playerList[playerIndex].name;
    this.game.scoreIncorrectAnswer(playerName);
    if (playerIndex >= 0) {
        // remove selection
        this.playerList[playerIndex].selected = false;
        // Move onto the next buzzer (may not be found).
        let buzzer = this.playerList[playerIndex].buzzer + 1;
        for (let i = 0; i < this.playerList.length; i++) {
            if (this.playerList[i].buzzer === buzzer) {
                this.playerList[i].selected = true;
            }
        }
    }
    this.numberIncorrect++;
    emitScoreboardUpdate(this);
}
/**
 * Record player buzz.
 */
Scoreboard.prototype.recordBuzz = function (name, answer) {
    let self = this;
    this.playerList.forEach(function(e,i, a) {
        if (e.name.toUpperCase() === name.toUpperCase()) {
            if (!e.buzzer) { // only new "buzzers" are falsy
                if (this.buzzOrder === 1) {
                    this.playerList[i].selected = true;
                    // Now enable the marking buttons.
                    emitMarkingButtonsUpdate(this,false);
                } else if (this.numberIncorrect+1 === this.buzzOrder) {
                    // This selects the player who buzzes late after all previous buzzers answered incorrectly.
                    this.playerList[i].selected = true;
                } // else logic below is faulty.
                //   else {
                //     logger.error("SOMEBODY BUZZED - don't know who")
                // }
                if (answer) {
                    // test player buzzes w/ answer
                    automarkAnswer(self, answer);
                }
                e.buzzer = this.buzzOrder;
                this.buzzOrder++;
            }
        }
    }, self);
    emitScoreboardUpdate(this);
}
/**
 *
 */
Scoreboard.prototype.askQuestion = function () {
    this.game.initQuestion();
    this.numberIncorrect = 0;
    // Wait until someone buzzes in.
    emitMarkingButtonsUpdate(this, true);
    clearBuzzerColumn(this);
    this.status = this.game.getRoundInfo();
    emitScoreboardUpdate(this);
}

module.exports = Scoreboard;

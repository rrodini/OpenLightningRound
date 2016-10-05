/**
 * AbstractGame.js - defines API for a quiz game supported by this app.
 */

"use strict";

// constructor
function AbstractGame() {
	throw new Error("Cannot create AbstractGame objects.");
}
// abstract methods
AbstractGame.prototype.initGame = function(gamePlayerList /* object (format varies) */) {
	throw new Error("initGame() must be overriden by concrete class.");
};
AbstractGame.prototype.initRound = function(curPlayerList) /* return newPlayerList  */ {
	throw new Error("initRound() must be overriden by concrete class.");
};
AbstractGame.prototype.getRoundInfo = function() /* return info (text) */{
	throw new Error("getRoundInfo() must be overriden by concrete class.");
};
AbstractGame.prototype.initQuestion = function() {
	throw new Error("initQuestion() must be overriden by concrete class.");
};
AbstractGame.prototype.scoreCorrectAnswer = function(player) /* return player score (text) */{
	throw new Error("scoreCorrectAnswer() must be overriden by concrete class.");
};
AbstractGame.prototype.scoreIncorrectAnswer = function(player) /* return player score (text) */{
	throw new Error("scoreIncorrectAnswer() must be overriden by concrete class.");
};
AbstractGame.prototype.isRoundOver = function() /* return boolean */ {
	throw new Error("isRoundOver() must be overriden by concrete class.");
};
AbstractGame.prototype.isGameOver = function() /* return boolean */ {
	throw new Error("isGameOver() must be overriden by concrete class.");
};
AbstractGame.prototype.getWinner = function() /* return player (text) */ {
	throw new Error("getWinner() must be overriden by concrete class.");
};
AbstractGame.prototype.getResults = function() /* return results object (format varies)  */ {
	throw new Error("getResults() must be overriden by concrete class.");
};
AbstractGame.prototype.getType = function() /* return game (text) */ {
	throw new Error("getType() must be overriden by concrete class.");
};

module.exports = AbstractGame;
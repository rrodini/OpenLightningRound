/**
 * olrGame.js - implementation of Open Lightning Round game.
 * 
 */
function OlrGame() {
	this.type = 'OLR';
}

var playerScores = {};
var questionCount = 0;

OlrGame.prototype = inherit(AbstractGame.prototype);

extend(OlrGame.prototype, {
	constructor: OlrGame,
//  override abstract methods
	initGame : function(gamePlayerList) {},
	initRound : function(playerList) {return playerList;},
	getRoundInfo : function() {return "";},
	initQuestion  : function() {questionCount++;},
	scoreCorrectAnswer : function(player) {
		if (playerScores[player]) {
			playerScores[player] += 1; 
		} else {
			playerScores[player] = 1;
		}
		return (playerScores[player]).toString();
	},
	scoreIncorrectAnswer : function(player) {},
	isRoundOver : function() {return false;},
	isGameOver : function() {return false;},
	getWinner : function() {
		var winner;
		var highScore = -1;
		for (var name in playerScores) {
			if (playerScores[name] >= highScore) {
				highScore = playerScores[name];
				winner = name;
			}
		}
		return winner;
	},
	getResults : function() { return playerScores;},
	getType: function() { return this.type;},
});



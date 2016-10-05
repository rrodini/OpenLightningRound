/**
 * olrGame.js - implementation of Open Lightning Round game.
 * 
 */
"use strict";

let util = require('util');
let AbstractGame = require('./AbstractGame')
function OlrGame() {
	this.type = 'OLR';
}
util.inherits(OlrGame, AbstractGame);

let playerScores = {};
let questionCount = 0;


Object.assign(OlrGame.prototype, {
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
		let winner;
		let highScore = -1;
		for (let name in playerScores) {
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

module.exports = OlrGame;

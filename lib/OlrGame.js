/**
 * olrGame.js - implementation of Open Lightning Round game.
 * 
 */
"use strict";

let util = require('util');
let AbstractGame = require('./AbstractGame')
// instance variables
// let type; // String
// let playerScores; // Object {name: <player name>, score: <player score>}
// let questionCount; // Number
function OlrGame() {
	this.type = 'OLR';
	this.playerScores = {};
	this.questionCount = 0;
}
util.inherits(OlrGame, AbstractGame);

Object.assign(OlrGame.prototype, {
	constructor: OlrGame,
//  override abstract methods
	initGame : function(gamePlayerList) {},
	initRound : function(playerList) {return playerList;},
	getRoundInfo : function() {return "";},
	initQuestion  : function() {this.questionCount++;},
	scoreCorrectAnswer : function(player) {
		if (this.playerScores[player]) {
			this.playerScores[player] += 1;
		} else {
			this.playerScores[player] = 1;
		}
		return (this.playerScores[player]).toString();
	},
	scoreIncorrectAnswer : function(player) {},
	isRoundOver : function() {return false;},
	isGameOver : function() {return false;},
	getWinner : function() {
		let winner;
		let highScore = -1;
		for (let name in this.playerScores) {
			if (this.playerScores[name] >= highScore) {
				highScore = this.playerScores[name];
				winner = name;
			}
		}
		return winner;
	},
	getResults : function() { return this.playerScores;},
	getType: function() { return this.type;},
});

module.exports = OlrGame;

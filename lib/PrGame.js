/**
 * prGame.js - implementation of Presentation Round game.
 * 
 */

"use strict";

let util = require('util');
let AbstractGame = require('./AbstractGame')
// instance variables
// let type; // String
function PrGame() {
	this.type = 'PR';
}

util.inherits(PrGame, AbstractGame);

Object.assign(PrGame.prototype, {
	constructor: PrGame,
//  override abstract methods
	initGame : function(gamePlayerList) {},
	initRound : function(playerList) {return playerList;},
	getRoundInfo : function() {return "";},
	initQuestion  : function() {},
	scoreCorrectAnswer : function(player) {
		return "";
	},
	scoreIncorrectAnswer : function(player) {},
	isRoundOver : function() {return false;},
	isGameOver : function() {return false;},
	getWinner : function() {
		return "";
	},
	getResults : function() { return undefined;},
	getType: function() { return this.type;},
});

module.exports = PrGame;


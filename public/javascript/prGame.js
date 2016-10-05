/**
 * prGame.js - implementation of Presentation Round game.
 * 
 */
function PrGame() {
	this.type = 'PR';
}

PrGame.prototype = inherit(AbstractGame.prototype);

extend(PrGame.prototype, {
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



/**
 * test-abstractGame.js - unit tests for the abstractGame module
 *
 */
var OlrGame = require('../../lib/OlrGame.js');
var game = null;


exports['setUp'] = function(callback) {
	game = new OlrGame();
	return callback();
};

exports['tearDown'] = function(callback) { 
	return callback();
};

exports['getType() returns correct value'] = function(test) {
	test.equal("OLR", game.getType());
	test.done();
};

exports['playerScores object is empty at start'] = function(test) {
	test.equal(0, Object.keys(game.getResults()).length);
	test.done();
};

exports['initRound() does not change playerList object'] = function(test) {
	var playerList = {'BOB': 27};  // just need an object here
	var roundPlayerList = game.initRound(playerList);
	test.strictEqual(roundPlayerList, playerList);
	test.done();
};

exports['getRoundInfo() should return empty string'] = function(test) {
	test.equal("", game.getRoundInfo());
	test.done();
};

exports['scoreCorrectAnswer() gives 1 point to BOB'] = function(test) {
	var score = game.scoreCorrectAnswer('BOB');
	test.equal("1", score);
	test.done();
};

exports['scoreCorrectAnswer() distributes points'] = function(test) {
	// BOB's score is 1 from previous test.
	var score2 = game.scoreCorrectAnswer('BOB');
	var score1 = game.scoreCorrectAnswer('Robert');
//console.dir(game.getResults());
	test.equal("2", score2);
	test.equal("1", score1);
	test.done();
};

exports['getWinner() returns BOB'] = function(test) {
	test.equal("BOB", game.getWinner());
	test.done();
};

exports['getResults() returns an object'] = function(test) {
	test.notStrictEqual(null, game.getResults());
	test.done();
};


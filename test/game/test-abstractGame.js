/**
 * test-abstractGame.js - unit tests for the abstractGame module
 *
 */
var util = require('util');
var AbstractGame = require('../../lib/AbstractGame.js');


exports['setUp'] = function(callback) {
	return callback();
};

exports['tearDown'] = function(callback) { 
	return callback();
};
//eval(fs.readFileSync('../lib/ooUtil.js') + '');
//eval(fs.readFileSync('../lib/AbstractGame.js') + '');

function DummyGame() {
	this.type = 'DUMMY';
}

util.inherits(DummyGame, AbstractGame);



Object.assign(DummyGame.prototype, {
 	constructor: DummyGame,
 //  override abstract methods
 	getType: function() { return this.type;},
 });


exports['cannot create instance of abstractGame'] = function(test) {
	test.throws (
		function() {
			var g = new AbstractGame();
		},
		Error,
		"Cannot create AbstractGame objects."
		);
	test.done();
};

exports['can create a subclass and call a method'] = function(test) {
	var game = new DummyGame();
	test.equal("DUMMY", game.getType());
	test.done();
};

exports['missing method generates error'] = function(test) {
	test.throws (
			function() {
				var g = new DummyGame();
				g.initGame(null);
			},
			Error,
			"initGame() must be overriden by concrete class."
			);
	test.done();
};

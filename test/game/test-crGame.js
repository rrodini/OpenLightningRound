/**
 * test-crGame.js - unit tests for the CrGame module
 *
 */
var CrGame = require('../../lib/CrGame.js');
var game = null;

exports['setUp'] = function(callback) {
	game = new CrGame();
	return callback();
};

exports['tearDown'] = function(callback) { 
	return callback();
};

exports['getType() returns correct value'] = function(test) {
	test.equal("CR", game.getType());
	test.done();
};

exports['initGame() rejects too short player list'] = function(test) {
	test.throws (
		function() {
			var gamePlayersList = [{AAA : {startPos : 1, endPos: undefined }} ];
			game.initGame(gamePlayersList);
		},
		Error,
		""
	);
	test.done();
};

exports['initGame() accepts game player list'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }}];
	game.initGame(gamePlayerList);
	test.done();
};

exports['initRound() handles 2 player list'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	var expectedPlayerList = [{name: "AAA", buzzer : undefined, score: 0, registered: undefined },
		{name: "BBB", buzzer : undefined, score: 0, registered: undefined }];
	test.deepEqual(roundPlayerList, expectedPlayerList);
	test.done();
};


exports['initRound() handles 3 player list'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }},
		{CCC : {startPos : 3, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	var expectedPlayerList = [{name: "BBB", buzzer : undefined, score: 0, registered: undefined },
		{name: "CCC", buzzer : undefined, score: 0, registered: undefined }];
	test.deepEqual(roundPlayerList, expectedPlayerList);
	test.done();
};

exports['initRound() promotes winner1 following scoring round'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }},
		{CCC : {startPos : 3, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var firstRoundPlayerList = game.initRound(PlayerList);
//	pretend that a "round" is just one question.
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	var expectedPlayerList = [{name: "BBB", buzzer : undefined, score: 0, registered: true },
		{name: "AAA", buzzer : undefined, score: 0, registered: undefined }];
	var secondRoundPlayerList = game.initRound(firstRoundPlayerList);
//console.dir(secondRoundPlayerList);
	test.deepEqual(secondRoundPlayerList, expectedPlayerList);
	test.done();
};

exports['initRound() promotes winner2 following scoring round'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }},
		{CCC : {startPos : 3, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var firstRoundPlayerList = game.initRound(PlayerList);
//	pretend that a "round" is just one question.
	game.initQuestion();
	game.scoreCorrectAnswer("CCC");
	var expectedPlayerList = [{name: "CCC", buzzer : undefined, score: 0, registered: true },
		{name: "AAA", buzzer : undefined, score: 0, registered: undefined }];
	var secondRoundPlayerList = game.initRound(firstRoundPlayerList);
//console.dir(secondRoundPlayerList);
	test.deepEqual(secondRoundPlayerList, expectedPlayerList);
	test.done();
};

exports['initRound() promotes winner following two rounds'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }},
		{CCC : {startPos : 3, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var firstRoundPlayerList = game.initRound(PlayerList);
//	pretend that a "round" is just one question.
	game.initQuestion();
	game.scoreCorrectAnswer("CCC");
	var expectedPlayerList = [{name: "CCC", buzzer : undefined, score: 0, registered: true },
		{name: "AAA", buzzer : undefined, score: 0, registered: undefined }];
	var secondRoundPlayerList = game.initRound(firstRoundPlayerList);
//console.dir(secondRoundPlayerList);
	test.deepEqual(secondRoundPlayerList, expectedPlayerList);
	test.done();
};

exports['initRound() promotes winner following three rounds'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }},
		{CCC : {startPos : 3, endPos: undefined }},
		{DDD : {startPos : 4, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
//  no promotion in first round
	var firstRoundPlayerList = game.initRound(PlayerList);
	var expectedPlayerList = [{name: "CCC", buzzer : undefined, score: 0, registered: undefined },
		{name: "DDD", buzzer : undefined, score: 0, registered: undefined }];
	test.deepEqual(firstRoundPlayerList, expectedPlayerList);
//	a "round" requires 3 correct answers.
	game.initQuestion();
	game.scoreCorrectAnswer("DDD");
	game.initQuestion();
	game.scoreCorrectAnswer("DDD");
	game.initQuestion();
	game.scoreCorrectAnswer("DDD"); // "DDD" beats "CCC"
	var secondRoundPlayerList = game.initRound(firstRoundPlayerList);
	expectedPlayerList = [{name: "DDD", buzzer : undefined, score: 0, registered: true },
		{name: "BBB", buzzer : undefined, score: 0, registered: undefined }];
	test.deepEqual(secondRoundPlayerList, expectedPlayerList);
	var thirdRoundPlayerList = game.initRound(secondRoundPlayerList);
//	a "round" requires 3 correct answers.
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	game.initQuestion();
	game.scoreCorrectAnswer("BBB"); // "BBB" beats "DDD"
	expectedPlayerList = [{name: "BBB", buzzer : undefined, score: 0, registered: true },
		{name: "AAA", buzzer : undefined, score: 0, registered: undefined }];
	test.deepEqual(thirdRoundPlayerList, expectedPlayerList);
//console.dir(secondRoundPlayerList);
//	a "round" requires 3 correct answers.
	game.initQuestion();
	game.scoreCorrectAnswer("AAA");
	game.initQuestion();
	game.scoreCorrectAnswer("AAA");
	game.initQuestion();
	game.scoreCorrectAnswer("AAA"); // "AAA" beats "BBB"
	test.done();
};

exports['getRoundInfo() returns correct value for last round'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
	var score1 = game.scoreCorrectAnswer("AAA");
	// question #2
	game.initQuestion();
	var score2 = game.scoreCorrectAnswer("BBB");
	test.equal(game.getRoundInfo(), "<p>Round: 1 Question: 2 Goal: Must get 3 correct.</p>");
	// question #3
	game.initQuestion();
	score1 = game.scoreCorrectAnswer("AAA");
	// question #4
	game.initQuestion();
	score1 = game.scoreCorrectAnswer("AAA");
	test.equal(game.getRoundInfo(), "<p>AAA wins Countdown Round competition!</p>");
	test.done();
};

exports['getRoundInfo() returns correct value for early round'] = function(test) {
	var gamePlayerList =  [ { JJJ: { startPos:  1, endPos: undefined } },
		{ III: { startPos:  2, endPos: undefined } },
		{ HHH: { startPos:  3, endPos: undefined } },
		{ GGG: { startPos:  4, endPos: undefined } },
		{ FFF: { startPos:  5, endPos: undefined } },
		{ EEE: { startPos:  6, endPos: undefined } },
		{ DDD: { startPos:  7, endPos: undefined } },
		{ CCC: { startPos:  8, endPos: undefined } },
		{ BBB: { startPos:  9, endPos: undefined } },
		{ AAA: { startPos: 10, endPos: undefined } } ];

	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
	var score1 = game.scoreCorrectAnswer("AAA");
	// question #2
	game.initQuestion();
	var score2 = game.scoreCorrectAnswer("BBB");
	test.equal(game.getRoundInfo(), "<p>Round: 1 Question: 2 Goal: Most correct out of 3.</p>");
	// question #3
	game.initQuestion();
	test.equal(game.getRoundInfo(), "<p>Round: 1 Question: 3 Goal: Most correct out of 3.</p>");
	// question #4
	game.initQuestion();
	test.equal(game.getRoundInfo(), "<p>Round: 1 Question: 4 Goal: SUDDEN DEATH.</p>");
	// question #5
	game.initQuestion();
	var score3 = game.scoreCorrectAnswer("BBB");
	test.equal(game.getRoundInfo(), "<p>BBB wins round. AAA eliminated. New round.</p>");
	test.done();
};


exports['isRoundOver() 5th place vs. 4th place requires 3 correct'] = function(test) {
	var gamePlayerList =  [ { JJJ: { startPos:  1, endPos: undefined } },
		{ III: { startPos:  2, endPos: undefined } },
		{ HHH: { startPos:  3, endPos: undefined } },
		{ GGG: { startPos:  4, endPos: undefined } },
		{ FFF: { startPos:  5, endPos: undefined } } ];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
	game.scoreCorrectAnswer("FFF");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 GGG: 0");
	// question #2
	game.initQuestion();
	game.scoreCorrectAnswer("GGG");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 GGG: 1");
	// question #3
	game.initQuestion();
	game.scoreCorrectAnswer("FFF");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 2 GGG: 1");
	// question #4
	game.initQuestion();
	var score1 = game.scoreCorrectAnswer("GGG");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 2 GGG: 2");
	// question #5
	game.initQuestion();
	var score2 = game.scoreCorrectAnswer("GGG");

	test.ok(game.isRoundOver(), "Should end now FFF: 2 GGG: 3");
	test.equal(score1, 2);
	test.equal(score2, 3);
	test.done();
};
exports['isRoundOver() 6th place vs. 5th place requires wins 2-1'] = function(test) {
	var gamePlayerList =  [ { JJJ: { startPos:  1, endPos: undefined } },
		{ III: { startPos:  2, endPos: undefined } },
		{ HHH: { startPos:  3, endPos: undefined } },
		{ GGG: { startPos:  4, endPos: undefined } },
		{ FFF: { startPos:  5, endPos: undefined } },
		{ EEE: { startPos:  6, endPos: undefined } } ];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
	game.scoreCorrectAnswer("FFF");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 EEE: 0");
	// question #2
	game.initQuestion();
	var score1 = game.scoreCorrectAnswer("EEE");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 EEE: 1");
	// question #3
	game.initQuestion();
	var score2 = game.scoreCorrectAnswer("FFF");
	test.ok(game.isRoundOver(), "Should end now FFF: 2 EEE: 1");
	test.equal(score1, 1);
	test.equal(score2, 2);
	test.done();
};

exports['isRoundOver() 6th place vs. 5th place requires SUDDEN DEATH'] = function(test) {
	var gamePlayerList =  [ { JJJ: { startPos:  1, endPos: undefined } },
		{ III: { startPos:  2, endPos: undefined } },
		{ HHH: { startPos:  3, endPos: undefined } },
		{ GGG: { startPos:  4, endPos: undefined } },
		{ FFF: { startPos:  5, endPos: undefined } },
		{ EEE: { startPos:  6, endPos: undefined } } ];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
//console.log(game.getRoundInfo());
	var score1 = game.scoreCorrectAnswer("FFF");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 EEE: 0");
	// question #2
	game.initQuestion();
//console.log(game.getRoundInfo());
	game.scoreCorrectAnswer("EEE");
	test.ok(!game.isRoundOver(), "Should not end now FFF: 1 EEE: 1");
	// question #3
	game.initQuestion();
//console.log(game.getRoundInfo());
	// question #4
	game.initQuestion();
//console.log(game.getRoundInfo());
	// question #5
	game.initQuestion();
//console.log(game.getRoundInfo());
	var score2 = game.scoreCorrectAnswer("EEE");
	test.ok(game.isRoundOver(), "Should end now FFF: 1 EEE: 2");
	test.equal(score1, 1);
	test.equal(score2, 2);
	test.done();
};

exports['isGameOver() handles 2 player game AND getWinner() works'] = function(test) {
	var gamePlayerList = [{AAA : {startPos : 1, endPos: undefined }},
		{BBB : {startPos : 2, endPos: undefined }}];
	game.initGame(gamePlayerList);
	var PlayerList = [];
	var roundPlayerList = game.initRound(PlayerList);
	// question #1
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	test.ok(!game.isRoundOver(), "Round should not end now AAA: 0 BBB: 1");
	test.ok(!game.isGameOver(),  "Game  should not end now AAA: 0 BBB: 1");
	// question #2
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	test.ok(!game.isRoundOver(), "Round should not end now AAA: 0 BBB: 2");
	test.ok(!game.isGameOver(),  "Game  should not end now AAA: 0 BBB: 2");
	// question #3
	game.initQuestion();
	game.scoreCorrectAnswer("AAA");
	test.ok(!game.isRoundOver(), "Round should not end now AAA: 1 BBB: 2");
	test.ok(!game.isGameOver(),  "Game  should not end now AAA: 1 BBB: 2");
	// question #4
	game.initQuestion();
	game.scoreCorrectAnswer("BBB");
	test.ok(game.isRoundOver(), "Round should end now AAA: 1 BBB: 3");
	test.ok(game.isGameOver(),  "Game  should end now AAA: 1 BBB: 3");
	test.equal(game.getWinner(), "BBB", "Expect BBB to win");
	test.done();
};


exports['play a complete 10 player game'] = function(test) {
	function playRound(roundWinner, roundPlayers) {
		var nextRoundPlayers = game.initRound(roundPlayers);
		for (var i=0; i<3; i++) {
			game.initQuestion();
			//  3 correct answers will win an early or a late round.
			game.scoreCorrectAnswer(roundWinner);
		}
		return nextRoundPlayers;
	}
	var gamePlayerList =  [ { JJJ: { startPos:  1, endPos: undefined } },
		{ III: { startPos:  2, endPos: undefined } },
		{ HHH: { startPos:  3, endPos: undefined } },
		{ GGG: { startPos:  4, endPos: undefined } },
		{ FFF: { startPos:  5, endPos: undefined } },
		{ EEE: { startPos:  6, endPos: undefined } },
		{ DDD: { startPos:  7, endPos: undefined } },
		{ CCC: { startPos:  8, endPos: undefined } },
		{ BBB: { startPos:  9, endPos: undefined } },
		{ AAA: { startPos: 10, endPos: undefined } } ];
	game.initGame(gamePlayerList);
	// AAA vs. BBB
	var roundPlayers = playRound("AAA", []);
	// AAA vs. CCC
	roundPlayers = playRound("CCC", roundPlayers);
	// CCC vs. DDD
	roundPlayers = playRound("CCC", roundPlayers);
	// CCC vs. EEE
	roundPlayers = playRound("EEE", roundPlayers);
	// EEE vs. FFF
	roundPlayers = playRound("EEE", roundPlayers);
	// EEE vs. GGG
	roundPlayers = playRound("GGG", roundPlayers);
	// GGG vs. HHH
	roundPlayers = playRound("GGG", roundPlayers);
	// GGG vs. III
	roundPlayers = playRound("III", roundPlayers);
	// III vs. JJJ
	roundPlayers = playRound("III", roundPlayers);
	test.ok(game.isGameOver(), "Game should be over");
	test.equal(game.getWinner(), 'III', "III should win");
	test.done();
};

/**
 * crGame.js - implementation of Countdown Round game (as per mathcounts).
 */
"use strict";

let util = require('util');
let AbstractGame = require('./AbstractGame');
// instance variables
//let type; // String
//let rankedPlayerList; // array of {name: {startPos: i, endPos: j }} Note: name is unique.
//let currentRound; // Number: 1 .. totalRounds
//let totalRounds; // Number: rankedPlayerList.length
//let player1Score; // Object: {name: nme, score: correct, index: n} Note: current defender
//let rankedPlayer1Entry; // Object: element from rankedPlayerList
//let player2Score; // Object: {name: nme, score: correct, index: n} Note: current challenger
//let rankedPlayer2Entry; // Object: element from rankedPlayerList
//let questionCount; // Number: # questions asked for round

function CrGame() {
	this.type = 'CR';
}
util.inherits(CrGame, AbstractGame);
// initialize the game.
function initGame(gamePlayerList) {
	this.rankedPlayerList = gamePlayerList;
	this.totalRounds = this.rankedPlayerList.length - 1;
	this.currentRound = 0;
	this.player1Score = {};
	this.rankedPlayer1Entry = {};
	this.player2Score = {};
	this.rankedPlayer2Entry = {};
	this.questionCount = 0;
	if (this.totalRounds < 1) {
		throw new Error("Countdown Round must have at least two players");
	}
}
// private: update the final position of both players for the round.
// Note: self === this
function updateRankingsFollowingRound(self) {
	// called after a correct answer is given
	if (self.isRoundOver()) {
		let player1Name;
		let player2Name;
		let player1Index;
		let player2Index;
		let player1EndPos;
		let player2EndPos;
		player1Name = self.player1Score.name;
		player2Name = self.player2Score.name;
		player1Index = self.player1Score.index;
		player2Index = self.player2Score.index;
		if (self.player1Score.score > self.player2Score.score) {
			player1EndPos = self.totalRounds - (self.currentRound-1);
			player2EndPos = self.totalRounds - (self.currentRound-2);
		} else {
			player1EndPos = self.totalRounds - (self.currentRound-2);
			player2EndPos = self.totalRounds - (self.currentRound-1);
		}
		self.rankedPlayerList[player1Index][player1Name].endPos = player1EndPos;
		self.rankedPlayerList[player2Index][player2Name].endPos = player2EndPos;
	}
}
// pick the two players for the upcoming round.
function initRound(playerList) {
	let player1Name;
	let player2Name;
	let player1Index;
	let player2Index;
	let firstRound = false;
	function buildPlayer(name, winner) {
		// if 'registered' property is undefined, then player must register for the round.
		let p = {name: name, buzzer: undefined, score: 0, registered: winner? true: undefined};
		return p;
	}
	// initialize the score tracking for the round.
	function initializePlayerScore(self, name, winner, index) {
		if (winner) {
			self.player1Score = {name: name, score: 0, index: index};
		} else {
			self.player2Score = {name: name, score: 0, index: index};
		}
	}
	
	this.currentRound++;
	this.questionCount = 0;
	if (playerList.length === 0) {
		// must be 1st round
		firstRound = true;
		player1Index = this.totalRounds-this.currentRound;
		this.rankedPlayer1Entry = this.rankedPlayerList[player1Index];
		player2Index = this.totalRounds-(this.currentRound-1);
		this.rankedPlayer2Entry = this.rankedPlayerList[player2Index];
		player1Name = Object.keys(this.rankedPlayer1Entry)[0];
		player2Name = Object.keys(this.rankedPlayer2Entry)[0];
	} else {
		player1Name = this.player1Score.name;
		player2Name = this.player2Score.name;
		player1Index = this.player1Score.index;
		player2Index = this.player2Score.index;
		if (this.player1Score.score > this.player2Score.score) {
			// player1 advances, player2 eliminated.
		} else {
			// player2 advances, player1 eliminated.
			player1Name = player2Name;
			player1Index = player2Index;
		}
		// get index of next challenger
		player2Index = this.totalRounds - this.currentRound ;
		this.rankedPlayer2Entry = this.rankedPlayerList[player2Index];
		player2Name = Object.keys(this.rankedPlayer2Entry)[0];
	}
	initializePlayerScore(this, player1Name, true, player1Index);
	initializePlayerScore(this, player2Name, false, player2Index);
	return [buildPlayer(player1Name, (!firstRound)? true: false), buildPlayer(player2Name, false)];
}
// private: basically means "has we reached the fourth (or lower) ranked player?"
// Note: self === this
function roundRequiresThreeCorrectAnswers(self) {
	return (self.totalRounds - self.currentRound) < 4;
}

/** 
 * getRoundInfo - return display info for the round.
 * At beginning of round:
 *    Round: x  Goal: Most correct out of 3   -OR-
 *    Round: x  Goal: SUDDEN DEATH   -OR-
 *    Round: x  Goal: Must get 3 correct
 * At the end of game:
 *    AAA wins the Countdown Round competition! -OR-
 * At the end of round:
 *    AAA wins round. BBB eliminated. New round.
 */
function getRoundInfo() {
	function scoreTiedAfterQuestions(self) {
		return (self.questionCount > 3 &&
			   ((self.player1Score.score === 0 && self.player2Score.score === 0) ||
				(self.player1Score.score === 1 && self.player2Score.score === 1)));
	}
	// this logic is needed to properly display the status of a round as getRoundInfo is 
	// repeatedly displayed after every question and after every correct answer.
	let html = "<p>";
	if (this.isGameOver()) {
		html += this.getWinner() + " wins Countdown Round competition!";
	} else if (this.isRoundOver()) {
		let roundWinner, roundLoser;
		if (this.player1Score.score > this.player2Score.score) {
			roundWinner = this.player1Score.name;
			roundLoser =  this.player2Score.name;
		} else {
			roundWinner = this.player2Score.name;
			roundLoser =  this.player1Score.name;
		}
		html += roundWinner + " wins round. " + roundLoser + " eliminated. New round." ;
	} else {
		// round is in progress
		html += "Round: " + this.currentRound + " | Question: " + this.questionCount + " | Goal: ";
		if (roundRequiresThreeCorrectAnswers(this)){
			html += "Must get 3 correct.";
		} else {
			if (scoreTiedAfterQuestions(this)) {
				html += "SUDDEN DEATH.";
			} else {
				html += "Most correct of 3.";
			}
		}
	}
	html += "</p>";
	return html;
}
// just bump the question count.
function initQuestion() {
	this.questionCount++;
}
// a correct score is the only place where a player is eliminated, so do the rankings here.
function scoreCorrectAnswer (playerName) {
	let score;
	if (this.player1Score.name === playerName) {
		score = ++this.player1Score.score;
		
	} else if (this.player2Score.name === playerName) {
		score = ++this.player2Score.score;
	}
	updateRankingsFollowingRound(this);
	return score;
}

function scoreIncorrectAnswer(player) {
//	no op for now.
}
// as per stated rules on MathCounts website as interpreted by Rodini.
function isRoundOver() {
	function playerHasOutScoredOpponent(self) {
		return (self.player1Score.score > self.player2Score.score) ||
			    (self.player2Score.score > self.player1Score.score);
	}
	if (roundRequiresThreeCorrectAnswers(this)){
		return (this.player1Score.score >= 3) || (this.player2Score.score >= 3);
	} else {
		if (this.questionCount === 2) {
			// is either player 2 for 2?
			return (this.player1Score.score === 2) || (this.player2Score.score === 2);
		} else if (this.questionCount === 3) {
			// has either player outscored the other?
			return playerHasOutScoredOpponent(this);
		} else {
			// true side is SUDDEN DEATH, false side is MATCH IN PROGRESS
			return this.questionCount > 3? playerHasOutScoredOpponent(this) : false;
		}
	}
}
// game is over if the round is over and it's the last round.
function isGameOver() {
	return (this.currentRound >= this.totalRounds) && this.isRoundOver();
}
// should only be called when isGameOver() is true.
function getWinner() {
	let winner;
	this.rankedPlayerList.forEach(function (e) {
		let name = Object.keys(e)[0];
		if (e[name].endPos === 1) {
			winner = name;
		}
	});
	return winner;
}
// this is simple since the rankings were being updated all along.
function getResults() {
	return this.rankedPlayerList;
}

function getType() {
	return this.type;
}

Object.assign(CrGame.prototype, {
	constructor: CrGame,
//  override abstract methods w/ implementations defined above
	initGame : initGame,
	initRound : initRound,
	getRoundInfo : getRoundInfo,
	initQuestion : initQuestion,
	scoreCorrectAnswer : scoreCorrectAnswer,
	scoreIncorrectAnswer : scoreIncorrectAnswer,
	isRoundOver : isRoundOver,
	isGameOver : isGameOver,
	getWinner : getWinner,
	getResults : getResults,
	getType: getType
});

module.exports = CrGame;
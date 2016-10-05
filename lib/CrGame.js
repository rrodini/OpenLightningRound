/**
 * crGame.js - implementation of Countdown Round game (as per mathcounts).
 */
"use strict";

let util = require('util');
let AbstractGame = require('./AbstractGame');

let rankedPlayerList; // array of {name: {startPos: i, endPos: j }} Note: name is unique.
let currentRound; // range: 1 .. totalRounds
let totalRounds; // derived from # elements in initial rankedPlayerList
let player1Score; // current defender, {name: nme, score: correct, index: n}
let rankedPlayer1Entry; // from rankedPlayerList
let player2Score; // current challenger, {name: nme, score: correct, index: n}
let rankedPlayer2Entry; // from rankedPlayerList
let questionCount; // # questions asked for round

function CrGame() {
	this.type = 'CR';
}
util.inherits(CrGame, AbstractGame);
// initialize the game.
function initGame(gamePlayerList) {
	rankedPlayerList = gamePlayerList;
	totalRounds = rankedPlayerList.length - 1;
	currentRound = 0;
	questionCount = 0;
	if (totalRounds < 1) {
		throw new Error("Countdown Round must have at least two players");
	}
}
// private: update the final position of both players for the round.
function updateRankingsFollowingRound() {
	// called after a correct answer is given
	if (isRoundOver()) {
		let player1Name;
		let player2Name;
		let player1Index;
		let player2Index;
		let player1EndPos;
		let player2EndPos;
		player1Name = player1Score.name;
		player2Name = player2Score.name;
		player1Index = player1Score.index;
		player2Index = player2Score.index;
		if (player1Score.score > player2Score.score) {
			player1EndPos = totalRounds - (currentRound-1);
			player2EndPos = totalRounds - (currentRound-2);
		} else {
			player1EndPos = totalRounds - (currentRound-2);
			player2EndPos = totalRounds - (currentRound-1);
		}
		rankedPlayerList[player1Index][player1Name].endPos = player1EndPos;
		rankedPlayerList[player2Index][player2Name].endPos = player2EndPos;
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
	function initializePlayerScore(name, winner, index) {
		if (winner) {
			player1Score = {name: name, score: 0, index: index};
		} else {
			player2Score = {name: name, score: 0, index: index};
		}
	}
	
	currentRound++;
	questionCount = 0;
	if (playerList.length === 0) {
		// must be 1st round
		firstRound = true;
		player1Index = totalRounds-currentRound;
		rankedPlayer1Entry = rankedPlayerList[player1Index];
		player2Index = totalRounds-(currentRound-1);
		rankedPlayer2Entry = rankedPlayerList[player2Index];
		player1Name = Object.keys(rankedPlayer1Entry)[0];
		player2Name = Object.keys(rankedPlayer2Entry)[0];
	} else {
		player1Name = player1Score.name;
		player2Name = player2Score.name;
		player1Index = player1Score.index;
		player2Index = player2Score.index;
		if (player1Score.score > player2Score.score) {
			// player1 advances, player2 eliminated.
		} else {
			// player2 advances, player1 eliminated.
			player1Name = player2Name;
			player1Index = player2Index;
		}
		// get index of next challenger
		player2Index = totalRounds - currentRound ;
		rankedPlayer2Entry = rankedPlayerList[player2Index];
		player2Name = Object.keys(rankedPlayer2Entry)[0];
	}
	initializePlayerScore(player1Name, true, player1Index);
	initializePlayerScore(player2Name, false, player2Index);
	return [buildPlayer(player1Name, (!firstRound)? true: false), buildPlayer(player2Name, false)];
}
// private: basically means "has we reached the fourth (or lower) ranked player?"
function roundRequiresThreeCorrectAnswers() {
	return (totalRounds - currentRound) < 4;
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
	function scoreTiedAfterQuestions() {
		return (questionCount > 3 && 
			   ((player1Score.score === 0 && player2Score.score === 0) ||
				(player1Score.score === 1 && player2Score.score === 1)));
	}
	// this logic is needed to properly display the status of a round as getRoundInfo is 
	// repeatedly displayed after every question and after every correct answer.
	let html = "<p>";
	if (isGameOver()) {
		html += getWinner() + " wins Countdown Round competition!";
	} else if (isRoundOver()) {
		let roundWinner, roundLoser;
		if (player1Score.score > player2Score.score) {
			roundWinner = player1Score.name;
			roundLoser =  player2Score.name;
		} else {
			roundWinner = player2Score.name;
			roundLoser =  player1Score.name;
		}
		html += roundWinner + " wins round. " + roundLoser + " eliminated. New round." ;
	} else {
		// round is in progress
		html += "Round: " + currentRound + " | Question: " + questionCount + " | Goal: ";
		if (roundRequiresThreeCorrectAnswers()){
			html += "Must get 3 correct.";
		} else {
			if (scoreTiedAfterQuestions()) {
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
	questionCount++;
}
// a correct score is the only place where a player is eliminated, so do the rankings here.
function scoreCorrectAnswer (playerName) {
	let score;
	if (player1Score.name === playerName) {
		score = ++player1Score.score;
		
	} else if (player2Score.name === playerName) {
		score = ++player2Score.score;
	}
	updateRankingsFollowingRound();
	return score;
}

function scoreIncorrectAnswer(player) {
//	no op for now.
}
// as per stated rules on MathCounts website as interpreted by Rodini.
function isRoundOver() {
	function playerHasOutScoredOpponent() {
		return (player1Score.score > player2Score.score) || (player2Score.score > player1Score.score);
	}
	if (roundRequiresThreeCorrectAnswers()){
		return (player1Score.score >= 3) || (player2Score.score >= 3);
	} else {
		if (questionCount === 2) {
			// is either player 2 for 2?
			return (player1Score.score === 2) || (player2Score.score === 2);
		} else if (questionCount === 3) {
			// has either player outscored the other?
			return playerHasOutScoredOpponent();
		} else {
			// true side is SUDDEN DEATH, false side is MATCH IN PROGRESS
			return questionCount > 3? playerHasOutScoredOpponent() : false;
		}
	}
}
// game is over if the round is over and it's the last round.
function isGameOver() {
	return (currentRound >= totalRounds) && isRoundOver();
}
// should only be called when isGameOver() is true.
function getWinner() {
	let winner;
	rankedPlayerList.forEach(function (e) {
		let name = Object.keys(e)[0];
		if (e[name].endPos === 1) {
			winner = name;
		}
	});
	return winner;
}
// this is simple since the rankings were being updated all along.
function getResults() {
	return rankedPlayerList;
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
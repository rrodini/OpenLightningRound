/**
 * CrPlayersList.js - responsible for reformatting the Countdown Round playersJSON.
 */

"use strict";

let winston = require('winston');

let logger = winston.loggers.get('application');

// Attention: this function may throw an error
// load the players file with this JSON format:
// [
//	 {  "rank": 1, "name": "AAA"},
//	 ...
//	 { "rank": 10, "name": "JJJ"}
// ]
// and return an array in this object format:
// [
//  {"AAA" : {startPos:  1, endPos: undefined}},
//  ...
//  {"JJJ" : {startPos: 10, endPos: undefined}}
// ]
exports.getRankedPlayers = function (playersList) {
	let input = playersList;
	let output = [];
	let startPositions = [];
	let names = [];
	function unique(pos, name) {
		if (startPositions.indexOf(pos) >= 0) {
			logger.error("Player start position is not unique: " + pos);
			throw new Error("Player start position is not unique: " + pos);
		}
		if (names.indexOf(name) >= 0) {
			logger.error("Player name is not unique: " + name);
			throw new Error("Player name is not unique: " + name);
		}
		startPositions.push(pos);
		names.push(name);
		return true;
	}
	try {
		input.forEach(function(e, i, a) {
			// e has format: {  "rank": n, "name": "name"}
			let startPosition = e.rank;
			let name = e.name;
			// now convert to integer
			if (isNaN(Number(startPosition))) {
				throw new Error("Start position is not a number");
			}
			startPosition = parseInt(startPosition);
			if (unique(startPosition, name)) {
				let entry = {};
				entry[name] = {startPos: startPosition, endPos: undefined};
				output.push(entry);
			}
		});
	} catch (e) {
		logger.error(e.message);
		throw e;
	}
	output.sort(function(a, b){
		// sort entries on the starting positions of the named players.
		let name1 = Object.keys(a)[0];
		let name2 = Object.keys(b)[0];
		let pos1 = a[name1].startPos;
		let pos2 = b[name2].startPos;
		return (pos1 - pos2);
	});
	return output;
}

/**
 * CrPlayersFile.js - responsible for reading the Countdown Round player file from disk.
 */

"use strict";

let fs = require('fs');
let winston = require('winston');

let path;
let logger = winston.loggers.get('application');
/* 
 * Constructor
 */
function CrPlayersFile(filePath) {
	// set the abs. path for the cr player files.
	let stat = fs.lstatSync(filePath);
	if (!stat.isFile()) {
		logger.error("File path is not valid: " + path);
		throw new Error("CrPlayersFile() was not passed an abs. file name: " + filePath);
	}
	path = filePath;
}

// Attention: this function may throw an error
// load the players file with this JSON format:
// [
//	 {  "1": "AAA"},
//	 ...
//	 { "10": "JJJ"}
// ]
// and return an array in this object format:
// [
//  {"AAA" : {startPos:  1, endPos: undefined}},
//  ...
//  {"JJJ" : {startPos: 10, endPos: undefined}}
// ]
CrPlayersFile.prototype.getRankedPlayers = function () {
	let data = fs.readFileSync(path);
	let input;
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
		input = JSON.parse(data);
	} catch (e) {
		logger.error("Error parsing countdown round players file: " + path);
		throw e;
	}
	try {
		input.forEach(function(e, i, a) {
			// e has format: {  "n": "name"}
			let startPosition = Object.keys(e)[0];
			let name = e[startPosition];
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
};

module.exports = CrPlayersFile;

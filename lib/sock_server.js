/**
 * sock_server.js - uses socket.io module for socket connections between
 * player clients and the one admin client.
 */
"use strict";

let socketio = require('socket.io');
let os = require('os');
let path = require('path');
let ReadJsonFile = require('./ReadJsonFile');
let DirectoryContents = require('./DirectoryContents');
let winston = require('winston');
let olr = require("./olr");
let olrOpt = require('./olr_options');
let CrPlayersFile = require('./CrPlayersFile');
let fs = require('fs');
let pkg = require('../package.json');
let Scoreboard = require('./Scoreboard');
let MathFormatter = require('./MathFormatter');

// global variables
let io; // socket io object
let appInfo; // application info - IP, port#, version
let admin_channel;	// channel for talking to admin client
let admin_count = 0; // # of admin clients. Admin #1 is special.
let player_channel; // channel for talking to player clients
let player_count = 0; // # of player clients
let player_map = {}; // properties (keys) are socket.id's, values are player objects
let logger = winston.loggers.get('application'); // for logging
let questionsList = null; // questions for game
let currentQuestionAnswer; // current question and answer
let version = pkg.version; // official version #.  Don't forget to increment.
let scoreboard;	// scoreboard encapsulates the game being played and the current players.
let projector_channel; // channel for talking to projector client
let figures = new Map(); // map with each figure as a dataurl
let mathFormat = new MathFormatter(figures);

exports.listen = function(server) {
	logger.info('socket server now listening');
	io = socketio.listen(server);
	admin_channel = io.of('/admin');
//  admin connections below
	admin_channel.on('connection', function(socket) {
		logger.info('>>connection');
		logger.info('admin connection %s', socket.id);
		admin_count++;
		logger.info('admin count: %d', admin_count);
		console.log("IP: " + olr.getServerIP());
		console.log("port: " + olr.getServerPort());
		console.log("Version: " + version);
		appInfo = {appVersion: version, serverIP: olr.getServerIP(), serverPort: olr.getServerPort()};
		socket.emit('info', appInfo);
		logger.info('info>>admin');
		processAdminCommand(socket);
	});
	player_channel = io.of('/player');
//  player connections below
	player_channel.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("player connection " + socket.id);
		// don't have name of player yet, but accept socket connection.
		player_count++;
		player_map[socket.id] = {};
		logger.info('player count:' + player_count);
		processPlayerCommand(socket);
    });
	projector_channel = io.of('/projector');
//  projector connections below
	projector_channel.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("projector connection " + socket.id);
		processProjectorCommand(socket);
	});

// scoreboardUpdate is a callback passed to scoreboard object.
// It must be visible to both processAdminCommand and processPlayerCommand
function scoreboardUpdate(status, pList) {
	admin_channel.emit('update-scoreboard', {status: status, playerList: pList});
	projector_channel.emit('update-scoreboard', {status: status, playerList: pList});
	logger.info('  update-scoreboard>>admin/projector');
}
// markingButtonsUpdate is a callback passed to the scoreboard object
function markingButtonsUpdate(enable) {
	admin_channel.emit('update-marking-buttons', enable);
	logger.info('  update-marking-buttons>>admin');
}
/**
 * processAdminCommand - message (command) received from Admin1.
 */
function processAdminCommand(socket) {
	socket.on('load-folder-file', function (data) {
		logger.info('>>load-folder-file');
		// get root folder from configuration file (or CLI argument).
		let folder = olrOpt.getOption('olr-folder');
		let dc = new DirectoryContents(folder);
		let contents = dc.getContents();
		admin_channel.emit('select-folder-file', contents);
		logger.info('  select-folder-file>>admin');
	});
	socket.on('start-game', function(data) {
		logger.info('>>start-game');
	//  NEW, NEW, NEW
		let gameType = data.gameType;
		let questionsFile = data.questionsFile;
		let rankedPlayersFile = data.playersFile;
		logger.info("gameType: ", gameType);
		logger.info("questionsFile: " + questionsFile);
		logger.info("playersFile: " + rankedPlayersFile);

		let questionsError = false;
		let playersError = false;
		scoreboard = new Scoreboard(gameType, scoreboardUpdate, markingButtonsUpdate);
		let rankedPlayersList = [];
		if (gameType === 'CR') {
			try { // read the players file.
				let fileReader = new CrPlayersFile(rankedPlayersFile);
				rankedPlayersList = fileReader.getRankedPlayers();
			} catch (e) {
				// can't load players file.
				playersError = true;
			}
		}
		try { // read the questions file.
			let readJson = new ReadJsonFile();
			let json = readJson.read("questions", questionsFile);
			questionsList = json.questions_and_answers;

			// load the figures from Json here.
			// but for now, cheat:
            figures.set("figure-10", "<div><img src=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAABJAQMAAABLvZmfAAAABlBMVEX///8jHyCZ/QWRAAAALUlEQVQoz2P4DwMNDA0MCgwcDEwMDEOPieYLBpDo0GP+//8AyGQe8r4YXikKAHXFeVRwVlYzAAAAAElFTkSuQmCC></div>");
            figures.set("figure-13", "<div><img src=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABTCAMAAABXqPIJAAACMVBMVEX///+oqa0jHyAsKStramzPzs7//vrfmlU/PT6b3vokJlbz8/OhoaXb2tuKio5RT1JQTU4wLS6SkpZeXF1JR0gjHzu++v//+eO1tLWZmp2DgoXy///+++uop6ibmpp7en0nNnV0c3NjYWRRTk82MzXn/v/H7vz//fbn5+f9+Nz+9MPCwcIkTZf7049+fH18enqyhW5aWVvPiEgwHytxRikiHyhpKCH4///b/v/R/P/j+f7Z+f688v7P7Pv//O+21u93ve9or+RYod1Smtj+99dLlNW+vb0wb7f/77L84KWZl5f91pTEoo6Ni4z3w31ncnjyuHJubG06VWjgnl1kVU8kIUprV0A2NDYrJyg3HyiSRSdeNCdFICU+JyNLICDT+P7//vzU7/u46Pui4vrE5fmV2fjP5fay3vWt6PR+w+9xuOp4t+D+99X+79L53s7+9s1YjsVeg8X+7sN4msLPvr5BdbxSg7rv2LnvxLhrmrSElLPv2LE0arD+6KxJXadUl6WEkKRegqOMd6JSdaEkVqGEoZ/lw5qKcpk0V5lkiJheapjvzZdEaY4sT4x+h4gkQIjvwoGtmoCbV340T30kOHgwN3YkOHVCW2+ERGtQVWrorGjDkGSEcGOQfF0lKl1QT1y9iFndmlczOFfIiVO+dVJLTE3UjkybcEszPkvDfUZQTURQP0G+dT2+dTg7IDcsIDZsODUzITWiVjAkHzCETy8jHyybUCqQSSmENSJ3JyBYISDtRhi9AAACwklEQVRYw+3Z1VfbYBjH8d/elCwjSb1UqEApMtwZPoaMwbAxhjN3d3d3d3d331+3HjboaTu6juY5Z5zD9yIXuXg+Sd67Jxjvv6lxfREUaHL2bK1W07JjPgKyv4orgxIl50ZP4nd+urIA/u0u/DwNSsRPjJ4ENHdXB9xu39uTPkU5oDUv4HFTry27b1quDGDaXne+93QS/GrdHFtfOD1WGeC483b/xaX+Z//hmfZF/52Fin2ijAH/D56xJ9F76asFIEdFkDwEpH6Pi4Ev+6MVAGq+XCoDulgEdf0G+HN9uxIxnPnmm/2LwB/JLzhVCU41YdSpOJhn5hfMip/z/mA5RihCwNeYBNzUgJGNdYCjBhgxoKcGbNSAykAMGDOJAc5CC+iZTAvE60ALaNqIAWahBWwshRbISQApIHEOWsDFRFrA2AZSwMrSaIEcAaSAxBy0gEonkgIS1wBSwPsCpICVOUEKaASQAmqWRgpIHgNIAbcuhRRQMwcoAanTAFJAoxNJARWLAiVgYw2gBPRcFigBK5cgUgKSoBVBCEiCTgQh4J0vgxDQewQZhIDed74kgIt55xMCbpYJ0AFWgVlACNg4QQYdIGlYpgg6IJ4T0gAyQC2wJhFkgNrIDDJCxUJszO+27KsMAILHRwF/B1Znv3x8/fDRYr+NecdifuvTt+tiRwIkl+AbHxqY8W5LCewPL8cEbWvtz01Vfwb0ORzLigLCAdZ+TS8FUHMhCPDaPw4lBgM2dycTHCIQHtDcXQtv87YlBQOp3+Ji/AG1SsOYtklGmDEkPzFNhS9/YFXPMGBVu1QagTEhy5KC8GOoeB0CqC88WwzO42GDcRz798C3f6waCeBv5FUDFqdzcI0+2hoHfv2GWFMeCPAne4/NRcRV5HasLAI2HCjFUEMb8wcbS6BA5nt5V8/cOpEEusyb6pZgvPEU7Cd8L3ETnnys2wAAAABJRU5ErkJggg==></div>");


            // send to admin for display.
			admin_channel.emit('load-questions', questionsList);
			logger.info('  load-questions>>admin');
		} catch (e) {
			// can't load questions file.
			questionsError = true;
		}
		scoreboard.initScoreboard(rankedPlayersList);
		admin_channel.emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		projector_channel.emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		logger.info('  start-game>>all admin/projectors');
	});
	socket.on('ask-question', function (data) {
		let index = data;
		let rawQuestion =  questionsList[index].q;
		let rawAnswer = questionsList[index].a;
		// process the question NOW (backticks indicate needed processing)
        let qPromise = mathFormat.format(rawQuestion);
logger.debug(`raw question: ${rawQuestion}`);
logger.debug(`figure-10: ${figures.get("figure-10")}`);
logger.debug(`raw answer: ${rawAnswer}`);

        let aPromise = mathFormat.format(rawAnswer);
        let qaPromises = [qPromise, aPromise];

        Promise.all(qaPromises).then( (results) => {
            currentQuestionAnswer = {q: results[0], a: results[1]};
			logger.info('>>ask-question');
			scoreboard.askQuestion();
            admin_channel.emit('ask-question', results[0]);
            admin_channel.emit('show-answer', results[1]);
            projector_channel.emit('ask-question', results[0]);
            player_channel.emit('ask-question', results[0]);
            logger.info('  ask-question>>all admin/projectors/players');
         }).catch ((failMsg) => {
            logger.info('>>ask-question');
            scoreboard.askQuestion();
            admin_channel.emit('ask-question', 'Error processing q or a.  Ask another.');
            logger.info('Failure message: ' + failMsg);
            logger.info('  ask-question>>admin');
        });


// TODO: eliminate old code below.
//         currentQuestionAnswer = {q: question, a: answer};
// 		logger.info('>>ask-question');
// 		scoreboard.askQuestion();
// 		// broadcast to all admins and players below
// 		admin_channel.emit('ask-question', question);
// 		projector_channel.emit('ask-question', question);
// 		player_channel.emit('ask-question', question);
// 		logger.info('  ask-question>>all admin/projectors/players');
	});
	socket.on('test-buzzers', function (data) {
		logger.info('>>test-buzzers');
		// forward to all clients
		admin_channel.emit('test-buzzers');
		player_channel.emit('test-buzzers');
		logger.info('  test-buzzers>>all admin/players');
	});
	socket.on('mark-correct', function(data) {
		logger.info('>>mark-correct');
		scoreboard.markCorrect();
		// automatically show the answer.
		// TODO: delete this line. admin_channel.emit('show-answer', currentQuestionAnswer.a);
		projector_channel.emit('show-answer', currentQuestionAnswer.a);
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('mark-incorrect', function(data) {
		logger.info('>>mark-incorrect');
		// this will highlight the next player who has buzzed in.
		scoreboard.markIncorrect();
	});
	socket.on('show-answer', function(data) {
		logger.info('>>show-answer');
		admin_channel.emit('show-answer', data);
		projector_channel.emit('show-answer', data);
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('disconnect', function(data) {
		logger.info('>>disconnect');
		logger.info('unregistering admin w/ number: ' + admin_count);
		admin_count--;
		if (admin_count === 0) {
			logger.info('================================');
			// Admin1 has disconnected - game over for all players
			player_channel.emit('shutdown');
			projector_channel.emit('shutdown', data);
			logger.info('  shutdown>>all players/projectors');
		}
	});
}
/**
 * processPlayerCommand - message (command) received from a player.
 */
function processPlayerCommand(socket) {
	// function below plays a "buzzer" sound (depends on the audio file).
	function playAudio(mp3File) {
		// afplay is pre-installed on most unix systems.
		let player = 'afplay';
		if (os.type() === 'Windows_NT') {
		//  mplayer must be installed separately on Windows systems.
			player = 'mplayer';
		}
		let spawn = require('child_process').spawn;
		spawn(player, [mp3File]);
		// Don't do spawnSync as it delays the event loop unnecessarily.
	}
	socket.on('register', function(data) {
		let name = data.name;
		logger.info('>>register ' + name);
		let duplicate = false;
		// send message to socket if name is already registered.
		for (let socket_id in player_map) {
			if (player_map.hasOwnProperty(socket_id) && player_map[socket_id].name !== undefined) {
				logger.info('comparing ' + player_map[socket_id].name.toUpperCase() + '===' + name.toUpperCase());
				if (player_map[socket_id].name.toUpperCase() === name.toUpperCase() ) {
					logger.info('player w/ duplicate name: ' + name);
					duplicate = true;
					break;
				}
			}
		}
		if (duplicate) {
			// tell player with the duplicate name to refresh screen.
			// when player complies this disconnects the socket and opens a new one.
			socket.emit("deregister", {name: name, reason: "Duplicate name: refresh your screen and enter a different name."});
			logger.info('  deregister>>player');
		} else {
			let new_player = {'name': name };
			player_map[socket.id] = new_player;
			logger.info('registering player w/ name: ' + name);
			socket.emit("registered");
			logger.info('  registered>>player');
			// forward registration to admin
			scoreboard.registerPlayer(name);
		}
	});
	socket.on('buzz', function(data) {
//		var buzzStart = new Date();
		logger.info('>>buzz: ' + data.name + '(answer: ' + data.answer + ')' );
		// forward immediately to the admin console
		// sound the buzzer
		let mp3Path = path.resolve(__dirname , '../resources/doorbell.mp3');
		playAudio(mp3Path);
//		console.log("buzz time: %d milliseconds", new Date() - buzzStart  );
		scoreboard.recordBuzz(data.name, data.answer);
	});
	socket.on('disconnect', function(data) {
		logger.info('>>disconnect');
		// disconnect may be due to closing browser window, refreshing window, or navigating away from window
		let playerInfo = player_map[socket.id];
		logger.info('unregistering player w/ name: ' + playerInfo.name);
		scoreboard.deregisterPlayer(playerInfo.name);
		delete player_map[socket.id];
		player_count--;
	});
}
/**
 * processProjectorCommand - message (command) received from a projector. None??
 */
function processProjectorCommand(socket) {
}

};



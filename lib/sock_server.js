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
let version = pkg.version; // official version #.  Don't forget to increment.
let admin_nsp;	// namespace for talking to admin client
let player_nsp; // namespace for talking to player clients
let projector_nsp; // namespace for talking to projector client
let logger = winston.loggers.get('application'); // for logging
let mathFormat = new MathFormatter(); // formula formatting, assumed to be pure function

// player_map must be rolled into room tracking.
let player_map = {}; // properties (keys) are socket.id's, values are player objects

// variables below pertain to the game within a room.
let questionsList = null; // questions for game
let scoreboard;	// scoreboard encapsulates the game being played and the current players.
let figures = new Map(); // map with each figure as a dataurl

exports.listen = function(server) {
	logger.info('socket server now listening');
	io = socketio.listen(server);
	admin_nsp = io.of('/admin');
//  admin connections below
	admin_nsp.on('connection', function(socket) {
		logger.info('>>connection');
		logger.info('admin connection %s', socket.id);
		console.log("IP: " + olr.getServerIP());
		console.log("port: " + olr.getServerPort());
		console.log("Version: " + version);
		appInfo = {appVersion: version, serverIP: olr.getServerIP(), serverPort: olr.getServerPort()};
		socket.emit('info', appInfo);
		logger.info('info>>admin');
		processAdminCommand(socket);
	});
	player_nsp = io.of('/player');
//  player connections below
	player_nsp.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("player connection " + socket.id);
		// don't have name of player yet, but accept socket connection.
		player_map[socket.id] = {};
		processPlayerCommand(socket);
    });
	projector_nsp = io.of('/projector');
//  projector connections below
	projector_nsp.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("projector connection " + socket.id);
		processProjectorCommand(socket);
	});

// scoreboardUpdate is a callback passed to scoreboard object.
// It must be visible to both processAdminCommand and processPlayerCommand
function scoreboardUpdate(status, pList) {
	admin_nsp.emit('update-scoreboard', {status: status, playerList: pList});
	projector_nsp.emit('update-scoreboard', {status: status, playerList: pList});
	logger.info('  update-scoreboard>>admin/projector');
}
// markingButtonsUpdate is a callback passed to the scoreboard object
function markingButtonsUpdate(enable) {
	admin_nsp.emit('update-marking-buttons', enable);
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
		admin_nsp.emit('select-folder-file', contents);
		logger.info('  select-folder-file>>admin');
	});
	socket.on('start-game', function(data) {
		logger.info('>>start-game');
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
			let figureList = json.figures;
			if (figureList) {
                // load the figures from Json here.
				for (let figure of figureList) {
                    figures.set(figure.name, figure.val);
				}
			}
            // send questions only to admin for display.
			admin_nsp.emit('load-questions', questionsList);
			logger.info('  load-questions>>admin');
		} catch (e) {
            logger.error(e.message);
			// can't load questions file.
			questionsError = true;
		}
		scoreboard.initScoreboard(rankedPlayersList);
		admin_nsp.emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		projector_nsp.emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		logger.info('  start-game>>all admin/projectors');
	});
	socket.on('ask-question', function (data) {
		let index = data;
		let rawQuestion =  questionsList[index].q;
		let rawAnswer = questionsList[index].a;
		// process the question NOW (backticks indicate needed processing)
        let qPromise = mathFormat.format(rawQuestion, figures);
        logger.silly(`raw question: ${rawQuestion}`);
        logger.silly(`raw answer: ${rawAnswer}`);
		let rawLength = rawQuestion.length;
        let aPromise = mathFormat.format(rawAnswer, figures);
        let qaPromises = [qPromise, aPromise];
		const LONG_LENGTH = 190;  // this number is the result of an imprecise process to determine how "long" the question.
        Promise.all(qaPromises).then( (results) => {
        	let question = results[0];
        	let answer = results[1];
			logger.info('>>ask-question');
			scoreboard.askQuestion();
            admin_nsp.emit('ask-question', question);
            projector_nsp.emit('ask-question', {item: question, size: question.length >= LONG_LENGTH? 4:3});
            player_nsp.emit('ask-question', question);
            logger.info('  ask-question>>all admin/projectors/players');
         }).catch ((failMsg) => {
            logger.info('>>ask-question');
            scoreboard.askQuestion();
            admin_nsp.emit('ask-question', 'Error processing q or a.  Ask another.');
            logger.info('Failure message: ' + failMsg);
            logger.info('  ask-question>>admin');
        });
	});
	socket.on('test-buzzers', function (data) {
		logger.info('>>test-buzzers');
		// forward to all clients
		admin_nsp.emit('test-buzzers');
		player_nsp.emit('test-buzzers');
		logger.info('  test-buzzers>>all admin/players');
	});
	socket.on('mark-correct', function(data) {
		logger.info('>>mark-correct');
		scoreboard.markCorrect();
		// automatically show the answer.
		projector_nsp.emit('show-answer',  {item: data, size: 1});
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('mark-incorrect', function(data) {
		logger.info('>>mark-incorrect');
		// this will highlight the next player who has buzzed in.
		scoreboard.markIncorrect();
	});
	socket.on('show-answer', function(data) {
		logger.info('>>show-answer');
		//admin_nsp.emit('show-answer', data);
		projector_nsp.emit('show-answer', {item: data, size: 1});
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('disconnect', function(data) {
		logger.info('>>disconnect');
		logger.info('unregistering admin w/ id: ' + socket.id);
		// TODO: add game shutdown logic here.
	});
}
/**
 * processPlayerCommand - message (command) received from a player.
 */
function processPlayerCommand(socket) {
    // function moved to projector.html and projector.js
	// function below plays a "buzzer" sound (depends on the audio file).
	// function playAudio(mp3File) {
	// 	// afplay is pre-installed on most unix systems.
	// 	let player = 'afplay';
	// 	if (os.type() === 'Windows_NT') {
	// 	//  mplayer must be installed separately on Windows systems.
	// 		player = 'mplayer';
	// 	}
	// 	let spawn = require('child_process').spawn;
	// 	spawn(player, [mp3File]);
	// 	// Don't do spawnSync as it delays the event loop unnecessarily.
	// }
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
		logger.info('>>buzz: ' + data.name + '(answer: ' + data.answer + ')' );
		// sound the buzzer
		//let mp3Path = path.resolve(__dirname , '../resources/doorbell.mp3');
		//playAudio(mp3Path);
        projector_nsp.emit('buzz');
        scoreboard.recordBuzz(data.name, data.answer);
	});
	socket.on('disconnect', function(data) {
		logger.info('>>disconnect');
		// disconnect may be due to closing browser window, refreshing window, or navigating away from window
		let playerInfo = player_map[socket.id];
		logger.info('unregistering player w/ name: ' + playerInfo.name);
		scoreboard.deregisterPlayer(playerInfo.name);
		delete player_map[socket.id];
	});
}
/**
 * processProjectorCommand - message (command) received from a projector. None??
 */
function processProjectorCommand(socket) {
}

};



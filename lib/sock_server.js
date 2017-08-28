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
//let olrOpt = require('./olr_options');
let CrPlayersFile = require('./CrPlayersFile');
let fs = require('fs');
let pkg = require('../package.json');
let md5 = require('MD5');
let Scoreboard = require('./Scoreboard');
let MathFormatter = require('./MathFormatter');
let Room = require('./Room');
let Rooms = require('./Rooms');

// global variables
let io; // socket io object
let appInfo; // application info - IP, port#, version
let version = pkg.version; // official version #.  Don't forget to increment.
let admin_nsp;	// namespace for talking to admin client
let player_nsp; // namespace for talking to player clients
let projector_nsp; // namespace for talking to projector client
let logger = winston.loggers.get('application'); // for logging
let mathFormat = new MathFormatter(); // formula formatting, assumed to be pure function
let rooms = new Rooms();

// player_map must be rolled into room tracking.
//let player_map = {}; // properties (keys) are socket.id's, values are player objects

// variables below pertain to the game within a room.
//let questionsList = null; // questions for game
//let scoreboard;	// scoreboard encapsulates the game being played and the current players.
//let figures = new Map(); // map with each figure as a dataurl

exports.listen = function(server) {
	logger.info('socket server now listening');
	io = socketio.listen(server);
	admin_nsp = io.of('/admin');
//  admin connections below
	admin_nsp.on('connection', function(socket) {
		logger.info('>>connection');
		logger.info('admin connection %s', socket.id);
		processAdminCommand(socket);
	});
	player_nsp = io.of('/player');
//  player connections below
	player_nsp.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("player connection " + socket.id);
        socket.emit('invitation');
        processPlayerCommand(socket);
    });
	projector_nsp = io.of('/projector');
//  projector connections below
	projector_nsp.on('connection', function (socket) {
		logger.info('>>connection');
		logger.info("projector connection " + socket.id);
        socket.emit('invitation');
        processProjectorCommand(socket);
	});

// scoreboardUpdate is a callback passed to scoreboard object.
// It must be visible to both processAdminCommand and processPlayerCommand
function scoreboardUpdate(roomNum, status, pList) {
	admin_nsp.to(roomNum).emit('update-scoreboard', {status: status, playerList: pList});
	projector_nsp.to(roomNum).emit('update-scoreboard', {status: status, playerList: pList});
    logger.info('  update-scoreboard>>admin/projector');
	logger.info('  room #' + roomNum);
}
// markingButtonsUpdate is a callback passed to the scoreboard object
function markingButtonsUpdate(roomNum, enable) {
	admin_nsp.to(roomNum).emit('update-marking-buttons', enable);
	logger.info('  update-marking-buttons>>admin');
    logger.info('  room #' + roomNum);
}
/**
 * processAdminCommand - message (command) received from Admin1.
 */
function processAdminCommand(socket) {
    socket.on('login', function(loginPwd) {
        logger.info('>>login pwd: ' + md5(loginPwd));
//        let pwd = olrOpt.getOption('loginPwd');
        let pwd = process.env.PASSWD;
        if (md5(loginPwd) === md5(pwd)) {
            let room = rooms.create(socket.id);
            let num = room.getNumber();
            room.join('admin', socket);
            socket.roomNum = num;
            socket.join(num);
            console.log("room #" + num);
            console.log("IP: " + olr.getServerIP());
            console.log("port: " + olr.getServerPort());
            console.log("version: " + version);
            appInfo = {roomNum: num, appVersion: version, serverIP: olr.getServerIP(), serverPort: olr.getServerPort()};
            socket.emit('register', appInfo);
            logger.info('  register>>admin');
        } else {
            socket.emit('bad-login');
            logger.info('<<bad-login');
        }
    })

	socket.on('load-folder-file', function (data) {
		logger.info('>>load-folder-file');
		// get root folder from configuration file (or CLI argument).
//		let folder = olrOpt.getOption('olr-folder');
        let folder = process.env.FOLDER;
		let dc = new DirectoryContents(folder);
		let contents = dc.getContents();
		admin_nsp.to(socket.roomNum).emit('select-folder-file', contents);
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
        let room = rooms.get(socket.roomNum);
		let questionsError = false;
		let playersError = false;
		room.scoreboard = new Scoreboard(gameType, socket.roomNum, scoreboardUpdate, markingButtonsUpdate);
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
			room.questionsList = json.questions_and_answers;
			room.figures = new Map();
			let figureList = json.figures;
			if (figureList) {
                // load the figures from Json here.
				for (let figure of figureList) {
                    room.figures.set(figure.name, figure.val);
				}
			}
            // send questions only to admin for display.
			admin_nsp.to(socket.roomNum).emit('load-questions', room.questionsList);
			logger.info('  load-questions>>admin');
		} catch (e) {
            logger.error(e.message);
			// can't load questions file.
			questionsError = true;
		}
		room.scoreboard.initScoreboard(rankedPlayersList);
		admin_nsp.to(socket.roomNum).emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		projector_nsp.to(socket.roomNum).emit('start-game', {gameType: gameType, questionsError: questionsError, playersError: playersError });
		logger.info('  start-game>>all admin/projectors');
	});
	socket.on('ask-question', function (data) {
	    let room = rooms.get(socket.roomNum);
		let index = data;
		let rawQuestion =  room.questionsList[index].q;
		let rawAnswer = room.questionsList[index].a;
		// process the question NOW (backticks indicate needed processing)
        let qPromise = mathFormat.format(rawQuestion, room.figures);
        logger.silly(`raw question: ${rawQuestion}`);
        logger.silly(`raw answer: ${rawAnswer}`);
		let rawLength = rawQuestion.length;
        let aPromise = mathFormat.format(rawAnswer, room.figures);
        let qaPromises = [qPromise, aPromise];
		const LONG_LENGTH = 190;  // this number is the result of an imprecise process to determine how "long" the question.
        Promise.all(qaPromises).then( (results) => {
        	let question = results[0];
        	let answer = results[1];
			logger.info('>>ask-question');
			room.scoreboard.askQuestion();
            admin_nsp.to(socket.roomNum).emit('ask-question', question);
            projector_nsp.to(socket.roomNum).emit('ask-question', {item: question, size: question.length >= LONG_LENGTH? 4:3});
            player_nsp.to(socket.roomNum).emit('ask-question', question);
            logger.info('  ask-question>>all admin/projectors/players');
         }).catch ((failMsg) => {
            logger.info('>>ask-question');
            room.scoreboard.askQuestion();
            admin_nsp.to(socket.roomNum).emit('ask-question', 'Error processing q or a.  Ask another.');
            logger.info('Failure message: ' + failMsg);
            logger.info('  ask-question>>admin');
        });
	});
	socket.on('test-buzzers', function (data) {
		logger.info('>>test-buzzers');
		// forward to all clients
		admin_nsp.to(socket.roomNum).emit('test-buzzers');
		player_nsp.to(socket.roomNum).emit('test-buzzers');
		logger.info('  test-buzzers>>all admin/players');
	});
	socket.on('mark-correct', function(data) {
		logger.info('>>mark-correct');
		let room = rooms.get(socket.roomNum);
		room.scoreboard.markCorrect();
		// automatically show the answer.
		projector_nsp.to(socket.roomNum).emit('show-answer',  {item: data, size: 1});
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('mark-incorrect', function(data) {
		logger.info('>>mark-incorrect');
        let room = rooms.get(socket.roomNum);
		// this will highlight the next player who has buzzed in.
		room.scoreboard.markIncorrect();
	});
	socket.on('show-answer', function(data) {
		logger.info('>>show-answer');
		//admin_nsp.emit('show-answer', data);
		projector_nsp.to(socket.roomNum).emit('show-answer', {item: data, size: 1});
		logger.info('  show-answer>>all admin/projectors');
	});
	socket.on('disconnect', function(reason) {
		logger.info('>>disconnect %s reason: %s', socket.id, reason);
		let num = socket.roomNum;
		logger.info('destroying room #%d', num);
		rooms.destroy(num);
	});
}
/**
 * processPlayerCommand - message (command) received from a player.
 */
function processPlayerCommand(socket) {
    // function moved to projector.html and projector.js
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
    socket.on('join-room' , function (num) {
        logger.info(">>join-room #" + num);
        // validate room #.
        num = parseInt(num);
        if (rooms.isValid(num)) {
            socket.roomNum = num;
            socket.join(num);
            let room = rooms.get(num);
            room.join('player', socket);
            room.printAttendees();
            socket.emit('room-joined');
            logger.info('  room-joined>>player');
        } else {
            logger.info(socket.id + " entered bad room #: " + num);
            // sent player another invitation.
            socket.emit('invitation');
            logger.info('  invitation>>player');
        }
    });
	socket.on('register', function(data) {
		let name = data.name;
		logger.info('>>register ' + name);
		// check for potential script tags.
        if (name.indexOf('<') >= 0 || name.indexOf('>') >= 0) {
            // tell player to refresh screen and don't use special characters.
            // when player complies this disconnects the socket and opens a new one.
            socket.emit("deregister", {name: name, reason: "Special characters used: refresh your screen and reenter name."});
            logger.info('  deregister>>player');
            return;
        }
        let room = rooms.get(socket.roomNum);
		let duplicate = room.isAttendeeNameDuplicated(name);
		if (duplicate) {
			// tell player with the duplicate name to refresh and enter a different name.
			// when player complies this disconnects the socket and opens a new one.
			socket.emit("deregister", {name: name, reason: "Duplicate name: refresh your screen and enter a different name."});
			logger.info('  deregister>>player');
			return;
		}
		// name is acceptable.
        room.setAttendeeName(socket, name);
        logger.info('registering player w/ name: ' + name);
        socket.emit('registered', socket.roomNum);
        logger.info('  registered>>player');
        // forward registration to admin
        room.scoreboard.registerPlayer(name);
	});
	socket.on('buzz', function(data) {
		logger.info('>>buzz: ' + data.name + '(answer: ' + data.answer + ')' );
        let room = rooms.get(socket.roomNum);
		// sound the buzzer
		//let mp3Path = path.resolve(__dirname , '../resources/doorbell.mp3');
		//playAudio(mp3Path);
        projector_nsp.to(socket.roomNum).emit('buzz');
        room.scoreboard.recordBuzz(data.name, data.answer);
	});
	socket.on('disconnect', function(reason) {
		logger.info('>>disconnect %s reason: %s', socket.id, reason);
		let num = socket.roomNum;
        let room = rooms.get(num);
		// disconnect may be due to closing browser window, refreshing window, or navigating away from window
        if (room) {
     		room.scoreboard.deregisterPlayer(room.getAttendeeName(socket));
            room.leave(socket.id);
            socket.leave(num);
        }
	});
}
/**
 * processProjectorCommand - message (command) received from a projector. None??
 */
function processProjectorCommand(socket) {
    socket.on('join-room' , function (num) {
        logger.info(">>join-room #" + num);
        // validate room #.
        num = parseInt(num);
        if (rooms.isValid(num)) {
            socket.roomNum = num;
            socket.join(num);
            let room = rooms.get(num);
            room.join('projector', socket);
            room.printAttendees();
        } else {
            logger.info("%s entered bad room #: %s", socket.id, num);
            // sent player another invitation.
            socket.emit('invitation');
        }
    });

    socket.on('disconnect', function (reason) {
        console.log(">>disconnect %s reason: %s", socket.id, reason);
        // remove projector from room.
        let num = socket.roomNum;
        let room = rooms.get(num);
        if (room) {
            room.leave(socket.id);
            socket.leave(num);
        }
    });

}

};



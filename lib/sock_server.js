/**
 * sock_server.js - uses socket.io module for socket connections between
 * player clients and the one emcee client.
 */
"use strict";
let socketio = require('socket.io')();
let path = require('path');
let fsPromise = require('fs/promises');
let winston = require('winston');
let crPlayersList = require('./CrPlayersList');
let pkg = require('../package.json');
let Scoreboard = require('./Scoreboard');
let MathFormatter = require('./MathFormatter');
let Rooms = require('./Rooms');
let db = require('./DbUpdate')

// global variables
let io; // socket io object
let appInfo; // application info - IP, port#, version
let version = pkg.version; // official version #.  Don't forget to increment.
let emcee_nsp;	// namespace for talking to emcee client
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
	io = socketio.listen(server, {'pingTimeout': process.env.PINGTIMEOUT || 5000});
	emcee_nsp = io.of('/emcee');
//  emcee connections below
	emcee_nsp.on('connection', function(socket) {
		logger.info('>>connection');
		logger.info('emcee connection %s', socket.id);
		processEmceeCommand(socket);
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
// It must be visible to both processEmceeCommand and processPlayerCommand
function scoreboardUpdate(roomNum, status, pList) {
	emcee_nsp.to(roomNum).emit('update-scoreboard', {status: status, playerList: pList});
	//TODO: delete line below since it is not needed
	//projector_nsp.to(roomNum).emit('update-scoreboard', {status: status, playerList: pList});
    logger.info('  update-scoreboard>>emcee');
	logger.info('  room #' + roomNum);
}
// markingButtonsUpdate is a callback passed to the scoreboard object
function markingButtonsUpdate(roomNum, enable) {
	emcee_nsp.to(roomNum).emit('update-marking-buttons', enable);
	logger.info('  update-marking-buttons>>emcee');
    logger.info('  room #' + roomNum);
}
/**
 * processEmceeCommand - message (command) received from Emcee1.
 */
function processEmceeCommand(socket) {
    socket.on('register', function(data) {
		let gameType = data.gameType;
		if (gameType !== 'PR' && gameType !== 'OLR' && gameType !== 'CR' ) {
			socket.emit('register-error', {name: 'GameTypeError', message: "Invalid game type"});
			logger.info('  register-error>>emcee');
			gameType = 'PR';
		}
		let gameId = data.gameId;
		logger.info('>>register');
		let room = rooms.create(socket.id);
		let num = room.getNumber();
		room.join('emcee', socket);
		room.gameType = gameType;
		room.gameId = gameId;
		room.setAttendeeName(socket, 'emcee');
		socket.roomNum = num;
		socket.join(num);
		console.log("room #" + num);
		console.log("version: " + version);
		appInfo = {roomNum: num, appVersion: version};
		socket.emit('register', appInfo);
		logger.info('  register>>emcee');
		if (gameId) {
			// update the game record w/ the roomNo for debugging purposes.
			// TODO: function call must be made synchronous.
			db.update({game_id: gameId, room_no: num});
		}
    })
	socket.on('load-questions', function(data) {
		logger.info('>>load-questions');
		let promise;
		if (data.questionFileId) {
			// read the questionFileId (data has key value)
			promise = db.readQuestionFile(data.questionFileId);
		} else if (data.questionFileAbsPath) {
			promise = fsPromise.readFile(data.questionFileAbsPath, {encoding: "utf-8"});
		} else {
			socket.emit('load-questions-error', {name: "DataError", message: "No question file data"});
			logger.info('  load-questions-error>>emcee');
			// can't continue, so return
			return;
		}
		promise.then (questionsJson => {
			questionsJson = JSON.parse(questionsJson);
			let room = rooms.get(socket.roomNum);
			room.questionsDescription = questionsJson.description;
			room.questionsList = questionsJson.questions_and_answers;
			room.figures = new Map();
			let figureList = questionsJson.figures;
			if (figureList) {
				// load the figures from Json here.
				for (let figure of figureList) {
					room.figures.set(figure.name, figure.val);
				}
			}
			socket.emit('load-questions', questionsJson.questions_and_answers);
			logger.info('  load-questions>>emcee');
		})
		.catch( error => {
			let name = error.name;
			let message = error.message
			socket.emit('load-questions-error', {name: name, message: message});
			logger.info('  load-questions-error>>emcee');
		});
	});
	socket.on('load-players', function(data) {
		logger.info('>>load-players');
		const playerFileId = data.playerFileId;
		const playerFileAbsPath = data.playerFileAbsPath;
		if (playerFileId === 0 && !playerFileAbsPath) {
			socket.emit('load-players', []);  // No players
			logger.info('  load-players>>emcee');
		} else {
			let promise;
			if (playerFileId) {
				promise = db.readPlayerFile(playerFileId);
			} else if (playerFileAbsPath) {
				promise = fsPromise.readFile(data.playerFileAbsPath, {encoding: "utf-8"});
			} else {
				socket.emit('load-players-error', {name: "DataError", message: "No player file data"});
				logger.info('  load-players-error>>emcee');
				// can't continue, so return
				return;
			}
			// read the playerFileId (data is key value unless 0);
			promise.then(playersJson => {
				playersJson = JSON.parse(playersJson);
				socket.emit('load-players', playersJson.players);
				logger.info('  load-players>>emcee');
			})
			.catch( error => {
				let name = error.name;
				let message = error.message
				socket.emit('load-players-error', {name: name, message: message});
				logger.info('  load-players-error>>emcee');
			});
		}
	});
	socket.on('start-game', function(data) {
		logger.info('>>start-game');
		// playersJson is restructured by getRankedPlayers
		const rankedPlayersList = crPlayersList.getRankedPlayers(data);
        let room = rooms.get(socket.roomNum);
		room.scoreboard = new Scoreboard(room.gameType, socket.roomNum, scoreboardUpdate, markingButtonsUpdate);
		room.scoreboard.initScoreboard(rankedPlayersList);
		emcee_nsp.to(socket.roomNum).emit('start-game');
		projector_nsp.to(socket.roomNum).emit('start-game', {gameType: room.gameType});
		// TODO: Wait for projector connection?  Otherwise, this message will be lost.
		logger.info('  start-game>>projector');
	});
	socket.on('ask-question', function (data) {
	    let room = rooms.get(socket.roomNum);
		let index = data.index;
		let rawQuestion =  room.questionsList[index].q;
		let rawAnswer = room.questionsList[index].a;
		// rawFormat may be undefined
		let rawFormat = room.questionsList[index].f;
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
            emcee_nsp.to(socket.roomNum).emit('ask-question', {q:question, a:answer});
            // only projector is worried about format (and that's only for questions too)
			let format = 3;
			if (rawFormat) {
				format = rawFormat;
			} else {
				// crude algorithm here.
				format = (question.length >= LONG_LENGTH) ? 4 : 3;
			}
            projector_nsp.to(socket.roomNum).emit('ask-question', {item: question, format: format});
            player_nsp.to(socket.roomNum).emit('ask-question', question);
            logger.info('  ask-question>>all emcee/projectors/players');
         }).catch ((failMsg) => {
            logger.info('>>ask-question');
            room.scoreboard.askQuestion();
            emcee_nsp.to(socket.roomNum).emit('ask-question', 'Error processing q or a.  Ask another.');
            logger.info('Failure message: ' + failMsg);
            logger.info('  ask-question>>emcee');
        });
	});
	socket.on('test-buzzers', function (data) {
		logger.info('>>test-buzzers');
		// forward to all clients
		emcee_nsp.to(socket.roomNum).emit('test-buzzers');
		player_nsp.to(socket.roomNum).emit('test-buzzers');
		logger.info('  test-buzzers>>all emcee/players');
	});
	socket.on('mark-correct', function(data) {
		logger.info('>>mark-correct');
		let room = rooms.get(socket.roomNum);
		room.scoreboard.markCorrect();
		// automatically show the answer.
		projector_nsp.to(socket.roomNum).emit('show-answer',  {item: data, format: 1});
		logger.info('  show-answer>>all emcee/projectors');
	});
	socket.on('mark-incorrect', function(data) {
		logger.info('>>mark-incorrect');
        let room = rooms.get(socket.roomNum);
		// this will highlight the next player who has buzzed in.
		room.scoreboard.markIncorrect();
	});
	socket.on('show-answer', function(data) {
		logger.info('>>show-answer');
		//emcee_nsp.emit('show-answer', data);
		projector_nsp.to(socket.roomNum).emit('show-answer', {item: data, format: 1});
		logger.info('  show-answer>>all emcee/projectors');
	});
	socket.on('disconnect', function(reason) {
		// tell clients that the emcee has disconnected.
		projector_nsp.to(socket.roomNum).emit('emcee-disconnect', reason);
		player_nsp.to(socket.roomNum).emit('emcee-disconnect', reason);
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
            // Don't print attendees here since player names are not known
            //room.printAttendees();
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
		if (name === undefined || name.length === 0) {
			socket.emit("deregister", {name: name, reason: "Hey, your name is blank. Enter a name"});
			logger.info('Name is blank.')
			logger.info('  deregister>>player');
			return;
		}
		logger.info('>>register ' + name);
		// check for potential script tags.
        if (name.indexOf('<') >= 0 || name.indexOf('>') >= 0) {
            // tell player to refresh screen and don't use special characters.
            // when player complies this disconnects the socket and opens a new one.
            socket.emit("deregister", {name: name, reason: "Special characters used: refresh your screen and reenter name."});
			logger.info('Name has characters < or >.')
            logger.info('  deregister>>player');
            return;
        }
        let room = rooms.get(socket.roomNum);
		let duplicate = room.isAttendeeNameDuplicated(name);
		if (duplicate) {
			// tell player with the duplicate name to refresh and enter a different name.
			// when player complies this disconnects the socket and opens a new one.
			socket.emit("deregister", {name: name, reason: "Duplicate name: Enter a different name."});
			logger.info('Name is duplicated.')
			logger.info('  deregister>>player');
			return;
		}
		// name is acceptable.
        room.setAttendeeName(socket, name);
		room.printAttendees();
        logger.info('registering player w/ name: ' + name);
        socket.emit('registered', socket.roomNum);
        logger.info('  registered>>player');
        // forward registration to emcee
        room.scoreboard.registerPlayer(name);
	});
	socket.on('buzz', function(data) {
		logger.info('>>buzz: ' + data.name + '(answer: ' + data.answer + ')' );
        let room = rooms.get(socket.roomNum);
		// sound the buzzer
		// TODO: buzz on the projector device? buzz on the emcee device?
        //projector_nsp.to(socket.roomNum).emit('buzz');
		emcee_nsp.to(socket.roomNum).emit('buzz');
        room.scoreboard.recordBuzz(data.name, data.answer);
	});
	socket.on('disconnect', function(reason) {
		// tell the emcee that a player has disconnected.
		emcee_nsp.to(socket.roomNum).emit('player-disconnect', reason);
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
			room.setAttendeeName(socket, 'projector');
            room.printAttendees();
            // kludge - display the questions file's description field
            socket.emit('ask-question', {item: room.questionsDescription, format: 3});
            logger.info("  ask-question>>projectors");
        } else {
            logger.info("%s entered bad room #: %s", socket.id, num);
            // sent player another invitation.
            socket.emit('invitation');
        }
    });

    socket.on('disconnect', function (reason) {
    	// tell the emcee that the projector has disconnected.
		emcee_nsp.to(socket.roomNum).emit('projector-disconnect', reason);
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



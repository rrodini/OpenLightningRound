/**
 * sock_server.js - uses socket.io module for socket connections between
 * player clients and the one emcee client.
 */
"use strict";
let socketio = require('socket.io');
let path = require('path');
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
	projector_nsp.to(roomNum).emit('update-scoreboard', {status: status, playerList: pList});
    logger.info('  update-scoreboard>>emcee/projector');
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
		let gameId = data.gameId;
		logger.info('>>register');
		let room = rooms.create(socket.id);
		let num = room.getNumber();
		room.join('emcee', socket);
		room.gameType = gameType;
		room.gameId = gameId;
		socket.roomNum = num;
		socket.join(num);
		console.log("room #" + num);
		console.log("version: " + version);
		appInfo = {roomNum: num, appVersion: version};
		socket.emit('register', appInfo);
		logger.info('  register>>emcee');
		// update the game record w/ the roomNo for debugging purposes.
		db.update({game_id: gameId, room_no: num});
    })
	socket.on('load-questions', function(data) {
		logger.info('>>load-questions');
		// read the questionFileId (data has key value)
		db.readQuestionFile(data.questionFileId).then (questionsJson => {
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
		});
	});
	socket.on('load-players', function(data) {
		logger.info('>>load-players');
		const playerFileId = data.playerFileId;
		if (playerFileId === 0) {
			socket.emit('load-players', []);  // No players
			logger.info('  load-players>>emcee');
		} else {
			// read the playerFileId (data is key value unless 0);
			db.readPlayerFile(playerFileId).then(playersJson => {
				playersJson = JSON.parse(playersJson);
				socket.emit('load-players', playersJson.players);
				logger.info('  load-players>>emcee');
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
		logger.info('  start-game>>projector');
	});
	socket.on('ask-question', function (data) {
	    let room = rooms.get(socket.roomNum);
		let index = data.index;
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
            emcee_nsp.to(socket.roomNum).emit('ask-question', {q:question, a:answer});
            projector_nsp.to(socket.roomNum).emit('ask-question', {item: question, size: question.length >= LONG_LENGTH? 4:3});
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
		projector_nsp.to(socket.roomNum).emit('show-answer',  {item: data, size: 1});
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
		projector_nsp.to(socket.roomNum).emit('show-answer', {item: data, size: 1});
		logger.info('  show-answer>>all emcee/projectors');
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
        // forward registration to emcee
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
            // kludge - display the questions file's description field
            socket.emit('ask-question', {item: room.questionsDescription, size: 3});
            logger.info("  ask-question>>projectors");
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



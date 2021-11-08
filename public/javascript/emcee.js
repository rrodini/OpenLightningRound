/**
 * emcee.js - emcee's javascript
 */
/* global window, document, location, prompt, io, OlrGame, CrGame, PrGame */
var version; // version of application e.g. 3.1.49
var socket;	// communication socket on emcee channel
var roomNum; // room # of game
var questionList;	// array of question objects
var nextQuestion;	// next question from questionList
var timerCounter;	// system generated value when a timer is started
/**
 * processTestBuzzers - the 'Test Buzzers' button was clicked.
 */
function processTestBuzzers() {
	$('current_question').text("");
	$('current_answer').text("");
}
/**
 * stopTimer - low level interface to stop the timer
 */
function stopTimer() {
	clearInterval(timerCounter);
}
/**
 * startTimer - low level interface to start the countdown timer
 */
function startTimer(timeLeft) {
//	don't activate the next line as it messes up the timer notification pop-up window.
//	$('#timeNotification').on('close', function () { });
	timerCounter=setInterval(function() {
		$(".timer").text(timeLeft);
		timeLeft--;
		if (timeLeft <= 0) {
			clearInterval(timerCounter);
			//countdown ended, do something here
			$("#timeNotification").jqxNotification("closeLast");
		}
	}, 1000); //1000 will  run it every 1 second
}
/**
 * hideTimer - high level interface to close the timer window
 */
function hideTimer() {
    stopTimer();
	$("#timeNotification").jqxNotification("closeLast");
}
/**
 * displayTimer - high level interface to display the timer window.
 */
function displayTimer() {
	// hide and kill any active timers
	hideTimer();
	$("#timeNotification").jqxNotification({position: "top-right"});
	$("#timeNotification").jqxNotification("open");
	startTimer(45);
}
/**
 * displayQuestion - display the new question.
 */
function displayQuestion(question) {
	displayTimer();
	$('#current_question').html(question);
}
/**
 * processAskQuestion - the 'Ask Question' button was clicked.
 */
function processAskQuestion() {
	if (nextQuestion >= questionList.length) {
			window.alert('No more questions!');
			nextQuestion = 0;
		}
	var index = $('#question_grid').jqxGrid('getselectedrowindex');
	var answer   = questionList[index].a;
	// new for game display
	socket.emit('ask-question', {index: index});
	console.log('  ask-question>>server');
	displayAnswer(answer);
	nextQuestion = index + 1;
	// select (highlight) the next question row.
	$('#question_grid').jqxGrid('selectrow', nextQuestion);
	$('#question_grid').jqxGrid('scrolloffset', 25*nextQuestion, 0);
	// Wait until someone buzzes in.
	disableMarkingButtons(true);
}

/**
 * updateScoreboard - update the scoreboard due to some change, e.g. player registration, player buzzes, etc.
 * @param status - state of the current game.
 * @param pList - players in this round of game.
 */
function updateScoreboard(status, pList) {
	$("#status_div").html(status);
	// now sync the player grid to the pList state.
	reloadPlayers(pList);
}

/**
 * reloadPlayers - the playerList data has changed so reload it into the grid.
 */
//var playerList;   // array of player objects

function reloadPlayers(pList) {
	// mysterious assignment to prevent pList from disappearing in playerRenderer
	playerList = pList;
	var playerRenderer = function(playerIndex, columnfield, value, defaulthtml, columnproperties) {
		if (!playerList[playerIndex].registered) {
			return '<span style="margin-left: 4px; color: red;" >' + value + '</span>';
		}
	};
	var playerSource =
	{
		localdata: playerList,
		datatype: "array"
	};
	$("#player_grid").jqxGrid(
		{
			source: playerSource,
			columns: [
				{ text: 'Player', datafield: "name", cellsrenderer: playerRenderer},
				{ text: 'Buzzer', datafield: "buzzer"},
				{ text: 'Score', datafield: "score"}
			]
		});
	// clear any current selected player.
	$('#player_grid').jqxGrid('clearselection');
	// now highlight the player that is selected.
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].selected ) {
			$('#player_grid').jqxGrid('selectrow', i);
			break;
		}
	}

}

/**
 * loadQuestions - load the questionList into the question grid.  Assign each question an ordinal number.
 */
function loadQuestions(questionList) {
	var data = questionList;
	data.forEach(function(e,i,a){
	// add the question number NOW.
		e['no.'] = i+1;
		a[i] = e;
	});
	var question_source =
	{
		localdata: data,
		datatype: "array"
	};
	$("#question_grid").jqxGrid(
	{
		source: question_source,
	});
	$("#question_grid").jqxGrid('selectrow', 0);
}
/**
 * processMenuItem - process a click on a menu item at the bottom
 */
function processMenuItem(text) {
	if (text === 'End Game') {
		endGame();
		socket.close();
		console.log('socket closed.');
        // socket.disconnect("end game clicked.");
	    // console.log('  disconnect>>server');
	} else if (text === 'License') {
		// pop up a window with license information
		$("#license_window").jqxWindow('open');
	}
}
/**
 * disableMarkingButtons - 'disable' parameter is true or false.
 */
function disableMarkingButtons (disable) {
 	$('#mark_correct').jqxButton({disabled: disable });
	$('#mark_incorrect').jqxButton({disabled: disable });
}
/**
 * enableTestingButtons - 'enable' parameter is true or false.
 */
function enableTestingButtons (enable) {
	$('#test_buzzers').jqxButton({disabled: !enable });
	$('#ask_question').jqxButton({disabled: !enable });
}
/**
 * initWidget - initialize the jqxWidgets on the emcee/display screen.
 */
function initWidgets () {
	// just draw a sample emcee screen to get the layout down
	//var vpWidth = $(window).width();
	//var vpHeight = $(window).height();
	//console.log("vpWidth: " + vpWidth + ", vpHeight: " + vpHeight);
	$("#current_question").jqxPanel({ width: '100%', height: '150px', theme: 'energyblue'});
	$("#current_answer").jqxPanel({ width: '100%', height: '25px', theme: 'energyblue'});
	$("#mark_correct").jqxButton({width: '25%', theme: 'energyblue'});
	$("#mark_incorrect").jqxButton({width: '25%', theme: 'energyblue'});
	$("#show_answer").jqxButton({width: '25%', theme: 'energyblue'});
 	disableMarkingButtons(true);
	$('#mark_correct').click(function () {
        var answer = $('#current_answer').html();
		socket.emit('mark-correct', answer);
		console.log('  mark-correct>>server');
	});
	$('#mark_incorrect').click(function () {
		socket.emit('mark-incorrect');
		console.log('  mark-incorrect>>server');
	});
	$('#show_answer').click(function () {
		var answer = $('#current_answer').html();
		// do not need timer.
		hideTimer();
		socket.emit('show-answer', answer);
		console.log('  show-answer>>server');
	});
	$("#player_grid").jqxGrid(
	{
		//width: '100%',  // why 90%? don't know. 100% doesn't work.
		height: 160,
		theme: 'energyblue',
		//source: null,  // no data to display
		columns: [
		{ text: 'Player', datafield: "name", width: '50%', height: 20 },
		{ text: 'Buzzer', datafield: "buzzer", width: '25%', height: 20 },
		{ text: 'Score', datafield: "score", width: '25%', height: 20 },
		]
	});
	$("#question_grid").jqxGrid(
	{
		//width: '100%',
		height: 260,
		theme: 'energyblue',
		// source: null,  // no data to display
		columns: [
		{ text: 'No.', datafield: 'no.', width: '10%', height: 20},
		{ text: 'Question', datafield: 'q', width: '70%', height: 20 },
		{ text: 'Answer', datafield: 'a', width: '20%', height: 20 },
		]
	});
	$("#test_buzzers").jqxButton({width: '33%', theme: 'energyblue'});
	$("#ask_question").jqxButton({width: '33%', theme: 'energyblue'});
	enableTestingButtons(false);
	// create a menu
	$("#menu").jqxMenu({ width: '100%', height: '30px', theme: 'energyblue'});
	$("#menu").css('visibility', 'visible');
	// set up the handlers for widget events
	$('#test_buzzers').click(function () {
	//  new for game display
		socket.emit('test-buzzers');
		console.log('  test-buzzers>>server');
	});
	// set click handler for 'Ask Question'
	$('#ask_question').click(function () {
		processAskQuestion();
	});
	// set click handler for 'Select Questions'
	$('#menu').bind('itemclick', function (event) {
		var clickedItem = event.args;
		var menuText = $(clickedItem).text();
		processMenuItem(menuText);
	});
// popup window for "License" dialog
	$("#license_window").jqxWindow({
		width: 400, height: 250, isModal: true, autoOpen: false, theme: 'energyblue',
		okButton: $('#license_okay'),
		initContent: function () {
			$('#license_window').jqxWindow('focus');
			$('#license_okay').jqxButton('focus');
		}
	});
// popup window for "Setup" dialog
	$("#setup_window").jqxWindow({
		width: 400, height: 200, isModal: true, autoOpen: false, theme: 'energyblue',
		okButton: $('#setup_okay'),
		initContent: function () {
			$('#setup_okay').jqxButton('focus');
		}
	});
// timer notification window
	$("#timeNotification").jqxNotification({
		width: 100, position: "bottom-left", opacity: 0.9, showCloseButton: true,
		autoOpen: false, autoClose: false, template: "time"
	});
}
/**
 * window.onload
 * 1. initialize the GUI widgets.
 * 2. open the socket with the server on the emcee channel.
 * 3. respond to socket messages from the server
 */
window.onload = function() {
	// initialize all jQWidgets
	initWidgets();
	// open web socket back to host w/ reconnection set to 'false.'
	// Default is 'true' which has dead screens re-attach automatically.
	socket = io("//" + location.host + "/emcee", {transports: ['websocket'], reconnection: false});
	socket.emit('register', {gameType: gameType, gameId: gameId});
    socket.on('register', function(data ) {
		console.log('>>register');
		console.log("room #: ", data.roomNum);
		roomNum = data.roomNum;
		setWindowTitle(roomNum);
		if (data.appVersion) {
			version = data.appVersion;
		}
		$('#ver').text("Ver. " + version);
		console.log("ver: " + data.appVersion);
		$('#room_div').html("Room #" + data.roomNum.toString());
		$('#room_num').html(data.roomNum.toString());
		$("#setup_window").jqxWindow('open');

		socket.emit('load-questions', {questionFileId: questionFileId, questionFileAbsPath: questionFileAbsPath});
		console.log('  load-questions>>server');
	});
	socket.on('register-error', function(data) {
		console.log('>>register-error');
		window.alert('Game type error: ' + data.name + '/' + data.message + '.');
	});
	socket.on('load-questions', function(data) {
		console.log('>>load-questions');
		if (data) {
			questionList = data;  // questionList
			nextQuestion = 0;
			loadQuestions(questionList);
			socket.emit('load-players', {playerFileId: playerFileId, playerFileAbsPath: playerFileAbsPath});
			console.log('  load-players>>server');
		} else {
			// no question list (why???)
			window.alert('Bad questions file! Start new game.');
		}
	});
	socket.on('load-questions-error', function(data) {
		console.log('>>load-questions-error');
		window.alert('Load questions error: ' + data.name + '/' + data.message + '.');
	});
	socket.on('load-players', function(data) {
		console.log('>>load-players');
		if (data) {
			playerList = data;  // playerList
			socket.emit('start-game', playerList);
			console.log('  start-game>>server');
		} else {
			// no player list (why???)
			window.alert('Bad players file! Start new game.');
		}
	});
	socket.on('load-players-error', function(data) {
		console.log('>>load-players-error');
		window.alert('Load players error: ' + data.name + '/' + data.message + '.');
	});
	socket.on('start-game', function(data) {
		console.log('>>start-game');
		enableTestingButtons(true);  // TODO: rename enable game buttons
	});
	socket.on('test-buzzers', function(data) {
		console.log('>>test-buzzers');
		processTestBuzzers();
	});
	socket.on('ask-question', function(data) {
		console.log('>>ask-question');
		displayQuestion(data.q);
		displayAnswer(data.a)
	});
	socket.on('update-marking-buttons', function (data) {
		console.log('>>update-marking-buttons');
		// data is true or false (literals).
		disableMarkingButtons(data);
	});
	socket.on('update-scoreboard', function(data) {
		console.log('>>update-scoreboard');
		updateScoreboard(data.status, data.playerList);
	});
	socket.on('shutdown', function(data) {
		console.log('>>shutdown');
	//  'shutdown' message only sent by test driver.
		window.close();
	});

    socket.on('disconnect', function (reason) {
		console.log(">>emcee-disconnect reason: " + reason);
		window.alert("emcee-disconnect: " + reason);
    });

	socket.on('player-disconnect', function (reason) {
		console.log("player-disconnect: "+ reason);
		// Don't bother the emcee with a window.alert
		//window.alert("player-disconnect: " + reason);
	});

	socket.on('projector-disconnect', function (reason) {
		console.log("projector-disconnect: " + reason);
		window.alert("projector-disconnect: " + reason);
	});

	socket.on('error', function (reason) {
        window.alert("error:" + reason.message);
        console.log(">>error reason: " + reason.message);
    });

};



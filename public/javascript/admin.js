/**
 * admin.js - administrator's javascript
 */
/* global window, document, location, prompt, io, OlrGame, CrGame, PrGame */
var loginCount = 0;
var version; // version of application e.g. 3.1.49
var gameType; // "type" of game
var crPlayersFile; // path for file w. ranked players for Countdown Round
var socket;	// communication socket on admin channel
var roomNum; // room # of game
var questionsFile; // path for file w. game questions
var questionList;	// array of {"q": "What is 1+1?", "a": "2"}
var nextQuestion;	// next question from questionList
var timerCounter;	// system generated value when a timer is started
/**
 * processTestBuzzers - the 'Test Buzzers' button was clicked.
 */
function processTestBuzzers() {
	$('current_question').text("");
	$('current_answer').text("");
	// clearBuzzerColumn();
	// disableMarkingButtons(true);
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
	socket.emit('ask-question', index);
	console.log('  ask-question>>server');
	displayAnswer(answer);
	nextQuestion = index + 1;
	// select (highlight) the next question row.
	$('#question_grid').jqxGrid('selectrow', nextQuestion);
	$('#question_grid').jqxGrid('scrolloffset', 25*nextQuestion, 0);
	// Wait until someone buzzes in.
	disableMarkingButtons(true);
}

var playerList; // data for player grid.
/**
 * reloadPlayers - the playerList data has changed so reload it into the grid.
 */
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
				{ text: 'Mathlete', datafield: "name", cellsrenderer: playerRenderer},
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
 * loadFileGrid - load the files names within the folder into the grid. See DirectoryContents.js for variable formats.
 */
function loadFileGrid(folder, folderFiles) {
	var fileList;
	fileList = new Array();
	// must reformat the folderFiles array to make jqxGrid happy.
	folderFiles.forEach(function(e, i, a) {
		fileList.push({file: e}) ;
	});
	var fileSource = {
		localdata: fileList,
		datatype: "array"
	};
	$("#file_grid").jqxGrid(
	{ 	source: fileSource,
	});

}
/**
 * loadFolderTree - load the folders into the tree. See DirectoryContents.js for variable formats.
 */
function loadFolderTree(folderTree, folderContents, folderId) {
	var folder;
	for (var i = 0; i < folderContents.length; i++) {
		if (folderContents[i].path === folderId) {
			folder = folderContents[i];
			break;
		}
	}
	if (folder) {
		var folderFiles = folder.files;
		if (folderFiles) {
			loadFileGrid(folder, folderFiles);
		}
	}
	$("#folder_tree").jqxTree(
		{source: folderTree}
	);
	// since jQuery reject the funky id selector use good ole DOM API.
	var elem = document.getElementById(folderId);
	$("#folder_tree").jqxTree('selectItem', elem);
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
	if (text === 'Stop Game') {
//	    socket.emit('disconnect', "stop game clicked.");
        socket.disconnect("stop game clicked.");
	    console.log('  disconnect>>server');
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

function login() {
    $("#login_window").jqxWindow('open');
    $("#passwd").focus();
    loginCount++;
    $("#login_window").on('close', function(event) {
        var ok = event.args.dialogResult.OK;
        //console.log('password: ' + $('#passwd').val() );
        socket.emit('login', $('#passwd').val() );
    });
}

/**
 * initWidget - initialize the jqxWidgets on the admin/display screen.
 */
function initWidgets () {
	// just draw a sample admin screen to get the layout down
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
		width: '90%',  // why 90%? don't know. 100% doesn't work.
		height: 160,
		theme: 'energyblue',
		//source: null,  // no data to display
		columns: [
		{ text: 'Mathlete', datafield: "name", width: '50%', height: 20 },
		{ text: 'Buzzer', datafield: "buzzer", width: '25%', height: 20 },
		{ text: 'Score', datafield: "score", width: '25%', height: 20 },
		]
	});
	$("#question_grid").jqxGrid(
	{
		width: '90%',
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
	// $("#testing_buttons").jqxButtonGroup({mode: 'radio', theme: 'energyblue'});
	// $("#testing_buttons").jqxButtonGroup('setSelection', 0);
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
// popup window for "Login" dialog
    $("#login_window").jqxWindow({
        width: 400, height: 100, isModal: true, autoOpen: false, theme: 'energyblue',
        okButton: $('#passwd_okay'),
        initContent: function () {
            // Don't put focus on window. Focus will be put on input field.
        }
    });
// popup window for "Setup" dialog
	$("#setup_window").jqxWindow({
		width: 400, height: 160, isModal: true, autoOpen: false, theme: 'energyblue',
		okButton: $('#setup_okay'),
		initContent: function () {
			//$('#setup_window').jqxWindow('focus');
			$('#setup_okay').jqxButton('focus');
		}
	});
// popup window for "Select Folder / File" dialog.
	$("#select_folder_file_window").jqxWindow( {
		width: 700,
		height: 400,
		isModal: true,
		autoOpen: false,
		theme: 'energyblue',
		cancelButton: $('#select_file_cancel'),
		okButton: $('#select_file_okay'),
		initContent: function() {
			$("#folder_tree").jqxTree(
				{
					width: 275,
					height: 250,
					theme: 'energyblue',
				});
			$("#file_grid").jqxGrid(
				{
					width: 275,
					height: 250,
					theme: 'energyblue',
					columns: [
						{ text: 'File', datafield: 'file', width: 275, height: 20 },
					]
				});
			$("#select_file_cancel").jqxButton({width: '125'});
			$("#select_file_okay")  .jqxButton({width: '125', disabled: true});
		}
	});
	$("#select_game_window").jqxWindow(
			{
				width: 500,
				height: 375,
				isModal: true,
				autoOpen: false,
				theme: 'energyblue',
				cancelButton: $('#select_game_cancel'),
				okButton: $('#select_game_okay'),
				initContent: function () {
					$('#file_type').val("questions");
					$('#pr_game').jqxRadioButton({width: 400, checked: true});
					$('#olr_game').jqxRadioButton({width: 400, checked: false});
					$('#cr_game').jqxRadioButton({width: 400, checked: false});
					$('#pr_game').css({'white-space': 'normal'});
					$('#olr_game').css({'white-space': 'normal'});
					$('#cr_game').css({'white-space': 'normal'});
					$('#select_players_button').jqxButton({disabled: true});
					$("#select_game_cancel").jqxButton({width: '125'});
					$("#select_game_okay")  .jqxButton({width: '125'});
					$('#pr_game').bind('change', function(event){
						//var checked = $('olr_game').jqxRadioButton('checked');
						var checked = event.args.checked;
						$('#select_players_button').jqxButton({disabled: checked});
						$('#select_game_okay').jqxButton({disabled: !checked});
					});
					$('#olr_game').bind('change', function(event){
						//var checked = $('olr_game').jqxRadioButton('checked');
						var checked = event.args.checked;
						$('#select_players_button').jqxButton({disabled: checked});
						$('#select_game_okay').jqxButton({disabled: !checked});
					});
					$('#select_players_button').click( function() {
						$('#file_type').val("crplayersfile");
						socket.emit('load-folder-file', null);
						$('#file_type').val("crplayersfile");
						console.log("  load-folder-file>>server");
						$('#select_game_okay').jqxButton({disabled: false});
					});
					$("#select_game_window").on('close', function(event) {
						var ok = event.args.dialogResult.OK;
						if (ok) {
							if ($('#pr_game').jqxRadioButton('checked')) {
								gameType = 'PR';
							} else if ($('#olr_game').jqxRadioButton('checked')) {
								gameType = 'OLR';
							} else if ($('#cr_game').jqxRadioButton('checked')) {
								gameType = 'CR';
							} else {
								window.alert("No game selected!");
							}
							$('#file_type').val("questions");
							socket.emit('load-folder-file', null);
							console.log("  load-folder-file>>server");
						}
					});
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
 * 2. open the socket with the server on the admin channel.
 * 3. respond to socket messages from the server
 */
window.onload = function() {
	// User must still click "Start Game"
	// initialize all jQWidgets
	initWidgets();
	login();
    // open web socket back to host w/ reconnection set to 'false.'
	// Default is 'true' which has dead screens re-attach automatically.
	socket = io("//" + location.host + "/admin", {transports: ['websocket'], reconnection: false});
    socket.on('bad-login', function() {
        console.log('>>bad-login');
        $("#passwd").val("");
        $("#passwd").attr("placeholder","Bad password. Try again.");
        login();
    });
    socket.on('register', function(data ) {
        console.log('>>register');

        // force game selection at the beginning.
        $("#select_game_window").jqxWindow('open');
        console.log('>>info');
        console.log("Room #: ", data.roomNum);
        console.log("IP: " + data.serverIP);
        console.log("port: " +data.serverPort);
        roomNum = data.roomNum;
        if (data.appVersion) {
            version = data.appVersion;
        }
        $('#ver').text("Ver. " + version);
        console.log("Ver: " + data.appVersion);
        console.log('projector: localhost:' + data.serverPort + '/projector.html');
        $('#room_num').html(data.roomNum.toString());
        $('#ip_address').html(data.serverIP);
        $('#port_number').html(data.serverPort);
        $('#projection_url').html('localhost:'  + data.serverPort + '/projector.html');
    });
//  'info' message NOT sent
	socket.on('info', function(data) {
		console.log('>>info');
		console.log("Room #: ", data.roomNum);
		console.log("IP: " + data.serverIP);
		console.log("port: " +data.serverPort);
		roomNum = data.roomNum;
		if (data.appVersion) {
			version = data.appVersion;
		}
		$('#ver').text("Ver. " + version);
		console.log("Ver: " + data.appVersion);
		console.log('projector: localhost:' + data.serverPort + '/projector.html');
        $('#room_num').html(data.roomNum.toString());
		$('#ip_address').html(data.serverIP);
		$('#port_number').html(data.serverPort);
		$('#projection_url').html('localhost:'  + data.serverPort + '/projector.html');
		$("#setup_window").jqxWindow('open');
	});
	socket.on('select-folder-file', function(data) {
		console.log('>>select-folder-file');
		var folders = data.folders;
		var files = data.files;
		var folderId = folders[0].id;
		var fileIndex = -1;
		// The type of folder/file selection is stored in hidden field.
		var fileType = $('#file_type').val();
		loadFolderTree(folders, files, folderId);
		// only show the window to first admin (moderator)
		$("#folder_tree").on('itemClick', function(event) {
			var args = event.args;
			folderId = $("#folder_tree").jqxTree('getItem', args.element).id
			loadFolderTree(folders, files, folderId);
			$("#file_grid").jqxGrid('clearselection');
			fileIndex = -1;
			$("#select_file_okay").jqxButton({disabled: true});
		});
		$("#file_grid").on('rowclick', function(event) {
			var args = event.args;
			fileIndex = args.rowindex;
			$("#select_file_okay").jqxButton({disabled: fileIndex < 0});
		});
		var title = (fileType==='questions')? 'Select the Questions File': 'Select the Players File';
		$("#select_folder_file_window").jqxWindow({title: title});
		$("#select_folder_file_window").jqxWindow('open');
		$("#select_folder_file_window").on('close', function(event) {
			// Below works. See <button> attributes
			var ok = event.args.dialogResult.OK;
			if (ok) {
				var folderItem = $('#folder_tree').jqxTree('getSelectedItem');
				var fileIndex = $('#file_grid').jqxGrid('getselectedrowindex');
				var path = folderItem.id;
				var file = $('#file_grid').jqxGrid('getcelltext', fileIndex, 'file');
				var fileType = $('#file_type').val();
				var absPath = path + '/' + file;
				if (fileType === "questions") {
					// this ends the "wizard" sequence
					questionsFile = absPath;
					// send the previously saved file paths
					console.log("gameType: ", gameType);
					console.log("questionsFile: " + questionsFile);
					console.log("playersFile: " + crPlayersFile);
					socket.emit('start-game', {gameType: gameType, questionsFile: questionsFile, playersFile: crPlayersFile});
                    console.log('  start-game>>server');
				} else {
					// save the CR players file path
					$("#crplayers_file_span").html(absPath);
					crPlayersFile = absPath;
				}
			}
			// unbind for now
			$("#select_folder_file_window").off('close');
		});
	});
	socket.on('load-questions', function(data) {
		console.log('>>load-questions');
		if (data) {
			questionList = data;
			nextQuestion = 0;
			loadQuestions(data);
		} else {
			// no question list (due to bad format no doubt)
			window.alert('Bad questions file! Pick another.');
		}
	});
	socket.on('start-game', function(data) {
		console.log('>>start-game');
        $("#setup_window").jqxWindow('open');
		gameType = data.gameType;
		if (data.questionsError) {
			alert("Error reading questions file. Can't start");
			return;
		}
		if (gameType === 'CR' && data.playersError) {
			alert("Error reading players file. Can't start");
			return;
		}
		setWindowTitle(roomNum);
		// ready to roll
		// change label to "Start Game"
		//$('#menu ul li#game').html("Start Game");
		enableTestingButtons(true);
	});
	socket.on('test-buzzers', function(data) {
		console.log('>>test-buzzers');
		processTestBuzzers();
	});
	socket.on('ask-question', function(data) {
		console.log('>>ask-question');
		displayQuestion(data);
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
        window.alert("disconnect:" + reason);
        console.log(">>disconnect reason: " + reason);
    });

    socket.on('error', function (reason) {
        window.alert("error:" + reason.message);
        console.log(">>error reason: " + reason.message);
    });

};



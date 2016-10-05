/**
 * projector.js - projector's javascript.
 */
/* global window, document, location, prompt, io, OlrGame, CrGame, PrGame */
var socket;	// communication socket on projector channel.
var SIZE_FACTOR = 1.0625;
var currentFontSize;
var currentRowsHeight;
var gameType; // type of game, e.g. "OLR" for "Open Lightning Round"
/**
 * set the window title as per the game type.
 */
function setWindowTitle() {
	var title = "Unknown Game!!";
	switch (gameType) {
	case "PR":	title = "Presentation Round"; break;
	case "OLR":	title = "Open Lightning Round"; break;
	case "CR":	title = "Countdown Round"; break;
	}
	$("#title").text(title);

}
/**
 * displayQuestion - display the new question
 */
function displayQuestion(question) {
	$('#current_question').text(question);
	$('#current_answer').text("");
}
/**
 * displayAnswer - display the answer (for benefit of the audience)
 */
function displayAnswer(answer) {
	$('#current_answer').text(answer);
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
var playerList;
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
 * initWidget - initialize the jqxWidgets on the admin/display screen.
 */
function initWidgets () {
	// save the initial font size.
	currentFontSize = parseInt($("body").css('font-size'));
	// just draw a sample admin screen to get the layout down
	$("#current_question").jqxPanel({width: '100%', height: '200px', theme: 'energyblue'}); // height: '50px'
	$("#current_answer").jqxPanel({width: '100%', height:  '50px', theme: 'energyblue'}); // height: '25px'
	$("#player_grid").jqxGrid(
		{
			width: '90%',
			height: 200, // height: 260
			theme: 'energyblue',
			//source: null,  // no data to display
			columns: [
				{text: 'Mathlete', datafield: "name", width: '50%', height: 20},
				{text: 'Buzzer', datafield: "buzzer", width: '25%', height: 20},
				{text: 'Score', datafield: "score", width: '25%', height: 20},
			]
		});
	// this must come after the initial sizing!
	currentRowsHeight = $("#player_grid").jqxGrid('rowsheight');
	$("#fontsize_up").jqxButton({width: '25%', theme: 'energyblue'});
	$("#fontsize_down").jqxButton({width: '25%', theme: 'energyblue'});
	// set click handler for font sizing buttons
	$('#fontsize_up').bind('click', function (event) {
		// increase size
		changeWidgetSize(true);
		changeFontSize(true);
	});
	$('#fontsize_down').bind('click', function (event) {
		// decrease size
		changeWidgetSize(false);
		changeFontSize(false);
	});

}

function changeWidgetSize(up) {
	var newHeight;
	if (up) {
		newHeight = currentRowsHeight * SIZE_FACTOR
	} else {
		newHeight = currentRowsHeight / SIZE_FACTOR
	}
	$("#player_grid").jqxGrid({rowsheight: newHeight});
	currentRowsHeight = newHeight;
}

/**
 * changeFontSize - increase or decrease the font size.
 * @param up - true => increase, false => decrease
 */
function changeFontSize(up) {
	var newSize;
	if (up) {
		newSize = currentFontSize * SIZE_FACTOR;
	} else { // must be down
		newSize = currentFontSize / SIZE_FACTOR;
	}
	$("#current_question").css("font-size", newSize );
	$("#current_answer").css("font-size", newSize);
	// as per jqWidgets documentation.
	$(".jqx-grid-column-header").css("font-size", newSize);
	$(".jqx-grid-cell").css("font-size", newSize);
	$("body").css("font-size", newSize);
	currentFontSize = newSize;
}
/**
 * window.onload
 * 1. initialize the GUI widgets.
 * 2. open the socket with the server on the projector channel.
 * 3. respond to socket messages from the server
 */
window.onload = function() {
	// initialize all jQWidgets
	initWidgets();
	$(window).resize( function () {
		"use strict";
		// there seems to be a flaw in jqWidgets that makes this necessary.
		$("#player_grid").jqxGrid({rowsheight: currentRowsHeight});
		$(".jqx-grid-column-header").css("font-size", currentFontSize);
		$(".jqx-grid-cell").css("font-size", currentFontSize);
	});
	// open web socket back to host w/ reconnection set to 'true'
	// Default is 'true' which has dead screens re-attach automatically.
	socket = io("http://" + location.host + "/projector", {reconnection: true});
	socket.on('start-game', function(data) {
		console.log('>>start-game');
		gameType = data.gameType;
		setWindowTitle();
	});
	socket.on('ask-question', function(data) {
		console.log('>>ask-question');
		displayQuestion(data);
	});
	socket.on('show-answer', function(data) {
		console.log('>>show-answer', data);
		displayAnswer(data);
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
};



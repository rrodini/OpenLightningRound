/**
 * projector.js - projector's javascript.
 */
/* global window, document, location, prompt, io, OlrGame, CrGame, PrGame */
var socket;	// communication socket on projector channel.
var roomNum; // room # for game.
var invitationCount = 0; // room number match attempts.
// var SIZE_FACTOR = 1.0625;
// var currentFontSize;
// var currentRowsHeight;
/**
 * displayItem - display the new item (Question / Answers / etc.)
 */
function displayItem(item, size) {
	// the item has been formatted on the server.  It may contain MathJax formulas (spans and divs)
	// or images.  The servers decides how is should be formatted based on its raw length (character count).
	let newClass = "";
    $('#central_div').removeClass();
    switch (size) {
		case 1:
			newClass = 'very-short';
			break;
        case 2:
            newClass = 'short';
            break;
        case 3:
            newClass = 'medium';
            break;
        case 4:
            newClass = 'long';
            break;
	}
	$('#central_div').addClass(newClass);
	$('#central_div').html(item);
	//$('#current_answer').html("");
}
//var playerList; // data for player grid.
// var playerSource =
// {
// 	localdata: null,
// 	datatype: "array"
// };
// var playerAdaptor;
//
// var playerRenderer = function(playerIndex, columnfield, value, defaulthtml, columnproperties) {
// 	if (!playerSource.localdata[playerIndex].registered) {
// 		return '<span style="margin-left: 4px; color: red;" >' + value + '</span>';
// 	}
// 	$(".jqx-grid-cell").css("font-size", currentFontSize);
// };
//
// /**
//  * reloadPlayers - the playerList data has changed so reload it into the grid.
//  */
// function reloadPlayers(pList) {
// 	// mysterious assignment to prevent pList from disappearing in playerRenderer
// 	// playerList = pList;
// 	$(".jqx-grid-column-header").css("font-size", currentFontSize);
// 	// clear any current selected player.
// 	var playerList = playerSource.localdata;
// 	$('#player_grid').jqxGrid('clearselection');
// 	$("#player_grid").jqxGrid('updatebounddata');
// 	// now highlight the player that is selected.
// 	for (var i = 0; i < playerList.length; i++) {
// 		if (playerList[i].selected ) {
// 			$('#player_grid').jqxGrid('selectrow', i);
// 			break;
// 		}
// 	}
//
// }
//
// /**
//  * initWidget - initialize the jqxWidgets on the admin/display screen.
//  */
// function initWidgets () {
// 	// save the initial font size.
// 	currentFontSize = parseInt($("body").css('font-size'));
// 	// just draw a sample admin screen to get the layout down
// 	$("#current_question").jqxPanel({width: '100%', height: '250px', theme: 'energyblue'}); // height: '50px'
// 	$("#current_answer").jqxPanel({width: '100%', height:  '50px', theme: 'energyblue'}); // height: '25px'
// 	playerAdaptor = new $.jqx.dataAdapter(playerSource);
// 	$("#player_grid").jqxGrid(
// 		{
// 			width: '90%',
// 			height: 200, // height: 260
// 			theme: 'energyblue',
// 			source: playerAdaptor,  // null => no data to display
// 			columns: [
// 				{text: 'Mathlete', datafield: "name", width: '50%', height: 20,  cellsrenderer: playerRenderer},
// 				{text: 'Buzzer', datafield: "buzzer", width: '25%', height: 20},
// 				{text: 'Score', datafield: "score", width: '25%', height: 20},
// 			]
// 		});
// 	// this must come after the initial sizing!
// 	currentRowsHeight = $("#player_grid").jqxGrid('rowsheight');
// 	$("#fontsize_up").jqxButton({width: '25%', theme: 'energyblue'});
// 	$("#fontsize_down").jqxButton({width: '25%', theme: 'energyblue'});
// 	// set click handler for font sizing buttons
// 	$('#fontsize_up').bind('click', function (event) {
// 		// increase size
// 		// this statement must follow the font size change
// 		changeWidgetSize(true);
// 		changeFontSize(true);
// 	});
// 	$('#fontsize_down').bind('click', function (event) {
// 		// decrease size
// 		changeWidgetSize(false);
// 		changeFontSize(false);
// 	});
//
// }
// /**
//  * Change the size of the widget.
//  * @param up true => increase, false => declrease
//  */
// function changeWidgetSize(up) {
// 	var newHeight;
// 	if (up) {
// 		newHeight = currentRowsHeight * SIZE_FACTOR
// 	} else {
// 		newHeight = currentRowsHeight / SIZE_FACTOR
// 	}
// 	$("#player_grid").jqxGrid({rowsheight: newHeight});
// 	currentRowsHeight = newHeight;
// }
//
// /**
//  * changeFontSize - increase or decrease the font size.
//  * @param up - true => increase, false => decrease
//  */
// function changeFontSize(up) {
// 	var newSize;
// 	if (up) {
// 		newSize = currentFontSize * SIZE_FACTOR;
// 	} else { // must be down
// 		newSize = currentFontSize / SIZE_FACTOR;
// 	}
// 	$("#current_question").css("font-size", newSize );
// 	$("#current_answer").css("font-size", newSize);
// 	$("body").css("font-size", newSize);
// 	// as per jqWidgets documentation.
// 	$(".jqx-grid-column-header").css("font-size", newSize);
// 	$(".jqx-grid-cell").css("font-size", newSize);
// 	currentFontSize = newSize;
// }
/**
 * window.onload
 * 1. initialize the GUI widgets.
 * 2. open the socket with the server on the projector channel.
 * 3. respond to socket messages from the server
 */
window.onload = function() {
	// initialize all jQWidgets
//	initWidgets();
	// $(window).resize( function () {
	// 	"use strict";
	// 	// there seems to be a flaw in jqWidgets that makes this necessary.
	// 	$("#player_grid").jqxGrid({rowsheight: currentRowsHeight});
	// 	$(".jqx-grid-column-header").css("font-size", currentFontSize);
	// 	$(".jqx-grid-cell").css("font-size", currentFontSize);
	// });
	// open web socket back to host w/ reconnection set to 'true'
	// Default is 'true' which has dead screens re-attach automatically.
	socket = io("//" + location.host + "/projector", {transports: ['websocket'], reconnection: false});
    socket.on('invitation', function () {
        console.log(">>invitation");
        invitationCount++;
        if (invitationCount <= 3) {
            var num = window.prompt("Enter room #:");
            roomNum = parseInt(num);
            socket.emit("join-room", num);
        } else {
            alert("Please refresh page and try again.")
        }
    });
	socket.on('start-game', function(data) {
		console.log('>>start-game');
		gameType = data.gameType;
		setWindowTitle(roomNum);
	});
	socket.on('ask-question', function(data) {
		console.log('>>ask-question ');
        console.log(' ' + data.item);
        console.log(' ' + data.size);
		displayItem(data.item, data.size);
	});
	socket.on('show-answer', function(data) {
		console.log('>>show-answer');
		displayItem(data.item, data.size);
	});
    socket.on('buzz', function(data) {
        console.log('>>buzz');
        var audio = document.getElementById("buzzer");
        audio.play();
    });
    socket.on('disconnect', function (reason) {
        window.alert("disconnect:" + reason);
        console.log(">>disconnect reason: " + reason);
    });

    socket.on('error', function (reason) {
        window.alert("error:" + reason.message);
        console.log(">>error reason: " + reason.message);
    });

    // socket.on('update-scoreboard', function(data) {
	// 	console.log('>>update-scoreboard');
	// 	playerSource.localdata = data.playerList;
	// 	updateScoreboard(data.status, data.playerList);
	// });
	// socket.on('shutdown', function(data) {
	// 	console.log('>>shutdown');
	// //  'shutdown' message only sent by test driver.
	// 	window.close();
	// });
};



/**
 * projector.js - projector's javascript.
 */
/* global window, document, location, prompt, io, OlrGame, CrGame, PrGame */
var socket;	// communication socket on projector channel.
var roomNum; // room # for game.
var invitationCount = 0; // room number match attempts.

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

    socket.on('admin-disconnect', function (reason) {
        window.alert("admin-disconnect:" + reason);
    });

    socket.on('error', function (reason) {
        window.alert("error:" + reason.message);
        console.log(">>error reason: " + reason.message);
    });

};



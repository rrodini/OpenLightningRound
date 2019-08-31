/* global window, document, location, prompt, io */

function promptForName() {
    // modal prompt for name
    var name = null;
    var first = true;
    // loop till a valid name is returned
    while (name === null) {
        name = prompt(first?"Enter your name.":"Don't hit cancel, hit ok.");
        if (!name) { // empty string
            name = null;
        }
        first = false;
    }
    return name;
}

window.onload = function() {
    var invitationCount = 0;
    var window_height = window.innerHeight;
	var splitHeight = (window_height / 3) - 12;
	//console.log("document.height: " + splitHeight);
	var message = document.getElementById("message");
	message.style.height = "" + 2*splitHeight + "px";//
	var button = document.getElementById("button");
	button.style.height = "" + splitHeight + "px";
	var title = document.getElementById("title");
	var name; // name of the player.
	// open web socket back to host w/ reconnection set to 'false.'
	// Default is 'true' which has dead screens re-attach automatically.
	var socket = io("//" + location.host + "/player", {transports: ['websocket'], reconnection: false});
	// This is how we receive messages from the server through the web socket
    socket.on('invitation', function () {
        console.log(">>invitation");
        invitationCount++;
        if (invitationCount <= 3) {
            var num = window.prompt("Enter room #:");
            roomNumber = parseInt(num);
            socket.emit("join-room", num);
        } else {
            alert("Please refresh page and try again.")
        }
    });
    socket.on('room-joined', function(data) {
        console.log('>>room-joined');
        // modal prompt for name
        name = promptForName();
        socket.emit('register', {'name': name});
        console.log('  register>>server');
    });
	socket.on('registered', function(data) {
		console.log('>>registered room #' + data);
        message.innerHTML = "";
		title.text = name;
		button.textContent = 'Buzz';
	});
	socket.on('deregister', function(data) {
		console.log('>>deregister');
		console.log(data.reason);
		message.style.fontSize = '36px';
		message.innerHTML = data.reason;
		// client was just told to refresh the screen so change status
        setTimeout(function () {
            "use strict";
           name = promptForName();
           socket.emit('register', {'name': name});
           console.log('  register>>server');
        }, 2000);
	});
	socket.on('ask-question', function(question) {
		var BACKTICK = "`";
		console.log('>>ask-question');
		message.style.fontSize = '22px';
        var backtick1 = question.indexOf(BACKTICK);
        if (backtick1 > 0 ) {
            if (question.substr(backtick1+1, 3) === "img") {
                // image here.  Turn backticks into brackets
                var backtick2 = question.lastIndexOf(BACKTICK);
                question = question.substring(0, backtick1-1) + "<div> <" + question.substring(backtick1+1, backtick2-1) +
                    "> </div>" + question.substring(backtick2+1);
                message.innerHTML = question;
            } else {
                // math formula here.  Let MathJax do the work.
                message.innerHTML = question;
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, "current_question"]);
            }
        } else {
            message.innerHTML = question;
        }
	});
	socket.on('test-buzzers', function(data) {
		console.log('>>test-buzzers');
		// clear any question in message area
		message.innerHTML = "";
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

	function flash_background() {
		var body = document.getElementById("body");
		var current = body.style.backgroundColor;
		body.style.backgroundColor = 'white';
		setTimeout(set_background, 100, current);
		setTimeout(set_background, 100, 'white');
		setTimeout(set_background, 100, current);
		setTimeout(set_background, 100, 'white');
		setTimeout(set_background, 100, current);
	}
	
	function set_background(color) {
		var body = document.getElementById("body");
		body.style.backgroundColor = color;
		//console.log("set_background: color: " + color);
	}
	// shutdown the client
	function shutdown() {
		console.log('shutting down client');
		// TBD: remove this line as this API is gone. socket.end();  // sends 'disconnect' event
	}
	// when user taps or clicks button send buzz message
	button.onclick = function(event) {
		var msg;
		var button = document.getElementById("button");
		if (button.textContent === "Register") {
			socket.emit('register', {'name': name});
		} else {  // assume test of buzzer or problem buzz
			flash_background();
			socket.emit('buzz', {'name': name});
			console.log('  buzz>>server');
		}
	};

};

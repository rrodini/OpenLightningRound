/**
 * olr.js - Open Lightning Round module.  Main startup code for application here.
 *   Some files below taken from "Node.js in Action" by Mike Cantelon et al.
 */
"use strict";

let http = require('http');
let fs  = require('fs');
let path = require('path');
let mime = require('mime');
let olrConf = require('./olr_options');
let winston = require('winston');
let winstonConf = require('winston-config');
let sockServer = require('./sock_server');

let cache = {};
let logger;
let serverIP;  // IP address of server
let serverPort; // port # of server

exports.init = function () {
	// get the options (configuration, args, etc.) for the application
	olrConf.init();
	let configPath = path.resolve(__dirname , '../config/winston-config.json');
	winstonConf.fromFileSync(configPath, function(error, winston) {
	    if (error) {
	      console.log('error during winston configuration');
	    } else {
	      console.log('everything alright');
	    }
	  });
	// now we can start logging
	logger = winston.loggers.get('application');
};


function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
}

function sendFile(response, filePath, fileContents) {
  response.writeHead(
    200,
    {"content-type": mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response);
          } else {
            // disable caching during development
// TODO: Enable caching
            //cache[absPath] = data;
            sendFile(response, absPath, data);
          }
        });
      } else {
        send404(response);
      }
    });
  }
}

exports.startServer = function() {
	// display the IP address of the server
	require('dns').lookup(require('os').hostname(), function(err, addr, fam) {
		serverIP = addr;
		logger.info('Server has IP address: ' + addr);
	});
	let server = http.createServer(function(request, response) {
		let filePath = false;
		if (request.url === '/') {
			filePath = 'public/player.html';
		} else {
			filePath = 'public' + request.url;
		}
		let absPath = './' + filePath;
		serveStatic(response, cache, absPath);
	});
	let port = parseInt(olrConf.getOption('port'));
	serverPort = port;
// http server is listening
	server.listen(port, function() {
		logger.info("Server using port %d", port);
		// now socket server is also listening
		sockServer.listen(server);
	});
};

exports.getServerIP = function () { return serverIP;};
exports.getServerPort = function() { return serverPort;};

exports.stopServer = function() {
	
};
#!/usr/bin/env node

/**
 * Standard Express starting point.
 */

var app = require('../app');
var debug = require('debug')('olrproxy:server');
var http = require('http');
let sockServer = require('../lib/sock_server'); //({pingTimeout: 300000});
var dotenv = require('dotenv');
let path = require('path');
let winston = require('winston');
//let winstonConf = require('../config/winston-config');
let logger

/**
 * Get port from environment and store in Express.
 */

dotenv.config();
let configPath = path.resolve(__dirname , '../config/winston-config.json');
console.log(__dirname);
// winstonConf.fromFileSync(configPath, function(error, winston) {
//     if (error) {
//         console.log('error during winston configuration');
//     } else {
//         console.log('winston alright');
//     }
// });
// now we can start logging
winston.level = process.env.LOGLEVEL || 'error';
console.log(`logging at: ${winston.level} level`);
logger = winston.loggers.get('application');

var port = normalizePort(process.env.PORT || '3000');
console.log(`Env port: ${process.env.PORT}`);

app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
    // now socket server is also listening
    sockServer.listen(server);
}
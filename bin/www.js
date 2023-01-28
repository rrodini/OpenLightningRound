#!/usr/bin/env node

/**
 * Standard Express starting point.
 */

let app = require('../app');
let enforce = require('express-sslify')
let debug = require('debug')('olrproxy:server');
let http = require('http');
let sockServer = require('../lib/sock_server'); //({pingTimeout: 300000});
let dotenv = require('dotenv');
let fs = require('fs')
let path = require('path');
let winston = require('winston');
let db = require('../lib/DbUpdate');
let logger
// flag is needed on Heroku
let trustProtoHeader = process.env.NODE_ENV === 'production'

/**
 * Get port from environment and store in Express.
 */
// OS level env variables will be used!
const result = dotenv.config({path: '../.env'} );
const postgresVerPromise = db.readPostgresVer();
if (process.env.NODE_ENV === 'development') {
    const overridePath = path.resolve( '../.env.override');
    const envConfig = dotenv.parse(fs.readFileSync('../.env.override'));
    for (const k in envConfig) {
    // FOR DEV ONLY
        process.env[k] = envConfig[k];
    }
}

// echo the ENVIRONMENT (except for DATABASEURL)
console.log('ENVIRONMENT:');
//console.log(result.parsed);
logEnvironment();
// echo RUNTIME versions
postgresVerPromise.then ( res => {
        const postgresVer = res.rows[0].version;
        logRuntimeVersions(postgresVer);
    });
// now we can start logging
winston.level = process.env.LOGLEVEL || 'error';
logger = winston.loggers.get('application');
// TODO: Check this PORT logic
var port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

/**
 * Create HTTP server.  Pass parameter for Heroku platform.
 */
// Line below forces HTTPS but prevents CORS
//app.use(enforce.HTTPS({ trustProtoHeader: trustProtoHeader }));
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
    debug('OLR Listening on ' + bind);
    // now socket server is also listening
    sockServer.listen(server);
}
/**
 * logRuntimeVersions - log important version info
 */
function logRuntimeVersions(postgresVer) {
    console.log('RUNTIME:');
    console.log(' node: ' + process.version);
    console.log(' ' + postgresVer);
}
/**
 * logEnviroment - log environment variables.
 * 
 * Notes:
 * - must update envNames with change to either DEV or PROD.
 */
function logEnvironment() {
    const envNames = {
        'NODE_ENV': {log: 'both'},
        'NODE_MODULES_CACHE': {log: 'production'},
        'LOGLEVEL': {log: 'both'},
        'DATABASE_URL':  {log: 'development'},
        'DBSSL':  {log: 'development'},
        'URLALLOWORIGIN':  {log: 'both'},
        'URLENDGAME':  {log: 'both'},
        'URLGAMESUMMARY':  {log: 'both'},
        'QUESTIONFILEROOT': {log: 'development'},
        'PLAYERFILEROOT': {log: 'development'}
    }
    const envProcessKeys = Object.keys(process.env);
    //console.log( envProcessKeys );
    for (key in envNames) {
        if (envProcessKeys.indexOf(key) >= 0) {
            const log = envNames[key].log;
            var doLog = log === 'both' || process.env.NODE_ENV === log;
            if (doLog) {
                console.log(` ${key}: ${process.env[key]}`);
            }
        }
    }
}
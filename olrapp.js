/**
 * app.js - start the application
 */

var olr = require("./lib/olr.js");
// read configuration files, command line parameters, etc.
olr.init();
// now start the http and websocket servers
olr.startServer();
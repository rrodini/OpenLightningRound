/**
 * olr_options.js - Return options object for OLR app. e.g. the port #.
 * Notes:
 * - The implementation uses node-getopt npm module from jiangmiao.
 * - Both the -v and -h options terminate the program immediately
 * - Command line arguments have precedence over config/olr-config.json options
 * - If option is not found in either place this module has hard-wired defaults
 * - A change in one place (Getopt constructor call) means a change in other places.
 * 
 */
"use strict";

let fs = require('fs');
let path = require('path');
let Getopt = require('node-getopt');
let definedOptions; // options for this execution
let defaultOptions; // options from config file
// pass the meta-data regarding args here.
let opt = new Getopt([
 ['p' , 'port=ARG'            , 'port #'],
 ['q' , 'olr-folder=ARG'      , 'olr folder'],
 ['w' , 'loginPwd=ARG'        , 'login passwd'],
 ['h' , 'help'                , 'display this help'],
 ['v' , 'version'             , 'show version']
]).bindHelp();     // bind option 'help' to default action
// If -v or --version is seen get value from package.json file.
opt.on('version', function (getoptArgv, getoptOptions) {
	let data = fs.readFileSync('package.json');
	let contents;
	try {
		contents = JSON.parse(data);
	} catch (e) {
		console.error("error parsing package.json");
		process.exit(1);
	}
//  In case the program should continue running, save the version information
	getoptOptions.version = contents.version;
//  But right now just echo the version to the console and stop execution.
	console.log(contents.version);
	process.exit(0);
});
// read the olr-config.json file for options.
function readConfig() {
	let configPath = path.resolve(__dirname , '../config/olr-config.json');
	let data = fs.readFileSync(configPath);
	try {
		defaultOptions = JSON.parse(data);
	} catch (e) {
		console.error("error parsing olr-config.json");
		process.exit(1);
	}
}
// set value of an option to something NOT from args.
function setDefault(name, backup) {
	let val;
	if (defaultOptions[name]) {
		val = defaultOptions[name];
	} else {
		val = backup;
	}
	definedOptions[name] = val;
}
// init should be called when OLR starts.
exports.init = function (){
	// this line parses the CLI args
	opt.parseSystem();
	// now get any missing values from the config file.
	readConfig();
	definedOptions = {};
	// parsedOption.options come from CLI args
	for (let option in opt.parsedOption.options) {
		definedOptions[option] = opt.parsedOption.options[option];
	}
	// if option wasn't set on CLI then set a value here
	for (let option in opt.long_options) {
		let backup;
		if (!definedOptions[option] && option !== 'help') {
			if (option === 'port') {
				backup = 8000;
			} else if (option === 'olr-folder') {
				backup = './olr-files';
			}
			setDefault(option, backup);
		}
	}
	return definedOptions;
};
// get all of the options.  Key is 'long name' of option.
exports.getOptions = function () {
	return definedOptions;
};
// get a particular option.  Name is 'long name' of option.
exports.getOption = function (name) {
	return definedOptions[name];
};

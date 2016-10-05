/**
 * ReadJsonFile.js - read (and eventually validate) a JSON file.
 */
"use strict";

let fs = require('fs');
let winston = require('winston');
let logger = winston.loggers.get('application');

// Constructor
function ReadJsonFile() {

}
/**
 * read the JSON file
 * @param type - 'questions', 'crplayers', etc.
 * @param path - absolute or relative path
 * @returns {*}
 */
ReadJsonFile.prototype.read = function(type, path) {
    let data = fs.readFileSync(path);
    let json;
    try {
        json = JSON.parse(data);
    } catch (e) {
        logger.error("error parsing JSON file: " + path);
        throw e;
    }
    // TODO: validate the type against a JSON schema.
    return json;
}

module.exports = ReadJsonFile;
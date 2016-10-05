/**
 * NOT USED.
 * questions.js - responsible for loading questions from disk.
 */

"use strict";

var fs = require('fs');
var winston = require('winston');

var root_folder;  // root folder for questions files
var questionFilesWithDescriptions; // array of {file: name, description: description}
var logger = winston.loggers.get('application');

var loadFileNames = function (root) {
	var fileAndFolderList = fs.readdirSync(root);
	var fileList = [];
	fileAndFolderList.forEach(function(fileName) {
		var stats = fs.lstatSync(root + '/' + fileName);
		if (stats.isFile()) {
			fileList.push(fileName);
		}
 	});
	// return the file names under the questions root folder
	return fileList;
// ATTENTION: line below works
		return fs.readdirSync(root);
};

var loadFileDescriptions = function (fileList, root) {
	questionFilesWithDescriptions = [];
	// read each of the questions file to get the description of the file contents.
	fileList.forEach(function (fileName){
		var path = root + '/' + fileName;
		var data = fs.readFileSync(path);
		var description;
		try {
			description = JSON.parse(data).description;
			questionFilesWithDescriptions.push({'file': fileName, 'description': description});
		} catch (e) {
			logger.error("error parsing questions file: " + fileName);
		}
	});
	// sort the array alphabetically by file name
	questionFilesWithDescriptions.sort(function(a,b) {return a.file.localeCompare(b.file); });
};
/* 
 * Constructor
 *
 */
function QuestionsFile(root) {
	// set the root folder for the list of question files.
	// root_folder = root;
	// var fileList = loadFileNames(root);
	// loadFileDescriptions(fileList, root);
}

QuestionsFile.prototype.getFileNamesWithDescriptions = function () {
	// return an array of {file: name, description: description}
	return questionFilesWithDescriptions;
};

QuestionsFile.prototype.loadQuestionsFile = function(absPath) {
	// load the questions file returning array of {q: question, a: answer }
//	var absPath = root_folder + '/' + name;
	var data = fs.readFileSync(absPath);
	var questionFile;
	// create empty array
	try {
		questionFile = JSON.parse(data);
	} catch (e) {
		logger.error("error parsing questions file: " + name);
	}
	return questionFile.questions_and_answers;
};

module.exports = {
		QuestionsFile: QuestionsFile,
		getFileNamesWithDescriptions: QuestionsFile.getFileNamesWithDescriptions,
		loadQuestionsFile:QuestionsFile.loadQuestionsFile,
};



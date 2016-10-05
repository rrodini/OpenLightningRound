/**
 * DirectoryContents.js - get the nested folders and their contents of the path passed to the constructor.
 */

"use strict";

let fs = require('fs');
let winston = require('winston');

let rootFolder; // root folder (can be a relative path too)
let logger = winston.loggers.get('application');

/*
 * Constructor
 */
function DirectoryContents(path) {
	// set the root folder for the list of question files.
	rootFolder = path;
}


/**
 * format of items (below) is for jqxTree widget.
 */
function newItem(path) {
	let folderName = path.split('/').pop();
	let val = path;
	// use of the id field is a kludge (should be an html id attribute but is file path).
	let item = {
		id    : val,
		icon  : './jqxwidgets/styles/images/folder.png',
		label : folderName,
		items : []
	};
	return item;
}
/**
 * getFolders - recursive routine for getting the nested folders and files.
 */
function getFolders(path, tree, lastItem, files) {
	if (fs.statSync(path).isDirectory()) {
		let item = newItem(path);
		if (lastItem !== undefined) {
			lastItem.items.push(item);
		} else {
			tree.push(item);
		}
		// push nested folders
		let foldersAndFiles = fs.readdirSync(path);
		let filesOnly = [];
		foldersAndFiles.forEach(function(f) {
			if (f.charAt(0) !== '.') { // ignore hidden folders
				let absPath = path + '/' + f;
				let stats = fs.lstatSync(absPath);
				if (stats.isDirectory() && !stats.isSymbolicLink()) {
					getFolders(absPath, tree, item, files);
				} else {
					filesOnly.push(f);
				}
			}

		});
		files.push( {path: path, files: filesOnly} );
		if (item.items.length === 0 ) {
			delete item.items;
		}
	}
}
/**
 * Get the contents (nested folders and files) of the root directory.
 * @returns {{folders: Array, files: Array}}.
 * folders is array of {id, icon, label, items[] }.
 * 		id: path of folder, icon: icon for jqxTree, label: folderName, items: array of nested folders.
 * files is array of fileName.
 */
DirectoryContents.prototype.getContents = function () {
	let folders = [];
	let files = [];
	getFolders(rootFolder, folders, undefined, files);
	return {folders: folders, files: files};
};

module.exports = DirectoryContents;


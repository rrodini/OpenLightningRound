/**
 * NOT USED. To be DELETED.
 * directory_tree.js - get the nested folders of the path passed to the constructor.
 */

"use strict";

var fs = require('fs');
var winston = require('winston');

var root_folder; // root folder (can be a relative path too)
var logger = winston.loggers.get('application');

/*
 * Constructor
 * 
 */
function DirectoryTree(path) {
	// set the root folder for the list of question files.
	root_folder = path;
}

DirectoryTree.prototype.getRootFolder = function() {
	return root_folder;
};

/**
 * format of items (below) is for jqxTree widget.
 */

function newItem(path) {
	var folderName = path.split('/').pop();
	var val = path;
	// use of the id field is a kludge -- but it works.
	var item = {
		id    : val,
		icon  : './jqxwidgets/styles/images/folder.png',
		label : folderName,
		items : []
	};
	return item;
}
/**
 * getFolders - recursive routine for getting the nest folders of path the tree
 */
function getFolders(path, tree, lastItem) {
	if (fs.statSync(path).isDirectory()) {
		var item = newItem(path);
		if (lastItem !== undefined) {
			lastItem.items.push(item);
		} else {
			tree.push(item);
		}
		// push nested folders
		var files = fs.readdirSync(path);
		files.forEach(function(f) {
			if (f.charAt(0) !== '.') { // ignore hidden folders
				var absPath = path + '/' + f;
				var stats = fs.lstatSync(absPath);
				if (stats.isDirectory() && !stats.isSymbolicLink()) {
					getFolders(absPath, tree, item);
				}
			}
		});
		if (item.items.length === 0 ) {
			delete item.items;
		}
	}
}

DirectoryTree.prototype.getNestedFolders = function() {
	var folders = [];
	getFolders(root_folder, folders, undefined);
	return folders;
};

module.exports = {
    DirectoryTree : DirectoryTree,
    getRootFolder : DirectoryTree.getRootFolder,
    getNestedFolders : DirectoryTree.getNestedFolders,
};

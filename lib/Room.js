/**
 * Room class.  A room is a construct where exactly one OLR game is played.
 * It mirrors a socket.io room but doesn't rely on socket.io's representation.
 * A room is created when an emcee connects to the server.
 * A room is destroyed when an emcee disconnect from the server.
 */
let Attendee = require('./Attendee');
let winston = require('winston');
let logger = winston.loggers.get('application'); // for logging

// constructor
function Room(number, emceeId) {
    this.number = number;
    this.emceeId = emceeId;
    this.attendees = [];
    // these fields will be filled in incrementally.
    this.gameType = null;
    this.gameId = null;
    this.questionsDesciption = null;
    this.questions = null;
    this.figures = null;
    this.scoreboard = null;
}
/**
 * get the room number
 * @returns room number (number)
 */
Room.prototype.getNumber = function () {
    return this.number;
}
/**
 * get the emcee for the room.
 * @returns socket.id for the room emcee. (String)
 */
Room.prototype.getEmceeId = function () {
    return this.emceeId;
}
/**
 * Allow a socket to join the room.
 * @param role one of 'emcee', 'player', 'projector'. (String)
 * @param socket socket  object. (Socket)
 * @param id socket id. (String)
 */
Room.prototype.join = function (role, socket) {
    let attendee = new Attendee(role, socket);
    this.attendees.push(attendee);
}
/**
 * socket has joined the room.  Now set put a human name to it.
 */
Room.prototype.setAttendeeName = function(socket, name) {
    for (let i = 0; i < this.attendees.length; i++) {
        if (this.attendees[i].socket.id === socket.id) {
            let attendee = this.attendees[i];
            attendee.name = name;
            this.attendees[i] = attendee;
            return;
        }
    }
}
/**
 * socket is leaving the room.  Get the associated name.
 */
Room.prototype.getAttendeeName = function(socket) {
    for (let i = 0; i < this.attendees.length; i++) {
        if (this.attendees[i].socket.id === socket.id) {
            return this.attendees[i].name;
        }
    }
    return undefined;
}
/**
 * is the attendee name already listed?
 * @param name of new attendee (String)
 * @returns {boolean}
 */
Room.prototype.isAttendeeNameDuplicated = function(name) {
    for (let i = 0; i < this.attendees.length; i++) {
        if (this.attendees[i].role === 'player' &&
            this.attendees[i].name &&
            this.attendees[i].name.toUpperCase() === name.toUpperCase()) {
            return true;
        }
    }
    return false;
}
/**
 * Get the attendees of the room.
 * @returns array of Attendees. (Array)
 */
Room.prototype.getAttendees = function () {
    return this.attendees;
}
/**
 * Print the attendees of the room. For debugging.
 */
Room.prototype.printAttendees = function () {
    logger.info('room #%d', this.number);
    let attendees = this.attendees;
    attendees.forEach(function (e) {
        logger.info('  role: %s id: %s name: %s', e.role, e.socket.id, e.name);
    });

}
/**
 * Allow the socket to leave the room.  Intended for players, and projector.
 * as the emcee disconnection should destroy the room.
 * @param id socket.id of leaving socket (String)
 */
Room.prototype.leave = function (id) {
    for (let i = 0; i < this.attendees.length; i++) {
        if (this.attendees[i].socket.id === id) {
            this.attendees.splice(i, 1);
            return;
        }
    }
}

module.exports = Room;
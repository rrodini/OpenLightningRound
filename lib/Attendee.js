/**
 * Attendee class.  Instance is a room attendee.
 */
"use strict";
// constructor
function Attendee(role, socket, name) {
    this.role = role;  // 'admin', 'player', 'projector'.
    this.socket = socket; // real socket object.
    this.name = undefined; // filled in later.
}

module.exports = Attendee;
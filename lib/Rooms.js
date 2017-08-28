/**
 * Rooms.js - class that creates Room objects and destroys them.
 * This class is a singleton.
 */
let Room = require('./Room');

let rooms;  // Array of Room objects.

//constructor
function Rooms() {
    rooms = [];
}
/**
 * generate a unique four digit room #.
 * @returns four digit room # (Number).
 */
function genUnique() {
    function duplicated(num) {
        for (let i = 0; i < rooms.length; i++) {
            if (num === rooms[i].getNumber()) {
                return true;
            }
        }
        return false;
    }
    let num;
    do {
        let real = Math.random();
        num = Math.floor(real * 10000.0);
    } while (duplicated(num));
    return num;
}
/**
 * Is the given room number valid?
 * @param num room number from a player. (Number)
 * @returns true => yes, it is valid. (Boolean)
 */
Rooms.prototype.isValid = function(num) {
    for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i];
        if (num === room.getNumber()) {
            return true;
        }
    }
    return false;
}
/**
 * Create a new room within rooms.
 * @param socket.id of admin socket within new room.
 * @returns room Object (Room)
 */
Rooms.prototype.create = function (adminId) {
    let num = genUnique(this);
    let room = new Room(num, adminId);
    rooms.push(room);
    return room;
}
/**
 * Get the number of active rooms.
 * @returns number of active rooms. (Number)
 */
Rooms.prototype.getRoomCount = function() {
    return rooms.length;
}
/**
 * Get a room object given it's room number.
 * @param num room number. (Number)
 * @returns room object or undefined.  (Room)
 */
Rooms.prototype.get = function (num) {
    for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i]
        if (num === room.getNumber()) {
            return room;
        }
    }
    return undefined; // this may lead to run-time error
}
/**
 * Destroy the given room given its number.  Assumes that the admin has disconnected.
 * Therefore, disconnect all players and projectors.
 * @param num room number. (Number)
 */
Rooms.prototype.destroy = function(num) {
    let index = -1;
    let room;
    for (let i = 0; i < rooms.length; i++) {
        room = rooms[i];
        if (num === room.getNumber()) {
            index = i;
            break;
        }
    }
    if (index >= 0) {
        // must make a shallow copy of attendees due to disconnection below.
        let attendees = room.getAttendees().slice();
        for (i = 0; i < attendees.length; i++) {
            let attendee = attendees[i];
            if (attendee.role !== 'admin') {
                // avoid using socket.io internals
                attendee.socket.disconnect(true);
            }
        }
        rooms.splice(index, 1);
    }
}


module.exports = Rooms;
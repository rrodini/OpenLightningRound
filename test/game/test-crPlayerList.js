/**
 * test-CrPlayerList.js - unit test for processing playersJson.
 */


var crPlayersList = require('../../lib/CrPlayersList.js')

exports['setUp'] = function(callback) {
    return callback();
};

exports['tearDown'] = function(callback) {
    return callback();
};

exports['one player List'] = function(test) {
    var playerList = [{rank: 1, "name": "player1"}];
    output = crPlayersList.getRankedPlayers(playerList);
    expected = [ {"player1" : {startPos:  1, endPos: undefined}} ];
    test.deepEqual(expected, output);
    test.done();
}

exports['two player List'] = function(test) {
    var playerList = [{rank: 2, "name": "player2"},{rank: 1, "name": "player1"}];
    output = crPlayersList.getRankedPlayers(playerList);
    expected = [ {"player1" : {startPos:  1, endPos: undefined}},
                 {"player2" : {startPos:  2, endPos: undefined}} ];
    test.deepEqual(expected[0], output[0]);
    test.deepEqual(expected[1], output[1]);
    test.done();
}

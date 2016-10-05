/**
 * test-scoreboard-prgame.js - unit tests for scoreboard injecting prGame (presentation) dependency.
 *
 */
var Scoreboard = require('../lib/Scoreboard.js');
var sb;
var status;
var playerList;
var markingDisabled;

function sbCallback(stat, pList) {
    status = stat;
    playerList = pList;
//    console.dir(playerList);
}

function markCallback(enable) {
    markingDisabled = enable;
}

exports['setUp'] = function(callback) {
    sb = new Scoreboard("CR", sbCallback, markCallback);
//    sb.initScoreboard(null);
    return callback();
};

exports['tearDown'] = function(callback) {
    return callback();
};

exports['getType() returns correct value'] = function(test) {
    test.ok(sb, "scoreboard should not be null");
    test.equal(sb.getType(), "CR", "should be CR game");
    test.done();
};

exports['initScoreboard() initializes correctly'] = function(test) {
    var rankedPlayers = [
        {"AAA" : {startPos:  1, endPos: undefined}},
        {"BBB" : {startPos:  2, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    test.expect(1);
    test.equal(playerList.length, 2, "should be  players");
    test.done();
};

exports['registerPlayers - two players'] = function(test) {
    var rankedPlayers = [
        {"AAA" : {startPos:  1, endPos: undefined}},
        {"BBB" : {startPos:  2, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    var registered1 = sb.registerPlayer('aaa');
    var registered2 = sb.registerPlayer('abc');
    var registered3 = sb.registerPlayer('Bbb');
    test.expect(3);
    test.ok(registered1, 'first player accepted');
    test.ok(!registered2, 'second player rejected');
    test.ok(registered3, 'third player accepted');
    test.done();
};
//
// exports['registerPlayer - two players'] = function(test) {
//     sb.registerPlayer('bob');
//     sb.registerPlayer('robert');
//     test.expect(1);
//     test.equal(playerList.length, 2, "wrong # of players");
//     test.done();
// };
//
// exports['registerPlayer / deregisterPlayer'] = function(test) {
//     sb.registerPlayer('bob');
//     sb.deregisterPlayer('bob');
//     test.expect(1);
//     test.equal(playerList.length, 0, "wrong # of players");
//     test.done();
// };
//
// exports['one player buzzes and is selected'] = function(test) {
//     sb.registerPlayer('bob');
//     sb.askQuestion();
//     sb.recordBuzz('bob');
//     test.expect(3);
//     test.equal(playerList.length, 1, "wrong # of players");
//     test.ok(playerList[0].selected, 'buzzing (only) player is selected');
//     test.equal(playerList[0].buzzer, 1, 'correct buzzer value')
//     test.done();
// };
//
exports['two players, one buzz, correct selection'] = function(test) {
    var rankedPlayers = [
        {"bob" : {startPos:  1, endPos: undefined}},
        {"robert" : {startPos:  2, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    sb.registerPlayer('bob');
    sb.registerPlayer('robert');
    sb.askQuestion();
    sb.recordBuzz('robert');
    test.expect(4);
    test.equal(playerList.length, 2, "wrong # of players");
    test.ok(!playerList[0].selected, 'first player should not be selected');
    test.ok(playerList[1].selected,  'second player should be selected');
    test.equal(playerList[1].buzzer, 1, 'correct buzzer value')
    test.done();
};

exports['two players, both buzz, correct selection'] = function(test) {
    var rankedPlayers = [
        {"bob" : {startPos:  1, endPos: undefined}},
        {"robert" : {startPos:  2, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    sb.registerPlayer('bob');
    sb.registerPlayer('robert');
    sb.askQuestion();
    sb.recordBuzz('robert');
    sb.recordBuzz('bob');
    test.expect(5);
    test.equal(playerList.length, 2, "wrong # of players");
    test.ok(!playerList[0].selected, 'first player should not be selected');
    test.equal(playerList[0].buzzer, 2, 'correct buzzer value')
    test.ok(playerList[1].selected,  'second player should be selected');
    test.equal(playerList[1].buzzer, 1, 'correct buzzer value')
    test.done();
};

exports['three players, three questions, player advances'] = function(test) {
    var rankedPlayers = [
        {"bob" :    {startPos:  1, endPos: undefined}},
        {"robert" : {startPos:  2, endPos: undefined}},
        {"rock" :   {startPos:  3, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    sb.registerPlayer('bob');
    sb.registerPlayer('robert');
    sb.registerPlayer('rock');
// play round: ask 3 questions with rock winning all.
    sb.askQuestion();
    sb.recordBuzz('rock');
    sb.recordBuzz('bob');
    sb.markCorrect();
    sb.askQuestion();
    sb.recordBuzz('rock');
    sb.markCorrect();
    sb.askQuestion();
    sb.recordBuzz('rock');
    sb.markCorrect();
// now rock advances to next round
    test.expect(6);
    test.equal(playerList.length, 2, 'wrong # of players');
    test.equal(playerList[0].name, 'rock', 'rock should be zeroeth player');
    test.ok(!playerList[0].selected, 'rock should not be selected');
    test.equal(playerList[1].name, 'bob', 'bob should be first player');
    test.ok(!playerList[1].selected, 'bob should not be selected');
    test.equal(status, '<p>rock wins round. robert eliminated. New round.</p>')
    test.done();
};

exports['two players, winner determined 3 - 1'] = function(test) {
    var rankedPlayers = [
        {"bob" :    {startPos:  1, endPos: undefined}},
        {"rock" :   {startPos:  2, endPos: undefined}},
    ];
    sb.initScoreboard(rankedPlayers);
    sb.registerPlayer('bob');
    sb.registerPlayer('rock');
// play round: ask 3 questions with rock winning all.
    sb.askQuestion();
    sb.recordBuzz('rock');
    sb.recordBuzz('bob');
    sb.markCorrect(); // bob 0, rock 1
    sb.askQuestion();
    sb.recordBuzz('bob');
    sb.recordBuzz('rock');
    sb.markCorrect(); // bob 1, rock 1
    sb.askQuestion();
    sb.recordBuzz('bob');
    sb.recordBuzz('rock');
    sb.markIncorrect();
    sb.markCorrect(); // bob 1, rock 2
    sb.askQuestion();
    sb.recordBuzz('bob');
    sb.markIncorrect();
    sb.askQuestion();
    sb.recordBuzz('rock');
    sb.markCorrect(); // bob 1, rock 3
// now rock wins countdown round
    test.expect(1);
    // test.equal(playerList.length, 2, 'wrong # of players');
    // test.equal(playerList[0].name, 'rock', 'rock should be zeroeth player');
    // test.ok(!playerList[0].selected, 'rock should not be selected');
    // test.equal(playerList[1].name, 'bob', 'bob should be first player');
    // test.ok(!playerList[1].selected, 'bob should not be selected');
    test.equal(status, '<p>rock wins Countdown Round competition!</p>')
    test.done();
};

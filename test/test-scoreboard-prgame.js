/**
 * test-scoreboard-prgame.js - unit tests for scoreboard injecting prGame (presentation) dependency.
 *
 */
//var PrGame = require('../lib/prGame.js');
var Scoreboard = require('../lib/Scoreboard.js');
var sb;
var status;
var playerList;
var markingDisaabled;

function sbCallback(stat, pList) {
    status = stat;
    playerList = pList;
}

function markCallback(enable) {
    markingDisabled = enable;
}

exports['setUp'] = function(callback) {
    sb = new Scoreboard("PR", sbCallback, markCallback);
    sb.initScoreboard([]);
    return callback();
};

exports['tearDown'] = function(callback) {
    return callback();
};

exports['getType() returns correct value'] = function(test) {
    test.ok(sb, "scoreboard should not be null");
    test.equal(sb.getType(), "PR", "should be PR game");
    test.done();
};

exports['initScoreboard() initializes correctly'] = function(test) {
    sb.initScoreboard([]);
    test.expect(1);
    test.equal(playerList.length, 0, "should be 0 players");
    test.done();
};

exports['registerPlayer - one player'] = function(test) {
    sb.registerPlayer('bob');
    test.expect(1);
    test.equal(playerList.length, 1, "wrong # of players");
    test.done();  
};

exports['registerPlayer - two players'] = function(test) {
    sb.registerPlayer('bob');
    sb.registerPlayer('robert');
    test.expect(1);
    test.equal(playerList.length, 2, "wrong # of players");
    test.done();
};

exports['registerPlayer / deregisterPlayer'] = function(test) {
    sb.registerPlayer('bob');
    sb.deregisterPlayer('bob');
    test.expect(1);
    test.equal(playerList.length, 0, "wrong # of players");
    test.done();
};

exports['one player buzzes and is selected'] = function(test) {
    sb.registerPlayer('bob');
    sb.askQuestion();
    sb.recordBuzz('bob');
    test.expect(3);
    test.equal(playerList.length, 1, "wrong # of players");
    test.ok(playerList[0].selected, 'buzzing (only) player is selected');
    test.equal(playerList[0].buzzer, 1, 'correct buzzer value')
    test.done();
};

exports['two players, one buzz, correct selection'] = function(test) {
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

exports['two players, both buzz, mark first buzzer incorrect, second now selected'] = function(test) {
    sb.registerPlayer('bob');
    sb.registerPlayer('robert');
    sb.askQuestion();
    sb.recordBuzz('robert');
    sb.recordBuzz('bob');
    sb.markIncorrect();
    test.expect(5);
    test.equal(playerList.length, 2, "wrong # of players");
    test.ok(playerList[0].selected, 'first player should now be selected');
    test.equal(playerList[0].buzzer, 2, 'correct buzzer value')
    test.ok(!playerList[1].selected,  'second player should not be selected');
    test.equal(playerList[1].buzzer, 1, 'correct buzzer value')
    test.done();
};

exports['two players, both buzz, mark first buzzer incorrect, mark second buzzer correct'] = function(test) {
    sb.registerPlayer('bob');   // 0
    sb.registerPlayer('robert');// 1
    sb.askQuestion();
    sb.recordBuzz('robert');
    sb.recordBuzz('bob');
    sb.markIncorrect();         // robert
    sb.markCorrect();           // bob
    test.expect(5);
    test.equal(playerList.length, 2, "wrong # of players");
    test.ok(!playerList[0].selected, 'first player should not be selected');
    test.ok(!playerList[0].buzzer, 'buzzer value should be undefined');
    test.ok(!playerList[1].selected,  'second player should not be selected');
    test.ok(!playerList[1].buzzer, 'buzzer value should be undefined');
    test.done();
};
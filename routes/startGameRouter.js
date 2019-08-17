let express = require('express');
let router = express.Router();
let {Client} = require('pg');
let db = require("../lib/DbUpdate.js")

/* POST - start a new game. */
router.post('/', function (req, res, next) {
  "use strict";
  let body = req.body;
  let gameType = parseInt(body.game_type);
  let questionFileId = parseInt(body.question_file_id);
  let playerFileId = parseInt(body.player_file_id);
  // worry about null here.
  playerFileId = playerFileId == 0 ? null : playerFileId;
  let emceeId = parseInt(body.emcee_id);
  let startTime = new Date();
  // connect to the DB and insert a game record.
  // ATTENTION: the response is generated after the record is written.
  console.log(process.env.URLALLOWORIGIN)
  db.insert({
    version: 1,
    start_time: startTime,  // timestamp
    emcee_id: emceeId,
    game_type: gameType,
    question_file_id: questionFileId,
    player_file_id: playerFileId,
  }, res);
});

module.exports = router;

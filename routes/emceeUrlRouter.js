/** emceeUrlRouter.js
 * This is a GUI entry point that receives query string parameters for a game.
 * gameType and QuestionFilePath are mandatory, PlayerFilePath is optional.
 * Note the use of environmental variables so that relative paths can be passed.
 */

let express = require('express');
let router = express.Router();

/**
 * Important conventions: If path starts with '/' then it is absolute.
 * @param root env variable
 * @param path query string parameter
 */
function getAbsPath(root, path) {
    if (path.startsWith('/')) {
        return path;
    } else {
        return root + (root.endsWith('/')? '': '/') + path;
    }
}

// returns emcee.html (with some dynamically generated js script), emcees.js
router.get('/', function (next) {
    "use strict";
    const questionFileRoot = process.env.QUESTION_FILE_ROOT;
    const playerFileRoot = process.env.PLAYER_FILE_ROOT;
    const gameType = req.query.gameType;
    const questionFilePath = req.query.questionFilePath || '';
    const playerFilePath = req.query.playerFilePath || '';
    let questionFileAbsPath;
    let playerFileAbsPath;
    questionFileAbsPath = questionFilePath? getAbsPath(questionFileRoot, questionFilePath): questionFilePath;
    playerFileAbsPath = playerFilePath? getAbsPath(playerFileRoot, playerFilePath): playerFilePath;
    console.log(`gameType: ${gameType}, questionFileAbsPath: ${questionFileAbsPath},  playerFileAbsPath: ${playerFileAbsPath}`);
    // Declare game parameters, then return emcee.html, emcee.js
    res.render('emcee', {gameId: 0, gameType: gameType, questionFileId: 0, playerFileId: 0,
        questionFileAbsPath: questionFileAbsPath, playerFileAbsPath: playerFileAbsPath,
        urlEndGame: process.env.URLENDGAME, urlGameSummary: process.env.URLGAMESUMMARY});
});

module.exports = router;
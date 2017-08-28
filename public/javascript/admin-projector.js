/**
 * admin-projector.js - Common code shared between admin and projector.
 */
var gameType; // type of game, e.g. "OLR" for "Open Lightning Round"
/**
 * set the window title as per the game type.
 */
function setWindowTitle(num) {
    var title = "Unknown Game!!";
    switch (gameType) {
        case "PR":	title = "PR Room #" + num; break;
        case "OLR":	title = "OLR Room #" + num; break;
        case "CR":	title = "CDR Room # + num"; break;
    }
    $("#title").text(title);

}
/**
 * displayAnswer - display the answer (for benefit of the audience)
 */
function displayAnswer(answer) {
    $('#current_answer').html(answer);
}
/**
 * updateScoreboard - update the scoreboard due to some change, e.g. player registration, player buzzes, etc.
 * @param status - state of the current game.
 * @param pList - players in this round of game.
 */
function updateScoreboard(status, pList) {
    $("#status_div").html(status);
    // now sync the player grid to the pList state.
    reloadPlayers(pList);
}

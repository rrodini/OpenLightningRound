/**
 * emcee-projector.js - Common code shared between emcee and projector.
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
        case "CR":	title = "CDR Room #" + num; break;
    }
    $("#title").text(title);

}
/**
 * displayAnswer - display the answer (for benefit of the audience)
 */
function displayAnswer(answer) {
    $('#current_answer').html(answer);
}


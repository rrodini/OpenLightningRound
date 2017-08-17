/**
 * Analyze the CDR questions as per their "length."
 * This info will be used to format the question on
 * the projector screen.
 */
var ReadJsonFile = require('./lib/ReadJsonFile');

var cdrFiles = [
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2009-Questions-01-40.json",
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2009-Questions-41-80.json",
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2015-Questions-01-40.json",
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2015-Questions-41-80.json",
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2017-Questions-01-40.json",
    "/Users/Robert/Documents/WebstormProjects/OLR/olr-files/question-files/CR-2017-Questions-41-80.json"
    ]
var mean = 0.0;
var totalCount = 0;
var totalLength = 0;
var readJson = new ReadJsonFile();
var lengths = []
var sigma = 0.0;

cdrFiles.forEach(function (file, i) {
    "use strict";
    console.log('reading: ' + file);
    let json = readJson.read("questions", file);
    let questions = json.questions_and_answers;
    //console.log(questions[0].q.substring(0,10));
    questions.forEach(function (q_a) {
        let length = q_a.q.length;
        lengths.push(length);
        //console.log(length);
        totalLength += length;
        totalCount++;
    });
    mean = totalLength / totalCount;
})

console.log("totalLength: " + totalLength + " totalCount: " + totalCount + " mean: " + mean );
var sumOfSquares = 0.0;
for (var i = 0; i < lengths.length; i++) {
    sumOfSquares += Math.pow(lengths[i] - mean, 2);
}
sigma = Math.sqrt((1/totalCount) * sumOfSquares);
console.log("sigma: " + sigma);
var longLength = Math.floor(sigma + mean);  // any length > mean plus one stnd deviation

cdrFiles.forEach(function (file, i) {
    "use strict";
    console.log('reading: ' + file);
    let json = readJson.read("questions", file);
    let questions = json.questions_and_answers;
    //console.log(questions[0].q.substring(0,10));
    questions.forEach(function (q_a, j) {
        let length = q_a.q.length;
        let long = (length >= longLength? "*" : " ");
        console.log(j + ". " + long);
    });
})
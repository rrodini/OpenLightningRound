/**
 * MathFormatter.js uses MathJax node package to insert formulas into questions and answers.
 *
 * Warning: This is complex code requiring promises.
 */
"use strict";

let mathjax = require('mathjax-node');
let winston = require('winston');

let logger = winston.loggers.get('application'); // for logging
const BACKTICK = "`";
const FIGURE_ERROR = "<div>FIGURE NOT FOUND.</div>"
const FORMULA_ERROR = "<span>ERROR FORMATTING FORMULA!</span>>";
const GENERIC_ERROR = "FORMAT ERROR WITHIN MathFormatter";

// Constructor
function MathFormatter() {
    // save the figures map.  Key is like "figure-10", value is like "<div><img src='data:image/png;base64,hexcode ></div>".
}

// MathJAX config must configure the proper path to the fonts for the client.
mathjax.config({
    fontURL: '../../node_modules/mathjax-node/node_modules/mathjax/fonts/HTML-CSS', // for webfont urls in the CSS for HTML output
    MathJax: {
        jax: ["input/AsciiMath","output/CommonHTML"]
    }
});
//mathjax.start();

// format a question (or an answer).  Most questions are pure text or text+html.
// However, there may be embedded formulas and / or figures.  The latter are enclosed in
// BACKTICK ` characters and must be processed.
MathFormatter.prototype.format = function format(question, figures) {
    "use strict";
    // must return a promise for two reasons:
    // 1. so as not to couple this module to socket.io
    // 2. so the caller can wait until the question and answer has been formatted.
    const finalPromise = new Promise((resolve, reject) => {
        // Formatting of math formulas is ridiculously easy with MathJAX. However,
        // the output is ASYNC requiring the use of Promises.
        function formatPromise (formula) {
            var formatPromise = new Promise((resolve, reject) => {
                mathjax.typeset({
                    math: formula,
                    format: "AsciiMath", // use AsciiMath only.
                    html: true,
                    css: false,
                }, function (data) {
                    if (data.errors) {
                        reject();
                    } else {
                        resolve(data.html); // this is the html returned.
                    }
                })
            });
            return formatPromise;
        }

        // scan for backticks and substitute formulas and/or figures
        let backtick1 = question.indexOf(BACKTICK);
        let start = 0;
        let fPromises = [];  // array of formatting promises.
        if (backtick1 < 0) {
            // No substitutions required, however the resolved promise below
            // forces output through the Promise.all.then function.
            fPromises.push(Promise.resolve("no substitutions"));
        }
        //let cols = []; // columns where the substitutions are to be made.
        while (backtick1 >= 0 ) {
            let backtick2 = question.indexOf(BACKTICK, backtick1+1);
            if (backtick2 < 0) {
                fPromises.push(Promise.reject(FORMULA_ERROR));
                break;
            }
            if (question.substr(backtick1+1, 6) === "figure") {
                // figure here.
                // Need some defensive code here.
                const figureRef = question.substring(backtick1+1, backtick2);
                const figure = figures.get(figureRef)?figures.get(figureRef): FIGURE_ERROR;
                fPromises.push(Promise.resolve(figure));
            } else {
                //cols.push({col1: backtick1, col2: backtick2});
                // math formula here.
                const fPromise = formatPromise(question.substring(backtick1+1, backtick2));
                fPromises.push(fPromise);
            }
            start = backtick2 + 1;
            backtick1 = question.indexOf(BACKTICK, start);
        }

        // NOTE: the code below will NOT be executed immediately when MathJAX processing
        // is required.
        Promise.all(fPromises).then(results => {
            let newQuestion = question;
            logger.debug("Before formatting: " + newQuestion);
            const count = results.length;
            for (let i = 0; i < count; i++) {
                newQuestion = newQuestion.replace(/`.*?`/, "${results[" + i + "]}" );
            }
            // NOTE: evil eval below!  For alternate implementation use the cols array.
            newQuestion =  eval ("`" + newQuestion + "`");
            logger.debug("After formatting: " + newQuestion);
            resolve(newQuestion);  // resolves the finalPromise
        }).catch(() => {
            logger.error("Format error within MathFormatter.");
            reject(GENERIC_ERROR); // rejects the finalPromise
        });

    });


    return finalPromise;

}


module.exports = MathFormatter;


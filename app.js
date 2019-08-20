/**
 * Standard express app.js file
 */

let createError = require('http-errors');
let express = require('express');
let path = require('path');
//let cookieParser = require('cookie-parser');
let logger = require('morgan');
let startGameRouter = require('./routes/startGameRouter');
let emceeRouter = require('./routes/emceeRouter');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
// Reply immediately to an OPTIONS request
app.use(function(req, res, next) {
    // //console.log("OPTIONS Filter");
    // //intercepts OPTIONS method
    // if ('OPTIONS' === req.method) {
    //     res.header('Access-Control-Allow-Origin', process.env.URLALLOWORIGIN);
    //     res.header('Access-Control-Allow-Methods', 'GET, PUT, POST');
    //     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    //     //respond with 200
    //     console.log(`OPTIONS method: allowing ${process.env.URLALLOWORIGIN}`);
    //     res.send(200);
    // }
    // else {
        //move on
console.log(`Setting header: ACAO ${process.env.URLALLOWORIGIN}`);
        res.header('Access-Control-Allow-Origin', process.env.URLALLOWORIGIN);
        next();
    // }
});
app.use('/projector', express.static(path.join(__dirname, 'public')));
app.use('/startGame', startGameRouter);
app.use('/emcee', emceeRouter);
app.use('/', express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;

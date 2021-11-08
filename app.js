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
let emceeUrlRouter = require('./routes/emceeUrlRouter');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
// Set response header for all requests.
app.use(function(req, res, next) {
//  console.log(`Setting header: ACAO ${process.env.URLALLOWORIGIN}`);
    res.header('Access-Control-Allow-Origin', process.env.URLALLOWORIGIN);
    next();
});
app.use('/projector', express.static(path.join(__dirname, 'public')));
app.use('/player', express.static(path.join(__dirname, 'public')));
app.use('/startGame', startGameRouter);
app.use('/emcee', emceeRouter);
app.use('/emceeUrl', emceeUrlRouter);
app.use('/', express.static(path.join(__dirname, 'public')));
// Note a default reference to index.html results in a redirect to player.html

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

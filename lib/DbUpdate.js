/***
 * DbUpdate.js - all of the Db inserts/updates/reads here.
 * All inserts/updates target the same GAME record.
 * Reads are spread between GAME, QUESTION_FILE, and PLAYER_FILE tables.
 * UPDATE and INSERT now wrapped in POSTGRES transaction.
 */
let dotenv = require('dotenv');
let {Client} = require('pg');
// simulate Heroku DATABASE_URL env variable

function getClient() {
    dotenv.config()
//    let dbConnectString = `postgresql:${process.env.PGUSER}:${process.env.PGPASSWORD}@localhost:${process.env.PGPORT}/${process.env.PGDATABASE}`
    let dbConnectString = process.env.DATABASE_URL;
    let useSsl = process.env.DBSSL || false;
    let client;
//  Development env doesn't accept SSL argument so it was dropped.
//    console.log("connecting: " + dbConnectString + " ssl: " + useSsl);
    if (process.env.NODE_ENV === 'development') {
        client = new Client(
            {connectionString: dbConnectString});
    } else {
        client = new Client(
            {connectionString: dbConnectString, ssl: {rejectUnauthorized: false}});
    }
    return client;
}


// expandCols - takes an object and returns a string to be used in DB queries.
// props - object with column name (key) and new value (value)
// withAssignment - true => generate the assignment operator followed by property value.
//                - false => generate the column name
// Example1: {start_time: 2019-05-13T16:37:33.626Z, ... } => "start_time = 2019-05-13T16:37:33.626Z, ..."
// Example2: {start_time: 2019-05-13T16:37:33.626Z, ... } => "start_time, ..."
function expandCols(props, withAssignment) {
    "use strict";
    let keys = Object.keys(props);
    let cols = "";
    let len = keys.length;
    for (let i=0; i < len; i++) {
        cols += keys[i];  // column name
        if (withAssignment) {
            cols += '=' + '$' + (i+2); // $number in query.
        }   
        if (i < len-1) {
            cols += ','; // determine if comma is needed
        }
    }
    return cols;
}

// update - UPDATE the game record.
// props - KLUDGE: key first, then columns names and values.
exports.update = function (props) {
    "use strict";
    let gameId = props.gameId;
    let values = Object.values(props);
    delete props.game_id;
    let colNames = expandCols(props, true);
    const sql = `UPDATE GAME SET ${colNames} WHERE id=$1`;
    console.log(`sql: ${sql}`);
    console.log(values);
    const client = getClient();
    client.connect(err => {
        if (err) {
            response.status(500).json({err: err.message});
            console.error('connect to db failed.', err.message);
            return;
        }
    });
    console.log('CONNECT');
    // wrap in a transaction - 3/18/2021
    if (client.query('BEGIN', err => {
        console.log('BEGIN transaction.');
        client.query(sql, values, (err, res) => {
            if (err) {
                response.status(500).json({err: err.message});
                console.error('update to db failed.', err.message);
                return;
            }
        });
        console.log('UPDATE statement.');
        if (client.query('COMMIT', err => {
            if (err) {
                response.status(500).json({err: err.message});
                console.error('update commit failed', err.message);
            } else {
                console.log('COMMIT transaction.');
                client.end((err, res) => {
                    if (err) {
                        response.status(500).json({err: err.message});
                        console.error('error during db disconnect.', err.message);
                    } else {
                        console.log('DISCONNECT');
                        console.log('update game: ' + gameId);
                        // everything is GOOD.
                    }
                });
            }
        }));
    }));
}

// insert() - INSERTS the game record into the DB.
//            id field must be present in the values list with value DEFAULT.
// props - columns names and values.
// response (required) - HTTP response object used to delay response until DB is written..
exports.insert = function (props, response) {
    let colsNames = expandCols(props, false);
    let values = Object.values(props);
    let colValues = "";
    let gameId;
    values.forEach(function(v, i) {
       colValues += '$'+(i+1);
       if (i < values.length -1) {
           colValues += ','
       };
    });
    const sql = `INSERT INTO GAME (id, ${colsNames}) VALUES (DEFAULT, ${colValues}) RETURNING id`;
    console.log(`sql: ${sql}`);
    console.log(values);
    const client = getClient();
    client.connect(err => {
        if (err) {
            response.status(500).json({err: err.message});
            console.error('connect to db failed.', err.message);
            return;
        }
    });
    console.log('CONNECT');
    // wrap in a transaction - 3/18/2021
    if (client.query('BEGIN', err => {
        console.log('BEGIN transaction.');
        client.query(sql, values, (err, res) => {
            if (err) {
                response.status(500).json({err: err.message});
                console.error('insert to db failed.', err.message);
            } else {
                console.log('INSERT statement.');
                gameId = res.rows[0].id;
                client.query('COMMIT', err => {
                if (err) {
                    response.status(500).json({err: err.message});
                    console.error('insert commit failed', err.message);
                } else {
                    console.log('COMMIT transaction.');
                    client.end((err) => {
                        if (err) {
                            response.status(500).json({err: err.message});
                            console.error('error during db disconnect.', err.message);
                        } else {
                            console.log('DISCONNECT');
                            console.log('insert game: ' + gameId);
                            // now send the HTTP response
                            response.header('Access-Control-Allow-Origin', process.env.URLALLOWORIGIN);
                            console.log('Access-Control-Allow-Origin', process.env.URLALLOWORIGIN);
                            response.type('json');
                            response.status(201).json({gameId: gameId});
                            // everything is GOOD.
                        }
                    });
                }
                });
            }
        });
    }));
}

// runQueryById - Run a query as a js promise.
// client - a client connected to the DB.
// sql - the SQL statement to run.
// values - an array w/ 0 or 1 value.  Value is id of record within table.
function runQueryById(client, sql, values) {
    if (values[0] === null) {   // No id parameter
        return Promise.resolve("");
    }
    return new Promise( (resolve, reject) => {
        client.query(sql, values, (err, res) => {
            if (err) {
                console.log(err.stack);
                reject(err);
            }
            // results from query here.
            resolve( res.rows[0]);
            client.end((err, res) => {
                if (err) {
                    console.log('error during db disconnect.');
                }
            });
        });
    });
}

// readGame - read the game record to get the other keys.
exports.readGame = async function (gameId) {
    const client = getClient();
    client.connect();
    const sql = `SELECT EMCEE_ID, GAME_TYPE, QUESTION_FILE_ID, PLAYER_FILE_ID FROM GAME WHERE ID = $1`;
    const values = [gameId];
    console.log(`sql: ${sql}`);
    console.log(values);
    const gameParams = await runQueryById(client, sql, values);
    const gameType = gameParams.game_type;
    const qfId = parseInt(gameParams.question_file_id);
    const pfId = parseInt(gameParams.player_file_id);
    return [gameType, qfId, pfId];
}

// readQuestionFile - read the question file record to get the question file.
exports.readQuestionFile = async function (qfId) {
    const client = getClient();
    client.connect();
    const sql = `SELECT QUESTIONS_JSON FROM QUESTION_FILE WHERE ID = $1`;
    const values = [qfId];
    console.log(`sql: ${sql}`);
    console.log(values);
    let obj = await runQueryById(client, sql, values);
    // SURPRISE. The pg library returns an object, not the text.
    return obj.questions_json;
}

// readPlayerFile - read the player file record to get the player file.
exports.readPlayerFile = async function (pfId) {
    const client = getClient();
    client.connect();
    const sql = `SELECT PLAYERS_JSON FROM PLAYER_FILE WHERE ID = $1`;
    const values = [pfId];
    console.log(`sql: ${sql}`);
    console.log(values);
    let obj = await runQueryById(client, sql, values);
    // SURPRISE. The pg library returns an object, not the text.
    return obj.players_json;
}
// readPostgresVer - read the current version # of PostgreSQL
exports.readPostgresVer = async function () {
    const client = getClient();
    client.connect();

    // client.query('SELECT version()')
    //     .then (res => {
    //         const version = JSON.parse(res.rows[0]).version;
    //         console.log(version);
    //         return version})
    //     .catch(e => console.log('ERROR: could not connect to postgres db.'))

    const res = await client.query('SELECT version()');
    //console.log(res.rows[0].version);
    client.end();
    //return res.rows[0].version;
    return res;

    // client.query('SELECT version()', (err, res) => {
    //     if (err) {
    //         console.log('Cannot connect to postgres db');
    //     } else {
    //         console.log(res.rows[0]);
    //     }
    // })

}

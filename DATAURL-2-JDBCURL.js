const DATABASE_URL = "postgres://quouqjkzewzwpa:d708c00df6feb5247c8f2bfc538c41d244a70cc8ae2c6fbe495ebad3da73510b@ec2-18-235-211-255.compute-1.amazonaws.com:5432/dbhpg0c1117pg"
console.log(`DATABASE_URL: ${DATABASE_URL}\n`)
const serverStart = DATABASE_URL.indexOf("@");
const serverEnd   = DATABASE_URL.indexOf(":", serverStart + 1);
const portStart   = DATABASE_URL.indexOf(":", serverEnd);
const portEnd     = DATABASE_URL.indexOf("/", portStart + 1);
const server      = DATABASE_URL.substring(serverStart+1, serverEnd);
const port        = DATABASE_URL.substring(portStart+1, portEnd);
console.log(`server: ${server}`);
console.log(`port: ${port}`);
const databaseStart = portEnd+1;
const database      = DATABASE_URL.substring(databaseStart)
console.log(`database: ${database}`);
const ownerStart   = DATABASE_URL.indexOf("//");
const ownerEnd     = DATABASE_URL.indexOf(":", ownerStart +2)
const owner        = DATABASE_URL.substring(ownerStart + 2, ownerEnd)
const pwdStart     = DATABASE_URL.indexOf(":", ownerStart + 2);
const pwdEnd       = DATABASE_URL.indexOf("@", ownerStart + 2);
const pwd          = DATABASE_URL.substring(pwdStart + 1, pwdEnd);
console.log(`owner: ${owner}`);
console.log(`pwd: ${pwd}\n`);
const JDBC_URL = `jdbc:postgresql://${server}:${port}/${database}?password=${pwd}&sslmode=require&user=${owner}`;
console.log(JDBC_URL);




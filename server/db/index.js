const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

module.exports = {
    query: (query, params, callback) => {
        pool.query(query, params, (result) => {
            if (err) {
                throw err;
            }
            callback(result);
        })
    }
};
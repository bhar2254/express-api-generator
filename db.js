
let dbConnection = null;

/**
 * Configures the database connection dynamically
 * @param {Object} dbConfig - Database configuration object
 * @param {string} dbConfig.type - Type of database ('mysql' or 'sqlite')
 * @param {Object} dbConfig.options - Connection options for the database
 */
async function configureDatabase(dbConfig) {
    try {
        if (dbConfig.type === 'mysql') {
            // Dynamically load MySQL library
            const mysql = require('mysql2/promise');
            dbConnection = await mysql.createPool({
                host: dbConfig.options.host,
                user: dbConfig.options.user,
                password: dbConfig.options.password,
                database: dbConfig.options.database,
            });
            console.log('Connected to MySQL database');
        } else if (dbConfig.type === 'sqlite') {
            // Dynamically load SQLite library
            const sqlite3 = require('sqlite3').verbose();
            const { open } = require('sqlite');
            dbConnection = await open({
                filename: dbConfig.options.filename,
                driver: sqlite3.Database,
            });
            console.log('Connected to SQLite database');
        } else {
            throw new Error('Unsupported database type. Use "mysql" or "sqlite".');
        }
    } catch (err) {
        console.error('Error configuring the database:', err.message);
        process.exit(1);
    }
}

async function getApiKey(apiKey) {
    try {
        const query = `SELECT api_key, scopes FROM api_keys WHERE api_key = "${apiKey}"`;
        let result;
        const db = dbConnection;
        if (db.query) {
            // MySQL
            [result] = await db.query(query);
            return result[0]
        } else {
            // SQLite
            result = await db.run(query)
            return result[0]
        }
    } catch (err) {
        console.error('Error fetching API key:', err);
        return res.status(500).json({ message: 'Error generating API key' });
    }
}

module.exports = { configureDatabase, getApiKey, getDatabase: () => dbConnection };
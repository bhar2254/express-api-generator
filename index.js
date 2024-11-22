require('express');
const { getDatabase, configureDatabase } = require('./db');

/**
 * Initializes the API generator
 * @param {Object} app - Express app instance
 * @param {Object} config - Configuration object
 * @param {string} config.version - API version (e.g., 'v1')
 * @param {Object} config.database - Database connection options
 */
const validateApiKey = require('./middleware/validate_api_key');
const generateRoutes = require('./routes');

function initializeAPI(app, config) {
    const { apiKeys, database } = config;
    let getApiKeyFunc;

    // If user wants to use an application-only SQLite database for API keys:
    if (apiKeys.useAppDb) {
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = apiKeys.appDbPath;

        // Initialize the SQLite database for API keys
        const apiDb = new sqlite3.Database(dbPath);

        // Create the API keys table if it doesn't exist
        apiDb.serialize(() => {
            apiDb.run(`CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT UNIQUE NOT NULL,
        scopes TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE
      )`);
        });

        // Function to fetch API key data from the application-only SQLite DB
        getApiKeyFunc = async (apiKey) => {
            return new Promise((resolve, reject) => {
                apiDb.get('SELECT * FROM api_keys WHERE api_key = ? AND active = 1', [apiKey], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });
        };
    }
    // If user wants to use their own database (MySQL or SQLite for API keys):
    else {
        const { type, options } = apiKeys.dbConfig;

        if (type === 'mysql') {
            const mysql = require('mysql2/promise');
            // Initialize MySQL connection pool
            const dbPool = mysql.createPool(options);

            dbPool.query(`CREATE TABLE IF NOT EXISTS api_keys (
                            id INTEGER AUTO_INCREMENT PRIMARY KEY ,
                            api_key VARCHAR(255) UNIQUE NOT NULL,
                            scopes VARCHAR(255) NOT NULL,
                            active BOOLEAN DEFAULT TRUE
                        )`);

            getApiKeyFunc = async (apiKey) => {
                const [rows] = await dbPool.query('SELECT * FROM api_keys WHERE api_key = ? AND active = 1', [apiKey]);
                return rows.length ? rows[0] : null;
            };
        }
        else if (type === 'sqlite') {
            const dbPath = options.localDbPath;

            const apiDb = new sqlite3.Database(dbPath);

            // Create the API keys table if it doesn't exist
            apiDb.serialize(() => {
                apiDb.run(`CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          api_key TEXT UNIQUE NOT NULL,
          scopes TEXT NOT NULL,
          active BOOLEAN DEFAULT TRUE
        )`);
            });

            // Function to fetch API key data from user's SQLite DB
            getApiKeyFunc = async (apiKey) => {
                return new Promise((resolve, reject) => {
                    apiDb.get('SELECT * FROM api_keys WHERE api_key = ? AND active = 1', [apiKey], (err, row) => {
                        if (err) reject(err);
                        resolve(row);
                    });
                });
            };
        } else {
            throw new Error('Unsupported database type for API keys. Use "mysql" or "sqlite".');
        }
    }

    // Set the API key fetcher function
    validateApiKey.setApiKeyFetcher(getApiKeyFunc);

    // Set up API routes with versioning (for example)
    configureDatabase(database)
    app.use(`/api/${config.version}`, generateRoutes());

    console.log(`API initialized with version /api/${config.version}`);
}
module.exports = { initializeAPI, getDatabase };
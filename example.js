const express = require('express');
const { initializeAPI } = require('./index'); // Adjust path as needed

const app = express();
app.use(express.json());  // Middleware for parsing JSON

const { apiKeys } = require('./config')

// Initialize API with MySQL
const sqlConfig = {
    type: 'mysql',  // Can switch between 'mysql' or 'sqlite'
    options: {
        host: 'localhost',
        user: 'your_mysql_user',
        password: 'your_mysql_password',
        database: 'your_mysql_db',
    },
}
initializeAPI(app, {
    version: 'v1',
    apiKeys: {
        useAppDb: false,  // If true, use a separate application-only DB for API keys
        dbConfig: sqlConfig,
    },
    database: sqlConfig
})

// OR Initialize API with SQLite
/*
initializeAPI(app, {
    version: 'v1',
    apiKeys: {
        useAppDb: true,  // If true, use a separate application-only DB for API keys
        appDbPath: './app_api_keys.db',  // Path to the application-only SQLite DB (if useAppDb is true)
    },
    database: {
        type: 'sqlite',
        options: {
            filename: './database.sqlite'  // Path to SQLite file
        }
    }
});
*/

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})

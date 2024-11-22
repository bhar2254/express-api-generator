module.exports = {
    apiKeys: {
        useAppDb: true,  // If true, use a separate application-only DB for API keys
        appDbPath: './app_api_keys.db',  // Path to the application-only SQLite DB (if useAppDb is true)
        dbConfig: {
            type: 'mysql',  // Can switch between 'mysql' or 'sqlite'
            options: {
                host: 'localhost',
                user: 'your_mysql_user',
                password: 'your_mysql_password',
                database: 'your_mysql_db',
            },
        },
    },
};

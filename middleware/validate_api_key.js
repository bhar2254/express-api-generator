let getApiKey;  // This will be dynamically set

/**
 * Middleware to validate API keys and scopes.
 * @param {Array} requiredScopes - The scopes required for the route.
 */
function validateApiKey(requiredScopes = []) {
    return async (req, res, next) => {
        const apiKey = req.header('x-api-key');

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is missing' });
        }

        try {
            const apiKeyData = await getApiKey(apiKey);

            if (!apiKeyData) {
                return res.status(403).json({ error: 'Invalid or inactive API key' });
            }

            const userScopes = apiKeyData.scopes.split(',');
            const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope));

            if (!hasRequiredScopes) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.apiKeyData = apiKeyData;
            next();
        } catch (error) {
            res.status(500).json({ error: 'API key validation failed', details: error.message });
        }
    };
}

// Set the function to fetch the API key (this will be dynamically set in the main app)
validateApiKey.setApiKeyFetcher = (fetcherFunc) => {
    getApiKey = fetcherFunc;
};

module.exports = validateApiKey;

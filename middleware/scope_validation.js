const { getApiKey } = require('../db'); // Assuming this function exists in the 'database' module

// Middleware to check if the API key has the required scope
function checkScope(requiredScope) {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];  // Assumes the API key is sent in the 'x-api-key' header

    if (!apiKey) {
      return res.status(401).json({ message: 'API key is required' });
    }

    try {
      // Fetch the API key from the database
      const keyData = await getApiKey(apiKey)
      
      const scopes = String(keyData.scopes).split(/[,; .|]+/)
      // Check if the API key has the required scope
      if (!scopes.includes(requiredScope) && requiredScope !== 'any') {
        return res.status(403).json({ message: 'Insufficient scope' });
      }

      // Attach the scope to the request object for access in the route
      req.apiKeyScope = scopes;

      // Continue to the next middleware or route handler
      next();
    } catch (err) {
      console.error('Error validating API key:', err);
      return res.status(401).json({ message: 'Invalid API key' })
    }
  };
}

module.exports = { checkScope };

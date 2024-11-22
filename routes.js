const express = require('express');
const { getDatabase } = require('./db');  // Database connection module
const { validate: isValidUUID, version: getUUIDVersion } = require('uuid');
const crypto = require('crypto');
const validateApiKey = require('./middleware/validate_api_key');
const { checkScope } = require('./middleware/scope_validation');

/**
 * Validates if the provided string is a UUID (v1 or v4).
 * @param {string} ident - The identifier to validate.
 * @returns {boolean} - True if it's a valid UUID (v1 or v4), false otherwise.
 */
const validateGUID = (ident) => {
    // Check if the identifier is a valid UUID
    if (!isValidUUID(ident)) return false;

    // Allow only v1 and v4 UUIDs
    const uuidVersion = getUUIDVersion(ident);
    return uuidVersion === 1 || uuidVersion === 4;
};

const disabledTables = ['api_keys']

/**
 * Generates CRUD routes dynamically based on table and ident
 * @returns {Router} Express router instance
 */
function generateRoutes() {
    const router = express.Router();

    const generateAPIKey = async (req, res, next) => {
        try {
            // Generate a new UUID v4 for the API key
            const apiKey = crypto.randomUUID();

            // Optionally accept a scope in the request body (default to empty string if not provided)
            const { scope = 'read' } = req.body;

            // Insert the new API key into the database
            const data = { api_key: apiKey, scopes: scope }
            const columns = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map(() => '?').join(', ');
            const values = Object.values(data);
            const query = `INSERT INTO api_keys (${columns}) VALUES (${placeholders})`;

            let result;
            const db = getDatabase();
            if (db.query) {
                // MySQL
                [result] = await db.query(query, values);
                return res.json({ message: 'Item inserted successfully', id: result.insertId });
            } else {
                // SQLite
                result = await db.run(query, values);
                return res.json({ message: 'Item inserted successfully', id: result.lastID });
            }

            // Respond with the newly created API key
            return res.status(201).json({
                message: 'API key generated successfully',
                apiKey: apiKey,
                scope: scope,
            });
        } catch (err) {
            console.error('Error generating API key:', err);
            return res.status(500).json({ message: 'Error generating API key' });
        }
    }

// Route to fetch an entire table
    router.get('/generate-api-key', generateAPIKey);
    router.post('/generate-api-key', generateAPIKey);
    
    router.get('/:table', validateApiKey(), checkScope('read'), async (req, res) => {
        const { table } = req.params;
        if(disabledTables.includes(table))
            return res.status(500).json({ error: 'You do not have permission to access this resource!'});

        try {
            const db = getDatabase();
            const query = `SELECT * FROM ${table}`;
            
            let rows;
            if (db.query) {
                // MySQL
                [rows] = await db.query(query);
            } else {
                // SQLite
                rows = await db.all(query);
            }
    
            return res.json(rows);
        } catch (error) {
            return res.status(500).json({ error: 'Database query failed', details: error.message });
        }
    });
  
    // GET: Fetch entire table or single object by ident
    router.get('/:table/:ident', validateApiKey(), checkScope('read'), async (req, res) => {
        const { table, ident } = req.params;
        if(disabledTables.includes(table))
            return res.status(500).json({ error: 'You do not have permission to access this resource!'});
        const queryKey = req.query.key;  // Optional query key for custom searches

        try {
            const db = getDatabase();
            let query, params;

            if (!ident) {
                // No ident provided: Fetch entire table
                query = `SELECT * FROM ${table}`;
                params = [];
            } else if (validateGUID(ident)) {
                // ident is a valid GUID: Search by 'guid' field
                query = `SELECT * FROM ${table} WHERE guid = ?`;
                params = [ident];
            } else if (queryKey) {
                // Custom query key provided: Search by queryKey field
                query = `SELECT * FROM ${table} WHERE ${queryKey} = ?`;
                params = [ident];
            } else {
                // Default case: Search by 'id' field
                query = `SELECT * FROM ${table} WHERE id = ?`;
                params = [ident];
            }

            let rows;
            if (db.query) {
                // MySQL query
                [rows] = await db.query(query, params);
            } else {
                // SQLite query
                rows = await db.all(query, params);
            }

            return res.json(rows);
        } catch (error) {
            return res.status(500).json({ error: 'Database query failed', details: error.message });
        }
    });

    // POST: Insert a new object into the table
    router.post('/:table', validateApiKey(), checkScope('write'), async (req, res) => {
        const { table } = req.params;
        if(disabledTables.includes(table))
            return res.status(500).json({ error: 'You do not have permission to access this resource!'});
        const data = req.body;

        try {
            const db = getDatabase();
            const columns = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map(() => '?').join(', ');
            const values = Object.values(data);

            const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

            let result;
            if (db.query) {
                // MySQL
                [result] = await db.query(query, values);
                return res.json({ message: 'Item inserted successfully', id: result.insertId });
            } else {
                // SQLite
                result = await db.run(query, values);
                return res.json({ message: 'Item inserted successfully', id: result.lastID });
            }
        } catch (error) {
            return  res.status(500).json({ error: 'Insert operation failed', details: error.message });
        }
    });

    // PUT: Update an existing object by ident
    router.put('/:table/:ident', validateApiKey(), checkScope('write'), async (req, res) => {
        const { table, ident } = req.params;
        if(disabledTables.includes(table))
            return res.status(500).json({ error: 'You do not have permission to access this resource!'});
        const data = req.body;

        try {
            const db = getDatabase();
            const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(data), ident];

            const key = validateGUID(ident) ? 'guid' : 'id';
            const query = `UPDATE ${table} SET ${setClause} WHERE ${key} = ?`;

            let result;
            if (db.query) {
                // MySQL
                [result] = await db.query(query, values);
            } else {
                // SQLite
                result = await db.run(query, values);
            }

            return res.json({ message: 'Item updated successfully', changes: result.changes || result.affectedRows });
        } catch (error) {
            return res.status(500).json({ error: 'Update operation failed', details: error.message });
        }
    });

    // DELETE: Remove an object by ident
    router.delete('/:table/:ident', validateApiKey(), checkScope('delete'), async (req, res) => {
        const { table, ident } = req.params;
        if(disabledTables.includes(table))
            return res.status(500).json({ error: 'You do not have permission to access this resource!'});

        try {
            const db = getDatabase();
            const key = validateGUID(ident) ? 'guid' : 'id';
            const query = `DELETE FROM ${table} WHERE ${key} = ?`;

            let result;
            if (db.query) {
                // MySQL
                [result] = await db.query(query, [ident]);
            } else {
                // SQLite
                result = await db.run(query, [ident]);
            }

            return res.json({ message: 'Item deleted successfully', changes: result.changes || result.affectedRows });
        } catch (error) {
            return res.status(500).json({ error: 'Delete operation failed', details: error.message });
        }
    });

    return router;
}

module.exports = generateRoutes;

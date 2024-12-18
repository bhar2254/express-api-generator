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

// Route to fetch an entire table
    // router.get('/generate-api-key', generateAPIKey);
    // router.post('/generate-api-key', generateAPIKey);
    
    router.get('/:table', validateApiKey(), checkScope('read'), async (req, res) => {
        const { table } = req.params;
        const { where, order, limit, offset } = req.query; // capture query params
        
        // Check if the table is in the disabled list
        if (disabledTables.includes(table)) {
            return res.status(500).json({ error: 'You do not have permission to access this resource!' });
        }
        
        // Construct the SQL query safely with defaults
        let query = `SELECT * FROM ${table}`;
        const params = [];
    
        // Add WHERE clause if specified (parameterized)
        if (where) {
            query += ' WHERE ' + where; // Validate this or use a safe mechanism to build the WHERE clause
            // You might want to sanitize 'where' to ensure it's a safe and valid SQL fragment
        }
    
        // Add ORDER BY clause if specified
        if (order) {
            query += ' ORDER BY ' + order; // Validate order parameter to prevent SQL injection
        }
    
        // Add LIMIT and OFFSET for pagination
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit, 10));
        }
        if (offset) {
            query += ' OFFSET ?';
            params.push(parseInt(offset, 10));
        }
    
        try {
            const db = getDatabase();
            let rows;
    
            // Execute the query with parameters (parameterized query for safety)
            if (db.query) {
                // MySQL
                [rows] = await db.query(query, params);
            } else {
                // SQLite
                rows = await db.all(query, params);
            }
    
            return res.json(rows);
        } catch (error) {
            return res.status(500).json({ error: 'Database query failed', details: error.message });
        }
    });
    
  
    // GET: Fetch entire table or single object by ident
    router.get('/:table', validateApiKey(), checkScope('read'), async (req, res) => {
        const { table } = req.params;
        const { where, order, limit, offset } = req.query; // capture query params
        
        // Check if the table is in the disabled list
        if (disabledTables.includes(table)) {
            return res.status(500).json({ error: 'You do not have permission to access this resource!' });
        }
    
        // Construct the SQL query safely with defaults
        let query = `SELECT * FROM ${table}`;
        const params = [];
    
        // Add WHERE clause if specified (parameterized)
        if (where) {
            query += ' WHERE ' + where; // Validate this or use a safe mechanism to build the WHERE clause
            // You might want to sanitize 'where' to ensure it's a safe and valid SQL fragment
        }
    
        // Add ORDER BY clause if specified
        if (order) {
            query += ' ORDER BY ' + order; // Validate order parameter to prevent SQL injection
        }
    
        // Add LIMIT and OFFSET for pagination
        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit, 10));
        }
        if (offset) {
            query += ' OFFSET ?';
            params.push(parseInt(offset, 10));
        }
    
        try {
            const db = getDatabase();
            let rows;
    
            // Execute the query with parameters (parameterized query for safety)
            if (db.query) {
                // MySQL
                [rows] = await db.query(query, params);
            } else {
                // SQLite
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

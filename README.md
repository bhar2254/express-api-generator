# Express API Routes Package

This package provides an easy way to generate RESTful API routes for Express.js applications. It supports a configurable database (MySQL or SQLite), automatic generation of basic CRUD operations (GET, POST, PUT, DELETE), and integrates with API key-based authentication with optional scope-based access control.

## Features

- **Dynamic RESTful Routes**: Automatically generate API routes with CRUD operations.
- **Flexible Database Support**: Choose between MySQL and SQLite as the database.
- **API Key Authentication**: Secure routes with API key-based authentication.
- **Scope-Based Authorization**: Limit access to certain API routes using scopes.
- **Application-Only SQLite Database**: Store API keys and associated scopes in a separate SQLite database, so the user does not need to expose sensitive data.
- **Fully Configurable**: The user can configure the database connection and other settings without modifying the core code.

## Installation

To use this package, simply install it from npm:

```bash
npm i @bhar2254/express-api-generator
```

## Usage

### 1. Initialize the Package in Your Express App

First, import the necessary modules and set up your Express app.

```javascript
const express = require('express');
const { initializeAPI } = require('express-api-routes');

const app = express();

// Initialize API with MySQL
initializeAPI(app, {
    version: 'v1',
    database: {
    type: 'mysql',  // Can switch between 'mysql' or 'sqlite'
    options: {
        host: 'localhost',
        user: 'your_mysql_user',
        password: 'your_mysql_password',
        database: 'your_mysql_db',
    },
}
})

// OR Initialize API with SQLite

initializeAPI(app, {
    version: 'v1',
    database: {
        type: 'sqlite',
        options: {
            filename: './database.sqlite'  // Path to SQLite file
        }
    }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 2. Configuring API Key Authentication and Scopes

When initializing the API, you can configure the API key store. If you choose `'sqlite'`, the API keys and scopes will be stored in an internal SQLite database, allowing you to secure routes without requiring the user to modify their existing database.

```javascript

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
});
```

### 3. API Routes with Scope-Based Authorization

You can define routes that require specific scopes using the `checkScope` middleware. Here’s an example of how to define routes with scope restrictions:

```javascript
const { checkScope } = require('express-api-routes');

router.get('/resource', checkScope('read'), async (req, res) => {
  try {
    const resource = await getResource(); // Implement this function as needed
    res.status(200).json(resource);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get resource' });
  }
});

router.post('/resource', checkScope('write'), async (req, res) => {
  try {
    const { data } = req.body;
    await saveResource(data); // Implement this function as needed
    res.status(201).json({ message: 'Resource created' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create resource' });
  }
});
```

### 4. Generating API Keys

To generate API keys, you can use the `/api/v1/generate-api-key` route, which will insert a new key into the SQLite store.

```bash
POST /api/v1/generate-api-key
```

The response will include the generated API key:

```json
{
  "apiKey": "new-generated-api-key"
}
```

### 5. Configure API Routes for Your Tables

Once the API is initialized, routes will automatically be created for your database tables. Routes will be available to perform CRUD operations like:

- **GET** `/api/v1/:table`: Get all records from a table.
- **GET** `/api/v1/:table/:ident`: Get a single record from a table by its ID or GUID.
- **POST** `/api/v1/:table`: Insert a new record into the table.
- **PUT** `/api/v1/:table/:ident`: Update a record.
- **DELETE** `/api/v1/:table/:ident`: Delete a record.

### 6. Configuration Options

You can customize the behavior of the API by passing an options object when initializing the package.

```javascript
initializeAPI(app, {
  version: 'v1',               // API version
  database: {                  // Database configuration
    type: 'mysql',             // 'mysql' or 'sqlite'
    options: {                 // MySQL options
      host: 'localhost',
      user: 'your_user',
      password: 'your_password',
      database: 'your_db',
    }
  },
  apiKeyStore: 'sqlite',       // Store API keys and scopes in SQLite (default 'mysql')
});
```

#### Available Configuration Options:

- **version** (string): The version of the API (e.g., `'v1'`).
- **database** (object): The database configuration.
  - **type** (string): Choose between `'mysql'` or `'sqlite'`.
  - **options** (object): The database connection options (for MySQL: `host`, `user`, `password`, `database`).
- **apiKeyStore** (string): Choose `'mysql'` or `'sqlite'` for where to store API keys and their associated scopes. Default is `'mysql'`.

### 7. Example Route with API Key Authentication and Scopes

```javascript
const express = require('express');
const { checkScope } = require('express-api-routes'); // Scope checking middleware

const router = express.Router();

// Example: GET /api/v1/resource (requires 'read' scope)
router.get('/resource', checkScope('read'), async (req, res) => {
  try {
    const resource = await getResource();  // Implement your function here
    res.status(200).json(resource);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching resource' });
  }
});

// Example: POST /api/v1/resource (requires 'write' scope)
router.post('/resource', checkScope('write'), async (req, res) => {
  try {
    const { data } = req.body;
    await saveResource(data); // Implement your function here
    res.status(201).json({ message: 'Resource created' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating resource' });
  }
});

module.exports = router;
```

### 8. API Key and Scopes Database Structure

The following structure will be used to store API keys and their scopes:

#### **SQLite Database Schema**:

```sql
CREATE TABLE api_keys (
  api_key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **MySQL Database Schema**:

```sql
CREATE TABLE IF NOT EXISTS api_keys (
	id INTEGER AUTO_INCREMENT PRIMARY KEY ,
	api_key VARCHAR(255) UNIQUE NOT NULL,
	scopes VARCHAR(255) NOT NULL,
	active BOOLEAN DEFAULT TRUE
)
```

- **api_key**: The API key that is used for authentication.
- **scope**: The scope assigned to the API key (e.g., `read`, `write`, `admin`).

### 9. License

This project is licensed under the GPL-3.0 License.

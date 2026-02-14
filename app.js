// /**
//  * =========================================================
//  * WATTWISE API SERVER (ENTITY-BASED ARCHITECTURE)
//  * =========================================================
//  *
//  * This server:
//  * - Manages users, devices, and notifications
//  * - Integrates Home Assistant (real-time states)
//  * - Stores time-series data in InfluxDB
//  * - Uses MongoDB for user & configuration data
//  * - Runs a background notification scheduler
//  */

// const express = require('express');
// const mongoose = require('mongoose');
// const router = require('./routes/user-routes');
// const cors = require('cors');
// const { InfluxDB } = require('influx');
// const axios = require('axios');
// const NotificationScheduler = require('./services/notification-scheduler');

// require("dotenv").config();

// const app = express();

// /**
//  * =========================================================
//  * ENVIRONMENT CONFIGURATION
//  * =========================================================
//  */

// // Security & server
// const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
// const MONGO_URI = process.env.MONGODB_URI;
// const PORT = process.env.PORT || 5000;

// // InfluxDB (Time-series database)
// const INFLUX_HOST = process.env.INFLUX_HOST;
// const INFLUX_PORT = parseInt(process.env.INFLUX_PORT) || 8086;
// const INFLUX_DB = process.env.INFLUX_DB;
// const INFLUX_USER = process.env.INFLUX_USER;
// const INFLUX_PASS = process.env.INFLUX_PASS;
// const INFLUX_PROTOCOL = process.env.INFLUX_PROTOCOL || 'http';

// // Home Assistant (Smart Home Gateway)
// const HA_URL = process.env.HA_URL;
// const HA_TOKEN = process.env.HA_TOKEN;

// /**
//  * =========================================================
//  * INFLUXDB CLIENT INITIALIZATION
//  * =========================================================
//  *
//  * Design choice:
//  * - Single measurement: "state"
//  * - entity_id stored as a TAG
//  * - All sensor & switch data share same structure
//  */
// const influxClient = new InfluxDB({
//   host: INFLUX_HOST,
//   port: INFLUX_PORT,
//   protocol: INFLUX_PROTOCOL,
//   database: INFLUX_DB,
//   username: INFLUX_USER,
//   password: INFLUX_PASS,
//   options: {
//     requestTimeout: 5000
//   }
// });

// /**
//  * =========================================================
//  * HOME ASSISTANT REQUEST HEADERS
//  * =========================================================
//  */
// const haHeaders = {
//   'Authorization': `Bearer ${HA_TOKEN}`,
//   'Content-Type': 'application/json'
// };

// /**
//  * =========================================================
//  * MIDDLEWARE
//  * =========================================================
//  */

// // Enable CORS for mobile & web clients
// app.use(cors({
//   origin: true,
//   credentials: true
// }));

// // Body parsers
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ limit: '10mb', extended: true }));

// /**
//  * =========================================================
//  * MONGODB CONNECTION
//  * =========================================================
//  */
// mongoose.connect(MONGO_URI)
//   .then(() => {
//     console.log("✅ MongoDB connected successfully");
//   })
//   .catch((err) => {
//     console.error("❌ MongoDB connection error:", err);
//     process.exit(1);
//   });

// /**
//  * Make InfluxDB client accessible in routes via req.app
//  */
// app.set('influxClient', influxClient);

// /**
//  * =========================================================
//  * HELPER FUNCTIONS
//  * =========================================================
//  */

// /**
//  * Wrapper for Home Assistant API calls
//  */
// async function callHomeAssistantAPI(endpoint) {
//   try {
//     const response = await axios.get(`${HA_URL}/api/${endpoint}`, {
//       headers: haHeaders,
//       timeout: 10000
//     });
//     return response.data;
//   } catch (error) {
//     throw new Error(`Home Assistant API Error: ${error.message}`);
//   }
// }

// /**
//  * Wrapper for InfluxDB queries
//  */
// async function queryInfluxDB(query) {
//   try {
//     return await influxClient.query(query);
//   } catch (error) {
//     throw new Error(`InfluxDB Query Error: ${error.message}`);
//   }
// }

// /**
//  * Async error handler wrapper
//  * Prevents repetitive try/catch blocks in routes
//  */
// function asyncHandler(fn) {
//   return (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// }

// /**
//  * =========================================================
//  * ROUTES
//  * =========================================================
//  */

// // User & device routes
// app.use('/api', router);

// /**
//  * =========================================================
//  * API DOCUMENTATION (ROOT)
//  * =========================================================
//  */
// app.get('/', (req, res) => {
//   res.json({
//     name: 'WattWise API - Entity-Based Architecture',
//     version: '2.0',
//     description: 'Clean entity-based REST API for device data management',
//     approach: 'Single entity_id approach for all device data',
//     endpoints: {
//       '/api/signup': 'Create user account',
//       '/api/login': 'User login',
//       '/api/user': 'Get user details',
//       '/api/user/setup': 'Setup devices',
//       '/api/user/devices': 'Get user devices',
//       '/api/user/device-data': 'Get all device data',
//       '/health': 'Health check'
//     },
//     architecture: {
//       database: 'MongoDB (users & config)',
//       timeseries: 'InfluxDB (device telemetry)',
//       measurement: 'Single "state" measurement',
//       entities: 'Auto-generated entity_id per device'
//     }
//   });
// });

// /**
//  * =========================================================
//  * ENTITY-BASED DATA INGESTION
//  * =========================================================
//  * Used by Home Assistant or external collectors
//  */
// app.post('/api/ingest-data', asyncHandler(async (req, res) => {
//   const { entity_id, fields, timestamp } = req.body;

//   if (!entity_id || !fields) {
//     return res.status(400).json({ message: 'Missing entity_id or fields' });
//   }

//   const points = [{
//     measurement: 'state',
//     tags: {
//       entity_id,
//       domain: entity_id.includes('switch') ? 'switch' : 'sensor'
//     },
//     fields,
//     timestamp: timestamp ? new Date(timestamp) : new Date()
//   }];

//   await influxClient.writePoints(points);

//   res.status(200).json({ message: 'Data ingested successfully' });
// }));

// /**
//  * =========================================================
//  * HEALTH CHECK ENDPOINT
//  * =========================================================
//  */
// app.get('/health', asyncHandler(async (req, res) => {
//   const health = {
//     status: 'healthy',
//     timestamp: new Date().toISOString(),
//     services: {},
//     architecture: 'entity-based'
//   };

//   try {
//     await axios.get(`${HA_URL}/api/`, { headers: haHeaders, timeout: 5000 });
//     health.services.homeAssistant = 'connected';
//   } catch {
//     health.services.homeAssistant = 'disconnected';
//     health.status = 'degraded';
//   }

//   try {
//     await influxClient.getDatabaseNames();
//     health.services.influxdb = 'connected';
//   } catch {
//     health.services.influxdb = 'disconnected';
//     health.status = 'degraded';
//   }

//   res.json(health);
// }));

// /**
//  * =========================================================
//  * ENTITY DATA FETCH (TIME-RANGED)
//  * =========================================================
//  */
// app.get('/entity/:entityId', asyncHandler(async (req, res) => {
//   const { entityId } = req.params;
//   const { hours, days } = req.query;
//   const limit = parseInt(req.query.limit) || 100;

//   let timeRange =
//     days ? `time > now() - ${days}d`
//     : hours ? `time > now() - ${hours}h`
//     : `time > now() - 24h`;

//   const query = `
//     SELECT * FROM "state"
//     WHERE entity_id = '${entityId}' AND ${timeRange}
//     ORDER BY time DESC
//     LIMIT ${limit}
//   `;

//   const data = await queryInfluxDB(query);

//   res.json({
//     entity_id: entityId,
//     count: data.length,
//     time_range: timeRange,
//     data
//   });
// }));

// /**
//  * =========================================================
//  * LIST ALL ENTITIES
//  * =========================================================
//  */
// app.get('/entities', asyncHandler(async (req, res) => {
//   const entities = await queryInfluxDB(
//     `SHOW TAG VALUES FROM "state" WITH KEY = "entity_id"`
//   );

//   res.json({
//     message: "Available entities",
//     count: entities.length,
//     entities: entities.map(e => e.value || e)
//   });
// }));

// /**
//  * =========================================================
//  * ERROR HANDLING
//  * =========================================================
//  */

// // Central error handler
// app.use((error, req, res, next) => {
//   console.error('API Error:', error);
//   res.status(error.status || 500).json({
//     error: error.message || 'Internal Server Error',
//     timestamp: new Date().toISOString()
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     error: 'Endpoint not found',
//     message: 'Check API documentation at /'
//   });
// });

// /**
//  * =========================================================
//  * SERVER STARTUP
//  * =========================================================
//  */
// const startServer = async () => {
//   console.log('🚀 Starting WattWise API');

//   // Test connections
//   try {
//     await axios.get(`${HA_URL}/api/`, { headers: haHeaders });
//     console.log('✅ Home Assistant connected');
//   } catch {
//     console.log('❌ Home Assistant connection failed');
//   }

//   try {
//     await influxClient.getDatabaseNames();
//     console.log('✅ InfluxDB connected');
//   } catch {
//     console.log('❌ InfluxDB connection failed');
//   }

//   // Start notification cron jobs
//   NotificationScheduler.startScheduler(influxClient);
//   console.log('✅ Notification scheduler started');

//   app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🌐 Server running on port ${PORT}`);
//   });
// };

// startServer().catch(console.error);

// module.exports = app;


const express = require('express');
const mongoose = require('mongoose');
const router = require('./routes/user-routes');
const cors = require('cors');
const { InfluxDB } = require('influx'); 
const axios = require('axios'); 
const NotificationScheduler = require('./services/notification-scheduler');


require("dotenv").config();

const app = express();

// Configuration
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

// InfluxDB Configuration
const INFLUX_HOST = process.env.INFLUX_HOST;
const INFLUX_PORT = parseInt(process.env.INFLUX_PORT) || 8086;
const INFLUX_DB = process.env.INFLUX_DB;
const INFLUX_USER = process.env.INFLUX_USER;
const INFLUX_PASS = process.env.INFLUX_PASS;

// Add this near the top with other config
const INFLUX_PROTOCOL = process.env.INFLUX_PROTOCOL || 'http';

// Initialize InfluxDB client
const influxClient = new InfluxDB({
  host: INFLUX_HOST,
  port: INFLUX_PORT,
  protocol: INFLUX_PROTOCOL, // ✅ Use env variable
  database: INFLUX_DB,
  username: INFLUX_USER,
  password: INFLUX_PASS,
  options: {
    requestTimeout: 5000
  }
});

// Home Assistant Configuration
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

const haHeaders = {
  'Authorization': `Bearer ${HA_TOKEN}`,
  'Content-Type': 'application/json'
};

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// MongoDB Connection
mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});


// Make InfluxDB client available to route handlers
app.set('influxClient', influxClient);

// Helper Functions
async function callHomeAssistantAPI(endpoint) {
  try {
    const response = await axios.get(`${HA_URL}/api/${endpoint}`, {
      headers: haHeaders,
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw new Error(`Home Assistant API Error: ${error.message}`);
  }
}

async function queryInfluxDB(query) {
  try {
    const result = await influxClient.query(query);
    return result;
  } catch (error) {
    throw new Error(`InfluxDB Query Error: ${error.message}`);
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Routes
app.use('/api', router);

// API Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'WattWise API - Entity-Based Architecture',
    version: '2.0',
    description: 'Clean entity-based REST API for device data management',
    approach: 'Single entity_id approach for all device data',
    endpoints: {
      '/api/signup': 'Create user account',
      '/api/login': 'User login',
      '/api/user': 'Get user details',
      '/api/user/setup': 'Setup devices with auto-generated entity IDs',
      '/api/user/devices': 'Get user devices',
      '/api/user/device-data': 'Get all device data',
      '/api/user/device/:applianceKey': 'Get specific device data',
      '/api/user/switch-data': 'Get switch states',
      '/health': 'Health check'
    },
    architecture: {
      database: 'MongoDB for user data',
      timeseries: 'InfluxDB with entity_id tags only',
      measurement: 'Single "state" measurement',
      entities: 'Auto-generated from device names'
    }
  });
});

// Entity-based data ingestion endpoint
app.post('/api/ingest-data', asyncHandler(async (req, res) => {
  const { entity_id, fields, timestamp } = req.body;

  if (!entity_id || !fields) {
    return res.status(400).json({ message: 'Missing required data: entity_id or fields' });
  }

  const points = [
    {
      measurement: 'state',
      tags: {
        entity_id: entity_id,
        domain: entity_id.includes('switch') ? 'switch' : 'sensor'
      },
      fields: fields,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    }
  ];

  try {
    await influxClient.writePoints(points);
    console.log(`Successfully ingested data for entity_id: ${entity_id}`);
    res.status(200).json({ message: 'Data ingested successfully' });
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    res.status(500).json({ 
      message: 'Failed to ingest data to InfluxDB', 
      error: error.message 
    });
  }
}));

// Health check
app.get('/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    architecture: 'entity-based'
  };

  try {
    await axios.get(`${HA_URL}/api/`, {
      headers: haHeaders,
      timeout: 5000
    });
    health.services.homeAssistant = 'connected';
  } catch (error) {
    health.services.homeAssistant = 'disconnected';
    health.status = 'degraded';
  }

  try {
    await influxClient.getDatabaseNames();
    health.services.influxdb = 'connected';
  } catch (error) {
    health.services.influxdb = 'disconnected';
    health.status = 'degraded';
  }

  res.json(health);
}));

// Get entity data by entity_id
app.get('/entity/:entityId', asyncHandler(async (req, res) => {
  const entityId = req.params.entityId;
  const hours = parseInt(req.query.hours) || null;
  const days = parseInt(req.query.days) || null;
  const limit = parseInt(req.query.limit) || 100;

  // Time range
  let timeRange;
  if (days) {
    timeRange = `time > now() - ${days}d`;
  } else if (hours) {
    timeRange = `time > now() - ${hours}h`;
  } else {
    timeRange = "time > now() - 24h";
  }

  const query = `
    SELECT * FROM "state"
    WHERE entity_id = '${entityId}' AND ${timeRange}
    ORDER BY time DESC
    LIMIT ${limit}
  `;

  const data = await queryInfluxDB(query);

  res.json({
    entity_id: entityId,
    count: data.length,
    time_range: timeRange,
    query_params: { hours, days, limit },
    data: data
  });
}));

// Get all entities
app.get('/entities', asyncHandler(async (req, res) => {
  const query = `SHOW TAG VALUES FROM "state" WITH KEY = "entity_id"`;
  const entities = await queryInfluxDB(query);
  
  res.json({
    message: "Available entities in InfluxDB",
    count: entities.length,
    entities: entities.map(e => e.value || e)
  });
}));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Please check the API documentation at /',
    timestamp: new Date().toISOString()
  });
});



// Server startup
const startServer = async () => {
  console.log('🚀 Starting WattWise API - Entity-Based Architecture');
  console.log(`📊 Home Assistant URL: ${HA_URL}`);
  console.log(`💾 InfluxDB Host: ${INFLUX_HOST}:${INFLUX_PORT}`);

  // Test connections on startup
  console.log('\n🔍 Testing connections...');

  try {
    await axios.get(`${HA_URL}/api/`, {
      headers: haHeaders,
      timeout: 5000
    });
    console.log('✅ Home Assistant connection: OK');
  } catch (error) {
    console.log('❌ Home Assistant connection: FAILED');
    console.log(`   Error: ${error.message}`);
  }

  try {
    await influxClient.getDatabaseNames();
    console.log('✅ InfluxDB connection: OK');
  } catch (error) {
    console.log('❌ InfluxDB connection: FAILED');
    console.log(`   Error: ${error.message}`);
  }

    // START NOTIFICATION SCHEDULER
  NotificationScheduler.startScheduler(influxClient);
  console.log('✅ Notification scheduler initialized');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📖 Documentation available at http://localhost:${PORT}/`);
    console.log(`🏥 Health check at http://localhost:${PORT}/health`);
    console.log(`📊 Architecture: Entity-based with auto-generated IDs`);
  });
};

startServer().catch(console.error);

module.exports = app;
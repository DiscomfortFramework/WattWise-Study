const jwt = require("jsonwebtoken");
const User = require("../model/user-model");
const bcrypt = require("bcrypt");
const JWT_SECRET_KEY = 'mysecretkey';
const nodemailer = require('nodemailer');
const PushNotificationService = require('../services/push-notification-services');
const EnergyCalculator = require('../services/energy-calculator');
const NotificationScheduler = require('../services/notification-scheduler');

const getUKEnergyRate = () => {
  return 26.83 / 100;  // £0.22681 per kWh
};

function generateEntityIds(deviceName) {
  const entityMappings = {
    'kettle': 'kettle_current_consumption',
    'microwave': 'microwave_current_consumption',
    'dishwahser': 'dishwasher_current_consumption',
    'washing machine': 'washing_machine_current_consumption',
    'washing_machine': 'washing_machine_current_consumption',
    'toaster': 'toaster_current_consumption',
    'dryer': 'dryer_current_consumption',
    'coffeemachine': 'coffeemachine_current_consumption',
    'airfryer': 'airfryer_current_consumption',
    'cooker': 'cooker_current_consumption',
    // 'water_purifier': 'water_purifier_current_consumption',
    'water purifier': 'water_purifier_current_consumption',
  };
  const key = deviceName.toLowerCase();
  const powerEntity = entityMappings[key];

  if (!powerEntity) {
    // Fallback to automatic generation
    const baseName = deviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      entityId: `${baseName}_switch_state`,
      powerEntityId: `${baseName}_current_consumption`,
      currentEntityId: `${baseName}_current`,
      switchEntityId: `${baseName}_switch_state`,
      statusEntityId: `${baseName}_status`
    };
  }

  return {
    entityId: powerEntity.replace('current_consumption', 'switch_state'),
    powerEntityId: powerEntity,
    currentEntityId: powerEntity.replace('current_consumption', 'current'),
    switchEntityId: powerEntity.replace('current_consumption', 'switch_state'),
    statusEntityId: powerEntity.replace('current_consumption', 'status')
  };
}
// UK Energy Rate Constants
const UK_ENERGY_RATES = {
  standard: 0.27,  // £0.27 per kWh (average UK rate)
  peak: 0.32,      // £0.32 per kWh (4pm-7pm weekdays)
  offPeak: 0.13,   // £0.13 per kWh (12am-7am)
};

// Signup
const signup = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists! Login instead." });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      devices: [],
      rooms: []
    });

    await user.save();
    console.log(`User created successfully: ${email}`);

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error("Error during signup: ", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Setup User - Auto-generate entity IDs
const setupUser = async (req, res, next) => {
  const userId = req.id;
  const { devices, rooms } = req.body;

  try {
    const newDevices = devices.map(d => {
      if (!d.name) {
        throw new Error("Device name is required");
      }

      const entityIds = generateEntityIds(d.name);

      return {
        name: d.name,
        location: d.location || '',
        applianceKey: d.applianceKey || d.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        entityId: entityIds.entityId, // switch states
        powerEntityId: entityIds.powerEntityId, // power consumption
        currentEntityId: entityIds.currentEntityId,
        switchEntityId: entityIds.switchEntityId,
        statusEntityId: entityIds.statusEntityId,
        deviceType: d.deviceType || 'appliance',
        isActive: true
      };
    });


    // In setupUser function, replace the rooms processing with:
    const roomsWithEntityIds = rooms.map((room) => {
      // Map room names to actual sensor entity formats
      const roomEntityMappings = {
        'living room': 'livingsensor',
        'livingroom': 'livingsensor',
        'dining room': 'dinningsensor',
        'diningroom': 'dinningsensor',
        'dining': 'dinningsensor',
        'kitchen': 'kitchensensor'
      };

      const roomKey = room.name.toLowerCase().replace(/\s+/g, '');
      const entityBase = roomEntityMappings[roomKey] || roomEntityMappings[room.name.toLowerCase()] || `${room.name.toLowerCase().replace(/\s+/g, '')}sensor`;

      return {
        name: room.name,
        entityId: entityBase
      };
    });

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          devices: newDevices,
          rooms: roomsWithEntityIds || []
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User setup completed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        devices: user.devices,
        rooms: user.rooms
      }
    });

  } catch (err) {
    console.error("Error updating user setup:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

// Login
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      return res.status(400).json({ message: "User not found. Please signup." });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: existingUser._id },
      JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Successfully logged in",
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        devices: existingUser.devices,
        rooms: existingUser.rooms
      },
      token
    });
  } catch (err) {
    console.log("Error during login: ", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const verifyToken = (req, res, next) => {
  console.log('🔍 verifyToken called for:', req.method, req.path);
  console.log('🔍 Headers:', req.headers);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log('❌ No authorization header found');
    return res.status(401).json({ message: "No token provided" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log('❌ Authorization header does not start with Bearer');
    return res.status(401).json({ message: "Invalid authorization format" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    console.log('❌ Token is empty after split');
    return res.status(401).json({ message: "Token is empty" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.id = decoded.id;
    console.log('✅ Token verified for user:', decoded.id);
    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const optionalAuth = (req, res, next) => {
  console.log('🔍 optionalAuth called for:', req.method, req.path);

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        req.id = decoded.id;
        req.isAuthenticated = true;
        console.log('✅ Optional auth: User authenticated:', decoded.id);
      } catch (err) {
        console.log('⚠️ Optional auth: Invalid token, continuing without auth');
        req.isAuthenticated = false;
      }
    }
  } else {
    console.log('ℹ️ Optional auth: No token provided, continuing without auth');
    req.isAuthenticated = false;
  }

  next();
};
// Get User
const getUser = async (req, res, next) => {
  const userId = req.id;

  try {
    const user = await User.findById(userId, "-password");
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.log("Error fetching user details: ", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Device Data for User
const getUserDeviceData = async (req, res, next) => {
  const userId = req.id;
  const { hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select('devices');
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Get all entity IDs from user's devices
    const entityIds = user.devices
      .map(device => device.entityId)
      .filter(id => id);

    if (entityIds.length === 0) {
      return res.status(200).json({
        message: "No devices found for user.",
        data: []
      });
    }

    // Build time range
    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 7d"; // Extended default to 7 days

    // Query InfluxDB using entity_id
    const entityConditions = entityIds
      .map(id => `entity_id = '${id}'`)
      .join(' OR ');

    const query = `
      SELECT * FROM "state"
      WHERE (${entityConditions}) AND ${timeRange}
      ORDER BY time DESC
      LIMIT ${parseInt(limit) || 1000}
    `;

    const influxClient = req.app.get('influxClient');
    const data = await influxClient.query(query);

    return res.status(200).json({
      message: "User device data fetched successfully.",
      timeRange,
      entityIds,
      dataCount: data.length,
      data: data
    });

  } catch (err) {
    console.error("Error fetching user device data:", err);
    return res.status(500).json({
      message: "Internal server error.",
      error: err.message
    });
  }
};

// Get Specific Device Data
const getDeviceData = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;
  const { hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select("devices");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const device = user.devices.find(d => d.applianceKey === applianceKey);
    if (!device) {
      return res.status(404).json({
        message: "Device not found for this user.",
        availableDevices: user.devices.map(d => d.applianceKey)
      });
    }

    // Time range
    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 30d"; // Extended default

    const influxClient = req.app.get("influxClient");

    const query = `
      SELECT * FROM "state"
      WHERE entity_id = '${device.entityId}' AND ${timeRange}
      ORDER BY time DESC
      LIMIT ${parseInt(limit) || 100}
    `;

    const data = await influxClient.query(query);

    res.status(200).json({
      message: "Device data fetched successfully",
      device: {
        name: device.name,
        applianceKey: device.applianceKey,
        entityId: device.entityId,
        location: device.location
      },
      timeRange,
      count: data.length,
      data
    });
  } catch (err) {
    console.error("Error fetching device data:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

// Get Switch States for User Devices
const getSwitchData = async (req, res, next) => {
  const userId = req.id;
  const { hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select('devices');
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Get switch entity IDs
    const switchEntityIds = user.devices
      .map(device => device.switchEntityId)
      .filter(id => id);

    if (switchEntityIds.length === 0) {
      return res.status(200).json({
        message: "No switch entities found for user devices.",
        data: []
      });
    }

    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 24h";

    const entityConditions = switchEntityIds
      .map(id => `entity_id = '${id}'`)
      .join(' OR ');

    const query = `
      SELECT * FROM "state"
      WHERE (${entityConditions}) AND ${timeRange}
      ORDER BY time DESC
      LIMIT ${parseInt(limit) || 1000}
    `;

    const influxClient = req.app.get('influxClient');
    const data = await influxClient.query(query);

    return res.status(200).json({
      message: "Switch data fetched successfully.",
      switchEntityIds,
      dataCount: data.length,
      data: data
    });

  } catch (err) {
    console.error("Error fetching switch data:", err);
    return res.status(500).json({
      message: "Internal server error.",
      error: err.message
    });
  }
};

const getDeviceCurrentConsumption = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;
  const { hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select("devices");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const device = user.devices.find(d => d.applianceKey === applianceKey);
    if (!device) {
      return res.status(404).json({
        message: "Device not found for this user.",
        availableDevices: user.devices.map(d => d.applianceKey)
      });
    }

    // Time range
    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 7d";

    const influxClient = req.app.get("influxClient");

    // Query the W measurement for current consumption
    const query = `
      SELECT * FROM "W"
      WHERE entity_id = '${device.powerEntityId}' AND ${timeRange}
      ORDER BY time DESC
      LIMIT ${parseInt(limit) || 100}
    `;

    const data = await influxClient.query(query);

    // Calculate summary if data exists
    let summary = null;
    if (data.length > 0) {
      const latestReading = data[0];
      const avgConsumption = data.reduce((sum, reading) => sum + (reading.value || 0), 0) / data.length;

      summary = {
        currentConsumption: latestReading.value || 0,
        averageConsumption: Math.round(avgConsumption * 100) / 100,
        unit: "W",
        lastUpdated: latestReading.time,
        isActive: (latestReading.value || 0) > 0
      };
    }

    res.status(200).json({
      message: "Device current consumption fetched successfully",
      device: {
        name: device.name,
        applianceKey: device.applianceKey,
        location: device.location,
        powerEntityId: device.powerEntityId
      },
      consumptionSummary: summary,
      timeRange,
      count: data.length,
      data
    });
  } catch (err) {
    console.error("Error fetching device consumption data:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

// Get Environmental Data for User's Rooms
const getRoomEnvironmentalData = async (req, res, next) => {
  const userId = req.id;
  const { hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select('rooms');
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.rooms.length === 0) {
      return res.status(200).json({
        message: "No rooms configured for user.",
        data: []
      });
    }

    // Time range
    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 24h";

    const influxClient = req.app.get('influxClient');
    const roomData = {};

    // Query each room's sensors
    for (const room of user.rooms) {
      const sensorEntityBase = room.entityId;

      // Get humidity data
      const humidityQuery = `
        SELECT * FROM "%"
        WHERE entity_id = '${sensorEntityBase}_humidity' AND ${timeRange}
        ORDER BY time DESC
        LIMIT ${parseInt(limit) || 50}
      `;

      // Get temperature data  
      const temperatureQuery = `
        SELECT * FROM "°C"
        WHERE entity_id = '${sensorEntityBase}_temperature' AND ${timeRange}
        ORDER BY time DESC
        LIMIT ${parseInt(limit) || 50}
      `;

      // Get pressure data
      const pressureQuery = `
        SELECT * FROM "hPa"
        WHERE entity_id = '${sensorEntityBase}_pressure' AND ${timeRange}
        ORDER BY time DESC
        LIMIT ${parseInt(limit) || 50}
      `;

      try {
        const [humidityData, temperatureData, pressureData] = await Promise.all([
          influxClient.query(humidityQuery),
          influxClient.query(temperatureQuery),
          influxClient.query(pressureQuery)
        ]);

        roomData[room.name] = {
          entityId: room.entityId,
          humidity: {
            current: humidityData.length > 0 ? humidityData[0].value : null,
            unit: '%',
            dataCount: humidityData.length,
            data: humidityData
          },
          temperature: {
            current: temperatureData.length > 0 ? temperatureData[0].value : null,
            unit: '°C',
            dataCount: temperatureData.length,
            data: temperatureData
          },
          pressure: {
            current: pressureData.length > 0 ? pressureData[0].value : null,
            unit: 'hPa',
            dataCount: pressureData.length,
            data: pressureData
          }
        };
      } catch (error) {
        roomData[room.name] = {
          error: `Error fetching data for ${room.name}`,
          details: error.message
        };
      }
    }

    return res.status(200).json({
      message: "Room environmental data fetched successfully.",
      timeRange,
      roomCount: user.rooms.length,
      roomData
    });

  } catch (err) {
    console.error("Error fetching room environmental data:", err);
    return res.status(500).json({
      message: "Internal server error.",
      error: err.message
    });
  }
};

const getDeviceHistoricalConsumption = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;

  try {
    const user = await User.findById(userId).select("devices");
    const device = user.devices.find(d => d.applianceKey === applianceKey);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const influxClient = req.app.get("influxClient");
    const results = {};

    console.log(`\n=== Historical Calculation for ${device.name} ===`);
    console.log(`Power Entity ID: ${device.powerEntityId}`);

    // Daily Average: Get average consumption over past 30 days
    try {
      // First, let's see if we have ANY data
      const testQuery = `
        SELECT COUNT(value) as total_readings
        FROM "W"
        WHERE entity_id = '${device.powerEntityId}' 
        AND time > now() - 30d
      `;

      const testData = await influxClient.query(testQuery);
      console.log(`Total readings in past 30 days: ${testData[0]?.total_readings || 0}`);

      if (testData[0]?.total_readings > 0) {
        // Method 1: Simple average approach
        const dailyQuery = `
          SELECT MEAN(value) as avgWatts
          FROM "W"
          WHERE entity_id = '${device.powerEntityId}' 
          AND time > now() - 30d
        `;

        const dailyData = await influxClient.query(dailyQuery);
        console.log('Daily query result:', dailyData);

        if (dailyData.length > 0 && dailyData[0].avgWatts != null) {
          // Convert average Watts to kWh per day (assuming continuous operation)
          const avgWatts = dailyData[0].avgWatts;
          const avgKwhPerDay = (avgWatts * 24) / 1000;

          results.daily = {
            estimatedKwh: Math.round(avgKwhPerDay * 100) / 100,
            avgWatts: Math.round(avgWatts * 100) / 100,
            dataPoints: testData[0].total_readings,
            calculation: "30-day average"
          };

          console.log(`Daily: ${avgWatts}W avg → ${avgKwhPerDay.toFixed(2)} kWh/day`);
        } else {
          results.daily = { estimatedKwh: 0, dataPoints: 0, reason: "No valid data" };
        }
      } else {
        results.daily = { estimatedKwh: 0, dataPoints: 0, reason: "No data in past 30 days" };
      }
    } catch (error) {
      console.error('Daily calculation error:', error);
      results.daily = { estimatedKwh: 0, error: error.message };
    }

    // Weekly Average
    try {
      const weeklyQuery = `
        SELECT MEAN(value) as avgWatts
        FROM "W"
        WHERE entity_id = '${device.powerEntityId}' 
        AND time > now() - 84d
      `;

      const weeklyData = await influxClient.query(weeklyQuery);

      if (weeklyData.length > 0 && weeklyData[0].avgWatts != null) {
        const avgWatts = weeklyData[0].avgWatts;
        const avgKwhPerWeek = (avgWatts * 24 * 7) / 1000;

        results.weekly = {
          estimatedKwh: Math.round(avgKwhPerWeek * 100) / 100,
          avgWatts: Math.round(avgWatts * 100) / 100,
          calculation: "12-week average"
        };
      } else {
        results.weekly = { estimatedKwh: 0, reason: "No data in past 12 weeks" };
      }
    } catch (error) {
      console.error('Weekly calculation error:', error);
      results.weekly = { estimatedKwh: 0, error: error.message };
    }

    // Monthly Average
    try {
      const monthlyQuery = `
        SELECT MEAN(value) as avgWatts
        FROM "W"
        WHERE entity_id = '${device.powerEntityId}' 
        AND time > now() - 180d
      `;

      const monthlyData = await influxClient.query(monthlyQuery);

      if (monthlyData.length > 0 && monthlyData[0].avgWatts != null) {
        const avgWatts = monthlyData[0].avgWatts;
        const avgKwhPerMonth = (avgWatts * 24 * 30) / 1000;

        results.monthly = {
          estimatedKwh: Math.round(avgKwhPerMonth * 100) / 100,
          avgWatts: Math.round(avgWatts * 100) / 100,
          calculation: "6-month average"
        };
      } else {
        results.monthly = { estimatedKwh: 0, reason: "No data in past 6 months" };
      }
    } catch (error) {
      console.error('Monthly calculation error:', error);
      results.monthly = { estimatedKwh: 0, error: error.message };
    }

    // Annual Projection
    try {
      const annualQuery = `
        SELECT MEAN(value) as avgWatts
        FROM "W"
        WHERE entity_id = '${device.powerEntityId}' 
        AND time > now() - 180d
      `;

      const annualData = await influxClient.query(annualQuery);

      if (annualData.length > 0 && annualData[0].avgWatts != null) {
        const avgWatts = annualData[0].avgWatts;
        const avgKwhPerYear = (avgWatts * 24 * 365) / 1000;

        results.annual = {
          estimatedKwh: Math.round(avgKwhPerYear * 100) / 100,
          avgWatts: Math.round(avgWatts * 100) / 100,
          calculation: "Projected from 6 months",
          note: "Projected based on 6 months data"
        };
      } else {
        results.annual = { estimatedKwh: 0, reason: "Insufficient data for projection" };
      }
    } catch (error) {
      console.error('Annual calculation error:', error);
      results.annual = { estimatedKwh: 0, error: error.message };
    }

    console.log('=== Results ===');
    console.log(JSON.stringify(results, null, 2));

    res.json({
      message: "Historical consumption data fetched",
      device: device.name,
      powerEntityId: device.powerEntityId,
      historicalAverages: results
    });

  } catch (err) {
    console.error("Error in getDeviceHistoricalConsumption:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Logout
const logout = async (req, res, next) => {
  try {
    // Since JWT is stateless, we just send success response
    // In a more secure implementation, you might maintain a blacklist of tokens
    return res.status(200).json({
      message: "Successfully logged out"
    });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// const savePushToken = async (req, res, next) => {
//   const userId = req.id; // Will be undefined if not authenticated
//   const isAuthenticated = req.isAuthenticated; // Added by optionalAuth middleware
//   const { pushToken } = req.body;

//   try {
//     // Validate push token
//     if (!pushToken) {
//       return res.status(400).json({ message: "Push token is required" });
//     }

//     // Case 1: User is authenticated - save to database
//     if (isAuthenticated && userId) {
//       const User = require("../model/user-model");
//       const user = await User.findByIdAndUpdate(
//         userId,
//         {
//           pushToken: pushToken,
//           notificationsEnabled: true
//         },
//         { new: true }
//       );

//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       console.log(`✅ Push token saved for authenticated user: ${user.email}`);

//       return res.status(200).json({
//         message: "Push token saved successfully",
//         notificationsEnabled: true,
//         saved: true
//       });
//     }

//     // Case 2: User is NOT authenticated - acknowledge but don't save
//     else {
//       console.log('ℹ️ Push token received for unauthenticated user:', pushToken);

//       return res.status(200).json({
//         message: "Push token received. Will be saved after login.",
//         saved: false,
//         requiresAuth: true
//       });
//     }

//   } catch (err) {
//     console.error("Error saving push token:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// Request push notifications (send notifications to user's device)
// const requestPushNotifications = async (req, res, next) => {
//   const userId = req.id;

//   try {
//     const User = require("../model/user-model");
//     const user = await User.findById(userId).select("devices rooms pushToken notificationsEnabled");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (!user.pushToken) {
//       return res.status(400).json({
//         message: "No push token found. Please enable notifications in app."
//       });
//     }

//     if (!user.notificationsEnabled) {
//       return res.status(400).json({
//         message: "Notifications are disabled for this user"
//       });
//     }

//     const influxClient = req.app.get('influxClient');
//     const EnergyCalculator = require('../services/energy-calculator');
//     const sentNotifications = [];

//     // Get current environmental data
//     const roomConditions = {};

//     for (const room of user.rooms) {
//       try {
//         const sensorBase = room.entityId;

//         const [humidityData, temperatureData, pressureData] = await Promise.all([
//           influxClient.query(`
//             SELECT * FROM "%"
//             WHERE entity_id = '${sensorBase}_humidity'
//             ORDER BY time DESC
//             LIMIT 1
//           `),
//           influxClient.query(`
//             SELECT * FROM "°C"
//             WHERE entity_id = '${sensorBase}_temperature'
//             ORDER BY time DESC
//             LIMIT 1
//           `),
//           influxClient.query(`
//             SELECT * FROM "hPa"
//             WHERE entity_id = '${sensorBase}_pressure'
//             ORDER BY time DESC
//             LIMIT 1
//           `)
//         ]);

//         if (humidityData.length > 0 && temperatureData.length > 0) {
//           roomConditions[room.name] = {
//             temperature: temperatureData[0].value,
//             humidity: humidityData[0].value,
//             pressure: pressureData.length > 0 ? pressureData[0].value : 101.3
//           };
//         }
//       } catch (error) {
//         console.error(`Error fetching conditions for ${room.name}:`, error.message);
//       }
//     }

//     if (Object.keys(roomConditions).length === 0) {
//       roomConditions['default'] = {
//         temperature: 22,
//         humidity: 50,
//         pressure: 101.3
//       };
//     }

//     // Generate notifications for each device
//     for (const device of user.devices) {
//       const conditions = roomConditions[device.location] || Object.values(roomConditions)[0];

//       const optimization = EnergyCalculator.calculateOptimization(
//         device.applianceKey,
//         conditions.temperature,
//         conditions.humidity,
//         conditions.pressure
//       );

//       const notification = EnergyCalculator.generateNotification(
//         device.applianceKey,
//         optimization
//       );

//       // Only send critical and high priority notifications via push
//       if (notification.priority === 'high' || notification.type === 'critical') {
//         try {
//           await PushNotificationService.sendPushNotification(
//             user.pushToken,
//             notification.title,
//             notification.message,
//             {
//               type: notification.type,
//               applianceKey: device.applianceKey,
//               deviceName: device.name,
//               priority: notification.priority,
//               action: notification.action,
//               efficiencyScore: optimization.efficiencyScore
//             }
//           );

//           sentNotifications.push({
//             device: device.name,
//             notification: notification.title
//           });

//         } catch (error) {
//           console.error(`Error sending notification for ${device.name}:`, error.message);
//         }
//       }
//     }

//     return res.status(200).json({
//       message: "Push notifications sent successfully",
//       sentCount: sentNotifications.length,
//       notifications: sentNotifications
//     });

//   } catch (err) {
//     console.error("Error sending push notifications:", err);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: err.message
//     });
//   }
// };

const savePushToken = async (req, res, next) => {
  const userId = req.id; // From verifyToken middleware
  const { pushToken } = req.body;

  try {
    console.log('💾 savePushToken called for user:', userId);
    console.log('📱 Push token:', pushToken);

    // Validate push token
    if (!pushToken) {
      return res.status(400).json({ message: "Push token is required" });
    }

    // ✅ CRITICAL: User MUST be authenticated
    if (!userId) {
      return res.status(401).json({ 
        message: "Authentication required to save push token" 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        pushToken: pushToken,
        notificationsEnabled: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`✅ Push token saved for user: ${user.email}`);

    return res.status(200).json({
      message: "Push token saved successfully",
      notificationsEnabled: true,
      saved: true
    });

  } catch (err) {
    console.error("❌ Error saving push token:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const requestPushNotifications = async (req, res, next) => {
  const userId = req.id;

  try {
    const User = require("../model/user-model");
    const user = await User.findById(userId).select("pushToken notificationsEnabled");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pushToken) {
      return res.status(400).json({
        message: "No push token found. Please enable notifications in app."
      });
    }

    if (!user.notificationsEnabled) {
      return res.status(400).json({
        message: "Notifications are disabled for this user"
      });
    }

    // ✅ CRITICAL FIX: Only fetch notifications that haven't been sent yet
    const unsendNotifications = await NotificationHistory.find({
      userId: user._id,
      sentViaExpo: { $ne: true },  // ✅ Only get unsent notifications
      'notification.type': { $in: ['critical', 'opportunity'] },  // Only important ones
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }  // Only last 24 hours
    }).sort({ createdAt: -1 }).limit(5);  // Max 5 at once

    console.log(`📨 Found ${unsendNotifications.length} unsent notifications for ${user.email}`);

    if (unsendNotifications.length === 0) {
      return res.status(200).json({
        message: "No new notifications to send",
        sentCount: 0
      });
    }

    const sentNotifications = [];

    for (const historyEntry of unsendNotifications) {
      try {
        const pushResponse = await PushNotificationService.sendPushNotification(
          user.pushToken,
          historyEntry.notification.title,
          historyEntry.notification.message,
          {
            type: historyEntry.notification.type,
            applianceKey: historyEntry.applianceKey,
            deviceName: historyEntry.deviceName,
            priority: historyEntry.notification.priority,
            historyId: historyEntry._id.toString()
          }
        );

        // ✅ CRITICAL: Mark as sent so it won't be sent again
        if (pushResponse && pushResponse.id) {
          await NotificationHistory.findByIdAndUpdate(historyEntry._id, {
            sentViaExpo: true,
            expoReceiptId: pushResponse.id,
            sentAt: new Date()  // ✅ Track when sent
          });

          sentNotifications.push({
            device: historyEntry.deviceName,
            notification: historyEntry.notification.title
          });

          console.log(`✅ Sent notification for ${historyEntry.deviceName}`);
        }

      } catch (error) {
        console.error(`❌ Failed to send notification for ${historyEntry.deviceName}:`, error.message);
      }
    }

    return res.status(200).json({
      message: "Push notifications sent successfully",
      sentCount: sentNotifications.length,
      notifications: sentNotifications
    });

  } catch (err) {
    console.error("Error sending push notifications:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};

// Toggle notifications on/off
const toggleNotifications = async (req, res, next) => {
  const userId = req.id;
  const { enabled } = req.body;

  try {
    const User = require("../model/user-model");
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationsEnabled: enabled },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
      notificationsEnabled: user.notificationsEnabled
    });

  } catch (err) {
    console.error("Error toggling notifications:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const getSmartNotifications = async (req, res, next) => {
  const userId = req.id;

  try {
    const User = require("../model/user-model");
    const user = await User.findById(userId).select("devices rooms pushToken notificationsEnabled");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if user has push notifications enabled
    const canSendPush = user.pushToken && user.notificationsEnabled;
    if (!canSendPush) {
      console.log(`⚠️ User ${user.email} - push notifications disabled or no token`);
    }

    const influxClient = req.app.get('influxClient');
    const notifications = [];

    // Get current environmental data from user's rooms
    const roomConditions = {};

    for (const room of user.rooms) {
      try {
        const sensorBase = room.entityId;

        const [humidityData, temperatureData, pressureData] = await Promise.all([
          influxClient.query(`
            SELECT * FROM "%"
            WHERE entity_id = '${sensorBase}_humidity'
            ORDER BY time DESC
            LIMIT 1
          `),
          influxClient.query(`
            SELECT * FROM "°C"
            WHERE entity_id = '${sensorBase}_temperature'
            ORDER BY time DESC
            LIMIT 1
          `),
          influxClient.query(`
            SELECT * FROM "hPa"
            WHERE entity_id = '${sensorBase}_pressure'
            ORDER BY time DESC
            LIMIT 1
          `)
        ]);

        if (humidityData.length > 0 && temperatureData.length > 0) {
          roomConditions[room.name] = {
            temperature: temperatureData[0].value,
            humidity: humidityData[0].value,
            pressure: pressureData.length > 0 ? pressureData[0].value : 101.3,
            lastUpdated: temperatureData[0].time
          };
        }
      } catch (error) {
        console.error(`Error fetching conditions for ${room.name}:`, error.message);
      }
    }

    // If no room data, use default values
    if (Object.keys(roomConditions).length === 0) {
      roomConditions['default'] = {
        temperature: 22,
        humidity: 50,
        pressure: 101.3,
        lastUpdated: new Date()
      };
    }

    // ✅ Track sent push notifications to avoid duplicates in same session
    let pushNotificationsSent = 0;

    // Generate notifications for each device
    for (const device of user.devices) {
      console.log(`\n📱 Processing notifications for: ${device.name}`);

      const conditions = roomConditions[device.location] || Object.values(roomConditions)[0];

      // Get ACTUAL usage data from InfluxDB
      const usageData = await NotificationScheduler.getDeviceUsageData(influxClient, device);

      console.log(`📊 Usage data for ${device.name}:`, {
        eaec: usageData.eaec,
        dailyEAEC: usageData.dailyEAEC,
        N: usageData.N,
        duration: usageData.duration
      });

      // ✅ Skip if device wasn't used
      if (usageData.N === 0 && usageData.dailyEAEC === 0) {
        console.log(`⏭️ [${device.name}] Not used today - skipping`);
        continue;
      }

      // Calculate optimization WITH usage data
      const optimization = EnergyCalculator.calculateOptimization(
        device.applianceKey,
        conditions.temperature,
        conditions.humidity,
        conditions.pressure,
        usageData
      );

      // Generate notification
      const notification = EnergyCalculator.generateNotification(
        device.applianceKey,
        optimization
      );

      console.log(`🔔 Notification for ${device.name}:`, {
        priority: notification.priority,
        type: notification.type,
        title: notification.title
      });

      // ✅ SAVE TO HISTORY AND SEND PUSH NOTIFICATION
      if (notification.type !== 'none') {
        try {
          const historyEntry = await NotificationScheduler.saveNotificationHistory(
            userId,
            device._id.toString(),
            device.applianceKey,
            device.name,
            optimization,
            notification,
            usageData,
            conditions
          );
          
          if (historyEntry) {
            console.log(`💾 Saved notification for ${device.name} to history (ID: ${historyEntry._id})`);
            
            // ✅ SEND PUSH NOTIFICATION if user has it enabled AND priority is high enough
            const shouldSendPush = canSendPush && (
              notification.priority === 'high' || 
              notification.type === 'critical' || 
              notification.type === 'opportunity'
            );

            if (shouldSendPush) {
              try {
                console.log(`📤 Sending push notification for ${device.name}...`);
                
                const pushResponse = await PushNotificationService.sendPushNotification(
                  user.pushToken,
                  notification.title,
                  notification.message,
                  {
                    type: notification.type,
                    applianceKey: device.applianceKey,
                    deviceName: device.name,
                    priority: notification.priority,
                    historyId: historyEntry._id.toString()
                  }
                );

                console.log(`Push response:`, pushResponse);

                // ✅ Mark as sent in database
                if (pushResponse && pushResponse.data) {
                  const firstResponse = pushResponse.data[0] || pushResponse.data;
                  
                  if (firstResponse.status === 'ok') {
                    await NotificationHistory.findByIdAndUpdate(historyEntry._id, {
                      sentViaExpo: true,
                      expoReceiptId: firstResponse.id,
                      sentAt: new Date()
                    });
                    
                    pushNotificationsSent++;
                    console.log(`✅ Push notification sent successfully for ${device.name}`);
                  } else {
                    console.log(`⚠️ Push send returned non-ok status:`, firstResponse);
                  }
                }
              } catch (pushError) {
                console.error(`❌ Failed to send push for ${device.name}:`, pushError.message);
                console.error(`Push error details:`, pushError.response?.data || pushError);
              }
            } else {
              const reason = !canSendPush 
                ? 'User has notifications disabled or no push token'
                : `Priority too low (${notification.priority})`;
              console.log(`⏭️ Skipping push for ${device.name} - ${reason}`);
            }
          } else {
            console.log(`⏭️ [${device.name}] Duplicate notification - already in history`);
          }
        } catch (saveError) {
          console.error(`❌ Failed to save notification for ${device.name}:`, saveError.message);
        }
      }

      // ✅ ADD TO RESPONSE for in-app display
      notifications.push({
        deviceName: device.name,
        applianceKey: device.applianceKey,
        location: device.location || 'Unknown',
        conditions: {
          temperature: conditions.temperature,
          humidity: conditions.humidity,
          pressure: conditions.pressure
        },
        usageData: {
          eaec: usageData.eaec,
          dailyEAEC: usageData.dailyEAEC,
          usageCount: usageData.N,
          avgDuration: usageData.duration
        },
        optimization: {
          efficiencyScore: optimization.efficiency,
          estimatedCost: parseFloat((optimization.adjustedEnergy * getUKEnergyRate()).toFixed(2)),
          potentialSavings: optimization.potentialSavings,
          energyUsed: optimization.adjustedEnergy,
          currentRate: getUKEnergyRate()
        },
        notification: notification,
        timestamp: new Date().toISOString()
      });
    }

    // Sort by priority
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };
    notifications.sort((a, b) => {
      return priorityOrder[a.notification.priority] - priorityOrder[b.notification.priority];
    });

    console.log(`\n📊 Summary: Generated ${notifications.length} notifications, sent ${pushNotificationsSent} push notifications`);

    // ✅ Return comprehensive response
    return res.status(200).json({
      message: "Smart notifications generated successfully",
      count: notifications.length,
      pushNotificationsSent: pushNotificationsSent,
      roomConditions: roomConditions,
      notifications: notifications,
      pushEnabled: canSendPush
    });

  } catch (err) {
    console.error("Error generating smart notifications:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};



const checkDeviceBeforeUse = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;
  const { durationMinutes = 45 } = req.query;

  try {
    const User = require("../model/user-model");
    const user = await User.findById(userId).select("devices rooms");

    const device = user.devices.find(d => d.applianceKey === applianceKey);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const influxClient = req.app.get('influxClient');

    // Get current environmental conditions
    let conditions = { temperature: 22, humidity: 50, pressure: 101.3 };

    if (device.location && user.rooms.length > 0) {
      const room = user.rooms.find(r => r.name === device.location);

      if (room) {
        try {
          const sensorBase = room.entityId;

          const [humidityData, temperatureData, pressureData] = await Promise.all([
            influxClient.query(`
              SELECT * FROM "%"
              WHERE entity_id = '${sensorBase}_humidity'
              ORDER BY time DESC
              LIMIT 1
            `),
            influxClient.query(`
              SELECT * FROM "°C"
              WHERE entity_id = '${sensorBase}_temperature'
              ORDER BY time DESC
              LIMIT 1
            `),
            influxClient.query(`
              SELECT * FROM "hPa"
              WHERE entity_id = '${sensorBase}_pressure'
              ORDER BY time DESC
              LIMIT 1
            `)
          ]);

          if (humidityData.length > 0 && temperatureData.length > 0) {
            conditions = {
              temperature: temperatureData[0].value,
              humidity: humidityData[0].value,
              pressure: pressureData.length > 0 ? pressureData[0].value : 101.3
            };
          }
        } catch (error) {
          console.error("Error fetching room conditions:", error.message);
        }
      }
    }

    // Calculate optimization
    const optimization = EnergyCalculator.calculateOptimization(
      device.applianceKey,
      conditions.temperature,
      conditions.humidity,
      conditions.pressure
    );

    // Generate recommendation
    const recommendation = EnergyCalculator.generateNotification(
      device.applianceKey,
      optimization
    );

    // Get current power consumption
    let currentPower = null;
    try {
      const powerQuery = `
        SELECT * FROM "W"
        WHERE entity_id = '${device.powerEntityId}'
        ORDER BY time DESC
        LIMIT 1
      `;
      const powerData = await influxClient.query(powerQuery);
      if (powerData.length > 0) {
        currentPower = powerData[0].value;
      }
    } catch (error) {
      console.error("Error fetching power data:", error.message);
    }

    return res.status(200).json({
      message: "Device analysis complete",
      device: {
        name: device.name,
        applianceKey: device.applianceKey,
        location: device.location
      },
      currentConditions: conditions,
      currentPower: currentPower,
      optimization: optimization,
      recommendation: recommendation,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Error checking device:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const getSpecificRoomData = async (req, res, next) => {
  const userId = req.id;
  const { roomName } = req.params;
  const { sensorType, hours, days, limit } = req.query;

  try {
    const user = await User.findById(userId).select('rooms');
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const room = user.rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase());
    if (!room) {
      return res.status(404).json({
        message: "Room not found for this user.",
        availableRooms: user.rooms.map(r => r.name)
      });
    }

    // Time range
    let timeRange;
    if (days) timeRange = `time > now() - ${parseInt(days)}d`;
    else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
    else timeRange = "time > now() - 24h";

    const influxClient = req.app.get('influxClient');
    const baseEntityId = room.entityId;

    console.log("=== INFLUX QUERY DEBUG ===");
    console.log("Room Name:", room.name);
    console.log("Base Entity ID:", baseEntityId);
    console.log("Time Range:", timeRange);

    let queries = {};
    const measurementMap = {
      'humidity': '%',
      'temperature': '°C',
      'pressure': 'hPa'
    };

    if (sensorType) {
      const measurement = measurementMap[sensorType];
      if (!measurement) {
        return res.status(400).json({
          message: "Invalid sensor type. Use: humidity, temperature, or pressure"
        });
      }

      const entityId = `${baseEntityId}_${sensorType}`;
      console.log(`Querying ${sensorType} with entity_id: ${entityId}`);

      // FIX 1: Try multiple query formats
      let query;
      let data = [];

      // Try format 1: With quotes and WHERE clause
      try {
        query = `
          SELECT * FROM "${measurement}"
          WHERE entity_id = '${entityId}' AND ${timeRange}
          ORDER BY time DESC
          LIMIT ${parseInt(limit) || 100}
        `;
        console.log("Query Format 1:", query);
        data = await influxClient.query(query);
        console.log(`Format 1 Results: ${data.length} records`);
      } catch (err1) {
        console.log("Format 1 failed:", err1.message);

        // Try format 2: Using regex for entity_id
        try {
          query = `
            SELECT * FROM "${measurement}"
            WHERE entity_id =~ /^${entityId}$/ AND ${timeRange}
            ORDER BY time DESC
            LIMIT ${parseInt(limit) || 100}
          `;
          console.log("Query Format 2:", query);
          data = await influxClient.query(query);
          console.log(`Format 2 Results: ${data.length} records`);
        } catch (err2) {
          console.log("Format 2 failed:", err2.message);

          // Try format 3: Without WHERE clause to see all data
          try {
            query = `
              SELECT * FROM "${measurement}"
              WHERE ${timeRange}
              ORDER BY time DESC
              LIMIT ${parseInt(limit) || 100}
            `;
            console.log("Query Format 3 (all entities):", query);
            const allData = await influxClient.query(query);
            console.log(`Format 3 Results: ${allData.length} total records`);

            // Filter manually
            data = allData.filter(d => d.entity_id === entityId);
            console.log(`Filtered to ${data.length} records for ${entityId}`);

            // Log all unique entity_ids found
            const uniqueIds = [...new Set(allData.map(d => d.entity_id))];
            console.log("Available entity_ids in InfluxDB:", uniqueIds);
          } catch (err3) {
            console.log("Format 3 failed:", err3.message);
          }
        }
      }

      queries[sensorType] = data;

    } else {
      // Query all sensors
      for (const [type, measurement] of Object.entries(measurementMap)) {
        const entityId = `${baseEntityId}_${type}`;
        console.log(`\n--- Querying ${type} ---`);
        console.log(`Entity ID: ${entityId}`);
        console.log(`Measurement: ${measurement}`);

        let data = [];

        // Try format 1
        try {
          const query = `
            SELECT * FROM "${measurement}"
            WHERE entity_id = '${entityId}' AND ${timeRange}
            ORDER BY time DESC
            LIMIT ${parseInt(limit) || 100}
          `;
          console.log("Query:", query);
          data = await influxClient.query(query);
          console.log(`✅ Found ${data.length} ${type} records`);
        } catch (err1) {
          console.log(`⚠️ Standard query failed for ${type}:`, err1.message);

          // Try without entity_id filter to see what's available
          try {
            const debugQuery = `
              SELECT * FROM "${measurement}"
              WHERE ${timeRange}
              ORDER BY time DESC
              LIMIT ${parseInt(limit) || 100}
            `;
            const allData = await influxClient.query(debugQuery);
            console.log(`Found ${allData.length} total ${type} records`);

            // Log unique entity_ids
            const uniqueIds = [...new Set(allData.map(d => d.entity_id))];
            console.log(`Available ${type} entity_ids:`, uniqueIds);

            // Filter manually
            data = allData.filter(d => d.entity_id === entityId);
            console.log(`Filtered to ${data.length} records for ${entityId}`);
          } catch (err2) {
            console.log(`❌ Debug query also failed for ${type}:`, err2.message);
          }
        }

        queries[type] = data;
      }
    }

    console.log("=== END DEBUG ===\n");

    return res.status(200).json({
      message: `${room.name} environmental data fetched successfully.`,
      room: room.name,
      entityId: baseEntityId,
      timeRange,
      sensorData: queries
    });

  } catch (err) {
    console.error("Error fetching specific room data:", err);
    return res.status(500).json({
      message: "Internal server error.",
      error: err.message
    });
  }
};


const NotificationHistory = require('../model/notification-history-model');

const getNotificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all' } = req.query;
    const userId = req.id; // From verifyToken middleware

    let query = { userId };

    // Apply filters
    if (filter === 'unread') {
      query.read = false;
    } else if (filter === 'critical') {
      query['notification.priority'] = 'high';
    } else if (filter === 'dismissed') {
      query.dismissed = true;
    } else if (filter !== 'all' && ['dryer', 'kettle', 'microwave', 'coffeemachine', 'airfryer', 'toaster', 'dishwasher', 'washingmachine'].includes(filter)) {
      query.applianceKey = filter;
    }

    const notifications = await NotificationHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await NotificationHistory.countDocuments(query);

    res.status(200).json({
      success: true,
      notifications: notifications.map(n => ({
        _id: n._id,
        applianceKey: n.applianceKey,
        deviceName: n.deviceName,
        notification: n.notification,
        optimization: n.optimization,
        conditions: n.conditions,
        timestamp: n.createdAt,
        read: n.read,
        dismissed: n.dismissed
      })),
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalNotifications: count
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
};

const getNotificationStats = async (req, res) => {
  try {
    const userId = req.id;

    const [total, unread, critical, today] = await Promise.all([
      NotificationHistory.countDocuments({ userId }),
      NotificationHistory.countDocuments({ userId, read: false }),
      NotificationHistory.countDocuments({
        userId,
        'notification.priority': 'high'
      }),
      NotificationHistory.countDocuments({
        userId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        unread,
        critical,
        today
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats',
      error: error.message
    });
  }
};


const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const notification = await NotificationHistory.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.id; // or req.user._id depending on your auth middleware

    const result = await NotificationHistory.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};


const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const notification = await NotificationHistory.findOneAndUpdate(
      { _id: id, userId },
      { dismissed: true, read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification',
      error: error.message
    });
  }
};

const clearReadNotifications = async (req, res) => {
  try {
    const userId = req.id;

    const result = await NotificationHistory.deleteMany({
      userId,
      read: true
    });

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;

    const notification = await NotificationHistory.findOneAndDelete({
      _id: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

const getDeviceDailyBreakdown = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;
  const { days = 30 } = req.query;

  try {
    const user = await User.findById(userId).select("devices");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const device = user.devices.find(d => d.applianceKey === applianceKey);
    if (!device) {
      return res.status(404).json({
        message: "Device not found for this user.",
        availableDevices: user.devices.map(d => d.applianceKey)
      });
    }

    const influxClient = req.app.get("influxClient");

    console.log(`\n=== Daily Breakdown for ${device.name} ===`);
    console.log(`Power Entity ID: ${device.powerEntityId}`);

    // ✅ METHOD 1: Get all readings and calculate energy properly
    const rawDataQuery = `
      SELECT value, time
      FROM "W"
      WHERE entity_id = '${device.powerEntityId}' 
        AND time > now() - ${parseInt(days)}d
      ORDER BY time ASC
    `;

    console.log('Fetching raw data...');
    const rawData = await influxClient.query(rawDataQuery);
    console.log(`Fetched ${rawData.length} readings`);

    if (rawData.length === 0) {
      return res.status(200).json({
        message: "No consumption data available for this period",
        device: {
          name: device.name,
          applianceKey: device.applianceKey
        },
        dailyBreakdown: []
      });
    }

    // ✅ Group readings by date and calculate actual energy consumption
    const dailyData = {};

    for (let i = 1; i < rawData.length; i++) {
      const prevReading = rawData[i - 1];
      const currReading = rawData[i];

      // Get date (YYYY-MM-DD)
      const date = new Date(currReading.time).toISOString().split('T')[0];

      // Calculate time difference in hours
      const timeDiffMs = new Date(currReading.time) - new Date(prevReading.time);
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      // Skip if time gap is too large (> 1 hour = missing data)
      if (timeDiffHours > 1) continue;

      // Calculate energy: Power (W) × Time (h) = Wh
      const avgPower = (prevReading.value + currReading.value) / 2;
      const energyWh = avgPower * timeDiffHours;

      // Initialize date if not exists
      if (!dailyData[date]) {
        dailyData[date] = {
          totalWh: 0,
          readings: 0,
          minWatts: Infinity,
          maxWatts: -Infinity,
          sumWatts: 0
        };
      }

      // Accumulate data
      dailyData[date].totalWh += energyWh;
      dailyData[date].readings++;
      dailyData[date].minWatts = Math.min(dailyData[date].minWatts, currReading.value);
      dailyData[date].maxWatts = Math.max(dailyData[date].maxWatts, currReading.value);
      dailyData[date].sumWatts += currReading.value;
    }

    // ✅ Convert to array and format
    const dailyBreakdown = Object.entries(dailyData)
      .map(([dateStr, data]) => {
        const date = new Date(dateStr);
        const dailyKwh = data.totalWh / 1000; // Convert Wh to kWh
        const avgWatts = data.readings > 0 ? data.sumWatts / data.readings : 0;
        const estimatedCost = dailyKwh * getUKEnergyRate();

        return {
          date: dateStr,
          dateFormatted: date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          consumption: {
            kWh: parseFloat(dailyKwh.toFixed(3)),
            avgWatts: Math.round(avgWatts),
            minWatts: data.minWatts === Infinity ? 0 : Math.round(data.minWatts),
            maxWatts: data.maxWatts === -Infinity ? 0 : Math.round(data.maxWatts)
          },
          estimatedCost: parseFloat(estimatedCost.toFixed(2)),
          dataQuality: {
            readings: data.readings,
            confidence: data.readings > 100 ? 'high' :
              data.readings > 50 ? 'medium' : 'low'
          }
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

    // Calculate summary
    const totalKwh = dailyBreakdown.reduce((sum, day) => sum + day.consumption.kWh, 0);
    const avgDailyKwh = dailyBreakdown.length > 0 ? totalKwh / dailyBreakdown.length : 0;
    const totalCost = dailyBreakdown.reduce((sum, day) => sum + day.estimatedCost, 0);

    console.log(`✅ Calculated ${dailyBreakdown.length} days`);
    console.log(`Total: ${totalKwh.toFixed(2)} kWh`);
    console.log(`Daily avg: ${avgDailyKwh.toFixed(2)} kWh`);

    res.status(200).json({
      message: "Daily breakdown fetched successfully",
      device: {
        name: device.name,
        applianceKey: device.applianceKey,
        powerEntityId: device.powerEntityId
      },
      period: {
        days: parseInt(days),
        from: dailyBreakdown[dailyBreakdown.length - 1]?.date,
        to: dailyBreakdown[0]?.date
      },
      summary: {
        totalKwh: parseFloat(totalKwh.toFixed(2)),
        avgDailyKwh: parseFloat(avgDailyKwh.toFixed(3)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        daysWithData: dailyBreakdown.length
      },
      dailyBreakdown: dailyBreakdown
    });

  } catch (err) {
    console.error("Error in getDeviceDailyBreakdown:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const getDeviceHourlyBreakdown = async (req, res, next) => {
  const userId = req.id;
  const { applianceKey } = req.params;

  try {
    const user = await User.findById(userId).select("devices");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const device = user.devices.find(d => d.applianceKey === applianceKey);
    if (!device) {
      return res.status(404).json({
        message: "Device not found for this user.",
        availableDevices: user.devices.map(d => d.applianceKey)
      });
    }

    const influxClient = req.app.get("influxClient");

    console.log(`\n=== Hourly Breakdown for ${device.name} ===`);
    console.log(`Power Entity ID: ${device.powerEntityId}`);

    // ✅ PROPER FIX: Calculate UK time correctly
    const now = new Date();

    // Get UTC time components
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    console.log(`UTC time: ${utcYear}-${utcMonth + 1}-${utcDate} ${utcHours}:${utcMinutes}`);

    // Determine if we're in BST or GMT
    // BST runs from last Sunday in March to last Sunday in October
    // For November, we're definitely in GMT (UTC+0)
    const isBST = utcMonth >= 3 && utcMonth <= 9; // April to October = BST
    const ukOffset = isBST ? 1 : 0; // BST = UTC+1, GMT = UTC+0

    // Calculate UK hour
    let ukHour = utcHours + ukOffset;
    if (ukHour >= 24) ukHour -= 24; // Handle day overflow

    const timezoneName = isBST ? 'BST (UTC+1)' : 'GMT (UTC+0)';

    console.log(`🌍 Timezone: ${timezoneName}`);
    console.log(`🕐 Current UK hour: ${ukHour}`);
    console.log(`🕐 Current UTC hour: ${utcHours}`);

    // Get start of today in UK timezone
    // If UK hour < UTC hour, we're on the same UTC day
    // If UK hour > UTC hour, we might have crossed into next day
    let startOfTodayUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0, 0));

    // Subtract the UK offset to get UTC time for UK midnight
    startOfTodayUTC = new Date(startOfTodayUTC.getTime() - (ukOffset * 60 * 60 * 1000));

    console.log(`📅 Start of today (UK midnight in UTC): ${startOfTodayUTC.toISOString()}`);

    // Query: Get all readings from start of today (UK time)
    const query = `
      SELECT value, time
      FROM "W"
      WHERE entity_id = '${device.powerEntityId}' 
        AND time >= '${startOfTodayUTC.toISOString()}'
      ORDER BY time ASC
    `;

    console.log('Query:', query);
    const rawData = await influxClient.query(query);
    console.log(`Fetched ${rawData.length} readings for today`);

    if (rawData.length === 0) {
      return res.status(200).json({
        message: "No consumption data available for today",
        device: {
          name: device.name,
          applianceKey: device.applianceKey
        },
        today: {
          date: startOfTodayUTC.toISOString().split('T')[0],
          currentHour: ukHour,
          totalKwh: 0,
          hoursWithData: 0,
          timezone: timezoneName
        },
        hourlyBreakdown: []
      });
    }

    // Group readings by hour and calculate energy consumption
    const hourlyData = {};

    for (let i = 1; i < rawData.length; i++) {
      const prevReading = rawData[i - 1];
      const currReading = rawData[i];

      // ✅ Convert reading time to UK timezone
      const readingUTC = new Date(currReading.time);
      const readingUTCHour = readingUTC.getUTCHours();

      // Calculate UK hour for this reading
      let readingUKHour = readingUTCHour + ukOffset;
      if (readingUKHour >= 24) readingUKHour -= 24;

      // ✅ CRITICAL: Skip data from future hours (in UK time)
      if (readingUKHour > ukHour) {
        console.log(`⏭️ Skipping reading at UK hour ${readingUKHour} (current UK hour is ${ukHour})`);
        continue;
      }

      // Calculate time difference in hours
      const timeDiffMs = new Date(currReading.time) - new Date(prevReading.time);
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      // Skip if time gap is too large (> 1 hour)
      if (timeDiffHours > 1) continue;

      // Calculate energy: Power (W) × Time (h) = Wh
      const avgPower = (prevReading.value + currReading.value) / 2;
      const energyWh = avgPower * timeDiffHours;

      // Initialize hour if not exists
      if (!hourlyData[readingUKHour]) {
        hourlyData[readingUKHour] = {
          totalWh: 0,
          readings: 0,
          minWatts: Infinity,
          maxWatts: -Infinity,
          sumWatts: 0
        };
      }

      // Accumulate data
      hourlyData[readingUKHour].totalWh += energyWh;
      hourlyData[readingUKHour].readings++;
      hourlyData[readingUKHour].minWatts = Math.min(hourlyData[readingUKHour].minWatts, currReading.value);
      hourlyData[readingUKHour].maxWatts = Math.max(hourlyData[readingUKHour].maxWatts, currReading.value);
      hourlyData[readingUKHour].sumWatts += currReading.value;
    }

    // Create hourly breakdown array
    const hourlyBreakdown = [];

    // Only loop through hours from 0 to current UK hour (inclusive)
    for (let hour = 0; hour <= ukHour; hour++) {
      const data = hourlyData[hour];

      if (data) {
        const kWh = data.totalWh / 1000;
        const avgWatts = data.readings > 0 ? data.sumWatts / data.readings : 0;

        hourlyBreakdown.push({
          hour,
          hourLabel: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
          consumption: {
            kWh: parseFloat(kWh.toFixed(3)),
            avgWatts: Math.round(avgWatts),
            minWatts: data.minWatts === Infinity ? 0 : Math.round(data.minWatts),
            maxWatts: data.maxWatts === -Infinity ? 0 : Math.round(data.maxWatts)
          },
          dataQuality: {
            readings: data.readings,
            confidence: data.readings > 10 ? 'high' :
              data.readings > 5 ? 'medium' : 'low'
          }
        });

        console.log(`✅ Hour ${hour}: ${kWh.toFixed(3)} kWh (${data.readings} readings)`);
      } else {
        hourlyBreakdown.push({
          hour,
          hourLabel: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
          consumption: {
            kWh: 0,
            avgWatts: 0,
            minWatts: 0,
            maxWatts: 0
          },
          dataQuality: {
            readings: 0,
            confidence: 'none'
          }
        });

        console.log(`⚪ Hour ${hour}: No data`);
      }
    }

    // Calculate summary
    const totalKwh = hourlyBreakdown.reduce((sum, hour) => sum + hour.consumption.kWh, 0);
    const hoursWithData = hourlyBreakdown.filter(h => h.dataQuality.readings > 0).length;

    console.log(`\n✅ Generated ${hourlyBreakdown.length} hours (0 to ${ukHour})`);
    console.log(`✅ Total today: ${totalKwh.toFixed(3)} kWh`);
    console.log(`✅ Hours with data: ${hoursWithData}`);

    res.status(200).json({
      message: "Hourly breakdown fetched successfully",
      device: {
        name: device.name,
        applianceKey: device.applianceKey,
        powerEntityId: device.powerEntityId
      },
      today: {
        date: new Date().toISOString().split('T')[0],
        currentHour: ukHour,
        totalKwh: parseFloat(totalKwh.toFixed(3)),
        hoursWithData,
        timezone: timezoneName
      },
      hourlyBreakdown
    });

  } catch (err) {
    console.error("Error in getDeviceHourlyBreakdown:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const testPushNotification = async (req, res, next) => {
  const userId = req.id;

  try {
    const user = await User.findById(userId).select('email pushToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.pushToken) {
      return res.status(400).json({
        error: 'No push token found',
        message: 'Please open the app and login first to generate a push token'
      });
    }

    console.log('📱 Sending test notification to:', user.email);
    console.log('📱 Push token:', user.pushToken);

    const result = await PushNotificationService.sendPushNotification(
      user.pushToken,
      '🔔 Test Notification',
      'If you see this, your notifications are working perfectly!',
      { type: 'test', screen: 'Dashboard' }
    );

    console.log('✅ Test notification sent successfully');

    return res.status(200).json({
      success: true,
      message: 'Test notification sent! Check your device.',
      email: user.email,
      result
    });

  } catch (error) {
    console.error('❌ Test notification error:', error);
    return res.status(500).json({
      error: error.message,
      message: 'Failed to send test notification'
    });
  }
};

// Add a single device to user's devices
const addDevice = async (req, res, next) => {
  const userId = req.id;
  const { name, location, applianceKey, deviceType } = req.body;

  try {
    console.log('📱 Adding device:', { name, location, applianceKey, deviceType });
    console.log('👤 User ID:', userId);

    // Validate required fields
    if (!name || !applianceKey) {
      return res.status(400).json({ 
        success: false,
        message: "Device name and applianceKey are required" 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if device already exists
    const deviceExists = user.devices.some(d => d.applianceKey === applianceKey);
    if (deviceExists) {
      return res.status(400).json({ 
        success: false,
        message: `${name} is already in your devices` 
      });
    }

    // Generate entity IDs using your existing function
    const entityIds = generateEntityIds(name);

    console.log('🔧 Generated entity IDs:', entityIds);

    // Create new device object
    const newDevice = {
      name,
      location: location || 'Kitchen',
      applianceKey,
      entityId: entityIds.entityId,
      powerEntityId: entityIds.powerEntityId,
      currentEntityId: entityIds.currentEntityId,
      switchEntityId: entityIds.switchEntityId,
      statusEntityId: entityIds.statusEntityId,
      deviceType: deviceType || 'appliance',
      isActive: true
    };

    // Add device to user's devices array
    user.devices.push(newDevice);
    
    // Save user
    await user.save();

    console.log('✅ Device added successfully');

    return res.status(200).json({
      success: true,
      message: `${name} added successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        devices: user.devices,
        rooms: user.rooms
      }
    });

  } catch (err) {
    console.error("❌ Error adding device:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};

// const getDeviceCurrentData = async (req, res, next) => {
//   const userId = req.id;
//   const { applianceKey } = req.params;
//   const { hours, days, limit } = req.query;

//   try {
//     const user = await User.findById(userId).select("devices");
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     const device = user.devices.find(d => d.applianceKey === applianceKey);
//     if (!device) {
//       return res.status(404).json({
//         message: "Device not found for this user.",
//         availableDevices: user.devices.map(d => d.applianceKey)
//       });
//     }

//     if (!device.currentEntityId) {
//       return res.status(400).json({
//         message: "Current entity ID not configured for this device"
//       });
//     }

//     // Time range
//     let timeRange;
//     if (days) timeRange = `time > now() - ${parseInt(days)}d`;
//     else if (hours) timeRange = `time > now() - ${parseInt(hours)}h`;
//     else timeRange = "time > now() - 7d";

//     const influxClient = req.app.get("influxClient");

//     // Query the A measurement for current
//     const query = `
//       SELECT * FROM "A"
//       WHERE entity_id = '${device.currentEntityId}' AND ${timeRange}
//       ORDER BY time DESC
//       LIMIT ${parseInt(limit) || 100}
//     `;

//     const data = await influxClient.query(query);

//     // Calculate summary if data exists
//     let summary = null;
//     if (data.length > 0) {
//       const latestReading = data[0];
//       const avgCurrent = data.reduce((sum, reading) => sum + (reading.value || 0), 0) / data.length;

//       summary = {
//         currentDraw: latestReading.value || 0,
//         averageCurrent: Math.round(avgCurrent * 100) / 100,
//         unit: "A",
//         lastUpdated: latestReading.time,
//         isActive: (latestReading.value || 0) > 0.5
//       };
//     }

//     res.status(200).json({
//       message: "Device current data fetched successfully",
//       device: {
//         name: device.name,
//         applianceKey: device.applianceKey,
//         location: device.location,
//         currentEntityId: device.currentEntityId
//       },
//       currentSummary: summary,
//       timeRange,
//       count: data.length,
//       data
//     });
//   } catch (err) {
//     console.error("Error fetching device current data:", err);
//     res.status(500).json({
//       message: "Internal server error",
//       error: err.message
//     });
//   }
// };





module.exports = {
  getSpecificRoomData,
  signup,
  login,
  verifyToken,
  getUser,
  setupUser,
  getUserDeviceData,
  getDeviceData,
  getSwitchData,
  getDeviceCurrentConsumption,
  getRoomEnvironmentalData,
  getSpecificRoomData,
  getDeviceHistoricalConsumption,
  logout,
  savePushToken,
  requestPushNotifications,
  toggleNotifications,
  getSmartNotifications,
  checkDeviceBeforeUse,
  optionalAuth,
  getNotificationHistory,
  getNotificationStats,
  markNotificationAsRead,
  dismissNotification,
  clearReadNotifications,
  deleteNotification,
  getDeviceDailyBreakdown,
  getDeviceHourlyBreakdown,
  testPushNotification,
  markAllNotificationsAsRead,
  addDevice
};
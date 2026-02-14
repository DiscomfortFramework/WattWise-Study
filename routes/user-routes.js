// // Import Express
// const express = require("express");

// // Import all user-related controller functions
// const {
//   signup,
//   login,
//   verifyToken,
//   getUser,
//   setupUser,
//   getUserDeviceData,
//   getDeviceData,
//   getSwitchData,
//   getDeviceCurrentConsumption,
//   getRoomEnvironmentalData,
//   getSpecificRoomData,
//   getDeviceHistoricalConsumption,
//   logout,
//   savePushToken,
//   requestPushNotifications,
//   toggleNotifications,
//   getSmartNotifications,
//   checkDeviceBeforeUse,
//   optionalAuth,
//   getNotificationHistory,
//   getNotificationStats,
//   markNotificationAsRead,
//   dismissNotification,
//   clearReadNotifications,
//   deleteNotification,
//   getDeviceDailyBreakdown,
//   getDeviceHourlyBreakdown,
//   testPushNotification,
//   markAllNotificationsAsRead,
//   addDevice
// } = require('../controllers/user-controller');

// // Initialize Express router
// const router = express.Router();

// /**
//  * ----------------------------------------
//  * DEVICE ANALYTICS ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get hourly energy consumption breakdown for a specific appliance
//  */
// router.get(
//   "/user/device/:applianceKey/hourly-breakdown",
//   verifyToken,
//   getDeviceHourlyBreakdown
// );

// /**
//  * ----------------------------------------
//  * AUTHENTICATION ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Create a new user account
//  */
// router.post("/signup", signup);

// /**
//  * User login
//  */
// router.post("/login", login);

// /**
//  * ----------------------------------------
//  * USER PROFILE & SETUP ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get authenticated user details
//  */
// router.get("/user", verifyToken, getUser);

// /**
//  * Initial setup for user devices and rooms
//  */
// router.patch("/user/setup", verifyToken, setupUser);

// /**
//  * ----------------------------------------
//  * DEVICE MANAGEMENT ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get all devices belonging to the authenticated user
//  */
// router.get("/user/devices", verifyToken, async (req, res) => {
//   try {
//     const User = require("../model/user-model");

//     // Fetch only device data for the user
//     const user = await User.findById(req.id).select("devices");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.status(200).json({ devices: user.devices });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error fetching devices",
//       error: err.message
//     });
//   }
// });

// /**
//  * Get all device data for the user
//  */
// router.get("/user/device-data", verifyToken, getUserDeviceData);

// /**
//  * Get data for a specific appliance
//  */
// router.get("/user/device/:applianceKey", verifyToken, getDeviceData);

// /**
//  * Get switch state data for user devices
//  */
// router.get("/user/switch-data", verifyToken, getSwitchData);

// /**
//  * Get current power consumption for a specific appliance
//  */
// router.get(
//   "/user/device/:applianceKey/consumption",
//   verifyToken,
//   getDeviceCurrentConsumption
// );

// /**
//  * ----------------------------------------
//  * DEBUG & TESTING ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Debug route to verify entity mappings for user devices
//  */
// router.get("/debug/entity-mapping", verifyToken, async (req, res) => {
//   try {
//     const User = require("../model/user-model");
//     const user = await User.findById(req.id).select("devices");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Map relevant entity IDs for debugging
//     const entityMapping = user.devices.map(device => ({
//       deviceName: device.name,
//       applianceKey: device.applianceKey,
//       powerEntityId: device.entityId,
//       switchEntityId: device.switchEntityId,
//       statusEntityId: device.statusEntityId
//     }));

//     res.json({
//       message: "User entity mapping",
//       deviceCount: user.devices.length,
//       entityMapping
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// /**
//  * Debug route to test whether entity IDs exist in InfluxDB
//  */
// router.get("/debug/test-entities", verifyToken, async (req, res) => {
//   try {
//     const User = require("../model/user-model");
//     const user = await User.findById(req.id).select("devices");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Get InfluxDB client from app context
//     const influxClient = req.app.get('influxClient');

//     // Extract entity IDs from user devices
//     const userEntityIds = user.devices.map(d => d.entityId).filter(Boolean);
//     const userSwitchEntityIds = user.devices.map(d => d.switchEntityId).filter(Boolean);

//     // Query available entities in InfluxDB
//     const query = `SHOW TAG VALUES FROM "state" WITH KEY = "entity_id"`;
//     const availableEntities = await influxClient.query(query);

//     // Test latest data availability for first two entities
//     let testResults = {};

//     for (const entityId of userEntityIds.slice(0, 2)) {
//       try {
//         const dataQuery = `
//           SELECT * FROM "state"
//           WHERE entity_id = '${entityId}'
//           ORDER BY time DESC
//           LIMIT 5
//         `;
//         const data = await influxClient.query(dataQuery);

//         testResults[entityId] = {
//           found: data.length > 0,
//           dataCount: data.length,
//           latestData: data[0] || null
//         };
//       } catch (error) {
//         testResults[entityId] = { error: error.message };
//       }
//     }

//     res.json({
//       message: "Entity testing results",
//       userEntityIds,
//       userSwitchEntityIds,
//       availableEntitiesCount: availableEntities.length,
//       availableEntities: availableEntities.slice(0, 10),
//       testResults
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// /**
//  * ----------------------------------------
//  * ROOM & ENVIRONMENT DATA ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get environmental data for all rooms
//  */
// router.get("/user/rooms/environmental", verifyToken, getRoomEnvironmentalData);

// /**
//  * Get data for a specific room
//  */
// router.get("/user/room/:roomName", verifyToken, getSpecificRoomData);

// /**
//  * Get historical energy consumption for a device
//  */
// router.get(
//   "/user/device/:applianceKey/historical",
//   verifyToken,
//   getDeviceHistoricalConsumption
// );

// /**
//  * ----------------------------------------
//  * AUTH & SESSION ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Logout user
//  */
// router.post("/logout", verifyToken, logout);

// /**
//  * Root test endpoint
//  */
// router.get('/', (req, res) => {
//   res.json({
//     message: "User routes are working - Entity-based approach",
//     endpoints: {
//       "POST /signup": "Create new user account",
//       "POST /login": "User login",
//       "GET /user": "Get user details",
//       "PATCH /user/setup": "Setup user devices and rooms",
//       "GET /user/devices": "Get user's devices",
//       "GET /user/device-data": "Get all device data for user",
//       "GET /user/device/:applianceKey": "Get specific device data",
//       "GET /user/switch-data": "Get switch states for user devices",
//       "GET /notifications/history": "Get notification history",
//       "GET /notifications/history/stats": "Get notification statistics"
//     }
//   });
// });

// /**
//  * ----------------------------------------
//  * PUSH NOTIFICATIONS & SMART ALERTS
//  * ----------------------------------------
//  */

// /**
//  * Save user's push notification token
//  */
// router.post("/user/push-token", verifyToken, savePushToken);

// /**
//  * Request permission for push notifications
//  */
// router.post(
//   "/user/request-push-notifications",
//   verifyToken,
//   requestPushNotifications
// );

// /**
//  * Enable or disable notifications
//  */
// router.patch(
//   "/user/toggle-notifications",
//   verifyToken,
//   toggleNotifications
// );

// /**
//  * Get AI-based smart notifications
//  */
// router.get(
//   "/user/smart-notifications",
//   verifyToken,
//   getSmartNotifications
// );

// /**
//  * Validate device conditions before use
//  */
// router.get(
//   "/user/check-device/:applianceKey",
//   verifyToken,
//   checkDeviceBeforeUse
// );

// /**
//  * ----------------------------------------
//  * NOTIFICATION HISTORY ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get user's notification history
//  */
// router.get(
//   "/notifications/history",
//   verifyToken,
//   getNotificationHistory
// );

// /**
//  * Get notification statistics
//  */
// router.get(
//   "/notifications/history/stats",
//   verifyToken,
//   getNotificationStats
// );

// /**
//  * Mark all notifications as read
//  */
// router.put(
//   "/notifications/history/mark-all-read",
//   verifyToken,
//   markAllNotificationsAsRead
// );

// /**
//  * Mark a specific notification as read
//  */
// router.put(
//   "/notifications/history/:id/read",
//   verifyToken,
//   markNotificationAsRead
// );

// /**
//  * Dismiss a specific notification
//  */
// router.put(
//   "/notifications/history/:id/dismiss",
//   verifyToken,
//   dismissNotification
// );

// /**
//  * Delete all read notifications
//  */
// router.delete(
//   "/notifications/history/clear",
//   verifyToken,
//   clearReadNotifications
// );

// /**
//  * Delete a specific notification
//  */
// router.delete(
//   "/notifications/history/:id",
//   verifyToken,
//   deleteNotification
// );

// /**
//  * ----------------------------------------
//  * DEVICE BREAKDOWN ROUTES
//  * ----------------------------------------
//  */

// /**
//  * Get daily energy consumption breakdown
//  */
// router.get(
//   "/user/device/:applianceKey/daily-breakdown",
//   verifyToken,
//   getDeviceDailyBreakdown
// );

// /**
//  * ----------------------------------------
//  * SCHEMA DEBUG ROUTE
//  * ----------------------------------------
//  */

// /**
//  * Debug route to inspect NotificationHistory schema structure
//  */
// router.get('/test-schema', verifyToken, async (req, res) => {
//   try {
//     const NotificationHistory = require('../model/notification-history-model');
//     const schema = NotificationHistory.schema.obj;

//     res.json({
//       success: true,
//       schema: {
//         applianceKey: schema.applianceKey,
//         notification: schema.notification,
//         recommendations: schema.notification.recommendations
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Add a new device to user's profile
// router.post('/user/device/add', verifyToken, addDevice);
// // Export router
// module.exports = router;


const express = require("express");
const {
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
  markAllNotificationsAsRead,
  addDevice,
  testPushNotification

} = require('../controllers/user-controller');

const router = express.Router();

router.get("/user/test-push", verifyToken, testPushNotification);

router.get(
  "/user/device/:applianceKey/hourly-breakdown",
  verifyToken,
  getDeviceHourlyBreakdown
);

// Authentication routes
router.post("/signup", signup);
router.post("/login", login);

// User management routes
router.get("/user", verifyToken, getUser);
router.patch("/user/setup", verifyToken, setupUser);

// Device data routes - All using entity-based queries
router.get("/user/devices", verifyToken, async (req, res) => {
  try {
    const User = require("../model/user-model");
    const user = await User.findById(req.id).select("devices");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ devices: user.devices });
  } catch (err) {
    res.status(500).json({ message: "Error fetching devices", error: err.message });
  }
});

router.get("/user/device-data", verifyToken, getUserDeviceData);
router.get("/user/device/:applianceKey", verifyToken, getDeviceData);
router.get("/user/switch-data", verifyToken, getSwitchData);
router.get("/user/device/:applianceKey/consumption", verifyToken, getDeviceCurrentConsumption);

// Debug and testing routes
router.get("/debug/entity-mapping", verifyToken, async (req, res) => {
  try {
    const User = require("../model/user-model");
    const user = await User.findById(req.id).select("devices");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const entityMapping = user.devices.map(device => ({
      deviceName: device.name,
      applianceKey: device.applianceKey,
      powerEntityId: device.entityId,
      switchEntityId: device.switchEntityId,
      statusEntityId: device.statusEntityId
    }));

    res.json({
      message: "User entity mapping",
      deviceCount: user.devices.length,
      entityMapping: entityMapping
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/debug/test-entities", verifyToken, async (req, res) => {
  try {
    const User = require("../model/user-model");
    const user = await User.findById(req.id).select("devices");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const influxClient = req.app.get('influxClient');

    // Get user's entity IDs
    const userEntityIds = user.devices.map(d => d.entityId).filter(Boolean);
    const userSwitchEntityIds = user.devices.map(d => d.switchEntityId).filter(Boolean);

    // Check what entities actually exist in InfluxDB
    const query = `SHOW TAG VALUES FROM "state" WITH KEY = "entity_id"`;
    const availableEntities = await influxClient.query(query);

    // Test data retrieval for user's entities
    let testResults = {};

    for (const entityId of userEntityIds.slice(0, 2)) { // Test first 2 entities
      try {
        const dataQuery = `
          SELECT * FROM "state" 
          WHERE entity_id = '${entityId}' 
          ORDER BY time DESC 
          LIMIT 5
        `;
        const data = await influxClient.query(dataQuery);
        testResults[entityId] = {
          found: data.length > 0,
          dataCount: data.length,
          latestData: data[0] || null
        };
      } catch (error) {
        testResults[entityId] = { error: error.message };
      }
    }

    res.json({
      message: "Entity testing results",
      userEntityIds,
      userSwitchEntityIds,
      availableEntitiesCount: availableEntities.length,
      availableEntities: availableEntities.slice(0, 10),
      testResults
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user/rooms/environmental", verifyToken, getRoomEnvironmentalData);
router.get("/user/room/:roomName", verifyToken, getSpecificRoomData);
router.get("/user/device/:applianceKey/historical", verifyToken, getDeviceHistoricalConsumption);


router.post("/logout", verifyToken, logout); // New
router.get('/', (req, res) => {
  res.json({
    message: "User routes are working - Entity-based approach",
    endpoints: {
      "POST /signup": "Create new user account",
      "POST /login": "User login",
      "GET /user": "Get user details",
      "PATCH /user/setup": "Setup user devices and rooms",
      "GET /user/devices": "Get user's devices",
      "GET /user/device-data": "Get all device data for user",
      "GET /user/device/:applianceKey": "Get specific device data",
      "GET /user/switch-data": "Get switch states for user devices",
      "GET /notifications/history": "Get notification history",
      "GET /notifications/history/stats": "Get notification statistics"

    }
  });
});

router.post("/user/push-token", verifyToken, savePushToken);
router.post("/user/request-push-notifications", verifyToken, requestPushNotifications);
router.patch("/user/toggle-notifications", verifyToken, toggleNotifications);
router.get("/user/smart-notifications", verifyToken, getSmartNotifications);
router.get("/user/check-device/:applianceKey", verifyToken, checkDeviceBeforeUse);

router.get("/notifications/history", verifyToken, getNotificationHistory);
router.get("/notifications/history/stats", verifyToken, getNotificationStats);
router.put('/notifications/history/mark-all-read', verifyToken, markAllNotificationsAsRead);
router.put("/notifications/history/:id/read", verifyToken, markNotificationAsRead);
router.put("/notifications/history/:id/dismiss", verifyToken, dismissNotification);
router.delete("/notifications/history/clear", verifyToken, clearReadNotifications);
router.delete("/notifications/history/:id", verifyToken, deleteNotification);


// router.get("/device/:applianceKey/current", verifyToken, getDeviceCurrentData);
// Add this route
router.get(
  "/user/device/:applianceKey/daily-breakdown",
  verifyToken,
  getDeviceDailyBreakdown
);

router.get('/test-schema', verifyToken, async (req, res) => {
  try {
    const NotificationHistory = require('../model/notification-history-model');
    const schema = NotificationHistory.schema.obj;
    
    res.json({
      success: true,
      schema: {
        applianceKey: schema.applianceKey,
        notification: schema.notification,
        recommendations: schema.notification.recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/user/device/add', verifyToken, addDevice);

module.exports = router;
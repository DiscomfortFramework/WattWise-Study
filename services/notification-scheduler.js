// /**
//  * =========================================================
//  * NOTIFICATION SCHEDULER
//  * =========================================================
//  * 
//  * This service:
//  *  - Runs cron jobs to periodically analyze device usage
//  *  - Generates energy optimization notifications
//  *  - Sends push notifications (Expo)
//  *  - Prevents duplicate or spam notifications
//  */

// const cron = require('node-cron');
// const User = require('../model/user-model');
// const NotificationHistory = require('../model/notification-history-model');
// const EnergyCalculator = require('./energy-calculator');
// const PushNotificationService = require('./push-notification-services');

// class NotificationScheduler {

//   /**
//    * ---------------------------------------------------------
//    * START CRON SCHEDULERS
//    * ---------------------------------------------------------
//    * 1️⃣ Every hour → normal notifications
//    * 2️⃣ Every 30 mins during peak hours (4–7pm) → high priority
//    */
//   static startScheduler(influxClient) {
//     console.log('📅 Notification scheduler started - checking every hour');

//     // Run at the top of every hour
//     cron.schedule('0 * * * *', async () => {
//       console.log('⏰ Running scheduled notification check...');
//       await this.checkAndSendNotifications(influxClient);
//     });

//     // Peak-time check (every 30 minutes between 4pm–7pm)
//     cron.schedule('*/30 16-19 * * *', async () => {
//       console.log('⏰ Running peak-time notification check...');
//       await this.checkAndSendNotifications(influxClient, true);
//     });
//   }

//   /**
//    * ---------------------------------------------------------
//    * FETCH USERS & PROCESS NOTIFICATIONS
//    * ---------------------------------------------------------
//    * @param onlyHighPriority - limits notifications during peak hours
//    */
//   static async checkAndSendNotifications(influxClient, onlyHighPriority = false) {
//     try {
//       // Fetch users who can receive notifications
//       const users = await User.find({
//         pushToken: { $exists: true, $ne: null },
//         notificationsEnabled: true
//       }).select('_id email pushToken devices rooms');

//       console.log(`Found ${users.length} users with notifications enabled`);

//       // Process users one by one (isolated error handling)
//       for (const user of users) {
//         try {
//           await this.sendNotificationsForUser(user, influxClient, onlyHighPriority);
//         } catch (error) {
//           console.error(`Error sending notifications for user ${user.email}:`, error.message);
//         }
//       }
//     } catch (error) {
//       console.error('Error in notification scheduler:', error);
//     }
//   }

//   /**
//    * ---------------------------------------------------------
//    * SEND NOTIFICATIONS FOR A SINGLE USER
//    * ---------------------------------------------------------
//    * Handles:
//    *  - deduplication (24h window)
//    *  - room condition fetching
//    *  - device usage analysis
//    *  - push notification delivery
//    */
//   static async sendNotificationsForUser(user, influxClient, onlyHighPriority = false) {

//     /**
//      * ---------------------------------------
//      * DUPLICATE CHECK (LAST 24 HOURS)
//      * ---------------------------------------
//      */
//     const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

//     const recentlySent = await NotificationHistory.find({
//       userId: user._id,
//       sentViaExpo: true,
//       createdAt: { $gte: last24Hours }
//     }).select('deviceId notification.type notification.title createdAt');

//     // Map: deviceId-type-title → lastSentTime
//     const sentNotifications = new Map();
//     recentlySent.forEach(n => {
//       const key = `${n.deviceId}-${n.notification.type}-${n.notification.title}`;
//       if (!sentNotifications.has(key) || n.createdAt > sentNotifications.get(key)) {
//         sentNotifications.set(key, n.createdAt);
//       }
//     });

//     console.log(`📊 User ${user.email} - ${sentNotifications.size} unique notifications in last 24h`);

//     /**
//      * ---------------------------------------
//      * FETCH ROOM ENVIRONMENTAL CONDITIONS
//      * ---------------------------------------
//      */
//     const roomConditions = {};

//     for (const room of user.rooms) {
//       try {
//         const sensorBase = room.entityId;

//         // Fetch temperature & humidity in parallel
//         const [humidityData, temperatureData] = await Promise.all([
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
//           `)
//         ]);

//         if (humidityData.length && temperatureData.length) {
//           roomConditions[room.name] = {
//             temperature: temperatureData[0].value,
//             humidity: humidityData[0].value,
//             pressure: 101.3 // default atmospheric pressure
//           };
//         }
//       } catch (error) {
//         console.error(`Error fetching room conditions for ${room.name}:`, error.message);
//       }
//     }

//     // Abort if no room data exists
//     if (Object.keys(roomConditions).length === 0) {
//       console.log(`⚠️ No room conditions available for user ${user.email}`);
//       return;
//     }

//     /**
//      * ---------------------------------------
//      * PROCESS EACH DEVICE
//      * ---------------------------------------
//      */
//     for (const device of user.devices) {
//       try {
//         const conditions =
//           roomConditions[device.location] ||
//           Object.values(roomConditions)[0];

//         // Fetch usage data from InfluxDB
//         const usageData = await this.getDeviceUsageData(influxClient, device);

//         // Skip unused devices
//         if (usageData.N === 0 && usageData.dailyEAEC === 0) {
//           console.log(`⏭️ [${device.name}] Not used today - skipping`);
//           continue;
//         }

//         // Calculate optimization & efficiency
//         const optimization = EnergyCalculator.calculateOptimization(
//           device.applianceKey,
//           conditions.temperature,
//           conditions.humidity,
//           conditions.pressure,
//           usageData
//         );

//         // Generate final notification payload
//         const notification = EnergyCalculator.generateNotification(
//           device.applianceKey,
//           optimization
//         );

//         /**
//          * ---------------------------------------
//          * DUPLICATE CHECK (12 HOURS PER DEVICE)
//          * ---------------------------------------
//          */
//         const notificationKey = `${device._id}-${notification.type}-${notification.title}`;
//         const lastSentTime = sentNotifications.get(notificationKey);

//         if (lastSentTime) {
//           const hoursAgo = (Date.now() - lastSentTime.getTime()) / 36e5;
//           if (hoursAgo < 12) {
//             console.log(`⏭️ [${device.name}] Duplicate notification (${hoursAgo.toFixed(1)}h ago)`);
//             continue;
//           }
//         }

//         /**
//          * ---------------------------------------
//          * SAVE TO NOTIFICATION HISTORY
//          * ---------------------------------------
//          */
//         let historyEntry = null;
//         if (notification.type !== 'none') {
//           historyEntry = await this.saveNotificationHistory(
//             user._id,
//             device._id.toString(),
//             device.applianceKey,
//             device.name,
//             optimization,
//             notification,
//             usageData,
//             conditions
//           );

//           if (!historyEntry) continue;
//         }

//         /**
//          * ---------------------------------------
//          * SEND PUSH NOTIFICATION
//          * ---------------------------------------
//          */
//         const shouldSend = onlyHighPriority
//           ? (notification.priority === 'high' || notification.type === 'critical')
//           : ['high', 'critical', 'opportunity'].includes(notification.priority || notification.type);

//         if (shouldSend && historyEntry) {
//           const response = await PushNotificationService.sendPushNotification(
//             user.pushToken,
//             notification.title,
//             notification.message,
//             {
//               type: notification.type,
//               applianceKey: device.applianceKey,
//               deviceName: device.name,
//               priority: notification.priority,
//               historyId: historyEntry._id.toString()
//             }
//           );

//           // Mark notification as sent
//           if (response?.id) {
//             await NotificationHistory.findByIdAndUpdate(historyEntry._id, {
//               sentViaExpo: true,
//               expoReceiptId: response.id,
//               sentAt: new Date()
//             });
//             sentNotifications.set(notificationKey, new Date());
//           }
//         }

//       } catch (error) {
//         console.error(`Error processing device ${device.name}:`, error.message);
//       }
//     }
//   }

//   /**
//    * ---------------------------------------------------------
//    * SAVE NOTIFICATION HISTORY (WITH DEDUPLICATION)
//    * ---------------------------------------------------------
//    */
//   static async saveNotificationHistory(
//     userId,
//     deviceId,
//     applianceKey,
//     deviceName,
//     optimization,
//     notification,
//     usageData,
//     conditions
//   ) {
//     try {
//       // Prevent similar notifications within last 12 hours
//       const last12Hours = new Date(Date.now() - 12 * 60 * 60 * 1000);

//       const recent = await NotificationHistory.findOne({
//         userId,
//         deviceId,
//         'notification.type': notification.type,
//         applianceKey,
//         createdAt: { $gte: last12Hours }
//       });

//       if (recent) return null;

//       // Persist history entry
//       const historyEntry = new NotificationHistory({
//         userId,
//         deviceId,
//         applianceKey,
//         deviceName,
//         notification,
//         optimization,
//         conditions,
//         usageData
//       });

//       await historyEntry.save();
//       return historyEntry;

//     } catch (error) {
//       console.error('❌ Save failed:', error.message);
//       return null;
//     }
//   }

//   /**
//    * ---------------------------------------------------------
//    * DEVICE USAGE DATA ANALYSIS (INFLUXDB)
//    * ---------------------------------------------------------
//    * Extremely detailed logic to:
//    *  - detect power cycles
//    *  - group multi-phase appliances
//    *  - calculate kWh via integration
//    */
//   static async getDeviceUsageData(influxClient, device) {
//     // (Your existing logic is preserved – comments already inline)
//   }

//   /**
//    * ---------------------------------------------------------
//    * PEAK TIME CHECK (UK)
//    * ---------------------------------------------------------
//    */
//   static isPeakTime() {
//     const hour = parseInt(
//       new Date().toLocaleString('en-GB', {
//         timeZone: 'Europe/London',
//         hour: 'numeric',
//         hour12: false
//       })
//     );
//     return hour >= 7 && hour < 19;
//   }
// }

// module.exports = NotificationScheduler;


const cron = require('node-cron');
const User = require('../model/user-model');
const NotificationHistory = require('../model/notification-history-model');
const EnergyCalculator = require('./energy-calculator');
const PushNotificationService = require('./push-notification-services');

class NotificationScheduler {

  static startScheduler(influxClient) {
    console.log('📅 Notification scheduler started - checking every hour');

    // Run every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running scheduled notification check...');
      await this.checkAndSendNotifications(influxClient);
    });

    // ✅ Peak times check every 30 minutes (4pm-7pm)
    cron.schedule('*/30 16-19 * * *', async () => {
      console.log('⏰ Running peak-time notification check...');
      await this.checkAndSendNotifications(influxClient, true);
    });
  }

  static async checkAndSendNotifications(influxClient, onlyHighPriority = false) {
    try {
      const users = await User.find({
        pushToken: { $exists: true, $ne: null },
        notificationsEnabled: true
      }).select('_id email pushToken devices rooms');

      console.log(`Found ${users.length} users with notifications enabled`);

      for (const user of users) {
        try {
          await this.sendNotificationsForUser(user, influxClient, onlyHighPriority);
        } catch (error) {
          console.error(`Error sending notifications for user ${user.email}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in notification scheduler:', error);
    }
  }

  static async sendNotificationsForUser(user, influxClient, onlyHighPriority = false) {
    // ✅ Check what's been sent in the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentlySent = await NotificationHistory.find({
      userId: user._id,
      sentViaExpo: true,
      createdAt: { $gte: last24Hours }
    }).select('deviceId notification.type notification.title createdAt');

    // ✅ Create a map: "deviceId-type-title" -> last sent time
    const sentNotifications = new Map();
    recentlySent.forEach(n => {
      const key = `${n.deviceId}-${n.notification.type}-${n.notification.title}`;
      const existingTime = sentNotifications.get(key);
      if (!existingTime || n.createdAt > existingTime) {
        sentNotifications.set(key, n.createdAt);
      }
    });

    console.log(`📊 User ${user.email} - ${sentNotifications.size} unique notifications in last 24h`);

    // Get room conditions
    const roomConditions = {};

    for (const room of user.rooms) {
      try {
        const sensorBase = room.entityId;

        const [humidityData, temperatureData] = await Promise.all([
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
        `)
        ]);

        if (humidityData.length > 0 && temperatureData.length > 0) {
          roomConditions[room.name] = {
            temperature: temperatureData[0].value,
            humidity: humidityData[0].value,
            pressure: 101.3
          };
        }
      } catch (error) {
        console.error(`Error fetching room conditions for ${room.name}:`, error.message);
        continue;
      }
    }

    if (Object.keys(roomConditions).length === 0) {
      console.log(`⚠️ No room conditions available for user ${user.email}`);
      return;
    }

    // Check each device
    for (const device of user.devices) {
      try {
        const conditions = roomConditions[device.location] || Object.values(roomConditions)[0];

        // Get usage data
        const usageData = await this.getDeviceUsageData(influxClient, device);

        console.log(`📊 [${device.name}] N=${usageData.N}, eaec=${usageData.eaec.toFixed(3)} kWh, dailyEAEC=${usageData.dailyEAEC.toFixed(3)} kWh`);

        // ✅ Skip if device wasn't used today
        if (usageData.N === 0 && usageData.dailyEAEC === 0) {
          console.log(`⏭️ [${device.name}] Not used today - skipping notification`);
          continue;
        }

        // Calculate optimization
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

        // ✅ Check if this EXACT notification was recently sent
        const notificationKey = `${device._id.toString()}-${notification.type}-${notification.title}`;
        const lastSentTime = sentNotifications.get(notificationKey);

        if (lastSentTime) {
          const hoursSinceLastSent = (Date.now() - lastSentTime.getTime()) / (1000 * 60 * 60);

          // Don't send same notification within 12 hours
          if (hoursSinceLastSent < 12) {
            console.log(`⏭️ [${device.name}] Same notification "${notification.title}" sent ${hoursSinceLastSent.toFixed(1)}h ago - skipping`);
            continue;
          }
        }

        // ✅ SAVE TO HISTORY FIRST (with duplicate check)
        let historyEntry = null;
        if (notification.type !== 'none') {
          historyEntry = await this.saveNotificationHistory(
            user._id,
            device._id.toString(),
            device.applianceKey,
            device.name,
            optimization,
            notification,
            usageData,
            conditions
          );

          if (!historyEntry) {
            console.log(`⏭️ [${device.name}] Duplicate notification detected - skipping push`);
            continue;
          }
        }

        // Determine if we should send push notification
        const shouldSend = onlyHighPriority
          ? (notification.priority === 'high' || notification.type === 'critical')
          : (notification.priority === 'high' || notification.type === 'critical' || notification.type === 'opportunity');

        if (shouldSend && historyEntry) {
          try {
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

            // ✅ Mark as sent with timestamp
            if (pushResponse && pushResponse.id) {
              await NotificationHistory.findByIdAndUpdate(historyEntry._id, {
                sentViaExpo: true,
                expoReceiptId: pushResponse.id,
                sentAt: new Date()
              });

              // Update our map so we don't send again soon
              sentNotifications.set(notificationKey, new Date());
            }

            console.log(`✅ Notification sent to ${user.email} for ${device.name}`);
          } catch (error) {
            console.error(`❌ Failed to send push notification:`, error.message);
          }
        } else {
          console.log(`⏭️ [${device.name}] Skipped sending - priority too low or no history entry`);
        }

      } catch (error) {
        console.error(`Error processing device ${device.name}:`, error.message);
      }
    }
  }

  static async saveNotificationHistory(userId, deviceId, applianceKey, deviceName, optimization, notification, usageData, conditions) {
    try {
      // ✅ Check for similar notifications in last 12 hours
      const last12Hours = new Date(Date.now() - 12 * 60 * 60 * 1000);

      const recentSimilar = await NotificationHistory.findOne({
        userId,
        deviceId,
        'notification.type': notification.type,
        'notification.priority': notification.priority,
        applianceKey: applianceKey,
        createdAt: { $gte: last12Hours }
      }).sort({ createdAt: -1 });

      if (recentSimilar) {
        const hoursSince = (Date.now() - recentSimilar.createdAt.getTime()) / (1000 * 60 * 60);

        // Check if the message content is similar
        const isSimilarContent =
          recentSimilar.notification.message &&
          notification.message &&
          recentSimilar.notification.message.substring(0, 50) === notification.message.substring(0, 50);

        if (isSimilarContent && hoursSince < 12) {
          console.log(`⏭️ [${deviceName}] Similar notification found (${hoursSince.toFixed(1)}h ago) - skipping`);
          return null;
        }
      }

      const getUKEnergyRate = () => {
        return 26.83 / 100;  // £0.22681 per kWh
      };

      let recommendationsArray = [];
      if (notification.recommendations) {
        if (Array.isArray(notification.recommendations)) {
          recommendationsArray = notification.recommendations;
        } else if (typeof notification.recommendations === 'string') {
          try {
            recommendationsArray = JSON.parse(notification.recommendations);
          } catch (e) {
            console.error('⚠️ Failed to parse recommendations string:', e.message);
            recommendationsArray = [];
          }
        }
      }

      const cleanedRecommendations = recommendationsArray.map(rec => ({
        type: String(rec.type || ''),
        title: String(rec.title || ''),
        message: String(rec.message || ''),
        potentialSavings: Number(rec.potentialSavings || 0),
        priority: String(rec.priority || 'low')
      }));

      const historyEntry = new NotificationHistory({
        userId,
        deviceId,
        applianceKey,
        deviceName,
        notification: {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          action: notification.action,
          actionButton: notification.actionButton,
          actionHint: notification.actionHint,
          alerts: Array.isArray(notification.alerts) ? notification.alerts : [],
          recommendations: cleanedRecommendations
        },
        optimization: {
          applianceKey: optimization.applianceKey,
          baseEnergy: optimization.baseEnergy,
          adjustedEnergy: optimization.adjustedEnergy,
          efficiencyLoss: optimization.efficiencyLoss,
          efficiency: optimization.efficiency,
          potentialSavings: optimization.potentialSavings,
          efficiencyScore: Math.round(optimization.efficiency),
          estimatedCost: parseFloat((optimization.adjustedEnergy * getUKEnergyRate()).toFixed(2)),
          factors: optimization.factors
        },
        conditions: {
          temperature: conditions.temperature,
          humidity: conditions.humidity,
          pressure: conditions.pressure
        },
        usageData: {
          eaec: usageData.eaec || 0,
          dailyEAEC: usageData.dailyEAEC || 0,
          N: usageData.N || 0,
          duration: usageData.duration || 0
        }
      });

      await historyEntry.save();
      console.log(`💾 Saved new notification: ${notification.title}`);
      return historyEntry;

    } catch (error) {
      console.error('❌ Save failed:', error.message);
      return null;
    }
  }

  static async getDeviceUsageData(influxClient, device) {
    try {
      // ✅✅✅ CRITICAL FIX: Correct UK timezone date calculation
      const now = new Date();
      
      // Get UK time using proper timezone conversion
      const ukTimeString = now.toLocaleString('en-US', { 
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Parse the UK time string properly
      const [datePart, timePart] = ukTimeString.split(', ');
      const [month, day, year] = datePart.split('/');
      const [hour, minute, second] = timePart.split(':');
      
      // Create UK date at midnight today
      const dayStart = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        0, 0, 0, 0
      ));
      
      // Adjust for UK timezone offset
      const ukOffset = now.toLocaleString('en-US', { 
        timeZone: 'Europe/London', 
        timeZoneName: 'short' 
      }).includes('GMT') ? 0 : -1;
      
      dayStart.setHours(dayStart.getHours() - ukOffset);
      
      console.log(`🕐 [${device.name}] UK now: ${ukTimeString}`);
      console.log(`🕐 [${device.name}] Query start: ${dayStart.toISOString()} (UK midnight today)`);

      // ✅ ADAPTIVE THRESHOLDS: Use lower thresholds for appliances with variable power
      const POWER_THRESHOLDS = {
        dryer: 500,
        kettle: 1500,
        microwave: 600,
        coffeemachine: 800,
        airfryer: 1000,
        toaster: 700,
        dishwasher: 1200,
        washingmachine: 100,     // ✅ LOWERED: 300→100W (catches filling/draining phases)
        washing_machine: 100,    // ✅ LOWERED: 300→100W
        cooker: 400
      };

      const threshold = POWER_THRESHOLDS[device.applianceKey] || 100;

      // ✅ LOWER MINIMUM DURATIONS for appliances with multi-phase cycles
      const MIN_CYCLE_DURATION_SECONDS = {
        kettle: 60,
        toaster: 30,
        microwave: 30,
        coffeemachine: 120,
        airfryer: 300,
        dryer: 600,              // ✅ LOWERED: 1200→600s (10 min)
        dishwasher: 900,         // ✅ LOWERED: 1800→900s (15 min)
        washingmachine: 300,     // ✅ LOWERED: 1200→300s (5 min per phase)
        washing_machine: 300,
        cooker: 300              // ✅ LOWERED: 600→300s (5 min)
      };

      const minCycleDuration = MIN_CYCLE_DURATION_SECONDS[device.applianceKey] || 60;

      // Get all power readings for today
      const powerData = await influxClient.query(`
        SELECT value, time
        FROM "W"
        WHERE entity_id = '${device.powerEntityId}'
        AND time >= '${dayStart.toISOString()}'
        ORDER BY time ASC
      `);

      console.log(`🔍 [${device.name}] Found ${powerData.length} power readings since UK midnight`);

      if (powerData.length === 0) {
        return {
          eaec: 0,
          dailyEAEC: 0,
          N: 0,
          duration: 0,
          shortUseCount: 0,
          isPeakTime: this.isPeakTime()
        };
      }

      // ✅✅ IMPROVED: Track continuous high-power periods with gap tolerance
      let usageCount = 0;
      let isDeviceOn = false;
      let cycleStartTime = null;
      let cycleStartIndex = 0;
      let lastHighPowerTime = null;
      const cycleEnergies = [];
      const cycleDurations = [];
      
      // ✅ Allow power gaps during cycles (washing machines have filling/draining phases)
      const MAX_GAP_SECONDS = ['washingmachine', 'washing_machine', 'dishwasher'].includes(device.applianceKey)
        ? 300  // 5 minutes for multi-phase appliances
        : 120; // 2 minutes for others

      for (let i = 0; i < powerData.length; i++) {
        const currentPower = powerData[i].value;
        const currentTime = new Date(powerData[i].time);

        // Device is using significant power
        if (currentPower > threshold) {
          
          // Start new cycle if device was previously off
          if (!isDeviceOn) {
            isDeviceOn = true;
            cycleStartTime = currentTime;
            cycleStartIndex = i;
            lastHighPowerTime = currentTime;
            console.log(`🟢 [${device.name}] Cycle started at ${currentTime.toISOString()} (${currentPower}W)`);
          } else {
            // Update last high power time (cycle is continuing)
            lastHighPowerTime = currentTime;
          }
        }
        
        // Device power is low
        else if (currentPower <= threshold && isDeviceOn) {
          
          // Check if this is just a brief dip or actual cycle end
          const gapSeconds = (currentTime - lastHighPowerTime) / 1000;
          
          // Look ahead to see if power comes back up soon
          let powerReturns = false;
          for (let j = i + 1; j < Math.min(i + 30, powerData.length); j++) {
            const futureTime = new Date(powerData[j].time);
            const futureGap = (futureTime - currentTime) / 1000;
            
            if (futureGap > MAX_GAP_SECONDS) break; // Too far ahead
            
            if (powerData[j].value > threshold) {
              powerReturns = true;
              console.log(`   💡 [${device.name}] Power dip at ${currentTime.toISOString()} (${currentPower}W) - but returns at ${futureTime.toISOString()}`);
              break;
            }
          }
          
          // If power doesn't return, this is the end of the cycle
          if (!powerReturns) {
            const cycleEndTime = currentTime;
            const cycleDurationSeconds = (cycleEndTime - cycleStartTime) / 1000;

            // Only count as a cycle if duration exceeds minimum
            if (cycleDurationSeconds >= minCycleDuration) {
              usageCount++;
              const cycleDurationMinutes = cycleDurationSeconds / 60;
              cycleDurations.push(cycleDurationMinutes);

              // Calculate energy using trapezoidal integration
              let cycleEnergy = 0;
              for (let j = cycleStartIndex; j < i; j++) {
                const p1 = powerData[j].value;
                const p2 = powerData[j + 1]?.value || p1;
                const t1 = new Date(powerData[j].time);
                const t2 = new Date(powerData[j + 1]?.time || t1);

                const timeDiffHours = (t2 - t1) / (1000 * 60 * 60);
                const avgPower = (p1 + p2) / 2;
                cycleEnergy += (avgPower * timeDiffHours) / 1000; // kWh
              }

              cycleEnergies.push(cycleEnergy);

              console.log(`🏁 [${device.name}] Cycle #${usageCount} completed:`);
              console.log(`   Duration: ${cycleDurationMinutes.toFixed(1)} min`);
              console.log(`   Energy used: ${cycleEnergy.toFixed(3)} kWh`);
              console.log(`   Start: ${cycleStartTime.toISOString()}`);
              console.log(`   End: ${cycleEndTime.toISOString()}`);
            } else {
              console.log(`⏭️ [${device.name}] Ignoring short usage (${(cycleDurationSeconds/60).toFixed(1)} min < ${minCycleDuration/60} min minimum)`);
            }

            isDeviceOn = false;
            cycleStartTime = null;
            lastHighPowerTime = null;
          }
        }
      }

      // ✅ Handle case where device is still running at end of data
      if (isDeviceOn && cycleStartTime) {
        const now = new Date();
        const cycleDurationSeconds = (now - cycleStartTime) / 1000;

        if (cycleDurationSeconds >= minCycleDuration) {
          usageCount++;
          const cycleDurationMinutes = cycleDurationSeconds / 60;
          cycleDurations.push(cycleDurationMinutes);

          // Calculate partial cycle energy
          let cycleEnergy = 0;
          for (let j = cycleStartIndex; j < powerData.length; j++) {
            const p1 = powerData[j].value;
            const p2 = powerData[j + 1]?.value || p1;
            const t1 = new Date(powerData[j].time);
            const t2 = new Date(powerData[j + 1]?.time || new Date());

            const timeDiffHours = (t2 - t1) / (1000 * 60 * 60);
            const avgPower = (p1 + p2) / 2;
            cycleEnergy += (avgPower * timeDiffHours) / 1000;
          }

          cycleEnergies.push(cycleEnergy);
          console.log(`🔄 [${device.name}] Cycle #${usageCount} still running (partial: ${cycleDurationMinutes.toFixed(1)} min, ${cycleEnergy.toFixed(3)} kWh)`);
        }
      }

      // Calculate summary statistics
      const lastCycleEnergy = cycleEnergies.length > 0
        ? cycleEnergies[cycleEnergies.length - 1]
        : 0;

      const dailyTotalEnergy = cycleEnergies.reduce((sum, e) => sum + e, 0);

      const avgDuration = cycleDurations.length > 0
        ? cycleDurations.reduce((sum, d) => sum + d, 0) / cycleDurations.length
        : 0;

      // Count short uses (for microwave - less than 2 minutes)
      const shortUseCount = cycleDurations.filter(d => d < 2).length;

      console.log(`📊 [${device.name}] FINAL SUMMARY:`);
      console.log(`   ✓ Raw cycles detected: ${usageCount}`);
      console.log(`   ✓ Raw total energy: ${dailyTotalEnergy.toFixed(3)} kWh`);

      // ✅✅ CRITICAL: Group cycles that are close together (washing machines have multiple phases)
      if (['washingmachine', 'washing_machine', 'dishwasher'].includes(device.applianceKey)) {
        
        // Group cycles within 30 minutes of each other
        const groupedCycles = [];
        let currentGroup = null;
        
        // Sort cycle data by start time (we need to track this)
        const cycleData = cycleEnergies.map((energy, i) => ({
          energy,
          duration: cycleDurations[i],
          // Approximate start time based on average duration
          startTime: new Date(powerData[0].time).getTime() + (i * avgDuration * 60 * 1000)
        }));
        
        cycleData.forEach((cycle, i) => {
          if (!currentGroup) {
            currentGroup = { ...cycle };
          } else {
            const gapMinutes = (cycle.startTime - currentGroup.startTime - currentGroup.duration * 60 * 1000) / (60 * 1000);
            
            if (gapMinutes < 30) {
              // Merge into current group
              currentGroup.energy += cycle.energy;
              currentGroup.duration += cycle.duration;
              console.log(`   🔗 Merging cycle ${i + 1} into group (gap: ${gapMinutes.toFixed(1)} min)`);
            } else {
              // Save current group and start new one
              groupedCycles.push(currentGroup);
              currentGroup = { ...cycle };
            }
          }
        });
        
        if (currentGroup) {
          groupedCycles.push(currentGroup);
        }
        
        if (groupedCycles.length > 0 && groupedCycles.length < usageCount) {
          console.log(`   ✅ Grouped ${usageCount} phases into ${groupedCycles.length} complete wash cycle(s)`);
          
          // Update statistics with grouped data
          usageCount = groupedCycles.length;
          cycleEnergies.length = 0;
          cycleDurations.length = 0;
          
          groupedCycles.forEach(group => {
            cycleEnergies.push(group.energy);
            cycleDurations.push(group.duration);
          });
          
          const lastCycleEnergyNew = cycleEnergies[cycleEnergies.length - 1];
          const avgDurationNew = cycleDurations.reduce((sum, d) => sum + d, 0) / cycleDurations.length;
          
          console.log(`   ✅ Adjusted N: ${usageCount}`);
          console.log(`   ✅ Last complete cycle: ${lastCycleEnergyNew.toFixed(3)} kWh`);
          console.log(`   ✅ Avg cycle duration: ${avgDurationNew.toFixed(1)} min`);
        }
      }
      
      console.log(`📊 [${device.name}] FINAL ADJUSTED:`);
      console.log(`   ✓ Usage cycles (N): ${usageCount}`);
      console.log(`   ✓ Last cycle energy (eaec): ${lastCycleEnergy.toFixed(3)} kWh`);
      console.log(`   ✓ Daily total (dailyEAEC): ${dailyTotalEnergy.toFixed(3)} kWh`);
      console.log(`   ✓ Avg duration: ${avgDuration.toFixed(1)} min`);

      return {
        eaec: lastCycleEnergy,
        dailyEAEC: dailyTotalEnergy,
        N: usageCount,
        duration: Math.round(avgDuration),
        shortUseCount: shortUseCount,
        isPeakTime: this.isPeakTime()
      };

    } catch (error) {
      console.error(`❌ Error fetching usage data for ${device.name}:`, error.message);
      return {
        eaec: 0,
        dailyEAEC: 0,
        N: 0,
        duration: 0,
        shortUseCount: 0,
        isPeakTime: false
      };
    }
  }

  static isPeakTime() {
    const ukTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(ukTime);
    return hour >= 7 && hour < 19;  // 7am-7pm (peak hours in UK)
  }
}

module.exports = NotificationScheduler;
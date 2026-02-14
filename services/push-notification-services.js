// const axios = require('axios');

// /**
//  * =========================================================
//  * PUSH NOTIFICATION SERVICE
//  * =========================================================
//  * 
//  * Responsible for:
//  *  - Sending push notifications via Expo Push API
//  *  - Preventing notification stacking on Android
//  *  - Supporting single & bulk notifications
//  *  - Attaching metadata for in-app navigation
//  */

// class PushNotificationService {

//   /**
//    * ---------------------------------------------------------
//    * SEND SINGLE PUSH NOTIFICATION
//    * ---------------------------------------------------------
//    * Uses Expo Push API
//    * 
//    * 🔑 Key design decisions:
//    * - Unique notificationId → prevents Expo/OS deduplication
//    * - Android "tag" → prevents stacking/replacing issues
//    * - Separate channels for alerts vs opportunities
//    * 
//    * @param pushToken Expo push token of the user
//    * @param title Notification title
//    * @param body Notification body text
//    * @param data Extra metadata for app navigation
//    */
//   static async sendPushNotification(pushToken, title, body, data = {}) {

//     /**
//      * Build Expo-compatible notification payload
//      */
//     const message = {
//       to: pushToken,

//       // Default system sound
//       sound: 'default',

//       // Notification content
//       title: title,
//       body: body,

//       /**
//        * Custom data payload
//        * - Used by the mobile app to route screens
//        * - notificationId ensures uniqueness across sends
//        */
//       data: {
//         ...data,
//         notificationId: `${data.applianceKey}-${Date.now()}` // ✅ Unique per notification
//       },

//       // High priority ensures timely delivery
//       priority: 'high',

//       /**
//        * Notification channel (Android)
//        * Allows user-level control in system settings
//        */
//       channelId: data.priority === 'high'
//         ? 'energy-alerts'
//         : 'energy-opportunities',

//       /**
//        * ANDROID-SPECIFIC SETTINGS
//        * -----------------------------------------------------
//        * ❗ tag is CRITICAL:
//        * - If tags are same → notifications overwrite
//        * - If tags are unique → notifications stack correctly
//        */
//       android: {
//         channelId: data.priority === 'high'
//           ? 'energy-alerts'
//           : 'energy-opportunities',
//         priority: 'high',
//         tag: `${data.applianceKey}-${Date.now()}` // ✅ Unique tag prevents stacking bug
//       },

//       /**
//        * iOS-specific configuration
//        * Allows showing notification while app is foregrounded
//        */
//       ios: {
//         _displayInForeground: true
//       }
//     };

//     try {
//       /**
//        * Send notification via Expo Push API
//        */
//       const response = await axios.post(
//         'https://exp.host/--/api/v2/push/send',
//         message,
//         {
//           headers: {
//             'Accept': 'application/json',
//             'Accept-encoding': 'gzip, deflate',
//             'Content-Type': 'application/json',
//           }
//         }
//       );

//       console.log('✅ Push notification sent:', response.data);
//       return response.data;

//     } catch (error) {
//       console.error('❌ Error sending push notification:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * ---------------------------------------------------------
//    * SEND BULK PUSH NOTIFICATIONS
//    * ---------------------------------------------------------
//    * Used when multiple users must be notified at once
//    * Expo supports sending an array of messages
//    */
//   static async sendBulkNotifications(notifications) {

//     /**
//      * Convert input array to Expo-compatible payload
//      */
//     const messages = notifications.map(notif => ({
//       to: notif.pushToken,
//       sound: 'default',
//       title: notif.title,
//       body: notif.body,

//       // Metadata payload
//       data: {
//         ...(notif.data || {}),
//         notificationId: `${notif.data?.applianceKey || 'bulk'}-${Date.now()}`
//       },

//       priority: 'high',

//       /**
//        * Android tag still required in bulk sends
//        */
//       android: {
//         tag: `${notif.data?.applianceKey || 'bulk'}-${Date.now()}`
//       }
//     }));

//     try {
//       const response = await axios.post(
//         'https://exp.host/--/api/v2/push/send',
//         messages,
//         {
//           headers: {
//             'Accept': 'application/json',
//             'Accept-encoding': 'gzip, deflate',
//             'Content-Type': 'application/json',
//           }
//         }
//       );

//       console.log(`✅ Bulk notifications sent: ${notifications.length}`);
//       return response.data;

//     } catch (error) {
//       console.error('❌ Error sending bulk notifications:', error.message);
//       throw error;
//     }
//   }

//   /**
//    * ---------------------------------------------------------
//    * FORMAT NOTIFICATION PAYLOAD
//    * ---------------------------------------------------------
//    * Helper method to normalize notification structure
//    * before sending
//    */
//   static formatNotification(notificationData) {
//     const { type, title, message, applianceKey, priority } = notificationData;

//     return {
//       title: title,
//       body: message,
//       data: {
//         type: type,
//         applianceKey: applianceKey,
//         priority: priority,

//         // Used by mobile app for navigation
//         screen: 'DeviceDetails',

//         // Ensures uniqueness
//         notificationId: `${applianceKey}-${Date.now()}`
//       }
//     };
//   }
// }

// module.exports = PushNotificationService;

const axios = require('axios');

class PushNotificationService {
  
  /**
   * Send push notification via Expo Push API
   * ✅ SOLUTION 1: Added unique notification IDs to prevent stacking
   */
  static async sendPushNotification(pushToken, title, body, data = {}) {
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: {
        ...data,
        notificationId: `${data.applianceKey}-${Date.now()}` // ✅ Unique ID
      },
      priority: 'high',
      channelId: data.priority === 'high' ? 'energy-alerts' : 'energy-opportunities',
      // ✅ CRITICAL: Android tag prevents notifications from stacking
      android: {
        channelId: data.priority === 'high' ? 'energy-alerts' : 'energy-opportunities',
        priority: 'high',
        tag: `${data.applianceKey}-${Date.now()}` // Each notification gets unique tag
      },
      ios: {
        _displayInForeground: true
      }
    };

    try {
      const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      });

      console.log('✅ Push notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending push notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulkNotifications(notifications) {
    const messages = notifications.map(notif => ({
      to: notif.pushToken,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: {
        ...(notif.data || {}),
        notificationId: `${notif.data?.applianceKey || 'bulk'}-${Date.now()}`
      },
      priority: 'high',
      android: {
        tag: `${notif.data?.applianceKey || 'bulk'}-${Date.now()}`
      }
    }));

    try {
      const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      });

      console.log(`✅ Bulk notifications sent: ${notifications.length}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error.message);
      throw error;
    }
  }

  /**
   * Format notification based on type
   */
  static formatNotification(notificationData) {
    const { type, title, message, applianceKey, priority } = notificationData;

    return {
      title: title,
      body: message,
      data: {
        type: type,
        applianceKey: applianceKey,
        priority: priority,
        screen: 'DeviceDetails',
        notificationId: `${applianceKey}-${Date.now()}`
      }
    };
  }
}

module.exports = PushNotificationService;
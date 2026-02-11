// Import mongoose ODM
const mongoose = require("mongoose");

// Create a shortcut reference to mongoose.Schema
const Schema = mongoose.Schema;

/**
 * NotificationHistory Schema
 * ---------------------------
 * Stores all notifications sent to users, including
 * device/appliance context, notification content,
 * optimization data, and delivery status.
 */
const notificationHistorySchema = new Schema({

  /**
   * Reference to the user who received the notification
   */
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Improves queries filtered by user
  },

  /**
   * Unique identifier of the physical device
   */
  deviceId: {
    type: String,
    required: true
  },

  /**
   * Appliance identifier
   * Restricted to known supported appliance types
   */
  applianceKey: {
    type: String,
    required: true,
    enum: [
      'dryer',
      'kettle',
      'microwave',
      'coffeemachine',
      'airfryer',
      'toaster',
      'dishwasher',
      'washingmachine',
      'washing_machine', // legacy / alternate naming
      'cooker'
    ]
  },

  /**
   * User-friendly name of the device
   */
  deviceName: {
    type: String,
    required: true
  },

  /**
   * Notification payload displayed to the user
   */
  notification: {
    title: String,
    message: String,

    /**
     * Notification category
     */
    type: {
      type: String,
      enum: ['critical', 'opportunity', 'info', 'warning', 'none']
    },

    /**
     * Priority level used for sorting and delivery urgency
     */
    priority: {
      type: String,
      enum: ['high', 'medium', 'low', 'none']
    },

    // Optional action metadata
    action: String,
    actionButton: String,
    actionHint: String,

    /**
     * Alert details (used for complex or multi-condition notifications)
     */
    alerts: [{
      level: String,
      priority: String,
      scenario: String,
      message: String
    }],

    /**
     * Energy or usage recommendations
     */
    recommendations: [{
      type: { type: String },
      title: String,
      message: String,
      potentialSavings: Number,
      priority: String
    }]
  },

  /**
   * Optimization & efficiency calculations
   */
  optimization: {
    applianceKey: String,
    baseEnergy: Number,
    adjustedEnergy: Number,
    efficiencyLoss: Number,
    efficiency: Number,
    potentialSavings: Number,
    efficiencyScore: Number,
    estimatedCost: Number,

    /**
     * Environmental or operational factors
     */
    factors: {
      fT: Number, // Temperature factor
      fH: Number, // Humidity factor
      fP: Number  // Pressure factor
    }
  },

  /**
   * Environmental conditions at the time of notification
   */
  conditions: {
    temperature: Number,
    humidity: Number,
    pressure: Number
  },

  /**
   * Appliance usage metrics
   */
  usageData: {
    eaec: Number,       // Energy Annual Equivalent Consumption
    dailyEAEC: Number,
    N: Number,          // Number of usage cycles
    duration: Number    // Usage duration
  },

  /**
   * User interaction states
   */
  read: {
    type: Boolean,
    default: false
  },

  dismissed: {
    type: Boolean,
    default: false
  },

  /**
   * Expo push notification delivery status
   */
  sentViaExpo: {
    type: Boolean,
    default: false
  },

  expoReceiptId: String,

  /**
   * Timestamp when the notification was sent
   */
  sentAt: Date,

  /**
   * Creation timestamp (indexed for faster sorting)
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  /**
   * Expiry timestamp for automatic cleanup (TTL index)
   */
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: true
  }

}, {
  timestamps: true // Automatically adds createdAt & updatedAt
});

/**
 * Indexes for performance optimization
 */

// Fetch latest notifications for a user
notificationHistorySchema.index({ userId: 1, createdAt: -1 });

// Fetch unread notifications for a user
notificationHistorySchema.index({ userId: 1, read: 1 });

// TTL index to automatically delete expired documents
notificationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export the model
module.exports = mongoose.model("NotificationHistory", notificationHistorySchema);

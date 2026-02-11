// Import mongoose ODM
const mongoose = require("mongoose");

// Create a shortcut to mongoose.Schema
const Schema = mongoose.Schema;

/**
 * Room Schema
 * ------------
 * Represents a physical room in the user's home
 * (e.g., Living Room, Kitchen, Bedroom)
 */
const roomSchema = new mongoose.Schema({
  /**
   * Human-readable room name
   * Example: "Living Room"
   */
  name: { 
    type: String, 
    required: true 
  },

  /**
   * Home Assistant / IoT entity ID for the room
   * Example: "livingroom_sensor"
   */
  entityId: { 
    type: String, 
    required: true 
  }
});

/**
 * Device Schema
 * --------------
 * Represents a device or appliance owned by the user
 */
const deviceSchema = new mongoose.Schema({

  /**
   * User-friendly device name
   * Example: "Dishwasher"
   */
  name: { 
    type: String, 
    required: true 
  },

  /**
   * Optional physical location of the device
   * Example: "Kitchen"
   */
  location: { 
    type: String 
  },

  /**
   * Appliance identifier used in business logic
   * Example: "dishwasher"
   */
  applianceKey: { 
    type: String, 
    required: true 
  },

  /**
   * Primary entity ID for the device
   * Auto-generated based on device name
   * Example: "dishwasher_power_consumption"
   */
  entityId: { 
    type: String, 
    required: true 
  },

  /**
   * Entity ID used specifically for power consumption readings
   */
  powerEntityId: { 
    type: String, 
    required: true 
  },

  /**
   * Entity ID used to control device on/off state
   * Example: "dishwasher_switch_state"
   */
  switchEntityId: { 
    type: String 
  },

  /**
   * Entity ID used to track device operational status
   * Example: "dishwasher_status"
   */
  statusEntityId: { 
    type: String 
  },

  /**
   * Metadata describing the device category
   * Possible values: appliance, sensor, switch
   */
  deviceType: { 
    type: String, 
    default: 'appliance' 
  },

  /**
   * Indicates whether the device is currently active
   */
  isActive: { 
    type: Boolean, 
    default: true 
  }
});

/**
 * User Schema
 * ------------
 * Core user model containing authentication data,
 * devices, rooms, and notification preferences
 */
const userSchema = new Schema({

  /**
   * User's full name
   */
  name: { 
    type: String, 
    required: true 
  },

  /**
   * User's email address (unique)
   */
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  /**
   * Hashed password
   */
  password: { 
    type: String, 
    required: true, 
    minlength: 6 
  },

  /**
   * Password reset token and expiry
   */
  resetToken: String,
  resetTokenExpiry: Date,

  /**
   * Push notification token (Expo / FCM)
   */
  pushToken: { 
    type: String 
  },

  /**
   * Controls whether the user receives notifications
   */
  notificationsEnabled: { 
    type: Boolean, 
    default: true 
  },

  /**
   * Embedded list of user devices
   */
  devices: [deviceSchema],

  /**
   * Embedded list of rooms
   */
  rooms: [roomSchema],

  /**
   * User account creation timestamp
   */
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Export User model
module.exports = mongoose.model("User", userSchema);

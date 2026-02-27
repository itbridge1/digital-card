const mongoose = require('mongoose');

// Polymorphic Card schema with flexible metadata
const cardSchema = new mongoose.Schema({
  // Multi-tenant identifier
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  
  // Unique tag identifier (NFC UID)
  tagId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  
  // Business/redirect URL
  businessUrl: {
    type: String,
    required: true
  },
  
  // Tap analytics
  tapCount: {
    type: Number,
    default: 0
  },
  
  lastTapped: {
    type: Date
  },
  
  // Polymorphic metadata - store different data based on tenant type
  metadata: {
    // Common fields
    name: String,
    title: String,
    email: String,
    phone: String,
    
    // School-specific fields
    studentId: String,
    grade: String,
    section: String,
    guardianName: String,
    guardianPhone: String,
    
    // Hospital-specific fields
    employeeId: String,
    department: String,
    specialization: String,
    licenseNumber: String,
    emergencyContact: String,
    
    // Business-specific fields
    company: String,
    position: String,
    linkedIn: String,
    website: String,
    
    // Any additional custom fields
    custom: mongoose.Schema.Types.Mixed
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient tenant queries
cardSchema.index({ tenantId: 1, tagId: 1 });

// Method to increment tap count
cardSchema.methods.recordTap = async function() {
  this.tapCount += 1;
  this.lastTapped = new Date();
  return this.save();
};

module.exports = mongoose.model('Card', cardSchema);

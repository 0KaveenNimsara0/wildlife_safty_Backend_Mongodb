const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const medicalOfficerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialization: {
    type: String,
    required: true,
    enum: ['general', 'toxicology', 'emergency', 'wildlife_medicine']
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  hospital: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    default: 'medical_officer',
    enum: ['medical_officer']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false // Admin needs to approve medical officers
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
medicalOfficerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
medicalOfficerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update updatedAt on save
medicalOfficerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MedicalOfficer', medicalOfficerSchema);

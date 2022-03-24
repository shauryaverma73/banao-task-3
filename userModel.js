// all imports
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// user schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required.']
    },
    username: {
        type: String,
        reuqired: [true, 'Username is required.']
    },
    password: {
        type: String,
        required: [true, 'Password must be given.']
    },
    passwordResetToken: {
        type: String,
        default: undefined
    }
});

// pre save middleware
userSchema.pre('save', async function (next) {
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// check password instance method
userSchema.methods.checkPassword = async function (userPass, dbPass) {
    return await bcrypt.compare(userPass, dbPass);
};

// create reset token instance methods
userSchema.methods.createResetToken = function () {
    // creating a random token
    const token = crypto.randomBytes(32).toString('hex');
    // adding reset token to collection after hashing
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    // sending token back to caller
    return token;
};

// creating model
const User = mongoose.model('Users', userSchema);
module.exports = User;
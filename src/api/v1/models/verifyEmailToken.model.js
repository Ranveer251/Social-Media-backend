const mongoose = require('mongoose');
const crypto = require('crypto');
const moment = require('moment-timezone');

const verifyTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: 'String',
    ref: 'User',
    required: true,
  },
  expires: { type: Date },
});

verifyTokenSchema.statics = {

  generate(user) {
    const userId = user._id;
    const userEmail = user.email;
    const token = `${userId}.${crypto.randomBytes(40).toString('hex')}`;
    const expires = moment().add(1, 'hours').toDate();
    const tokenObject = new VerifyToken({
      token, userId, userEmail, expires,
    });
    tokenObject.save();
    return tokenObject;
  },

};

const VerifyToken = mongoose.model('VerifyToken', verifyTokenSchema);
module.exports = VerifyToken;

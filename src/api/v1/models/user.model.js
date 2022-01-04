const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const APIError = require('../errors/api-error');
const moment = require('moment-timezone');
const {jwtSecret} = require('../utils/jwt');
const {sign} = require("../utils/jwt")
const {env, jwtExpirationInterval} = require('../../../config/vars');
const RefreshToken = require('./refreshToken.model');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        match: /^\S+@\S+\.\S+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    }, 
    passwordHash: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 128
    },
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    name: {
        type: String,
        maxlength: 128,
        trim: true
    },
    public: {
      type: Boolean,
      default: false
    },
    email_verified: {
        type: Boolean,
        default: false
    },
    profilePic: {
      type: String
    },
    friends: {
      type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Friend'}]
    },
    // phoneNumber: {
    //     type: String,
    //     match: /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
    // },
    createdAt: {
        type: Date
    }, 
    updatedAt: {
        type: Date
    }
})

userSchema.index({name: 'text', userName: 'text', email: 'text'});

userSchema.pre('save', async function save(next) {
    try {
      if (!this.isModified('passwordHash')) return next();
  
      const rounds = env === 'test' ? 1 : 10;
  
      const hash = await bcrypt.hash(this.passwordHash, rounds);
      this.passwordHash = hash;
  
      return next();
    } catch (error) {
      return next(error);
    }
});

userSchema.method({
    transform() {
      const transformed = {};
      const fields = ['id', 'name', 'email','userName', 'public', 'friends', 'profilePic', 'email_verified', 'createdAt', "updatedAt"];
  
      fields.forEach((field) => {
        transformed[field] = this[field];
      });
  
      return transformed;
    },
  
    token() {
      const payload = {
        exp: moment().add(jwtExpirationInterval, 'minutes').unix(),
        iat: moment().unix(),
        id: this._id,
      };
      return sign(payload, jwtSecret);
    },
  
    async passwordMatches(password) {
      return bcrypt.compare(password, this.passwordHash);
    },

});

userSchema.statics = {

  async get(id) {
    let user;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await this.findById(id).exec();
    }
    if (user) {
      return user;
    }

    throw new APIError({
      message: 'User does not exist',
      status: httpStatus.NOT_FOUND,
    });
  },

  async findAndGenerateToken(options) {
    const { email, passwordHash } = options;
    if (!email) throw new APIError({ message: 'An email is required to generate a token' });

    const user = await this.findOne({ "email":email }).exec();
    if(!user) {
      throw new APIError({
        status: 400,
        isPublic: true,
        message: "Email not registered",
      });
    }
    const err = {
      status: 401,
      isPublic: true,
    };
    if (passwordHash) {
      if (user && await user.passwordMatches(passwordHash)) {
        return { user, accessToken: user.token() };
      }
      err.message = 'Incorrect email or password';
    }
    throw new APIError(err);
  },

  async refreshAccessToken(options){
    const { email, refreshObject } = options;
    if(!email) throw new APIError({ message: 'An email is required to generate a token' });
    const err = {
      status: 401,
      isPublic: true,
    };
    if(refreshObject && refreshObject.userEmail == email){
      if (moment(refreshObject.expires).isBefore()) {
        err.message = 'Invalid refresh token.';
        RefreshToken.deleteOne({
          userEmail: email,
          token: refreshObject.token
        })
      } else {
        const user = await User.findOne({email:email}).exec();
        return { user, accessToken: user.token() };
      }
    }
    throw new APIError(err);
  },

  async changePassword(email, newPassword){
    if(!email) throw new APIError({ message: 'An email is required to generate a token' });
    const rounds = env === 'test' ? 1 : 10;
    const hash = await bcrypt.hash(newPassword,rounds);
    const user = await User.findOneAndUpdate({email: email},{$set:{passwordHash: hash}},{new:true}).exec();
  },

  // list({
  //   page = 1, perPage = 30, name, email, role,
  // }) {
  //   const options = omitBy({ name, email, role }, isNil);

  //   return this.find(options)
  //     .sort({ createdAt: -1 })
  //     .skip(perPage * (page - 1))
  //     .limit(perPage)
  //     .exec();
  // },

  // async oAuthLogin({
  //   service, id, email, name, picture,
  // }) {
  //   const user = await this.findOne({ $or: [{ [`services.${service}`]: id }, { email }] });
  //   if (user) {
  //     user.services[service] = id;
  //     if (!user.name) user.name = name;
  //     if (!user.picture) user.picture = picture;
  //     return user.save();
  //   }
  //   const password = uuidv4();
  //   return this.create({
  //     services: { [service]: id }, email, password, name, picture,
  //   });
  // },
};

const User = mongoose.model('User',userSchema);
module.exports = User;
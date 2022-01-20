const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
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
    bio: {
      type: String,
      maxlength: 512,
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
    phoneNumber: {
      type: String,
      match: /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
    },
    college: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    country: {
      type: String
    },
    profilePic: {
      type: String
    },
    friends: {
      type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
    },
    friendRequests: {
      type: [{type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest'}]
    },
    blocked: {
      type: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}]
    },
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

    async suggestFriends () {
      const userId = this._id
      console.log(userId);
      try {
        const suggestions = await User.aggregate([
          {
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $graphLookup: {
              from: 'users',
              startWith: '$friends',
              connectFromField: 'friends',
              connectToField: '_id',
              as: 'suggestions',
              maxDepth: 1
            }
          },
          {
            $unwind: {
              path: '$suggestions',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              $expr: {
                $not: {
                  $in: ['$suggestions._id', '$friends']
                }
              }
            }
          },
          {
            $match: {
              $expr: {
                $not: {
                  $in: ['$suggestions._id', [ObjectId(userId)]]
                }
              }
            }
          },
          { $replaceRoot: { newRoot: '$suggestions' } },
          {
            $project: {
              email: false,
              passwordHash: false,
              email_verified: false,
              friendRequests: false,
              blocked: false,
              createdAt: false,
              updatedAt: false,
              __v: false
            }
          }
        ]).exec();
        return suggestions;
      } catch (err) {
        console.error(err.message);
      }
    },
});

userSchema.statics = {

  async get(id) {
    let user;

    if (ObjectId.isValid(id)) {
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

  list({page, perPage, searchString}) {
    return this.find({$text: {$search: searchString}},{ score: { $meta: "textScore" } })
      .sort( { score: { $meta: "textScore" } } )
      .select({'name':1, 'userName':1, 'email':1, 'profilePic':1})
      .skip(perPage*(page-1))
      .limit(perPage)
      .exec();
  },

  
};

const User = mongoose.model('User',userSchema);
module.exports = User;
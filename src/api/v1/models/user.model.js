const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const bcrypt = require('bcryptjs');
const APIError = require('../errors/api-error');
const moment = require('moment-timezone');
const {jwtSecret} = require('../utils/jwt');
const {sign} = require("../utils/jwt")
const {env, jwtExpirationInterval} = require('../../../config/vars');
const RefreshToken = require('./refreshToken.model');
const Hashtag = require('./hashtag.model');
const cron = require('node-cron');
const Post = require('./post.model');
const Like = require('./like.model');
const Comment = require('./comment.model');

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
        trim: true,
        default: ""
    },
    bio: {
      type: String,
      maxlength: 512,
      trim: true,
      default: ""
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
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    country: {
      type: String,
      default: ""
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
    show_notifications: {
      type: Boolean,
      default: true
    },
    email_notifications: {
      type: Boolean,
      default: true
    },
    profile_views_this_month: {
      type: Number,
      default: 0
    },
},{timestamps: true})

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
        public: this.public,
        username: this.userName
      };
      return sign(payload, jwtSecret);
    },
  
    async passwordMatches(password) {
      return bcrypt.compare(password, this.passwordHash);
    },

    async suggestFriends () {
      const userId = this._id
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
        throw new APIError({
          message: 'Internal Server Error',
          status: 500
        });
      }
    },

    async getLikedHashtags () {
      const userId = this._id;
      try {
        const likedHashtags = await Hashtag.find({user: userId})
          .sort({count: -1})
          .exec();
        likedHashtags = likedHashtags.map(hashtag => {
          return hashtag._id;
        });
        return likedHashtags;
      } catch (err) {
        console.error(err.message);
        throw new APIError({
          message: 'Internal Server Error ',
          status: 500
        })
      }
    },

    async isBlocked(fid) {
      const userId = this._id;
      try {
        const blocked = await User.findOne({_id: userId, blocked: fid})
          .exec();
        return !!blocked;
      } catch (err) {
        console.error(err.message);
        throw new APIError({
          message: 'Something went wrong while checking if user is blocked',
          status: 500
        })
      }
    },
    
    async isFriend(fid) {
      const userId = this._id;
      try {
        const friend = await User.findOne({_id: userId, friends: fid})
          .exec();
        return !!friend;
      } catch (err) {
        console.error(err.message);
        throw new APIError({
          message: 'Something went wrong checking if user is friend',
          status: 500,
        })
      }
    },

    async getInsights() {
      const userId = this._id;
      try {
        const posts = await Post.find({author: userId}).exec();
        const insights = {
          reach_this_week: {
            friends: 0,
            non_friends: 0,
          },
          reach_this_month: {
            friends: 0,
            non_friends: 0,
          },
          engagement_this_week: {
            friends: 0,
            non_friends: 0,
          },
          engagement_this_month: {
            friends: 0,
            non_friends: 0,
          },
        };
        for await (const post of posts) {
          insights.reach_this_week.friends += post.reach_this_week.friends;
          insights.reach_this_week.non_friends += post.reach_this_week.non_friends;
          insights.reach_this_month.friends += post.reach_this_month.friends;
          insights.reach_this_month.non_friends += post.reach_this_month.non_friends;
          insights.engagement_this_month.friends = post.engagement_this_month.friends;
          insights.engagement_this_month.non_friends = post.engagement_this_month.non_friends;
          insights.engagement_this_week.friends = post.engagement_this_week.friends;
          insights.engagement_this_week.non_friends = post.engagement_this_week.non_friends;
        }
        insights["posts_this_week"] = await Post.countDocuments({author: userId, createdAt: {$gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate()}});
        insights["posts_this_month"] = await Post.countDocuments({author: userId, createdAt: {$gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate()}});
        insights["likes_this_week"] = await Like.countDocuments({author: userId, createdAt: {$gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate()}});
        insights["likes_this_month"] = await Like.countDocuments({author: userId, createdAt: {$gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate()}});
        insights["comments_this_week"] = await Comment.countDocuments({author: userId, createdAt: {$gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate()}});
        insights["comments_this_month"] = await Comment.countDocuments({author: userId, createdAt: {$gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate()}});
        insights["profile_views_this_month"] = this.profile_views_this_month;
        return insights;
      } catch (err) {
        console.error(err.message);
        throw new APIError({
          message: 'Something went wrong',
          status: 500
        })
      }
    }
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
      status: 404,
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

try {
  cron.schedule(
    '0 0 0 1 * *',
    async () => {
      await User.updateMany({}, { profile_views_this_month: 0});
    },
    {
        scheduled: true
    }
  )
} catch (error) {
  console.error(error);
}

module.exports = User;
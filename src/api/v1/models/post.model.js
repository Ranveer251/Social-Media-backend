const mongoose = require('mongoose');
const cron = require('node-cron');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    photos: [String],
    caption: {
        type: String,
        default: ""
    },
    hashtags: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref:'Hashtag'}],
        default: []
    },
    shared: {
        type: Boolean,
        default: false
    },
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    in_reply_to_userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    in_reply_content: {
        type: String,
        default: ""
    },
    mentions: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref:'User'}],
    },
    like_count: {
        type: Number,
        default: 0
    },
    comment_count: {
        type: Number,
        default: 0
    },
    share_count: {
        type: Number,
        default: 0
    },
    reach_this_month: {
        friends: {
            type: Number,
            default: 0
        },
        non_friends: {
            type: Number,
            default: 0
        }
    },
    reach_this_week: {
        friends: {
            type: Number,
            default: 0
        },
        non_friends: {
            type: Number,
            default: 0
        }
    },
    engagement_this_month: {
        friends: {
            type: Number,
            default: 0
        },
        non_friends: {
            type: Number,
            default: 0
        }
    },
    engagement_this_week: {
        friends: {
            type: Number,
            default: 0
        },
        non_friends: {
            type: Number,
            default: 0
        }
    },
},{timestamps: true})

postSchema.method({
    async getInsights() {
        const post = this;
        const insights = {
            reach_this_month: {
                friends: post.reach_this_month.friends,
                non_friends: post.reach_this_month.non_friends
            },
            reach_this_week: {
                friends: post.reach_this_week.friends,
                non_friends: post.reach_this_week.non_friends
            },
            engagement_this_month: {
                friends: post.engagement_this_month.friends,
                non_friends: post.engagement_this_month.non_friends
            },
            engagement_this_week: {
                friends: post.engagement_this_week.friends,
                non_friends: post.engagement_this_week.non_friends
            },
            like_count: post.like_count,
            comment_count: post.comment_count,
            share_count: post.share_count,
        }
        return insights;
    }
});

postSchema.statics = {

};

const Post = mongoose.model('Post',postSchema);

try {
    cron.schedule(
        "0 0 0 1 * *",
        async () => {
            await Post.updateMany({}, { reach_this_month: {friends: 0, non_friends: 0}, engagement_this_month: {friends: 0, non_friends: 0} });
        },
        {
            scheduled: true
        }
    );
    cron.schedule(
        "0 0 0 * * 0",
        async () => {
            await Post.updateMany({}, { reach_this_week: {friends: 0, non_friends: 0}, engagement_this_week: {friends: 0, non_friends: 0} });
        },
        {
            scheduled: true
        }
    );
} catch (error) {
    console.log("Task Scheduling Error",error);
}

module.exports = Post;

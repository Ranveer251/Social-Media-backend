const {Joi} = require('express-validation');

const postBody = {
    body: Joi.object({
        photos: Joi.array().items(Joi.string()),
        caption: Joi.string(),
        hashtags: Joi.array().items(Joi.string()),
        shared: Joi.boolean(),
        source: Joi.string(),
        in_reply_to_userId: Joi.string(),
        in_reply_content: Joi.string(),
        mentions: Joi.array().items(Joi.string())
    })
}

module.exports = {
    postBody
}
const {Joi} = require('express-validation');

const userProfile = {
    body: Joi.object({
        email: Joi.string().email(),
        passwordHash: Joi.string().min(6).max(128),
        userName: Joi.string(),
        name: Joi.string().max(128),
        bio: Joi.string().max(512),
        public: Joi.boolean(),
        phoneNumber: Joi.string().length(10).pattern(/^[0-9]+$/),
        college: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        country: Joi.string(),
        profilePic: Joi.string()
    })
}

const search = {
    body: Joi.object({
        searchString: Joi.string()
    })
}

module.exports = {
    userProfile,
    search
}
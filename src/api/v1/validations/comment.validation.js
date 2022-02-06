const {Joi} = require('express-validation');

const commentBody = {
    body: Joi.object({
        content: Joi.string().required()
    })
}

module.exports = {
    commentBody
}

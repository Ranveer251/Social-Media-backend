const {jwtSecret, verify} = require('../utils/jwt');

const authorize = (req,res,next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401).json({
        error: "Access token is missing"
    });

    verify(token, jwtSecret, (err, payload) => {
        console.log(err)
        if (err) return res.sendStatus(403).json({
            error: "Invalid Access token"
        });
        req.userId = payload.id;
        next()
    })

}

module.exports = authorize;
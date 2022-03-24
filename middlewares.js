const User = require('./userModel');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

exports.isLoggedIn = (async (req, res, next) => {
    if (req.body.token) {
        try {
            // 1.verification token
            const decoded = await promisify(jwt.verify)(req.headers.authorization.jwt, process.env.JWT_SECRET_KEY);
            // 2.check if user still exists
            const user = await User.findById(decoded.id);
            if (!user) {
                return next();
            }
            // setting user to request object
            req.user = user;
            next();
        } catch (error) {
            console.log(error);
            next();
        }
    }
});

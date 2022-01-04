const User = require('../models/user.model');
const RefreshToken = require('../models/refreshToken.model');
const VerifyToken = require('../models/verifyEmailToken.model')
const PasswordResetToken = require('../models/passwordResetToken.model')
const moment = require('moment-timezone')
const {sendEmailVerification, sendPasswordResetEmail} = require('../services/emailProvider')
const { jwtExpirationInterval } = require('../../../config/vars');


function generateTokenResponse(user, accessToken) {
    const tokenType = 'Bearer';
    const refreshToken = RefreshToken.generate(user).token;
    const expiresIn = moment().add(jwtExpirationInterval, 'minutes');
    return {
      tokenType,
      accessToken,
      refreshToken,
      expiresIn,
    };
}

const register = async (req,res,next) => {
    try{
        const userData = req.body;
        const email = userData.email;
        let user = await User.findOne({"email": email}).exec();
        if(user && user.email_verified===true) {
            return res.status(409).json({
                success: false,
                msg: "User alredy exists with the given email"
            }) 
        }
        user = await User.findOne({"userName": userData.userName}).exec();
        if(user) {
            return res.status(409).json({
                success: false,
                msg: "Username already taken"
            })
        }
        userData.createdAt = new Date();
        userData.updatedAt = new Date();
        user = await new User(userData).save();
        // console.log(user);
        verifyTokenObject = await VerifyToken.generate(user);
        sendEmailVerification(verifyTokenObject);
        const token = generateTokenResponse(user, user.token());
        return res.status(201).json({ 
            success: true,
            msg: "User Registered Successfully",
            token: token, 
            user: user 
        });
    } catch(err){
        return next(err);
    }
}

const login = async (req,res,next) => {
    try{
        const {user, accessToken} = await User.findAndGenerateToken(req.body);
        const token = generateTokenResponse(user, accessToken);
        return res.status(200).json({ 
            success:true,
            msg: "Login Successfull",
            token: token, 
            user: user });
    } catch(err){
        return next(err);
    }
}

const refresh = async (req,res,next) => {
    try{
        const {email, refreshToken} = req.body;
        const refreshObject = await RefreshToken.findOne({
            userEmail: email,
            token: refreshToken,
        }).exec();
        const { user, accessToken } = await User.refreshAccessToken({ email:email, refreshObject:refreshObject });
        const response = generateTokenResponse(user, accessToken);
        return res.status(200).json(response);
    } catch (err) {
        return next(err);
    }
}

const sendVerificationEmail = async (req,res,next) => {
    try{
        const {email} = req.body;
        const user = await User.findOne({email:email}).exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Not a valid user"
        })
        let verifyTokenObject = await VerifyToken.findOne({
            userEmail: email,
            userId: user._id
        })
        if(verifyTokenObject && !moment(verifyTokenObject.expires).isBefore()){
            sendEmailVerification(verifyTokenObject);
        } else {
            if(moment(verifyTokenObject.expires).isBefore()){
                await VerifyToken.deleteOne({
                    userEmail: email,
                    userId: user._id
                });
            }
            verifyTokenObject = await VerifyToken.generate(user);
            sendEmailVerification(verifyTokenObject);
        }
        return res.status(200).json({
            success: true,
            msg: "Verificatiom Email sent"
        })
    } catch(err){
        return next(err);
    }
}

const verifyEmail = async (req,res,next) => {
    try{
        const {id,token} = req.params;
        const user = await User.findById(id).exec();
        let message="";
        if(!user) message="Invalid User";
        else if(user.email_verified===true) message = "User Alreay Verified";
        if(!user || user.email_verified===true) res.status(400).json({
            success: false,
            msg: message
        })
        const tokenObject = await VerifyToken.findOneAndRemove({
            userId: id,
            token: token
        })
        if(!tokenObject || moment(tokenObject.expires).isBefore()) res.status(400).json({
            success: false,
            msg: "Invalid/Expired Token"
        })
        await User.findByIdAndUpdate(id,{email_verified: true})
        res.status(200).json({
            success: true,
            msg: "Email Successfully Verified"
        })
    } catch(err){
        return next(err);
    }
}

const requestChangePassword = async (req,res,next) => {
    try{
        const {email,passwordHash} = req.body;
        const user = await User.findOne({
            email: email
        });
        if(!user) return res.status(400).json({
            success: false,
            msg: "User not Registered"
        });
        if(!user.passwordMatches(passwordHash)){
            return res.status(401).json({
                success: false,
                msg: "Wrong Password"
            });
        }
        const passwordResetObj = await PasswordResetToken.generate(user)
        sendPasswordResetEmail(passwordResetObj);
        return res.status(200).json({
            success: true,
            msg: "Password Reset Request Sent"
        });
    } catch(err){
        return next(err);
    }
}

const forgotPassword = async (req,res,next) => {
    try{
        const {email} = req.body;
        const user = await User.findOne({
            email: email
        });
        if(!user) return res.status(400).json({
            success: false,
            msg: "User not Registered"
        });
        const passwordResetObj = await PasswordResetToken.generate(user);
        sendPasswordResetEmail(passwordResetObj);
        return res.status(200).json({
            success: true,
            msg: "Password Reset Request Sent"
        });
    } catch(err){
        return next(err);
    }
}

const changePassword = async (req,res,next) => {
    try{
        const {email, newPassword} = req.body;
        const {token} = req.params;
        const tokenObject = await PasswordResetToken.findOneAndRemove({
            token: token,
            userEmail: email
        });
        if(!tokenObject || moment(tokenObject.expires).isBefore()) return res.status(400).json({
            success: false,
            msg: "Invalid or Expired Token"
        })
        const user = await User.changePassword(email, newPassword);
        res.status(200).json({
            success: true,
            msg: "Password Change Successfull"
        });
    } catch(err){
        return next(err);
    }
}

module.exports = {
    register,
    login,
    refresh,
    sendVerificationEmail,
    verifyEmail,
    requestChangePassword,
    changePassword,
    forgotPassword
}

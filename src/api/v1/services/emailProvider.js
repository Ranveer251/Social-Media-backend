const {email_api_url} = require('../../../config/strings')
const axios = require('axios');
const {baseUrl} = require('../../../config/strings');  // frontend base url
const { email_service_auth_key } = require('../../../config/vars');
const APIError = require('../errors/api-error');

const axios_headers = {
    'Authorization': `Bearer ${email_service_auth_key}`
}

const sendEmailVerification = async (tokenObject) => {
    try{
        const link = baseUrl+`/emailVerification/view?id=${tokenObject.userId}&token=${tokenObject.token}`
        var text = `This mail is regarding the verification of the EMAIL \n\n Open this link ${link} to verify your account. \n\n This link will only be valid for 1 hour \n\nIgnore if already verified`;

        let html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Email</title>
            <style>
            @media (max-width: 500px) {
                            .form-wrapper {
                                max-width: 300px;
                            }
                        }
            </style>
        </head>
        <body style="font-family: 'Verdana', sans-serif;padding: 0;margin: 0;">
            <center>
                <div class="form-wrapper" style="max-width: 600px;padding-top: 5em;padding-bottom: 5em;">
                    <center>
                        <h3>This mail is regarding the verification of this EMAIL</h3>
                        <p>Open this <a href=${link}>Link</a> to verify your account. <br/> This link will only be valid for 1 hour <br/> Ignore if already verified</p>
                    </center>
                </div>
            </center>
        </body>
        </html>`;
        const subject = "Email Verfication";
        const email = tokenObject.userEmail;
        const data = {
            email,text,html,subject
        }
        await axios.post(email_api_url,data,{
            headers: axios_headers
        })
    }catch(err){
        throw new APIError({
            message: "Email Sending Error",
            status: 500,
            errors: err.message
        })
    }
}

const sendPasswordResetEmail = (tokenObject) => {
    try{
        const link = baseUrl + `/newPassword/view?resetToken=${tokenObject.token}`
        var text = `A password reset request has been made for your Account\n\nOpen this link to reset your password: ${link}\nThis link will only be valid for 1 hour.\n\n Please change your password to secure your account if this request was not made by you`;

        let html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Email</title>
            <style>
            @media (max-width: 500px) {
                            .form-wrapper {
                                max-width: 300px;
                            }
                        }
            </style>
        </head>
        <body style="font-family: 'Verdana', sans-serif;padding: 0;margin: 0;">
            <center>
                <div class="form-wrapper" style="max-width: 600px;padding-top: 5em;padding-bottom: 5em;">
                    <center>
                        <h3>A password reset request has been made for your Account</h3>
                        <p>Open this link to reset your password: <a href=${link}>Link</a>
                        <br/> This link will only be valid for 1 hour <br/> Please change your password to secure your account if this request was not made by you</p>
                    </center>
                </div>
            </center>
        </body>
        </html>`;
        const subject = "Password Reset";
        const email = tokenObject.userEmail;
        const data = {
            email,text,html,subject
        }
        console.log(tokenObject);
        axios.post(email_api_url,data,{
            headers: axios_headers
        })  
    }catch(err){
        throw new APIError({
            message: "Email Sending Error",
            status: 500,
            errors: err.message
        })
    }             
}

const sendNotificationEmail = async (emailData) => {
    try{
        const {message,type,email,postId} = emailData;
        const link = baseUrl + `/post/view?id=${postId}`;
        const text = `${message} \n\n Open this link to view the post: ${link}`;
        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Email</title>
            <style>
            @media (max-width: 500px) {
                            .form-wrapper {
                                max-width: 300px;
                            }
                        }
            </style>
        </head>
        <body style="font-family: 'Verdana', sans-serif;padding: 0;margin: 0;">
            <center>
                <div class="form-wrapper" style="max-width: 600px;padding-top: 5em;padding-bottom: 5em;">
                    <center>
                        <h3>${message}</h3>
                        <p>Open this <a href=${link}>Link</a> to view the post</p>
                    </center>
                </div>
            </center>
        </body>
        </html>`;
        const subject = "New Notification";
        const data = {  
            email,text,html,subject
        }
        await axios.post(email_api_url,data,{
            headers: axios_headers
        })
    }catch(err){
        throw new APIError({
            message: "Email Sending Error",
            status: 500,
            errors: err.message
        })

    }
}

const sendFriendRequestEmail = async (emailData) => {
    try{
        const {message,type,sender,reciever} = emailData;
        const link = baseUrl + `/${sender}`;
        const text = `${message} \n\n Open this link to view the profile: ${link}`;
        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Email</title>
            <style>
            @media (max-width: 500px) {
                            .form-wrapper {
                                max-width: 300px;
                            }
                        }
            </style>
        </head>
        <body style="font-family: 'Verdana', sans-serif;padding: 0;margin: 0;">
            <center>
                <div class="form-wrapper" style="max-width: 600px;padding-top: 5em;padding-bottom: 5em;">
                    <center>
                        <h3>${message}</h3>
                        <p>Open this <a href=${link}>Link</a> to view the profile</p>
                    </center>
                </div>
            </center>
        </body>
        </html>`;
        const subject = "New Friend Request";
        const email = reciever;
        const data = {  
            email,text,html,subject
        }
        await axios.post(email_api_url,data,{
            headers: axios_headers
        })
    }catch(err){
        throw new APIError({
            message: "Email Sending Error",
            status: 500,
            errors: err.message
        })

    }
}

const sendAcceptFriendEmail = async (emailData) => {
    try{
        const {message,type,sender,reciever} = emailData;
        const link = baseUrl + `/${sender}`;
        const text = `${message} \n\n Open this link to view the profile: ${link}`;
        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Email</title>
            <style>
            @media (max-width: 500px) {
                            .form-wrapper {
                                max-width: 300px;
                            }
                        }
            </style>
        </head>
        <body style="font-family: 'Verdana', sans-serif;padding: 0;margin: 0;">
            <center>
                <div class="form-wrapper" style="max-width: 600px;padding-top: 5em;padding-bottom: 5em;">
                    <center>
                        <h3>${message}</h3>
                        <p>Open this <a href=${link}>Link</a> to view the profile</p>
                    </center>
                </div>
            </center>
        </body>
        </html>`;
        const subject = "Friend Request Accepeted";
        const email = reciever;
        const data = {  
            email,text,html,subject
        }
        await axios.post(email_api_url,data,{
            headers: axios_headers
        })
    }catch(err){
        throw new APIError({
            message: "Email Sending Error",
            status: 500,
            errors: err.message
        })

    }
}

module.exports = {
    sendEmailVerification,
    sendPasswordResetEmail,
    sendNotificationEmail,
    sendFriendRequestEmail,
    sendAcceptFriendEmail
};
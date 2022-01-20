const express = require('express');
const app = express();
const routes = require('../api/v1/routes')
const { createProxyMiddleware } = require('http-proxy-middleware');
const {ValidationError} = require('express-validation')
const APIError = require('../api/v1/errors/api-error')

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

const apiProxy = createProxyMiddleware({ target: 'http://localhost:8080' ,pathRewrite: {
  '/api/v1/users/images' : '/images'
},changeOrigin: true});

app.use('/api/v1/users/images',apiProxy);
app.use('/api/v1',routes);

app.use(function(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err)
  } else if(err instanceof APIError){
    return res.status(err.status).json(err)
  }
})

process.on('uncaughtException', err => {
  console.error('There was an uncaught error', err)
  process.exit(1) //mandatory (as per the Node.js docs)
})

app.all('*',(req,res)=> {
  res.sendStatus(404);
});

module.exports = app;
const express = require('express');
const app = express();
const routes = require('../api/v1/routes')
const {ValidationError} = require('express-validation')
const APIError = require('../api/v1/errors/api-error')

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use('/api/v1',routes);

app.use(function(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err)
  } else if(err instanceof APIError){
    return res.status(err.status).json(err)
  }
})

app.all('*',(req,res)=> {
  res.sendStatus(404);
});

module.exports = app;
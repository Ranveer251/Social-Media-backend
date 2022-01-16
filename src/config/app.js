const express = require('express');
const app = express();
const routes = require('../api/v1/routes')
const {ValidationError} = require('express-validation')

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
  }
  return res.status(500).json(err)
})

app.all('*',(req,res)=> {
  res.sendStatus(404);
});

module.exports = app;
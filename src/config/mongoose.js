const mongoose = require('mongoose');
const { mongo, env } = require('./vars');

// print mongoose logs in dev env
if (env === 'development') {
  mongoose.set('debug', true);
}

console.log(mongo.uri);

exports.connect = () => {
  mongoose
    .connect(mongo.uri, {
      keepAlive: 1,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log('mongoDB connected...'))
    .catch((err) => {
      console.log(err);
      process.exit();
    });
  return mongoose.connection;
};

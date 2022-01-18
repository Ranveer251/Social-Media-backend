const http = require("http");
const app = require("./config/app");
const mongoose = require('./config/mongoose');
const {port, env} = require('./config/vars')

const server = http.createServer(app);

mongoose.connect();

server.listen(port, () => {
  console.log(`Server running on ${port} ${env}`);
});


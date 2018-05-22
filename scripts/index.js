const common = require('./lib/common');
chatbot = require('./bot');

let config;

try {
  config = common.loadConfigfile(common.getConfigFilePath());
} catch (err) {
  process.exit();
}

chatbot = chatbot.bind(null, config);

module.exports = chatbot;

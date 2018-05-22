const { msgVariables, sendMessages, stringElseRandomKey } = require('../lib/common');

class Error {
  constructor(interaction) {
    this.process = this.process.bind(this);
    this.interaction = interaction;
  }
  process(msg) {
    return sendMessages(stringElseRandomKey(this.interaction.answer), msg);
  }
}

module.exports = Error;

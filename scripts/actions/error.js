/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('coffeescript/register');

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

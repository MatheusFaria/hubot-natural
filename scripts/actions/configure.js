const classifier = require('../bot/classifier');
const security = require('../lib/security');
const { msgVariables, stringElseRandomKey, sendMessages,
  loadConfigfile, getConfigFilePath } = require('../lib/common');

class Configure {
  constructor(interaction) {
    this.process = this.process.bind(this);
    this.interaction = interaction;
  }

  process(msg) {
    if (this.interaction.role != null) {
      if (security.checkRole(msg, this.interaction.role)) {
        return this.act(msg);
      } else {
        return msg.sendWithNaturalDelay(
          `*Acces Denied* Action requires role ${this.interaction.role}`
        );
      }
    } else {
      return this.act(msg);
    }
  }

  setVariable(msg) {
    const raw_message = msg.message.text.replace(msg.robot.name + ' ', '');
    const configurationBlock = raw_message.split(' ').slice(-1).toString();

    const configKeyValue = configurationBlock.split('=');
    const configKey = configKeyValue[0];
    const configValue = configKeyValue[1];

    const key = `configure_${configKey}_${msg.envelope.room}`;
    msg.robot.brain.set(key, configValue);
    sendMessages(stringElseRandomKey(this.interaction.answer), msg,
                  { key: configKey, value: configValue });
  }

  retrain(msg) {
    global.config = loadConfigfile(getConfigFilePath());
    classifier.train();
    sendMessages(stringElseRandomKey(this.interaction.answer), msg);
  }

  act(msg) {
    const command = this.interaction.command || 'setVariable';
    console.log(command);
    switch (command) {
      case 'setVariable':
        this.setVariable(msg);
        break;
      case 'train':
        this.retrain(msg);
        break;
    }
  }
}

module.exports = Configure;

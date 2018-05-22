const { msgVariables, sendMessages, stringElseRandomKey } = require('../lib/common');

const livechat_department = (process.env.LIVECHAT_DEPARTMENT_ID || null );

class Respond {
  constructor(interaction) {
    this.process = this.process.bind(this);
    this.interaction = interaction;
  }
  process(msg) {
    const lc_dept = this.interaction.department || livechat_department;
    const offline_message = (
      this.interaction.offline || 'Sorry, there is no online agents to transfer to.'
    );
    sendMessages(stringElseRandomKey(this.interaction.answer), msg);

    const command = (this.interaction.command != null ? this.interaction.command.toLowerCase() : undefined) || false;
    switch (command) {
      case 'transfer':
        return this.livechatTransfer(msg, 3000, lc_dept, offline_message);
    }
  }


  livechatTransfer(msg, delay, lc_dept, offline_message) {
    if (delay == null) { delay = 3000; }
    return setTimeout((() => msg.robot.adapter.callMethod('livechat:transfer', {
                      roomId: msg.envelope.room,
                      departmentId: lc_dept
                    }
                    ).then(function(result) {
                      if (result === true) {
                        return console.log('livechatTransfer executed!');
                      } else {
                        console.log('livechatTransfer NOT executed!');
                        return sendMessages(stringElseRandomKey(offline_message), msg);
                      }
                }) ), delay);
  }
}

module.exports = Respond;

const { msgVariables, stringElseRandomKey } = require('../lib/common');

// interpolate a string to replace {{ placeholder }} keys with passed object values
// I couldn't find how to make delayed string interpolation with coffeescript yet :/
// Reference solution https://stackoverflow.com/questions/9829470/in-coffeescript-is-there-an-official-way-to-interpolate-a-string-at-run-time
String.prototype.interp = function(values){
    return this.replace(/{{(.*)}}/g,
        (ph, key)=> values[key] || '');
  };

class Rest {
  constructor(interaction) {
    this.process = this.process.bind(this);
    this.interaction = interaction;
  }
  process(msg) {
    const { rest_uri } = this.interaction;
    const offline_message = (
      this.interaction.offline || 'Sorry, there is no online agents to transfer to.'
    );
    const type = (this.interaction.type != null ? this.interaction.type.toLowerCase() : undefined) || 'random';
    switch (type) {
      case 'block':
        var messages = this.interaction.answer.map(line => msgVariables(line, msg));
        msg.sendWithNaturalDelay(messages);
        break;
      case 'random':
        var message = stringElseRandomKey(this.interaction.answer);
        message = msgVariables(message, msg);
        msg.sendWithNaturalDelay(message);
        break;
    }

    const method = (this.interaction.rest.method != null ? this.interaction.rest.method.toLowerCase() : undefined) || 'get';
    return this.rest(msg, 3000, rest_uri, offline_message, type, method);
  }


  rest(msg, delay, rest_uri, offline_message, type, method) {
    if (delay == null) { delay = 3000; }
    const data = JSON.stringify(this.interaction.rest.data);
    const { successmsg } = this.interaction.rest;

    let { headers } = this.interaction.rest;

    headers =
        {'Content-Type': 'application/json'};

    return msg.http(this.interaction.rest.url)
        .headers(headers)[method](data)(function(err, response, body) {
            if (response.statusCode !== 200) {
                msg.sendWithNaturalDelay("We're sorry, something went wrong :/");
                return;
              }
            const results = JSON.parse(body);
            const message = successmsg.interp((results));
            return msg.sendWithNaturalDelay(message);
    });
  }
}

module.exports = Rest;

const security = require('../lib/security');
const actionHandler = require('./action-handler');
const classifier = require('./classifier');

const typing = (res, t) =>
  res.robot.adapter.callMethod('stream-notify-room',
    res.envelope.user.roomID + '/typing', res.robot.alias, t === true)
;

var sendWithNaturalDelay = function(msgs, elapsed) {
  let cb;
  if (elapsed == null) { elapsed = 0; }
  if (!Array.isArray(msgs)) {
    msgs = [msgs];
  }

  const keysPerSecond = 50;
  const maxResponseTimeInSeconds = 2;

  let msg = msgs.shift();
  if (typeof msg !== 'string') {
    cb = msg.callback;
    msg = msg.answer;
  }

  const minTimeTyping = maxResponseTimeInSeconds * 1000;
  const timeToType = ((msg.length / keysPerSecond) * 1000) - elapsed;
  const delay = Math.min(Math.max(timeToType, 0), minTimeTyping);
  typing(this, true);

  return setTimeout(() => {
    this.send(msg);

    if (msgs.length) {
      return sendWithNaturalDelay.call(this, msgs);
    } else {
      typing(this, false);
      return (typeof cb === 'function' ? cb() : undefined);
    }
  }
  , delay);
};

const createMatch = (text, pattern) => text.match(new RegExp(`\\b${pattern}\\b`, 'i'));

module.exports = function(config, robot) {
  security.loadUserRoles(robot);

  if (!(config.interactions != null ? config.interactions.length : undefined)) {
    robot.logger.warning('No interactions configured.');
    return;
  }
  if (!config.trust) {
    robot.logger.warning('No trust level configured.');
    return;
  }

  actionHandler.registerActions(config);
  classifier.train(config);

  return robot.hear(/(.+)/i, function(res) {
    let actionName;
    res.sendWithNaturalDelay = sendWithNaturalDelay.bind(res);
    const msg = (res.match[0].replace(res.robot.name + ' ', '')).trim();

    // check if robot should respond
    if (['c', 'p'].includes(res.envelope.user.roomType)) {
      if (createMatch(res.message.text, res.robot.name) ||
          createMatch(res.message.text, res.robot.alias)) {
        actionName = classifier.processMessage(res, msg);
        return actionHandler.takeAction(actionName, res);
      }
        // TODO: Add engaged user conversation recognition/tracking
    } else if (['d', 'l'].includes(res.envelope.user.roomType)) {
      actionName = classifier.processMessage(res, msg);
      return actionHandler.takeAction(actionName, res);
    }
  });
};

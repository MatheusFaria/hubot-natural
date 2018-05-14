/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const actionHandler = {};

const fs = require('fs');
const path = require('path');

const actionsPath = path.join(__dirname, '..', 'actions');
const actions = {};

const nodes = {};
let err_nodes = 0;

actionHandler.registerActions = function(config) {
  for (var action of Array.from(fs.readdirSync(actionsPath).sort())) {
    const action_name = action.replace(/\.coffee$/, '');
    actions[action_name] = require(path.join(actionsPath, action));
  }

  for (let interaction of Array.from(config.interactions)) {
    var name;
    ({ name, action } = interaction);
    nodes[name] = new (actions[action])(interaction);

    if (name.substr(0, 5) === "error") {
      err_nodes++;
    }
  }

  if (err_nodes === 0) {
    return console.log("WARNING! You don't have any error nodes, you need at least " +
                "one to garantee that the bot always will respond something");
  }
};

actionHandler.errorNodesCount = () => err_nodes;

actionHandler.takeAction = function(name, res) {
  if ((name == null)) {
    return res.sendWithNaturalDelay("I'm sorry Dave, I'm afraid I can't do that =/");
  } else {
    return nodes[name].process(res);
  }
};

module.exports = actionHandler;

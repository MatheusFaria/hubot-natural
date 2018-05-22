const fs = require('fs');
const yaml = require('js-yaml');

const common = {};

const applyVariable = function(string, variable, value, regexFlags) {
  if (regexFlags == null) { regexFlags = 'i'; }
  return string.replace(
    new RegExp(`(^|\\W)\\$${variable}(\\W|$)`, regexFlags),
    match => match.replace(`$${variable}`, value));
};

common.msgVariables = function(message, msg, variables) {
  if (variables == null) { variables = {}; }
  message = applyVariable(message, 'user', msg.envelope.user.name);
  message = applyVariable(message, 'bot', msg.robot.alias);
  if (msg.envelope.room != null) {
    message = applyVariable(message, 'room', msg.envelope.room);
  }

  for (let key in variables) {
    const value = variables[key];
    message = common.applyVariable(message, key, value);
  }
  return message;
};

common.stringElseRandomKey = function(variable) {
  if (typeof variable === 'string') { return variable; }
  if (variable instanceof Array) {
    return variable[Math.floor(Math.random() * variable.length)];
  }
};

common.sendMessages = function(messages, msg, variables) {
  if (variables == null) { variables = {}; }
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  messages = messages.map(message => common.msgVariables(message, msg, variables));
  return msg.sendWithNaturalDelay(messages);
};

var getYAMLFiles = function(filepath, recursive) {
  if (recursive == null) { recursive = false; }
  const listFile = fs.readdirSync(filepath);

  let dataFiles = [];
  for (let filename of Array.from(listFile)) {
    const file = filepath + '/' + filename;
    if (fs.lstatSync(file).isFile()) {
      dataFiles.push(yaml.safeLoad(fs.readFileSync(file, 'utf8')));
    } else if (recursive) {
      dataFiles = dataFiles.concat(getYAMLFiles(file, recursive));
    }
  }

  if (dataFiles.lenght === 0) {
    console.error(`The directory: ${filepath} is empty.`);
  }
  return dataFiles;
};

const concatYAMLFiles = function(dataFiles) {
  let mindBot = {};
  if (dataFiles.length > 0) {
    mindBot = { trust: dataFiles[0].trust, interactions: [] };
    dataFiles.forEach(function(element) {
      mindBot.trust = Math.min(mindBot.trust, element.trust);
      return mindBot.interactions = mindBot.interactions.concat(element.interactions);
    });
  } else {
    console.error('Data files is empty.');
  }
  return mindBot;
};

common.regexEscape = string =>
  //http://stackoverflow.com/a/6969486
  string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
;

common.getConfigFilePath = () => process.env.HUBOT_CORPUS || 'training_data/corpus.yml';

common.loadConfigfile = function(filepath) {
  try {
    console.log(`Loading corpus: ${filepath}`);

    if (fs.lstatSync(filepath).isFile()) {
      return yaml.safeLoad(fs.readFileSync(filepath, 'utf8'));

    } else if (fs.lstatSync(filepath).isDirectory()) {
      const recursiveTraining = process.env.HUBOT_RECURSIVE_TRAINING || false;
      const yamlFiles = getYAMLFiles(filepath, recursiveTraining);
      return concatYAMLFiles(yamlFiles);
    }

  } catch (err) {
    console.error("An error occurred while trying to load bot's config.");
    console.error(err);
    throw Error(`Error on loading YAML file ${filepath}`);
  }
};

module.exports = common;

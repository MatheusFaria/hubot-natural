const natural = require('natural');

const classifier = {};

const lang = (process.env.HUBOT_LANG || 'en');

let { PorterStemmer } = natural;
if (lang !== 'en') {
  const lang_captilize = lang.charAt(0).toUpperCase() + lang.slice(1);
  PorterStemmer = natural[`PorterStemmer${lang_captilize}`];
}

const actionHandler = require('./action-handler');

let config = {}

// Classifier that holds all root level interactions
let root_classifier = {};
let error_count = 0;

const ROOT_LEVEL_NAME = "root";

var classifyInteraction = function(interaction, classifier) {
  if ((interaction.expect == null)) {
    console.warn(`\t!! Interaction with no expects: ${interaction.name}`);
    return;
  }

  console.log(`\tProcessing interaction: ${interaction.name}`);

  if (!Array.isArray(interaction.expect)) {
    interaction.expect = [interaction.expect];
  }

  for (let doc of Array.from(interaction.expect)) {
    if (typeof(doc) !== 'string') {
      doc = `${doc}`;
    }
    classifier.addDocument(doc, interaction.name);
  }

  if (((interaction.next != null ? interaction.next.interactions : undefined) != null) && ((interaction.next != null ? interaction.next.classifier : undefined) == null)) {
    if (!Array.isArray(interaction.next.interactions)) {
      interactions.next.interactions = [interactions.next.interactions];
    }

    interaction.next.classifier = new natural.LogisticRegressionClassifier(
      PorterStemmer
    );
    for (var nextInteractionName of Array.from(interaction.next.interactions)) {
      const nextInteraction = config.interactions.find(n => n.name === nextInteractionName);
      if ((nextInteraction == null)) {
        console.log('No valid interaction for', nextInteractionName);
        continue;
      }
      classifyInteraction(nextInteraction, interaction.next.classifier);
    }
    return interaction.next.classifier.train();
  }
};

classifier.train = function(_config) {
  config = _config;

  console.log('Processing interactions');
  console.time('Processing interactions (Done)');

  root_classifier = new natural.LogisticRegressionClassifier(PorterStemmer);

  for (let interaction of Array.from(config.interactions)) {
    if ((interaction.level == null) ||
        (Array.isArray(interaction.level) &&
         interaction.level.includes(ROOT_LEVEL_NAME)) ||
        (interaction.level === ROOT_LEVEL_NAME)) {
      classifyInteraction(interaction, root_classifier);
    }
  }

  console.log('Training Bot (This could be take a while...)');
  root_classifier.train();

  return console.timeEnd('Processing interactions (Done)');
};

const setContext = function(res, context) {
  const key = `context_${res.envelope.room}_${res.envelope.user.id}`;
  console.log('set context', context);
  return res.robot.brain.set(key, context);
};

const getContext = function(res) {
  const key = `context_${res.envelope.room}_${res.envelope.user.id}`;
  return res.robot.brain.get(key);
};

const isDebugMode = function(res) {
  const key = `configure_debug-mode_${res.envelope.room}`;
  return (res.robot.brain.get(key) === 'true');
};

const getDebugCount = function(res) {
  const key = `configure_debug-count_${res.envelope.room}`;
  if (res.robot.brain.get(key)) {
    return res.robot.brain.get(key) - 1;
  } else {
    return false;
  }
};

const buildClassificationDebugMsg = function(res, classifications) {
  let list = '';
  const debugCount = getDebugCount(res);

  if (debugCount) {
    classifications = classifications.slice(0, +debugCount + 1 || undefined);
  }

  for (let i = 0; i < classifications.length; i++) {
    const classification = classifications[i];
    list = (list.concat(`Label: ${classification.label} Score: ` +
              classification.value + '\n'));
  }

  const newMsg = {
    channel: res.envelope.user.roomID,
    msg: "Classifications considered:",
    attachments: [{
        text: list
    }]
  };

  return newMsg;
};

const incErrors = function(res) {
  const key = `errors_${res.envelope.room}_${res.envelope.user.id}`;
  let errors = res.robot.brain.get(key) || 0;
  errors++;
  console.log('inc errors ', errors);
  res.robot.brain.set(key, errors);
  return errors;
};

const clearErrors = function(res) {
  console.log('clear errors');
  const key = `errors_${res.envelope.room}_${res.envelope.user.id}`;
  return res.robot.brain.set(key, 0);
};

classifier.processMessage = function(res, msg) {
  let error_node_name, node_name;
  const context = getContext(res);
  let currentClassifier = root_classifier;
  let { trust } = config;
  let interaction = undefined;
  const debugMode = isDebugMode(res);
  console.log('context ->', context);

  if (context) {
    interaction = config.interactions.find(interaction => interaction.name === context);
    if ((interaction != null) && ((interaction.next != null ? interaction.next.classifier : undefined) != null)) {
      currentClassifier = interaction.next.classifier;
      if (interaction.next.trust != null) {
        ({ trust } = interaction.next);
      }
    }
  }

  const classifications = currentClassifier.getClassifications(msg);

  console.log('classifications ->', classifications.slice(0, 5));

  if (debugMode) {
    const newMsg = buildClassificationDebugMsg(res, classifications);
    robot.adapter.customMessage(newMsg);
  }

  if (classifications[0].value >= trust) {
    let sub_node_name;
    clearErrors(res);
    [node_name, sub_node_name] = Array.from(classifications[0].label.split('|'));
    console.log({ node_name, sub_node_name });
    const int = config.interactions.find(interaction => interaction.name === node_name);
    if (int.classifier != null) {
      int.classifier.getClassifications(msg);
    }
  } else {
    if (Array.isArray(__guard__(interaction != null ? interaction.next : undefined, x => x.error))) {
      error_count = incErrors(res);
      error_node_name = interaction.next.error[error_count - 1];
      if ((error_node_name == null)) {
        clearErrors(res);
        error_node_name = interaction.next.error[0];
      }
    } else if ((interaction != null ? interaction.next : undefined) != null) {
      setContext(res, undefined);
      return classifier.processMessage(res, msg);
    } else {
      error_count = incErrors(res);

      if (error_count > actionHandler.errorNodesCount()) {
        clearErrors(res);
        error_count = incErrors(res);
      }

      error_node_name = `error-${error_count}`;
    }
  }

  const currentInteraction = config.interactions.find(interaction => (interaction.name === node_name) || (interaction.name === error_node_name));

  if ((currentInteraction == null)) {
    clearErrors(res);
    return console.log(`Invalid interaction [${node_name}]`);
  }

  if (currentInteraction.context === 'clear') {
    setContext(res, undefined);
  } else if (node_name != null) {
    setContext(res, node_name);
  }

  return node_name || error_node_name;
};

module.exports = classifier;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

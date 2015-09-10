// System Objects

// Third Party Dependencies

// Internal
var logs = require('../logs');

var exportables = {};

exportables.meta = {
  keywords: ['py', 'python']
};

exportables.generateProject = () => {
  logs.info(`Sorry, Python project generation isn't implemented yet. Contributions welcome!`);
};

module.exports = exportables;

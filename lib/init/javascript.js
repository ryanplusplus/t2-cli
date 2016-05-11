// System Objects
var path = require('path');
var fs = require('fs-extra');

// Third Party Dependencies
var PZ = require('promzard').PromZard;
var NPM = require('npm');

// Internal
var logs = require('../logs');

var packageJson = path.resolve('./package.json');

var pkg, ctx, options;

var exportables = {};

exportables.meta = {
  keywords: ['javascript', 'js']
};

exportables.loadNpm = () => {
  // You have to load npm in order to use it programatically
  return new Promise(function(resolve, reject) {
    NPM.load(function(error, npm) {
      if (error) {
        return reject(error);
      }
      // It then returns a npm object with functions
      resolve(npm);
    });
  });
};

// Resolve an npm cofig list, or nothing (existance is not needed)
exportables.getNpmConfig = (npm) => {
  // Always resolve, we don't care if there isn't an npm config.
  return Promise.resolve(npm.config.list || {});
};

// Builds the package.json file and writes it to the directory
exportables.buildJSON = (npmConfig) => {
  return new Promise(function(resolve, reject) {
    // Path to promzard config file
    var promzardConfig;
    ctx.config = npmConfig;
    // Default to auto config
    promzardConfig = path.resolve(__dirname, './../../', 'resources/javascript/init-default.js');
    if (options.interactive) {
      promzardConfig = path.resolve(__dirname, '/../../', 'resources/javascript/init-config.js');
    }

    // Init promozard with appropriate config.
    var pz = new PZ(promzardConfig, ctx);

    // On data resolve the promise with data
    pz.on('data', function(data) {
      if (!pkg) {
        pkg = {};
      }
      Object.keys(data).forEach(function(k) {
        if (data[k] !== undefined && data[k] !== null) {
          pkg[k] = data[k];
        }
      });

      logs.info('Created package.json.');
      resolve(data);
    });

    // On error, reject with error;
    pz.on('error', function(error) {
      reject(error);
    });
  });
};

// Returns the dependencies of the package.json file
exportables.getDependencies = (pkg) => {
  if (!pkg.dependencies) {
    return [];
  }
  var dependencies = [];
  for (var mod in pkg.dependencies) {
    dependencies.push(mod + '@' + pkg.dependencies[mod]);
  }
  return dependencies;
};

// Installs npm and dependencies
exportables.npmInstall = (dependencies) => {
  return new Promise((resolve, reject) => {

    // If there are no depencencies resolve
    if (!dependencies.length) {
      return resolve();
    }

    // load npm to get the npm object
    exportables.loadNpm()
      .then((npm) => {
        npm.commands.install(dependencies, function(error) {
          if (error) {
            reject(error);
          }
          resolve();
        });
      });
  });
};

// // Generates blinky for JavaScript
exportables.generateJavaScriptSample = () => {
  return new Promise((resolve) => {
    var filename = 'index.js';
    // If an index.js already exists
    fs.exists(filename, function(exists) {
      // just return
      if (exists) {
        return resolve();
      }

      // Pipe the contents of the default file into a new file
      fs.createReadStream(path.resolve(__dirname, './../../', 'resources/javascript', filename))
        .pipe(fs.createWriteStream(filename));

      logs.info('Wrote "Hello World" to index.js');
      return resolve();
    });
  });
};

exportables.createTesselinclude = () => {
  var tesselinclude = '.tesselinclude';
  return new Promise((resolve) => {
    fs.exists(tesselinclude, (exists) => {
      if (exists) {
        return resolve();
      }

      fs.copySync(path.resolve(__dirname, './../../', 'resources/javascript', tesselinclude), tesselinclude);
      logs.info('Created .tesselinclude.');
      resolve();
    });
  });
};

exportables.readPackageJson = () => {
  return new Promise(function(resolve, reject) {
    fs.readFile(packageJson, 'utf8', function(err, data) {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

exportables.writePackageJson = (data) => {
  return new Promise(function(resolve, reject) {
    fs.writeFile(packageJson, data, function(err) {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

exportables.prettyPrintJson = (data) => {
  return JSON.stringify(data, null, 2);
};

exportables.generateProject = (opts) => {

  // Make the options global
  options = opts;

  logs.info('Initializing new Tessel project for JavaScript...');
  return exportables.readPackageJson()
    .then(function(data) {

      // Try to parse current package JSON
      try {
        ctx = pkg = JSON.parse(data);
      } catch (e) {
        // if it can't parse, then just make an object
        ctx = {};
      }

      ctx.dirname = path.dirname(packageJson);
      ctx.basename = path.basename(ctx.dirname);

      if (!ctx.version) {
        ctx.version = undefined;
      }
      return ctx;
    })
    .catch(function() {
      ctx = {};
      ctx.dirname = path.dirname(packageJson);
      ctx.basename = path.basename(ctx.dirname);
      ctx.version = undefined;
      return ctx;
    })
    .then(exportables.loadNpm)
    .then(exportables.getNpmConfig)
    .then(exportables.buildJSON)
    .then(exportables.prettyPrintJson)
    .then(exportables.writePackageJson)
    .then(exportables.readPackageJson)
    .then(JSON.parse)
    .then(exportables.getDependencies)
    .then(exportables.npmInstall)
    .then(exportables.createTesselinclude)
    .then(exportables.generateJavaScriptSample)
    .catch(function(error) {
      logs.error(error);
    });
};

module.exports = exportables;

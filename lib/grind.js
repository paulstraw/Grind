#! /usr/bin/env node

var async = require('async'),
	clc = require('cli-color'),
	fs = require('fs'),
	cp = require('child_process'),
	spawn = cp.spawn,
	config,
	files = [];

function initGrind(otherDir) {
	// `whateverSync()` methods are okay here, because this is initialization stuff. Also, because I'm lazy.
	var us = require('underscore'),
		gfDefaults = {
			"out": "grind-out.js",
			"uglify": true,
			"hint": true,
			"paths": []
		};

	if (otherDir) {
		try {
			process.chdir(otherDir);
		} catch (err) {
			console.error(clc.red('Looks like ' + otherDir + ' isn\'t a valid directory.'));
			process.exit(1);
		}
	}

	var grindfilePath = process.cwd() + '/Grindfile';

	if (fs.existsSync(grindfilePath)) {
		try {
			var grindConfig = JSON.parse(fs.readFileSync(grindfilePath, 'utf8'));
			config = us.defaults(grindConfig, gfDefaults);

			grind();
		} catch (err) {
			console.error(clc.red('Something went wrong. Maybe your Grindfile syntax is messed up?'));
			process.exit(1);
		}
	} else {
		console.error(clc.red('No Grindfile exists in ' + process.cwd()));
		process.exit(1);
	}
}

function cpExec(command, callback) {
	var proc = cp.exec(command, {
		cwd: process.cwd()
	});

	proc.stdout.setEncoding('utf8');
	proc.stdout.on('data', function(data) {
		console.log(data);
	});

	proc.stderr.on('data', function(data) {
		console.error(clc.red(data));
		process.exit(1);
	});

	proc.on('exit', function(code) {
		if (code != 0) {
			console.error(clc.red('Before command exited with code: ' + code));
			process.exit(1);
		}

		callback();
	});
}

function grind() {
	if (config.before) {
		cpExec(config.before, kickoffPathParsing);
	} else {
		kickoffPathParsing();
	}
}

function kickoffPathParsing() {
	async.forEachSeries(config.paths, parseConfigPath, function(err) {
		if (err) throw err;

		// All files have been processed and added to our "global" `files` array.
		compileCoffee();
	});
}

function parseConfigPath(path, callback) {
	fs.exists(path, function(exists) {
		if (!exists) {
			console.warn(clc.yellow(path + ' doesn\'t exist.'));
			callback();
			return;
		}

		fs.stat(path, function(err, stats) {
			if (err) throw err;

			if (stats.isFile()) {
				var fileObj = {
					path: path,
					language: path.substring(path.lastIndexOf('.') + 1)
				};

				fs.readFile(path, 'utf8', function(err, content) {
					if (err) callback(err);

					fileObj.content = content;
					files.push(fileObj);

					callback();
				});
			} else {
				fs.readdir(path, function(err, subPaths) {
					if (err) callback(err);

					async.map(subPaths, function(subPath, cb) {
						cb(null, path + '/' + subPath);
					}, function(err, paths) {
						async.forEachSeries(paths, parseConfigPath, function(err) {
							callback(err);
						});
					});
				});
			}
		});
	});
}

function compileCoffee() {
	async.forEach(files, function(file, callback) {
		if (file.language != 'coffee') {
			callback();
			return;
		}

		var coffeeScript = require('coffee-script');

		file.content = coffeeScript.compile(file.content, {filename: file.path});

		callback();
	}, function(err) {
		if (err) {
			console.error(clc.red('Converting ' + err + ' to JavaScript failed.'));
			process.exit(1);
		}

		config.hint ?
			hint() :
			concatAndUglify();
	});
}

function hint() {
	var hint = require('jshint').JSHINT,
		hintOpts = config.hint === true ? null : config.hint;

	async.forEachSeries(files, function(file, callback) {
		var hinted = hint(file.content, hintOpts);

		if (!hinted) {
			if (hint.errors[hint.errors.length - 1] === null) {
				console.error(clc.red('JSHint encountered a fatal error in ' + file.path));
				process.exit(1);
			}

			console.warn(clc.yellow('JSHint found ' + hint.errors.length + ' problem(s) with ' + file.path + '.'));

			async.forEachSeries(hint.errors, function(error, cb) {
				console.warn('	' + error.line + '.' + error.character + ': ' + error.reason);
				cb();
			}, function() {
				callback();
			});
		} else {
			callback();
		}
	}, function(err) {
		if (err) throw err;

		concatAndUglify();
	});
}

function concatAndUglify() {
	async.reduce(files, '', function(memo, file, callback) {
		callback(null, memo + file.content + '\n');
	}, function(err, combinedFiles) {
		if (err) throw err;

		if (config.uglify) {
			var uglify = require('uglify-js'),
				uglifiedFiles = uglify.minify(combinedFiles, {
					fromString: true
				}).code;

			write(uglifiedFiles);
		} else {
			write(combinedFiles);
		}
	});
}

function write(content) {
	fs.writeFile(config.out, content, 'utf8', function(err) {
		if (err) {
			console.error(clc.red('There was a problem writing the specified Grind output file.'));
			process.exit(1);
		}

		if (config.after) {
			cpExec(config.after, writeSuccess);
		} else {
			writeSuccess();
		}
	});
}

function writeSuccess() {
	console.log(clc.green('Grind finished compiling to ' + config.out));
}

// Run Grind
initGrind(process.argv[2]);
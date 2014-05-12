#!/usr/bin/env node

'use strict';

var fs = require('fs');
var glob = require('glob');
var watchGlob = require('watch-glob');
var watchify = require('watchify');
var browserify = require('browserify');

var cors_proxy = require('corsproxy');
var http_proxy = require('http-proxy');
var http_server = require('http-server');

var performanceBundle = './dist/performance-bundle.js';
var queryParams = {};

if (process.env.ES5_SHIM || process.env.ES5_SHIMS) {
  queryParams.es5shim = true;
}
if (process.env.ADAPTERS) {
  queryParams.adapters = process.env.ADAPTERS;
}

var indexfile = "./lib/index.js";
var outfile = "./dist/pouchdb-nightly.js";
var perfRoot = './tests/performance/*.js';


var w = watchify(indexfile).on('update', bundle);
bundle();

function writeFile(file) {
  return function (err, data) {
    if (err) {
      console.log(err);
    } else {
      fs.writeFileSync(file, data);
      console.log('Updated: ', file);
    }
  };
}

function bundle() {
  w.bundle({standalone: "PouchDB"}, writeFile(outfile));
}

function bundlePerfTests() {
  glob(perfRoot, function (err, files) {
    var b = browserify(files);
    b.bundle({}, writeFile(performanceBundle));
  });
}

watchGlob(perfRoot, bundlePerfTests);
bundlePerfTests();

var COUCH_HOST = process.env.COUCH_HOST || 'http://127.0.0.1:5984';

var HTTP_PORT = 8000;
var CORS_PORT = 2020;

function startServers(couchHost) {
  http_server.createServer().listen(HTTP_PORT);
  cors_proxy.options = {target: couchHost || COUCH_HOST};
  http_proxy.createServer(cors_proxy).listen(CORS_PORT);
  var testRoot = 'http://127.0.0.1:' + HTTP_PORT;
  var query = '';
  Object.keys(queryParams).forEach(function (key) {
    query += (query ? '&' : '?');
    query += key + '=' + encodeURIComponent(queryParams[key]);
  });
  console.log('Integration tests: ' + testRoot +
              '/tests/test.html' + query);
  console.log('Performance tests: ' + testRoot +
              '/tests/performance/test.html');
}


if (require.main === module) {
  startServers();
} else {
  module.exports.start = startServers;
}

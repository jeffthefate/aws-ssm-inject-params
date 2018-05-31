'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSsmValueFromAws = exports.lastPathToken = exports.isSsmString = exports.pullValueFromSsm = exports.cleanupResults = exports.findLastPathKey = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _traverse = require('traverse');

var _traverse2 = _interopRequireDefault(_traverse);

var _awsParamStore = require('aws-param-store');

var _awsParamStore2 = _interopRequireDefault(_awsParamStore);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isSsmStringRegex = /^aws-ssm:\/(\/[\w-]+[^|]*)\|?([^|]+)?/;
var lastPathToken = /(.*?)(\/[^/]+)$/;

var findLastPathKey = function findLastPathKey(path) {
  var matched = path.match(lastPathToken);
  if (matched) {
    return {
      path: matched[1],
      key: matched[2],
      full: path
    };
  }
  return matched;
};

var cleanupResults = function cleanupResults(path, results) {
  var levelUp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var newStructure = {};

  results.map(function (el) {
    var re = new RegExp('^' + path + '/?');
    var elPath = el.Name.replace(re, '');
    if (elPath === '') {
      newStructure = el.Value;
      return true;
    }
    if (!levelUp) {
      _objectPath2.default.set(newStructure, elPath.replace('/', '.'), el.Value);
    }
    return true;
  });

  return newStructure;
};

var getSsmValueFromAws = function getSsmValueFromAws(path) {
  var result = _awsParamStore2.default.newQuery(path).executeSync();
  return result;
};

var pullValueFromSsm = function pullValueFromSsm(path) {
  var results = getSsmValueFromAws(path);
  if (results.length > 0) return cleanupResults(path, results);

  var subKey = findLastPathKey(path);
  var parentResults = getSsmValueFromAws(subKey.path);
  var cleanResults = cleanupResults(path, parentResults, true);
  if ((0, _keys2.default)(cleanResults).length === 0) {
    throw new Error('Path ' + path + ' not found in parameter store!');
  }
  return cleanResults;
};

var isSsmString = function isSsmString(element) {
  return element.match(isSsmStringRegex);
};

exports.default = {
  getValuesFromSsm: function getValuesFromSsm(data) {
    return (0, _traverse2.default)(data).map(function (element) {
      if (typeof element === 'string') {
        var match = isSsmString(element);
        if (match) {
          var newValue = pullValueFromSsm(match[1]) || '';
          if (match.length >= 3 && match[2]) {
            return newValue + match[2];
          }
          return newValue;
        }
      }
      return element;
    });
  },
  getSsmValue: function getSsmValue(path) {
    return getSsmValueFromAws(path);
  }
};
exports.findLastPathKey = findLastPathKey;
exports.cleanupResults = cleanupResults;
exports.pullValueFromSsm = pullValueFromSsm;
exports.isSsmString = isSsmString;
exports.lastPathToken = lastPathToken;
exports.getSsmValueFromAws = getSsmValueFromAws;

'use strict';

var Fireproof = require('./lib/core');
require('./lib/snapshot')(Fireproof);
require('./lib/query')(Fireproof);
require('./lib/read')(Fireproof);
require('./lib/write')(Fireproof);
require('./lib/on-disconnect')(Fireproof);
require('./lib/fireproof-simple-login')(Fireproof);

module.exports = Fireproof;

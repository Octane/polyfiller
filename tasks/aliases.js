'use strict';

module.exports = {
    build: [
        'clean:cache',
        'babel:build',
        'symlink:build',
        'execute:features',
        'includes:features'
    ],

    test: [
        'build',
        'jshint:lint',
        'babel:tests',
        'mock:api',
        //'benchmark:api',
        //'mochaTest:api',
        'mocha_istanbul:api',
        'karma:api',
    ],

    lint: [
        'jshint:lint'
    ],

    default: [ ]
};

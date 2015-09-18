'use strict';

require('../configfile').watch_files = false;
var vm_harness     = require('./fixtures/vm_harness');
var fs             = require('fs');
var vm             = require('vm');
var config         = require('../config');
var path           = require('path');
var util_hmailitem = require('./fixtures/util_hmailitem');

var queue_dir = path.resolve(__dirname + '/test-queue/');

var ensureTestQueueDirExists = function(done) {
    fs.exists(queue_dir, function (exists) {
        if (exists) {
            done();
        }
        else {
            fs.mkdir(queue_dir, function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        }
    });
};

var removeTestQueueDir = function(done) {
    fs.exists(queue_dir, function (exists) {
        if (exists) {
            var files = fs.readdirSync(queue_dir);
            files.forEach(function(file,index){
                var curPath = queue_dir + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    return done(new Error('did not expect an sub folder here ("' + curPath + '")! cancel'));
                }
            });
            files.forEach(function(file,index){
                var curPath = queue_dir + "/" + file;
                fs.unlinkSync(curPath);
            });
            done();
        }
        else {
            done();
        }
    });
};

exports.outbound_protocol_tests = {
    setUp : ensureTestQueueDirExists,
    tearDown : removeTestQueueDir,
};



var tests = fs.readdirSync(path.join(__dirname, 'outbound_protocol')).filter(function (element) {
    return element.match(/^\./) == null && element.match(/\.js$/);
});
for (var x = 0; x < tests.length; x++) {
    var test_file = tests[x];
    exports.outbound_protocol_tests[test_file] = make_test(path.join(__dirname, '/../outbound.js'), path.join(__dirname, 'outbound_protocol', test_file));
}

function make_test(module_path, test_path) {
    return function (test) {
        var code = fs.readFileSync(module_path);
        code += fs.readFileSync(test_path);
        var sandbox = {
            require: vm_harness.sandbox_require,
            console: console,
            Buffer: Buffer,
            exports: {},
            process: process,
            test: test,
            setTimeout: setTimeout,
            test_queue_dir: queue_dir, // will be injected into the test-module
        };
        vm.runInNewContext(code, sandbox);
    };
}

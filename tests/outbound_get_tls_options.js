'use strict';

var fs   = require('fs');
var path = require('path');

exports.get_tls_options = {
    setUp : function (done) {
        process.env.HARAKA_TEST_DIR=path.resolve('tests');
        this.outbound = require('../outbound/index');
        this.get_tls_options = require('../outbound/_get_tls_options');
        done();
    },
    tearDown: function (done) {
        process.env.HARAKA_TEST_DIR='';
        done();
    },
    'gets TLS properties from tls.ini.outbound': function (test) {
        test.expect(1);

        // reset config to load from tests directory
        var testDir = path.resolve('tests');
        this.outbound.net_utils.config = this.outbound.net_utils.config.module_config(testDir);
        this.outbound.config = this.outbound.config.module_config(testDir);

        var tls_config = this.get_tls_options(
            { exchange: 'mail.example.com'}
        );

        test.deepEqual(tls_config, {
            servername: 'mail.example.com',
            key: fs.readFileSync(path.resolve('tests','config','tls_key.pem')),
            cert: fs.readFileSync(path.resolve('tests','config','tls_cert.pem')),
            dhparam: fs.readFileSync(path.resolve('tests','config','dhparams.pem')),
            ciphers: 'ECDHE-RSA-AES256-GCM-SHA384',
            rejectUnauthorized: false,
            requestCert: false,
            honorCipherOrder: false
        });
        test.done();
    },
}


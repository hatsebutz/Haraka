'use strict';

require('../configfile').watch_files = false;
var util_hmailitem = require('./fixtures/util_hmailitem');
var TODOItem    = require('../outbound/todo');
var outbound    = require('../outbound');
var config      = require('../config');
var mock_sock   = require('./fixtures/line_socket');

var outbound_context = {
    TODOItem: TODOItem,
    outbound: outbound
};

exports.bounce_3464 = {
    'test MAIL FROM responded with 500 5.0.0 triggers send_email() containing bounce msg with codes and message': function (test) {
        test.expect(9);

        util_hmailitem.newMockHMailItem(outbound_context, test, {}, function (mock_hmail){
            var mock_socket = mock_sock.connect('testhost', 'testport');
            mock_socket.writable = true;

            var orig_send_email = outbound_context.outbound.send_email;
            outbound_context.outbound.send_email = function (from, to, contents, cb, opts) {
                test.ok(true, 'outbound.send_email called');
                test.ok(contents.match(/^Content-type: message\/delivery-status/m), 'its a bounce report');
                test.ok(contents.match(/^Final-Recipient: rfc822;recipient@domain/m), 'bounce report contains final recipient');
                test.ok(contents.match(/^Action: failed/m), 'DATA-5XX: bounce report contains action field');
                test.ok(contents.match(/^Status: 5\.0\.0/m), 'bounce report contains status field with ext. smtp code');
                test.ok(contents.match(/Absolutely not acceptable\. Basic Test Only\./), 'original upstream message available');
                outbound_context.outbound.send_email = orig_send_email;

                test.done();
            };

            // The playbook
            // from remote: This line is to be sent (from an mocked remote SMTP) to haraka outbound. This is done in this test.
            // from haraka: Expected answer from haraka-outbound to the mocked remote SMTP.
            //              'test' can hold a function(line) returning true for success, or a string tested for equality
            var testPlaybook = [
                // Haraka connects, we say first
                { 'from': 'remote', 'line': '220 testing-smtp' },

                { 'from': 'haraka', 'test': function (line) { return line.match(/^EHLO /); }, 'description': 'Haraka should say EHLO' },
                { 'from': 'remote', 'line': '220-testing-smtp' },
                { 'from': 'remote', 'line': '220 8BITMIME' },

                { 'from': 'haraka', 'test': 'MAIL FROM:<sender@domain>' },
                { 'from': 'remote', 'line': '500 5.0.0 Absolutely not acceptable. Basic Test Only.' },

                { 'from': 'haraka', 'test': 'RSET', end_test: true }, // this will trigger calling the callback
            ];

            util_hmailitem.playTestSmtpConversation(mock_hmail, mock_socket, test, testPlaybook, function () {

            });
        });
    },
}


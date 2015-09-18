'use strict';

test.expect(7);

// What is tested:
// A simple SMTP conversation is made
// At one point, the mocked remote SMTP says "5XX"
// and we test that outbound.send_email is called with a RFC3464 bounce message

// we copy over here "test_queue_dir" from vm-sandbox to the queue_dir back
// (queue_dir is outbound-private var introduced at the beginning of outbound.js)
var queue_dir = test_queue_dir;

var util_hmailitem = require('./../fixtures/util_hmailitem');
var mock_sock      = require('./../fixtures/line_socket');

// create a dummy HMailItem for testing
util_hmailitem.createHMailItem(
    {
        TODOItem: TODOItem,
        exports: exports,
    }, // outbound context
    {

    },
    function (err, hmail) {
        if (err) {
            test.ok(false, 'Could not create HMailItem: ' + err);
            test.done();
            return;
        }
        if (!hmail.todo) {
            hmail.once('ready', function () {
                runBasicSmtpConversation(hmail);
            });
        }
        else {
            runBasicSmtpConversation(hmail);
        }
    }
);

exports.send_email = function (from, to, contents, cb, opts) {
    test.ok(true, 'outbound.send_email called');
    // console.log(contents);
    test.ok(contents.match(/^Content-type: message\/delivery-status/m), 'its a bounce report');
    test.ok(contents.match(/^Final recipient: rfc822;recipient@domain/m), 'bounce report contains final recipient');
    test.ok(contents.match(/^Status: 5\.0\.0/m), 'bounce report contains status field with our ext. smtp code');
    test.done();
};

function runBasicSmtpConversation(hmail) {
    var mock_socket = mock_sock.connect('testhost', 'testport');
    mock_socket.writable = true;

    // The playbook
    // from remote: This line is to be sent (from an mocked remote SMTP) to haraka outbound. This is done in this test.
    // from haraka: Expected answer from haraka-outbound to the mocked remote SMTP.
    //              'test' can hold a function(line) returning true for success, or a string tested for equality
    var testPlaybook = [
        // Haraka connects, we say first
        { 'from': 'remote', 'line': '220 testing-smtp' },

        { 'from': 'haraka', 'test': function(line) { return line.match(/^EHLO /); }, 'description': 'Haraka should say EHLO', },
        { 'from': 'remote', 'line': '220-testing-smtp' },
        { 'from': 'remote', 'line': '220 8BITMIME' },

        { 'from': 'haraka', 'test': 'MAIL FROM:<sender@domain>' },
        { 'from': 'remote', 'line': '500 5.0.0 Absolutely not acceptable. Basic Test Only.' },

        { 'from': 'haraka', 'test': 'QUIT', end_test: true }, // this will trigger calling the callback
    ];

    util_hmailitem.playTestSmtpConversation(hmail, mock_socket, test, testPlaybook, function() {
        // test done covered in stubbed outbound.send_email
    });

}



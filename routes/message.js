var ampq = require('amqp');
var util = require('util');
var async = require('async');
var queryString = require('querystring');
var util = require('util');

var QUEUE_NAME = 'messageQueue';
var gConnection;
var gQueue;

// Show the "send message" page
exports.sendMessage = function (req, res) {
    res.render('sendMessage');
};

// Handle the posted message
exports.postMessage = function (req, res) {
    // get the messageBody and send it to queue
    if (req.body.messageBody) {
        async.series([
            function (callback) { initConnection(callback) },
            function (callback) {
                gConnection.publish(QUEUE_NAME, { date: Date.now(), message: req.body.messageBody });
                res.redirect(301, '/message/send?' + queryString.stringify({ isMessageSent: 1, messageBody: req.body.messageBody }));
            }], function (err, results) { });
    }
};


// Get all the messages from the queue and show "view message" page
exports.viewMessage = function (req, res) {
    var messages = [];

    //messages.push({ date: Date.now(), message: "abc" });
    //messages.push({ date: Date.now(), message: "sfasf" });
    //messages.push({ date: Date.now(), message: "sfasfasdf" });
    async.series([
        function (callback) { initConnection(callback) },
        function (callback) {
            var defer = gQueue.subscribe({ ack: true}, function (message, header, deliveryInfo) {
                console.log(util.inspect(message));
                if (message) {
                    messages.push(message);
                }
            });
            defer.addCallback(function () {
                console.log("addCallback");
                // show view message page
                res.render('viewMessage', { messages: messages });
            });
        }], function (err, results) { });
};

function rabbitUrl() {
    if (process.env.VCAP_SERVICES) {
        conf = JSON.parse(process.env.VCAP_SERVICES);
        return conf['rabbitmq-2.4'][0].credentials.url;
    }
    else {
        return "amqp://localhost";
    }
}

function initConnection(callback) {
    if (gConnection) {
        if (!gQueue) {
            // spinning waiting until the gQueue is ready
            setTimeout(initConnection, 10, callback);
        }
        // If the gQueue is ready, then directly return.
        callback();
        return;
    }

    gConnection = ampq.createConnection({ url: rabbitUrl() });
    gConnection.on('ready', function () {
        gConnection.queue(QUEUE_NAME, { durable: true, autoDelete: false }, function (queue) {
            gQueue = queue;
            console.log('Queue ' + queue.name + ' is open!');
            callback();
        });
    });
}
// A highroller sits around collecting coins until
// a sufficiently favorable outcome looks likely for the hero, then 
// dumps all their coins on the other high EV outcomes
var irc = require("irc");
var _ = require('lodash');
var colors = require('colors');
var fs = require("fs");
var lib = require('./lib.js');
module.exports = function (account) {
    var settings = {
        channels : ["#amiibofighter"],
        server : "irc.twitch.tv",
        port: 6667,
        secure: false,
        nick : account.nick,
        password : account.password,
    };
    // Keep track of time so don't have to ask more than once
    var queryTime = new Date().getTime();
    var myCoins = (function () {
        // This is a dumb hack to make sure bot is fully initialized
        setTimeout(function () { bot.say("#amiibofighter", "!coins"); }, lib.Dist(4000, 3000));
        return 5;
    })();
    var bot = new irc.Client(settings.server, settings.nick, {
        channels: [settings.channels + " " + settings.password],
        debug: false,
        password: settings.password,
        username: settings.nick
    });
    // Add listener just for the coin command
    bot.addListener("message", function (uname, channelname, message, opts) {
        switch (uname) {
            case "jtv":// some sort of state stuff. All the parameters are weird if this is the uname
                return;
            case "amiibofighter":
                parseMessage(message);
                break;
            case "stockbets":
                parseMessage(message);
                break;
            default:
                break;
        }        ;
    });
    function parseMessage(m) {
        if (m.indexOf("coins: ") === 0) {
            if (m.indexOf(account.nick + " - ") !== -1) {
                // Update our coins
                var s = m.split(account.nick + " - ").pop().split(",")[0];
                myCoins = parseInt(s, 10);
                queryTime = new Date().getTime();
            }
            return;
        }
    }
    return {
        bet: function bet(index, amt) {
            bot.say("#amiibofighter", "!bet " + Math.min(amt, myCoins) + " " + (index + 1));
        },
        nick: settings.nick,
    };
};
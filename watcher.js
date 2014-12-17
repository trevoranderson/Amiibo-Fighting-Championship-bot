// These guys just watch the game, and get coins for free
var irc = require("irc");
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
     var bot = new irc.Client(settings.server, settings.nick, {
        channels: [settings.channels + " " + settings.password],
        debug: false,
        password: settings.password,
        username: settings.nick
    });
};
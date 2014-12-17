// Troller wastes all coins on low EV bets, and makes unreal bets
var irc = require("irc");
var _ = require('lodash');
var colors = require('colors');
var fs = require("fs");
var lib = require('./lib.js');
module.exports = exports = function (troll) {
    var settings = {
        channels : ["#amiibofighter"],
        server : "irc.twitch.tv",
        port: 6667,
        secure: false,
        nick : troll.nick,
        password : troll.password,
    };
    var myCoins = 5;
    
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
            if (m.indexOf(troll.nick + " - ") !== -1) {
                // Update our coins
                var s = m.split(troll.nick + " - ").pop().split(",")[0];
                myCoins = parseInt(s, 10);
            }
            return;
        }
    }
    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    // Out of the bets available, choose something bad
    // otherwise, choose something with a minimal upside
    var EV_Bet = function EV_Bet(gs, cb) {
        var EVs = BetEVs(gs).reverse();
        var lastPos = (function () {
            var ret = 1; // Start at one so if we mess up, we can use it as noninclusive right side
            for (; ret < EVs.length; ret++) {
                if (EVs[ret].value - EVs[ret].bet >= 0) {
                    break;
                }
            }
            return ret;
        })();
        var ind = EVs[randomIntFromInterval(0, lastPos - 1)].index;
        bot.say("#amiibofighter", "!bet " + myCoins + " " + (ind + 1));
        cb(myCoins, ind);
        console.log(("Losebet: " + myCoins + " " + ind).bgMagenta.white);
    }
    // Out of the bets available, choose something good
    // otherwise, choose something with a minimal downside    
    var Troll_Bet = function Troll_Bet(proportion, gs) {
        winDist = lib.getDistribution(gs.scores);
        var TotalBet = _.foldl(gs.currentBets, function (acc, elem) {
            return acc + elem;
        }, 0);
        var EVs = BetEVs(gs);
        var lastPos = (function () {
            var ret = 1; // Start at one so if we mess up, we can use it as noninclusive right side
            for (; ret < EVs.length; ret++) {
                if (EVs[ret].value - EVs[ret].bet <= 0) {
                    break;
                }
            }
            return ret;
        })();
        var ind = EVs[randomIntFromInterval(0, lastPos - 1)].index;
        bot.say("#amiibofighter", "!bet " + Math.max(myCoins + 1, Math.ceil(TotalBet * winDist[ind] * proportion)) + " " + (ind + 1));
        console.log(("Trolling on index: " + ind).bgRed.white);
    }
    // Returns bad ones first
    var BetEVs = function BetEVs(gs) {
        betDist = lib.getDistribution(gs.currentBets);
        winDist = lib.getDistribution(gs.scores);
        var TotalBet = _.foldl(gs.currentBets, function (acc, elem) {
            return acc + elem;
        }, 0);
        var EV_Tuples = [];
        gs.currentBets.forEach(function (v, i) {
            var maxBet = Math.ceil((winDist[i] * myCoins) / 15);
            var myBet = bestValue(TotalBet, gs.currentBets[i], winDist[i], maxBet);
            var valueBet = lib.expectedValue(myBet, winDist[i], TotalBet, gs.currentBets[i]);
            EV_Tuples.push({ bet: myBet, value: valueBet, index: i });
        });
        EV_Tuples.sort(function (a, b) {
            return ((a.value - a.bet) < (b.value - b.bet))? 1: -1;
        });
        return EV_Tuples;
    }
    var bestValue = function bestValue(Tot, t_x, p_x, max_bet) {
        // Never bet more than max or less than 1
        var locMaxes = {
            vb: 1,
            v1: ((0 - (2 * Tot + 2 * t_x)) + Math.sqrt((2 * Tot + 2 * t_x) * (2 * Tot + 2 * t_x) - (4 * Tot * t_x))) / 2,
            v2: ((0 - (2 * Tot + 2 * t_x)) - Math.sqrt((2 * Tot + 2 * t_x) * (2 * Tot + 2 * t_x) - (4 * Tot * t_x))) / 2,
            ve: max_bet,
        }
        var results = {
            vb: lib.expectedValue(locMaxes.vb, p_x, Tot, t_x) - 1, // The minus is so EV is profit
            ve: lib.expectedValue(locMaxes.ve, p_x, Tot, t_x) - max_bet, 
        };
        if (locMaxes.v1 > 1 && locMaxes.v1 < max_bet) {
            results.v1 = lib.expectedValue(locMaxes.v1, p_x, Tot, t_x) - locMaxes.v1;
        }
        if (locMaxes.v2 > 1 && locMaxes.v2 < max_bet) {
            results.v2 = lib.expectedValue(locMaxes.v2, p_x, Tot, t_x) - locMaxes.v2;
        }
        var maxkey = (function () {
            var retkey = "vb";
            var retval = -9999;
            for (key in results) {
                if (results.hasOwnProperty(key)) {
                    if (results[key] > retval) {
                        retval = results[key];
                        retkey = key;
                    }
                }
            }
            return retkey;
        })();
        return locMaxes[maxkey];
    }
    return {
        troll: Troll_Bet,
        badbet: EV_Bet,
        updateCoins: function () {
            return bot.say("#amiibofighter", "!coins");
        },
        nick: settings.nick,
    };
}
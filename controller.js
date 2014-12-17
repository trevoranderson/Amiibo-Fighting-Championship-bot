// We will view the game from the perspective of the maximizer
var irc = require("irc");
var _ = require('lodash');
var colors = require('colors');
var fs = require("fs");
var lib = require('./lib.js');
var accounts = require('./accounts.js');

// Initialize trollers
var MaxActiveTrolls = Math.min(accounts.trolls.length, 3);
var AllTrollAccounts = _.map(accounts.trolls, function (troll) {
    return require('./troller.js')(troll);
});
var trollAccounts = _.take(lib.shuffle(AllTrollAccounts), MaxActiveTrolls);
// Let them auto cycle on a random infrequent basis.
(function cycleTroll() {
    if (AllTrollAccounts.length === trollAccounts.length) { return; }
    var ind_out = Math.floor(Math.random() * trollAccounts.length);
    // loop until the next account isn't already in action
    var ind_in = Math.floor(Math.random() * AllTrollAccounts.length);
    while (lib.indexOf(trollAccounts, function (a) {
        return a.nick === AllTrollAccounts[ind_in].nick;
    }) !== -1) {
        ind_in = Math.floor(Math.random() * AllTrollAccounts.length);
    }
    //console.log(("out: " + trollAccounts[ind_out].nick + " in: " + AllTrollAccounts[ind_in].nick).bgYellow.black);
    trollAccounts[ind_out] = AllTrollAccounts[ind_in];
    console.log((JSON.stringify(_.map(trollAccounts, function (t) { return t.nick; }))).bgYellow.black);
    setTimeout(cycleTroll, lib.Dist(300000, 200000));
})();

var highRollAccounts = _.map(accounts.highrollers, function (hr) {
    return require('./highroller.js')(hr);
});
var watchers = _.map(accounts.watchers, function (wr) {
    return require('./watcher.js')(wr);
});
var settings = {
    channels : ["#amiibofighter"],
    server : "irc.twitch.tv",
    port: 6667,
    secure: false,
    nick : accounts.maximizer.nick,
    password : accounts.maximizer.password,
}
var bot = new irc.Client(settings.server, settings.nick, {
    channels: [settings.channels + " " + settings.password],
    debug: false,
    password: settings.password,
    username: settings.nick,
});

// Global Game state (only stored here)
var state = {
    trollers: lib.strArrToObj(_.map(accounts.trolls, function (t) { return t.nick.toLowerCase(); })),
    currentBets : [0, 0, 0, 0, 0, 0, 0, 0],
    currentBetters : {}, // Maps unames to amount bet
    scores : JSON.parse(fs.readFileSync("scores.json", 'utf8')).scores,
}
var betWindowOpen = true;
// Aliased here for easier access
var trollers = state.trollers;
var currentBets = state.currentBets;
var currentBetters = state.currentBetters; // Maps unames to amount bet
var scores = state.scores;
// State operations:
// Exponentially decays all scores, but adds a little bit to the winner's
var adjustScores = function adjustScores(winInd) {
    for (var i = 0; i < scores.length; i++) {
        scores[i] *= 0.99;
    }
    scores[winInd] += 1;
    fs.writeFile("scores.json", JSON.stringify({ scores: scores }), 'utf8');
}
// Don't care about old bets.
var resetBets = function resetBets() {
    for (var i = 0; i < currentBets.length; i++) {
        currentBets[i] = 0;
    }
    currentBetters = {};
}

// Maximizer's state only
var myCoins = 5; // Changed by listeners

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
    }    ;
    var trimmed = message.trim();
    if (trimmed.indexOf("!bet") === 0) {
        parseBet(trimmed, uname);
    }
});
// Only deals with control messages (broadcaster and stockbets)
function parseMessage(m) {
    if (m.indexOf("coins: ") === 0) {
        // Only care about coins going to the maximizer
        if (m.indexOf(settings.nick + " - ") !== -1) {
            // Update our coins
            var s = m.split(settings.nick + " - ").pop().split(",")[0];
            myCoins = parseInt(s, 10);
            console.log(m);
        }
        return;
    }
    console.log(m);
    if (m.indexOf("!gamble close") === 0) {
        betWindowOpen = false;
        return;
    }
    if (m.indexOf("!gamble open") === 0) {
        setTimeout(function () { bot.say("#amiibofighter", "!coins"); }, lib.Dist(4, 4));
        _.each(trollAccounts, function (troll) {
            setTimeout(function () { troll.updateCoins(); }, lib.Dist(6000, 5000));
        });
        betWindowOpen = true;
        return;
    }
    if (m.indexOf("!gamble winner") === 0) {
        var winner = parseInt(m.split("!gamble winner ").pop(), 10) - 1;
        adjustScores(winner);
        resetBets();
        return;
    }
    if (m.indexOf("Betting open for:") === 0) {
    }
    if ((m.indexOf("Bets closing in 30 seconds! House bets random...") === 0) || (m.indexOf("Bets closing in 30 seconds! House placing eco bet...") === 0)) {
        // Dude keeps changing the timing rip accuracy
        setTimeout(function () { EV_Bet(); }, 30000);
        // Schedule troll bets for trolls
        _.each(trollAccounts, function (troll) {
            var actualBetTime = lib.Dist(8000, 8000);
            setTimeout(function () {troll.badbet(state, addTrollBet);}, actualBetTime);
            var acceptableTrollStart = lib.Dist(actualBetTime + 3000,3000);
            setTimeout(function () {
                troll.troll(lib.Dist(1, 0.7), state);
            }, acceptableTrollStart);
        });
    }
    if (m.indexOf("Bets close in 5 seconds!") === 0) {
        
    }
}
// Unfortuneately, I can't think of a way to validate bets, so I optimistically assume
// all bets are real, but enforce uniqueness
function parseBet(bet, uname) {
    // ignore bets out of the window or bets by troll characters... 
    // The trolls will notify their real bet
    if (!betWindowOpen || trollers[uname]) { return; }
    var arr = bet.split(" ");
    var index = parseInt((arr[2])? arr[2].trim(): "NaN", 10) - 1;
    var num = parseInt((arr[1])? arr[1].trim(): "NaN", 10);
    if (index === index && num === num && num > 0 && num < 696969 && index >= 0 && index <= 7) {
        if (currentBetters[uname]) {
            // They have already bet
            currentBets[currentBetters[uname].index] -= currentBetters[uname].num;
        }
        currentBets[index] += num;
        currentBetters[uname] = { "index": index, "num": num };
        console.log(bet);
    }
}
var addTrollBet = function addTrollBet(amt, ind) {
    currentBets[ind] += amt;
}
// Uses expected value formula with the scores model to maximize Expected profit
var BestEV = function BestEV() {
    betDist = lib.getDistribution(currentBets);
    winDist = lib.getDistribution(scores);
    var TotalBet = _.foldl(currentBets, function (acc, elem) {
        return acc + elem;
    }, 0);
    var EV_Tuples = [];
    currentBets.forEach(function (v, i) {
        var maxBet = Math.max(lib.minbet,Math.ceil((winDist[i] * myCoins) / 15));
        var myBet = lib.bestValue(TotalBet, currentBets[i], winDist[i], maxBet);
        var valueBet = lib.expectedValue(myBet, winDist[i], TotalBet, currentBets[i]);
        EV_Tuples.push({ bet: myBet, value: valueBet, index: i });
    });
    EV_Tuples.sort(function (a, b) {
        return ((a.value - a.bet) < (b.value - b.bet))? 1: -1;
    });
    return EV_Tuples;
}
// Makes a random misleading bet to rek people calculating by hand
var Fake_Bet = function Fake_Bet(factor, minBet) {
    // bets the same way as EV_Bet, but uses intermediate results to scare away opponents
    // If we mess up and miss the last bet, we might still get an ok result
    var doThis = BestEV()[1];
    bot.say("#amiibofighter", "!bet " + (Math.ceil((doThis.bet * factor) + minBet)) + " " + (doThis.index + 1));
    console.log(("Faking " + (Math.ceil((doThis.bet * factor) + minBet)) + "/" + doThis.bet + " on index " + doThis.index).bgGreen.white);
}
var EV_Bet = function EV_Bet() {
    var evs = BestEV();
    var doThis = evs[0];
    bot.say("#amiibofighter", "!bet " + doThis.bet + " " + (doThis.index + 1));
    // allocate other good bets among highroller bots
    highRollAccounts = lib.shuffle(highRollAccounts);
    for (var i = 1; (i < evs.length) && ((evs[i].value - evs[i].bet) >= 0); i++) {
        if (highRollAccounts[i]) {
            highRollAccounts[i].bet(evs[i].index, evs[i].bet);
        }
    }
    // Redoing some calculations after we dispatch the message
    betDist = lib.getDistribution(currentBets);
    winDist = lib.getDistribution(scores);
    var TotalBet = _.foldl(currentBets, function (acc, elem) {
        return acc + elem;
    }, 0);
    console.log(("Betting " + doThis.bet + " on index " + doThis.index).bgWhite.blue);
    console.log(("We expect to gain " + (doThis.value - doThis.bet) + " with total bet: " + TotalBet).green.bgWhite);
    console.log(("Best Case: " + Math.floor((doThis.bet / (currentBets[doThis.index] + doThis.bet)) * TotalBet)).black.bgWhite);
    console.log(("Bet Distribution:" + JSON.stringify(_.map(betDist, function (p) { return Math.floor(p * 100); }))).bgWhite.red);
    console.log(("Win Distribution:" + JSON.stringify(_.map(winDist, function (p) { return Math.floor(p * 100); }))).bgWhite.magenta);
}
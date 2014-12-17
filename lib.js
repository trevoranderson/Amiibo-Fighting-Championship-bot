var _ = require('lodash');
// Annoying that I have to change this, but w/e
var minbet = module.exports.minbet = 15;

module.exports.strArrToObj = function (arr) {
    var ret = {};
    arr.forEach(function (a) { ret[a] = true; });
    return ret;
}
var Dist = module.exports.Dist = function Dist(left, width) {
    return (left + Math.random() * width);
}
// Turn number array into discrete distribution array
var getDistribution = module.exports.getDistribution = function getDistribution(arr) {
    var total = _.foldl(arr, function (acc, elem) {
        return acc + elem;z
    }, 0);
    var ret = [];
    _.each(arr, function (v) {
        ret.push(v / total);
    });
    return ret;
}
// Formula given probability to win, the amount bet, the total in pot, and the total bet on the one you bet on.
var expectedValue = module.exports.expectedValue = function expectedValue(coins, p_win, TotalBet, tot_x) {
    return ((p_win * (TotalBet + coins) * coins) / (coins + tot_x));
}
// Uses the derivative of expected value to calculate the point in the interval [1..max_bet] that gives
// the best return
var bestValue = module.exports.bestValue = function bestValue(Tot, t_x, p_x, max_bet) {
    // Never bet more than max or less than 1
    var locMaxes = {
        vb: minbet,
        v1: ((0 - (2 * Tot + 2 * t_x)) + Math.sqrt((2 * Tot + 2 * t_x) * (2 * Tot + 2 * t_x) - (4 * Tot * t_x))) / 2,
        v2: ((0 - (2 * Tot + 2 * t_x)) - Math.sqrt((2 * Tot + 2 * t_x) * (2 * Tot + 2 * t_x) - (4 * Tot * t_x))) / 2,
        ve: max_bet,
    };
    var results = {
        vb: expectedValue(locMaxes.vb, p_x, Tot, t_x) - minbet, // The minus is so EV is profit
        ve: expectedValue(locMaxes.ve, p_x, Tot, t_x) - max_bet, 
    };
    if (locMaxes.v1 > minbet && locMaxes.v1 < max_bet) {
        results.v1 = expectedValue(locMaxes.v1, p_x, Tot, t_x) - locMaxes.v1;
    }
    if (locMaxes.v2 > minbet && locMaxes.v2 < max_bet) {
        results.v2 = expectedValue(locMaxes.v2, p_x, Tot, t_x) - locMaxes.v2;
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
// Similar to any, but returns index
module.exports.indexOf = function indexOf(arr, predicate) {
    var ret = -1;
    arr.forEach(function (v, i) {
        if (predicate(v)) {
            ret = i;
        }
    });
    return ret;
};
// From stack overflow
module.exports.shuffle = function shuffle(array) {
    var counter = array.length, temp, index;
    
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * counter);
        
        // Decrease counter by 1
        counter--;
        
        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    
    return array;
}
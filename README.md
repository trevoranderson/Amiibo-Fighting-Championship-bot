Amiibo-Fighting-Championship-bot
================================

Pwnin' the AFC with probability and HFT magic

Don't expect this code to work against the current version. I'm open sourcing this because its not fun enough to maintain
to convince me to stay up to date with all the streamer's shenanigans. What is written below was accurate at the time of its writing, but may be out of date now. This worked fabulously well for me, catapulting me to the wealthiest player in a relatively short time.

The way betting worked was that all bets go into a pool. When an amiibo wins, the pool is divided up proportionately to whoever bet on them. My bot works by maximizing expected value given the above, then at the last second places a bet when we have maximal information. 

To combat other people trying to make last second bets, we have a few countermeasures. One is the ability to make feint bets on the main account, the others are "troll accounts", which place large bogus bets on amiibos with good odds (works because you can't tell if a bet goes through simply by watching the chat).

Additionally, the ability to provide a few "submaximal" bots is provided. They will bet on things with a positive EV, but not the one the maxuser wants to bet on. You can also have watchers that just acumulate coins.

Setup: Put twitch account details (Nickname and oauth) in the accounts.js file, then install the npm packages. "controller.js" is the startup file.

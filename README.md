# 🚌 Lottie's Bus Party 🚕🦢⛵🎈✈️🎪🚜🚂🚡🚀

A bright, tap-to-play traffic-jam puzzle for your phone, in the style of Bus Fever / Bus Jam.

**▶ Play:** https://robjos1-coder.github.io/lotties-bus-party/

## How to play
- **Tap** a vehicle to drive it out of the lot. It only moves if **nothing is in its way**. Tap a blocked one and it bumps (and costs you a star).
- Vehicles drive round to the bays at the top.
- Passengers walk round the **holding circle** and leave through the gap at the bottom to board vehicles of **their colour**. Two feeder lines top the circle up, so you can see which colours are coming next.
- Full vehicles drive off, sail away, take off down the runway or blast into space!
- If every bay fills up with colours nobody in the circle wants, it's a **Traffic Jam**.

## Worlds
Level 1 is a gentle tutorial. From level 2 the puzzles start properly tricky and keep getting harder.

| Levels | World | Twist |
|---|---|---|
| 1–5 | 🚕 Taxi Rank | Lots of little cabs, plus a taxi office 🏠 that sends out more one at a time |
| 6–10 | 🚌 City Streets | Bigger buses and bus depots |
| 11–15 | 🦢 Swan Lake | Swan pedalos, with ducks 🦆 paddling about in the way |
| 16–20 | ⛵ Sunny Harbour | Mystery boats 🎁 hide their colour until they have a clear way out |
| 21–25 | 🎈 Balloon Fiesta | Balloons float off in the direction of their arrow, while flocks of geese 🪿 fly across the field |
| 26–30 | ✈️ Sky Airport | Refuelling planes ⛽ stay locked until enough others have flown. Planes taxi to the runway to take off |
| 31–35 | 🎪 Dodgem Fair | Bumps are free here! Some dodgems hide their colour |
| 36–40 | 🚜 Farm Show | Tractors pull passenger trailers. Barns 🏚️ hold more, and gates 🚧 stay shut until enough have left |
| 41–45 | 🚂 Rail Yard | Trains on sidings, then **Spaghetti Junction** 🍝 and **Curly Spaghetti** 🌀. Keep tapping a blocked train and it **crashes** 💥 |
| 46–50 | 🚡 Snowy Peaks | Cable cars in rows on cables (only the end one can go), and frozen ❄️ cars |
| 51–55 | 🚀 Star Port | The hardest: 4 docking ports, asteroids ☄️, mystery and charging rockets, and a **black hole** 🕳️ |
| 56+ | Remix worlds | Everything mixed together, harder every level |

Every 5th level is a **🎉 Party Level** with a rainbow Party vehicle. Fill it to start a party.

## Extra features
- **Party meter:** send vehicles off in a really quick streak to fill it (it's hard!). A full meter starts **PARTY TIME**, with disco lights, music, faster passengers and double coins.
- **Boosters:** 🅿️ Extra Bay, a lift (🚁 Heli-Lift / 🏗️ Crane / 🛻 Tow / 🧲 Magnet / 🛸 Tractor Beam) that pulls any vehicle out, and ✨ Sort Queue
- An original chiptune menu theme
- Levels are generated endlessly, and each one is built so it can be solved.
- Stars, coins and progress are saved on your device in two places (local storage plus a cookie backup), so they survive one being cleared.

## Install on iPhone / iPad
1. Open the play link in **Safari**
2. Tap **Share** ⬆️ → **Add to Home Screen**
3. Launch it from the home screen. It runs full-screen and works offline.

## Tech
Plain HTML5 Canvas + JavaScript, with no build step and no dependencies. It's a PWA, so it has a manifest, a service worker for offline play and home-screen icons. Sound effects and party music are made with the Web Audio API.

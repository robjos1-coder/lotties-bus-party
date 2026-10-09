# 🚌 Lottie's Bus Party ⛵✈️🚂🚀

A bright, tap-to-play traffic-jam puzzle for your phone, in the style of Bus Fever / Bus Jam.

**▶ Play:** https://robjos1-coder.github.io/lotties-bus-party/

## How to play
- **Tap** a vehicle to drive it out of the lot. It only moves if **nothing is in its way**. Tap a blocked one and it bumps (and costs you a star).
- Vehicles drive round to the bays at the top.
- Passengers walk round the **holding circle** and leave through the gap at the bottom to board vehicles of **their colour**. Two feeder lines top the circle up, so you can see which colours are coming next.
- Full vehicles drive off, sail away, take off down the runway or blast into space!
- If every bay fills up with colours nobody in the circle wants, it's a **Traffic Jam**.

## Worlds
| Levels | World | Twist |
|---|---|---|
| 1–5 | 🚌 City Streets | Bus depots 🏠: buses come out one at a time, only when the spot in front of the door is clear |
| 6–10 | ⛵ Sunny Harbour | Mystery boats 🎁 hide their colour until they have a clear way out |
| 11–15 | ✈️ Sky Airport | Refuelling planes ⛽ stay locked until enough others have flown. Planes taxi to the runway to take off |
| 16–20 | 🚂 Rail Yard | Trains wait nose-to-tail on sidings. Only the end train can leave, so the order really matters. From level 18 it's **Spaghetti Junction** 🍝, with criss-crossing tracks, and level 20 is **Curly Spaghetti** 🌀, where squiggly tracks bend every train. Keep tapping a blocked train and it **crashes** 💥 |
| 21–25 | 🚀 Star Port | The hardest world: only 4 docking ports, astronauts orbiting a ringed planet, drifting asteroids ☄️ that block launches, plus mystery and charging rockets. Level 25 adds a **black hole** 🕳️ |
| 26+ | Remix worlds | Everything mixed together, harder every level |

Every 5th level is a **🎉 Party Level** with a rainbow Party vehicle. Fill it to start a party.

## Extra features
- **Party meter:** send vehicles off quickly to fill it. A full meter starts **PARTY TIME**, with disco lights, music, faster passengers and double coins.
- **Boosters:** 🅿️ Extra Bay, a lift (🚁 Heli-Lift / 🏗️ Crane / 🚜 Tow / 🛸 Tractor Beam) that pulls any vehicle out, and ✨ Sort Queue
- Levels are generated endlessly, and each one is built so it can be solved.
- Stars, coins and progress are saved on your device.

## Install on iPhone / iPad
1. Open the play link in **Safari**
2. Tap **Share** ⬆️ → **Add to Home Screen**
3. Launch it from the home screen. It runs full-screen and works offline.

## Tech
Plain HTML5 Canvas + JavaScript, with no build step and no dependencies. It's a PWA, so it has a manifest, a service worker for offline play and home-screen icons. Sound effects and party music are made with the Web Audio API.

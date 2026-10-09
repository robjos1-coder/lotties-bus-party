# 🚌 Lottie's Bus Party 🚕⛵🎈✈️🚜🚂🚡🚀

A bright, tap-to-play traffic-jam puzzle for your phone, in the style of Bus Fever / Bus Jam.

**▶ Play:** https://robjos1-coder.github.io/lotties-bus-party/

## How to play
- **Tap** a vehicle to drive it out of the lot. It only moves if **nothing is in its way**. Tap a blocked one and it bumps (and costs you a star).
- Vehicles drive round to the bays at the top.
- Bright, chunky passengers walk round the **holding circle** and leave through the gap at the bottom to board vehicles of **their colour**. Two feeder lines top the circle up, so you can see which colours are coming next.
- Full vehicles drive off, sail away, take off down the runway or blast into space!
- If every bay fills up with colours nobody in the circle wants, it's a **Traffic Jam**.

## Worlds
Level 1 is a gentle tutorial. From level 2 it's a real balancing act: free the right vehicles, **and** send them in the colours the passengers actually need. There are only 4 bays, passengers arrive in runs of the same colour, and one wrong colour can block a bay for ages.

| Levels | World | Twist |
|---|---|---|
| 1–5 | 🚕 Taxi Rank | Little cabs, a taxi office 🏠, and cyclists 🚲 riding round the road on harder levels |
| 6–10 | 🚌 City Streets | Bigger buses, bus depots and cyclists |
| 11–15 | ⛵ Sunny Harbour | Mystery boats 🎁 and ducks 🦆 paddling round the channel |
| 16–20 | 🎈 Balloon Fiesta | Balloons float the way their arrow points; geese 🪿 fly across the field |
| 21–25 | ✈️ Sky Airport | Refuelling planes ⛽, hangars, baggage carts 🧳, and take-offs from the runway |
| 26–30 | 🚜 Farm Show | Tractors with trailers, barns, shut gates 🚧 and sheep 🐑 wandering the farm track |
| 31–35 | 🚂 Rail Yard | Sidings, then **Spaghetti Junction** 🍝 and **Curly Spaghetti** 🌀 with up to 10 tangled lines. Keep tapping a blocked train and it **crashes** 💥 |
| 36–40 | 🚡 Snowy Peaks | Cable cars on cables, frozen ❄️ cars and skiers ⛷️ |
| 41–45 | 🚀 Star Port | Asteroids ☄️, mystery and charging rockets, and a **black hole** 🕳️ |
| 46+ | Remix worlds | Everything mixed together, harder every level |

Moving obstacles never cost you a star: if one is in the way, just wait for it to pass.

Every 5th level is a **🎉 Party Level** with a rainbow Party vehicle. Fill it to start a party.

## Extra features
- **Party meter:** send vehicles off in a really quick streak to fill it (it's hard!). A full meter starts **PARTY TIME**, with disco lights, music, faster passengers and double coins.
- **Boosters:** 🅿️ Extra Bay, a lift (🚁 Heli-Lift / 🏗️ Crane / 🛻 Tow / 🛸 Tractor Beam) that pulls any vehicle out, and ✨ Sort Queue
- An original chiptune menu theme
- Levels are generated endlessly, and each one is built so it can be solved.
- Stars, coins and progress are saved on your device in two places (local storage plus a cookie backup).

## Install on iPhone / iPad
1. Open the play link in **Safari**
2. Tap **Share** ⬆️ → **Add to Home Screen**
3. Launch it from the home screen. It runs full-screen and works offline.

## Tech
Plain HTML5 Canvas + JavaScript, with no build step and no dependencies. It's a PWA, so it has a manifest, a service worker for offline play and home-screen icons. Sound effects and party music are made with the Web Audio API.

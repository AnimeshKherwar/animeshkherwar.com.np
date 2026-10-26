# Roster sources and verification status

**Experiment:** Cricket, Unreasonably Serious
**Data file:** `experiments/cricket/teams.js`
**Compiled:** 26 October 2026
**Status of every squad: UNVERIFIED FALLBACK**

## 1. Verification statement

No squad in this build was checked against an official board, ICC or IPL page during the build session. Live source verification wasn't available while the files were produced. All squads were compiled from the builder's prior knowledge, which reflects selections up to about mid-2025.

As a result:

- No source URL, publication date or announcement date is recorded for any squad. The fields stay empty because nothing was verified.
- The game shows "UNVERIFIED FALLBACK" and the compile date on the home screen, team selection and the Sources & about screen.
- Squads are selection snapshots, not permanent national rosters. Some players listed here have probably been dropped or have retired, or are unavailable, by the build date.

## 2. Format coverage (disclosed fallback)

The brief asked for separate Test, ODI and T20 squads. **This build doesn't have them.** Each international team has **one shared squad pool**, and that pool is used for Test, ODI, T20 and the arcade formats. The game says this on team selection ("shared pool (not T20-specific)", for example).

| Team | Pool size | Status | Default captain in data |
|---|---|---|---|
| Afghanistan | 16 | Test nation | Hashmatullah Shahidi |
| Australia | 17 | Test nation | Pat Cummins |
| Bangladesh | 15 | Test nation | Najmul Hossain Shanto |
| England | 18 | Test nation | Ben Stokes |
| India | 19 | Test nation | Shubman Gill |
| Ireland | 16 | Test nation | Paul Stirling |
| New Zealand | 17 | Test nation | Tom Latham |
| Pakistan | 18 | Test nation | Shan Masood |
| South Africa | 17 | Test nation | Temba Bavuma |
| Sri Lanka | 16 | Test nation | Charith Asalanka |
| West Indies | 18 | Test nation | Shai Hope |
| Zimbabwe | 16 | Test nation | Craig Ervine |
| Nepal | 16 | Associate. **Test option is FICTIONAL / CUSTOM** | Rohit Paudel |
| Netherlands | 16 | Associate. **Test option is FICTIONAL / CUSTOM** | Scott Edwards |

Nepal and Netherlands don't have official Test status. The game labels their Test matches "FICTIONAL TEST" on the scoreboard and "FICTIONAL / CUSTOM Test participation" on team selection.

The data holds one default captain per team, which doesn't match format-specific captaincy. For example, West Indies and Sri Lanka have different Test and white-ball captains. You can change the captain in the XI editor before any match.

## 3. Known conflicts and risks to check first

- **Retired-format players in a shared pool.** Players who have retired from one format still appear in every format, because the pool is shared. Known examples: Rohit Sharma and Virat Kohli (Tests and T20Is), and Steve Smith and Glenn Maxwell (some formats). Check this and split the pools per format.
- **International retirements.** Heinrich Klaasen and Nicholas Pooran appear only in IPL squads, because both announced retirement from international cricket in 2025. Mahmudullah and Shakib Al Hasan were left out of Bangladesh for the same kind of availability reason.
- **Captaincy.** Captaincy changes often. Treat every default captain above as unverified.
- **Batting hands and bowling styles.** These came from memory. Verify them, especially for associate players.

## 4. IPL

- **Season shown:** IPL 2025, with franchise squads as known to the builder after the November 2024 mega auction.
- **Status:** UNVERIFIED FALLBACK. Mid-season replacements and injury substitutes may be missing, and squads are shorter than the full registered squads (16–18 players per franchise in this data).
- **Not done:** the latest season (IPL 2026) couldn't be verified, so it isn't used. No speculative future squads are included.
- **Playing conditions:** the game applies a maximum of 4 overseas players in the XI and one Impact Player substitute in a simplified form. This follows the IPL 2023–2025 concept and wasn't re-verified against the official playing conditions at build time.

| Franchise | Squad size in data | Overseas | Default captain |
|---|---|---|---|
| Chennai Super Kings | 18 | 6 | Ruturaj Gaikwad |
| Mumbai Indians | 16 | 6 | Hardik Pandya |
| Royal Challengers Bengaluru | 17 | 7 | Rajat Patidar |
| Kolkata Knight Riders | 16 | 8 | Ajinkya Rahane |
| Sunrisers Hyderabad | 16 | 6 | Pat Cummins |
| Rajasthan Royals | 16 | 5 | Sanju Samson |
| Delhi Capitals | 16 | 5 | Axar Patel |
| Punjab Kings | 16 | 7 | Shreyas Iyer |
| Lucknow Super Giants | 16 | 4 | Rishabh Pant |
| Gujarat Titans | 17 | 6 | Shubman Gill |

## 5. Identity model

Each player has one record with a stable ID: a slug of the name, such as `jasprit-bumrah`. IPL squads refer to existing international records by name, so the same person isn't duplicated. The data has 338 unique players. Nationality (`nat`) drives the IPL overseas flag: anyone whose nationality isn't `IND` counts as overseas.

## 6. Game ratings

Ratings are **game ratings**: balancing estimates set by listed role, plus a small deterministic spread. They're not official ratings and aren't derived from real statistics. Every team uses the same scale, so Nepal and Netherlands aren't built to lose.

## 7. Where to verify (not consulted for this build)

| Body | Website |
|---|---|
| ICC | icc-cricket.com |
| IPL | iplt20.com |
| BCCI | bcci.tv |
| Cricket Australia | cricket.com.au |
| ECB | ecb.co.uk |
| PCB | pcb.com.pk |
| NZC | nzc.nz |
| Cricket South Africa | cricket.co.za |
| Sri Lanka Cricket | srilankacricket.lk |
| Cricket West Indies | windiescricket.com |
| Zimbabwe Cricket | zimcricket.org |
| Bangladesh Cricket Board | tigercricket.com.bd |
| Cricket Ireland | cricketireland.ie |
| Afghanistan Cricket Board | cricket.af |
| Cricket Association of Nepal | official CAN channels |
| KNCB (Netherlands) | kncb.nl |

## 8. How to update a squad

1. Open `teams.js` and find the team by its three-letter `id`.
2. Each player is one string in the format `Name|ROLE|BatHand|BowlStyle`.
   - ROLE is one of `BAT`, `WK`, `AR` or `BOWL`.
   - BatHand is `R` or `L`.
   - BowlStyle is one of `RF`, `RFM`, `RM`, `LF`, `LFM`, `LM`, `OB`, `LB`, `SLA` or `LWS`, or `-` if the player doesn't bowl.
3. For IPL entries, use just the name if the player already exists in an international squad. Otherwise add a fifth field with the nationality code, for example `|ENG`.
4. Update `SNAPSHOT` (status, compiled date, basis) and record the sources in this file.
5. Optional: run `node tests/rules.test.js`. It checks that every squad still produces a valid XI.

# Firechart: product spec

Status: draft 1, 10 November 2026. Awaiting the owner's review.

## 1. What it is

Firechart is a tiny habit tracker for a group of friends. You pick the things
you want to be disciplined about, tick them off each day, and each one grows
its own "fire chart": a grid of little boxes, one per day, like the
contribution graph on a GitHub profile or the Review Heatmap add-on for Anki.
Your friends do the same, and everyone can see each other's charts, so you can
compare, compete a little, and keep each other honest over months and years.

It is an installed app on Windows and on phones, it costs nothing to run, and
every person can make it look the way they like.

## 2. Principles

1. **Five seconds a day.** Open, tick, close. Nothing else is required.
2. **The chart is the hero.** Screens are mostly charts; chrome is minimal.
3. **Yours to style.** Colours, cell shape, background photo. Your friends see
   your charts the way you styled them.
4. **Private means private.** A private chart is invisible to everyone else,
   enforced on the server, not just hidden in the interface.
5. **Free forever.** No subscriptions, no paid services behind it.
6. **Works offline.** Ticking never waits for the network.
7. **Honest numbers.** Comparison is by consistency, not by who tracks the most
   things.

## 3. Words we use

| Word | Meaning |
|---|---|
| Fire chart (chart) | One tracked activity and its grid of days. |
| Tick | Marking a day as done for a chart. |
| Streak | Days done in a row, counting only days the chart was planned for. |
| Heat | How bright a cell is. By default it grows with the streak. |
| Circle | Your friend group. People in a circle see each other's public charts. |
| Public chart | Visible to everyone in your circle. |
| Private chart | Visible only to you. |

## 4. A day with Firechart

1. In the evening you open the app. The **Today** screen lists your charts:
   Exercise, Study 4 h, Screen time under 1.5 h.
2. You tap the tick next to Exercise. Today's box lights up and your streak
   goes from 11 to 12.
3. Screen time for today is not final until midnight, so tomorrow morning the
   app shows "Yesterday is still open" with a one-tap **I did it** button.
4. You glance at **Friends**: one friend is on a 31-day streak, another has not
   ticked anything today. The scoreboard shows who has been most consistent
   this week.
5. You open a friend's profile. Their charts appear in their colours, with
   their cell shape, over the background photo they chose.

## 5. Version 1

### 5.1 Charts

- Create, rename, reorder, archive and delete charts. No limit on how many.
- A chart has: a name (for example "Screen time under 1.5 h"), an icon, a
  colour, a cell shape, a heat mode, a schedule and a visibility.
- **Visibility is an explicit choice when creating a chart**: "Friends can see"
  or "Only me". There is no default, so nothing is shared or hidden by
  accident. It can be changed later.
- **Schedule**: every day, or chosen weekdays (for example Mon, Wed, Fri). Days
  a chart is not planned for are drawn as hollow cells and never break a
  streak.
- Version 1 charts are yes/no: you either did it that day or you did not. A
  target such as "4 hours" or "under 1.5 hours" lives in the chart's name.
  Charts that record an amount come later (section 6).

### 5.2 Ticking

- Tick or untick today from the Today screen.
- If yesterday has open charts, Today shows a catch-up prompt. This matters for
  goals that are only known after the day ends, like screen time.
- Any past day can be changed from the chart's detail screen. Future days
  cannot be ticked.
- A streak is always calculated from the ticks, so logging a day late repairs
  the streak.
- **Today and yesterday are "still open".** While they are unticked they do not
  break a streak; a day counts as missed once it is two days old. Without this,
  a goal that is logged the next morning would show a broken streak every
  morning.

### 5.3 The chart

- Weeks are columns and weekdays are rows, oldest on the left, with today in
  the last column. The week starts on Monday by default (setting).
- Today's cell has an outline. Future cells are faint outlines. Days before a
  chart existed are empty.
- Wide views show month labels above and Mon/Wed/Fri labels at the side, plus a
  "Less to More" legend.
- Pointing at or tapping a cell shows its date and state.
- How much history fits:
  - Phone, chart card: the last 20 weeks.
  - Phone, chart detail: a whole year as two half-year blocks, with a year
    switcher.
  - Desktop: the last 53 weeks in one row, like GitHub.

### 5.4 Heat

Each chart has a heat mode:

- **Streak heat (default).** The longer the current run, the hotter the cell.
  A run that breaks starts cool again. This gives yes/no charts the varied look
  of a GitHub graph and makes long streaks visibly glow.

  | Days in a row | Level |
  |---|---|
  | 1 to 2 | 1 (coolest) |
  | 3 to 6 | 2 |
  | 7 to 13 | 3 |
  | 14 or more | 4 (hottest) |

- **Flat.** Every done day has the same colour.

### 5.5 Numbers on a chart

- **Streak**: planned days done in a row up to today. Today and yesterday do
  not break it while they are still open (section 5.2). A tick on a day that
  was not planned counts as a bonus day.
- **Best streak**: the longest run ever.
- **Last 30 days**: planned days done divided by planned days, as a percentage.
  Today is left out until it is ticked, so the number does not dip during the
  day.
- **Days done**: the total.

### 5.6 Friends

- A **circle** is created by one person, who shares an invite link or code.
  Anyone who joins sees every member's public charts and is seen by them.
- **Friends screen**:
  - A scoreboard ranking members by **consistency** for this week, the last 30
    days or all time, with each person's best current streak beside it.
  - A card per friend with small versions of their public charts and how many
    they have done today.
- **Friend profile**: all of that person's public charts, full size, in their
  style and over their background.
- **Consistency** = planned days done ÷ planned days, across a person's public
  charts in the chosen period. It is a share, so someone tracking two things
  and someone tracking six are compared fairly. Private charts never count.

### 5.7 Privacy

- Private charts, their ticks and even their existence are hidden from every
  other user. The server refuses to return them; this is covered by automated
  tests.
- Private charts do not count toward the scoreboard and never appear on a
  profile, in a wallpaper view shared with others, or in any friend-facing
  number.
- One honest caveat: whoever administers the database (the owner of the
  project) could technically look at stored rows, including the names of
  private charts. Section 6 lists "Vault mode", which encrypts private chart
  names on the device so that not even the administrator can read them.

### 5.8 Style

Per chart:

- Colour: eight presets (Ember, Moss, Ice, Orchid, Bone, Sun, Coral, Teal) or
  any custom colour, from which the app builds the four heat levels.
- Cell shape: rounded, square or dot.
- Heat mode: streak heat or flat.

Per person:

- Theme: dark (default) or light.
- Background: plain, or an uploaded photo with adjustable dimming. Over a photo
  the cards become dark frosted glass in both themes, so the heat colours stay
  legible on any picture.
- Week starts on Monday or Sunday.
- Shape and heat mode can also be set for every chart at once.

Your friends see your charts in your colours and shapes everywhere, and see
your background on your profile.

### 5.9 Accounts and devices

- Sign up with an email address and a password, plus an invite code to join a
  circle. No confirmation email is involved.
- The same account works on the desktop app and the phone app; data stays in
  step between them.
- The app works without a connection and syncs when it is back.

### 5.10 Your data

- Export everything you own as a file (JSON and CSV).
- Import an export.
- Delete your account and all its data.

## 6. Later, roughly in this order

1. **Rest and skip days**: mark a day as skipped (sick, travel) so it neither
   breaks the streak nor counts against consistency, with a small monthly
   budget so it stays honest. Friends see skipped days as a distinct cell.
2. **Weekly targets**: "4 times a week" instead of fixed weekdays.
3. **Amount charts**: type a number (hours studied, minutes of screen time)
   against a target; heat follows the amount instead of the streak.
4. **Reminders**: a daily nudge at a time you choose.
5. **Late-tick marker**: a tick entered more than two days late is shown with a
   small mark, so back-filling is visible to friends.
6. **Phone home-screen widget** (Android) showing a chart.
7. **Cheers**: send a friend a flame on a good day; milestone badges at 7, 30,
   100 and 365 days.
8. **Share cards**: export a chart as an image.
9. **Wallpaper mode** on Windows: your charts as a live desktop wallpaper.
10. **Vault mode**: private chart names encrypted on your devices.
11. **More than one circle**, and shared challenges where everyone tracks the
    same chart.

## 7. Not planned

- A public social network, feeds, followers or strangers.
- Game mechanics such as points, levels, avatars or shared punishments.
- Ads, payments or premium tiers.
- Heavy analytics. Four numbers per chart is the limit.

## 8. Screens

| Screen | What is on it |
|---|---|
| Today | Your charts as cards with a tick button and a 20-week grid; yesterday catch-up; done count. |
| Chart detail | Streak, best streak, last 30 days, days done; the full year; last 7 days as large tap targets; colour, shape and visibility. |
| Friends | Period switch; consistency scoreboard; a card per friend with mini charts. |
| Friend profile | Their public charts in their style over their background. |
| Style | Live preview; colour, cell shape, heat mode, background. |
| Settings | Account, circle and invite, week start, export and import, about and updates. |
| First run | Sign in or sign up; join or create a circle; create the first charts from suggestions. |

On desktop the same screens use a sidebar and show every chart at full year
width, with friends in a side column. The design canvas (linked from
`docs/PROGRESS.md`) shows all of these.

Until accounts exist (milestone 3), the navigation is Today, Charts, Style and
Settings; Charts is the list where charts are reordered, archived and restored.
Friends takes its place in the navigation when it arrives.

## 9. Rules and edge cases

- **What a day is.** A day is the calendar date on your device when you tick.
  It is stored as a plain date, never converted between time zones, so a tick
  made on the 10th stays on the 10th wherever you travel.
- **Night owls.** A setting can move the end of the day (for example to 03:00)
  so a late-night tick still counts for the day that just ended. Later.
- **Editing on two devices.** The most recent change to a given day wins.
- **Changing a chart from public to private** removes it from friends' devices
  at their next sync.
- **Archiving** hides a chart from Today but keeps its history. **Deleting**
  removes it everywhere.
- **Leaving a circle** immediately stops others from seeing your charts.

## 10. Open questions for the owner

1. Should the scoreboard also show a weekly winner, or stay a plain ranking?
2. Is the late-tick marker (section 6, item 5) wanted from day one, or is trust
   among friends enough?
3. Does the Vault mode caveat in section 5.7 matter enough to bring it forward?
4. Is streak heat the right default look, or should charts start flat?

Answered on 10 November 2026: the group uses both Android phones and iPhones,
and the repository may become public when the first version ships.

/* Cricket, Unreasonably Serious — original commentary text. Reacts to what actually happened; never changes outcomes. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var C = CRK.Commentary = {};
  function pick(rng, a) { return a[Math.floor(rng() * a.length)]; }
  var L = {
    serious: {
      dot: ['{b} to {s}, no run.', 'Well bowled, {s} defends.', 'Good length, {s} is watchful.', 'Beaten! That one moved late.'],
      one: ['{s} works it away for a single.', 'Pushed into the gap, they take one.', 'Quick single, well run.'],
      two: ['Placed well, they come back for two.', 'Good running — two more.'],
      three: ['Excellent running, three taken.'],
      four: ['FOUR! {shot} from {s}, beautifully timed.', 'FOUR! Pierces the field.', 'That races away to the boundary.'],
      six: ['SIX! {s} clears the rope with a {shot}.', 'SIX! Clean strike, deep into the stands.'],
      wicket: ['OUT! {how}. {s} has to go.', 'Wicket! {how}. Big moment.'],
      wide: ['Wide called — too far from the batter.', 'Down the leg side, wide.'],
      nb: ['No-ball ({why}). Free hit to follow.', 'No-ball, {why}.'],
      drop: ['Dropped! A chance goes begging.'],
      bye: ['They scramble byes.']
    },
    light: {
      dot: ['{s} blocks it with the enthusiasm of a man filling in a tax form.', 'Dot ball. The scorer barely looks up.', 'Left alone. Judgement noted, applause modest.'],
      one: ['A single, tidy and entirely respectable.', 'Nudged for one. Accountants everywhere approve.'],
      two: ['Two runs, earned with honest jogging.'],
      three: ['Three! Someone in the outfield took the scenic route.'],
      four: ['FOUR! {shot}, and the fielder chases it out of politeness.', 'FOUR! That one had somewhere to be.'],
      six: ['SIX! {s} has sent that into a different postcode.', 'SIX! The ball has asked not to be disturbed.'],
      wicket: ['OUT! {how}. {s} walks off, rehearsing an explanation.', 'Gone! {how}. The bowler is very pleased with themselves.'],
      wide: ['Wide. The batter could not have reached that with a ladder.'],
      nb: ['No-ball ({why}). Free hit — the batter perks up considerably.'],
      drop: ['Dropped! The fielder inspects their hands for a manufacturing defect.'],
      bye: ['Byes. The keeper will not be mentioning this at dinner.']
    },
    nonsense: {
      dot: ['Dot ball. Somewhere, a pigeon files a formal complaint.', '{s} defends. The ball returns to the bowler, emotionally unchanged.', 'Nothing happens, magnificently.'],
      one: ['One run, delivered with the gravitas of a state visit.', 'Single taken. The crowd rises, realises, and sits back down.'],
      two: ['Two runs. The batters wave at each other like old colleagues.'],
      three: ['Three! The outfield has been officially declared "quite big".'],
      four: ['FOUR! {shot} so elegant it should be wearing a waistcoat.', 'FOUR! The boundary rope receives the ball with full diplomatic honours.'],
      six: ['SIX! That ball now has a frequent flyer account.', 'SIX! Air traffic control would like a word with {s}.'],
      wicket: ['OUT! {how}. {s} departs to consult a philosopher.', 'WICKET! {how}. The stumps have filed for early retirement.'],
      wide: ['Wide. The ball has gone to visit a friend near second slip.'],
      nb: ['No-ball ({why}). The free hit is now trending among the seagulls.'],
      drop: ['Dropped! The ball and the hands have agreed to see other people.'],
      bye: ['Byes. Nobody touched it, everybody is responsible.']
    }
  };
  C.line = function (level, ev, names, rnd) {
    if (level === 'off') return '';
    var lib = L[level === 'full' ? 'nonsense' : level === 'light' ? 'light' : 'serious'];
    var d = ev.d, k;
    if (ev.outId) k = 'wicket';
    else if (d.extra === 'wd') k = 'wide';
    else if (d.extra === 'nb') k = 'nb';
    else if (d.extra === 'b' || d.extra === 'lb') k = 'bye';
    else if (d.boundary === 6) k = 'six'; else if (d.boundary === 4) k = 'four';
    else k = ['dot', 'one', 'two', 'three'][Math.min(3, d.bat || 0)];
    var t = pick(rnd, lib[k] || lib.dot);
    var sub = { b: names.bowler, s: names.striker, shot: ev.meta && ev.meta.shot ? ev.meta.shot : 'shot', how: names.how || 'dismissed', why: (ev.meta && ev.meta.nbReason) || 'front foot' };
    return t.replace(/\{(\w+)\}/g, function (_, x) { return sub[x] || ''; });
  };
  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);

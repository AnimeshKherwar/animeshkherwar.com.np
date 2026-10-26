const CRK = require('../engine.js'); require('../physics.js'); require('../ai.js'); require('../sim.js'); require('../teams.js');
function mkTeam(kind,id){const t=CRK.Rosters.team(kind,id);const d=CRK.Rosters.defaultXI(t.squad);const players={};t.squad.forEach(p=>players[p]=CRK.Rosters.PLAYERS[p]);
 return {id:t.id,name:t.name,short:t.short,xi:d.xi,keeper:d.keeper,captain:d.xi.includes(t.capId)?t.capId:d.xi[0],players};}
module.exports={CRK,mkTeam};

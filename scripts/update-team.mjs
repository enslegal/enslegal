import {readFileSync,writeFileSync} from "node:fs";
const cfg=readFileSync("config.js","utf8");
const GID=+cfg.match(/groupId:\s*(\d+)/)[1], MIN=+cfg.match(/minRank:\s*(\d+)/)[1];
const G=`https://groups.roblox.com/v1/groups/${GID}`;
const get=async u=>{for(let i=0;i<4;i++){const r=await fetch(u);if(r.ok)return r.json();await new Promise(r=>setTimeout(r,1500*(i+1)))}throw new Error("Failed: "+u)};
const roles=(await get(G+"/roles")).roles.filter(r=>r.rank>=MIN).sort((a,b)=>b.rank-a.rank);
for(const r of roles){r.users=[];let c="";do{const d=await get(`${G}/roles/${r.id}/users?limit=100&sortOrder=Asc${c?"&cursor="+c:""}`);r.users.push(...d.data.map(u=>({userId:u.userId,username:u.username})));c=d.nextPageCursor||""}while(c)}
const all=roles.flatMap(r=>r.users),img={};
for(let i=0;i<all.length;i+=100){const ids=all.slice(i,i+100).map(u=>u.userId).join(",");(await get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=false`)).data.forEach(x=>img[x.targetId]=x.imageUrl)}
roles.forEach(r=>r.users.forEach(u=>u.img=img[u.userId]||""));
writeFileSync("team.json",JSON.stringify({updated:new Date().toISOString(),roles:roles.map(({id,name,rank,users})=>({id,name,rank,users}))},null,1));
console.log("Saved",all.length,"members");

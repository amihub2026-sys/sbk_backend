import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
function walk(dir){return readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?walk(p):p.endsWith(".js")||p.endsWith(".mjs")?[p]:[];});}
let failed=false;
for(const f of [...walk("src"),...walk("tests"),...walk("scripts")]){
  const r=spawnSync(process.execPath,["--check",f],{stdio:"inherit"});
  if(r.status!==0)failed=true;
}
if(failed)process.exit(1);
console.log("Syntax check passed.");

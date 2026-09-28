import test from "node:test";
import assert from "node:assert/strict";
import { categorySeeds,competitionSeeds } from "../src/seed/catalog.js";
test("client catalog has exactly 12 age categories",()=>assert.equal(categorySeeds.length,12));
test("client catalog has exactly 17 competitions",()=>assert.equal(competitionSeeds.length,17));
test("age ranges are continuous from 4 to below 17",()=>{assert.deepEqual(categorySeeds[0],["I",48,72]);assert.deepEqual(categorySeeds.at(-1),["XII",192,204]);for(let i=1;i<categorySeeds.length;i++)assert.equal(categorySeeds[i-1][2],categorySeeds[i][1]);});
test("every seeded competition references valid age categories",()=>{for(const c of competitionSeeds)for(const n of c[4])assert.ok(n>=1&&n<=12);});

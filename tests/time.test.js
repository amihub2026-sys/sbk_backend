import test from "node:test";
import assert from "node:assert/strict";
import { ageInMonths } from "../src/utils/time.js";
test("ageInMonths respects completed months",()=>{assert.equal(ageInMonths("2020-01-15","2026-01-14"),71);assert.equal(ageInMonths("2020-01-15","2026-01-15"),72);});

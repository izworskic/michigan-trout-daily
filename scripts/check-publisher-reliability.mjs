import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/daily-publish.yml', import.meta.url), 'utf8');
const publisher = readFileSync(new URL('./publish.py', import.meta.url), 'utf8');
const verifier = readFileSync(new URL('./verify_today.py', import.meta.url), 'utf8');

assert.match(workflow, /cron: '17 6 \* \* \*'/);
assert.match(workflow, /cron: '47 7 \* \* \*'/);
assert.equal((workflow.match(/timezone: 'America\/Detroit'/g) || []).length, 2);
assert.match(workflow, /concurrency:/);
assert.match(workflow, /python scripts\/verify_today\.py/);

assert.match(publisher, /ZoneInfo\("America\/Detroit"\)/);
assert.match(publisher, /datetime\.now\(MICHIGAN_TZ\)/);
assert.doesNotMatch(publisher, /timezone\(timedelta\(hours=-4\)\)/);

assert.match(verifier, /MIN_REAL_WORDS = 250/);
assert.match(verifier, /daily\.michigantroutreport\.com/);
assert.match(verifier, /post\.get\("status"\) != "publish"/);

console.log('Publisher reliability checks passed.');

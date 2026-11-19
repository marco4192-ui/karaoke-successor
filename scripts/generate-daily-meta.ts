/** One-off generator (R81): derives the server's dailyTypeMeta map and the
 * seeder's type data from the client's DAILY_TYPE_LIST. Run with bun. */
import { DAILY_TYPE_LIST } from '../src/lib/game/challenge-pools';
const DAILY_TYPE_IDS = DAILY_TYPE_LIST.map(d => d.id); // mirrors daily-challenge.ts:269

const METRIC_MAX: Record<string, number> = {
  score: 10000, accuracy: 100, tickAccuracy: 100, maxCombo: 2500,
  perfectNotesCount: 1500, goldenNotesCount: 600, notesHit: 1500,
  notesMissed: 600, category_match: 1, songsCompleted: 100,
};

let php = "";
for (const d of DAILY_TYPE_LIST) {
  const max = METRIC_MAX[d.metricKey] ?? 10000;
  php += `        '${d.id}' => ['max' => ${max}, 'dir' => '${d.direction}'],\n`;
}

const json = JSON.stringify({
  ids: DAILY_TYPE_IDS,
  types: DAILY_TYPE_LIST.map(d => ({
    id: d.id, metricKey: d.metricKey, direction: d.direction,
  })),
}, null, 2);

await Bun.write('/tmp/daily-meta-php.txt', php);
await Bun.write('./daily-types.json', json + '\n');
console.log(`types: ${DAILY_TYPE_LIST.length}, ids: ${DAILY_TYPE_IDS.length}`);
console.log('PHP block -> ./daily-meta-php.txt');
console.log('JSON      -> scripts/daily-types.json');

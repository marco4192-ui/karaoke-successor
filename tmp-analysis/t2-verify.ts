// T2 verification: settingsTabIntro + tutorial.settings key parity (en ref) + '?'-Update checks
// Usage: bun tmp-analysis/t2-verify.ts
import path from 'path';

const LOCALES_DIR = 'src/lib/i18n/locales';
const LANGS = ['pl', 'ru', 'zh', 'ja', 'ko', 'fi', 'no'] as const;

async function imp(p: string): Promise<Record<string, unknown>> {
  const mod = await import(path.resolve(p));
  return (mod.default ?? Object.values(mod)[0]) as Record<string, unknown>;
}

function flatten(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) keys.push(...flatten(v, key));
    else keys.push(key);
  }
  return keys;
}

const enSettings = await imp(`${LOCALES_DIR}/en/settings.ts`);
const enTutorial = await imp(`${LOCALES_DIR}/en/tutorial.ts`);

const refIntro = new Set(flatten((enSettings as any).settingsTabIntro));
const refTour = new Set(
  flatten(((enTutorial as any).tutorial as any).settings).map((k) => k.replace(/^settings\./, '')),
);
console.log(`EN ref: settingsTabIntro ${refIntro.size} keys, tutorial.settings ${refTour.size} keys`);

let fail = 0;
for (const lang of LANGS) {
  const settings = await imp(`${LOCALES_DIR}/${lang}/settings.ts`);
  const completion = await imp(`${LOCALES_DIR}/${lang}/completion.ts`);
  const intro = new Set(flatten((settings as any).settingsTabIntro));
  const tour = new Set(
    flatten(((completion as any).tutorial as any).settings).map((k) => k.replace(/^settings\./, '')),
  );
  const missIntro = [...refIntro].filter((k) => !intro.has(k));
  const extraIntro = [...intro].filter((k) => !refIntro.has(k));
  const missTour = [...refTour].filter((k) => !tour.has(k));
  const extraTour = [...tour].filter((k) => !refTour.has(k));

  const t = (completion as any).tutorial;
  const offerHint: string = t.offerHint ?? '';
  const basicFinish: string = t.basic?.steps?.finish?.body ?? '';
  const editorFinish: string = t.editor?.steps?.finish?.body ?? '';
  const settingsView: string = t.basic?.steps?.settingsView?.body ?? '';
  const menuBarOk =
    /pasku menu|строке меню|菜单栏|メニューバー|메뉴 바|valikkopalk|menylinjen/.test(offerHint) &&
    basicFinish.includes('\n\n') &&
    editorFinish.includes('\n\n') &&
    settingsView.includes('\n\n');

  const ok = !missIntro.length && !extraIntro.length && !missTour.length && !extraTour.length && menuBarOk;
  if (!ok) fail++;
  console.log(
    `${ok ? 'OK ' : 'FAIL'} ${lang}: intro ${intro.size} (miss [${missIntro}] extra [${extraIntro}]) · tour ${tour.size} (miss [${missTour}] extra [${extraTour}]) · ?-updates ${menuBarOk ? 'ok' : 'MISSING'}`,
  );
}
console.log(fail === 0 ? 'ALL 7 LANGUAGES PASS' : `${fail} LANGUAGES FAILED`);
process.exit(fail === 0 ? 0 : 1);

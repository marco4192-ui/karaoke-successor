// R11 runtime equivalence spot-check: detection dispatch + conversions
import {
  detectFileFormat, parseKaraokeMugen, parseAssKaraoke, parseSingStarData,
  parseStepMania, convertToSong, parseMIDIKaraoke,
} from '@/lib/parsers/multi-format-import';

console.log('detect .sm  →', detectFileFormat('x.sm', '#TITLE:X;\n#ARTIST:Y;\n'));
console.log('detect .kar →', detectFileFormat('x.kar', new ArrayBuffer(10)));
console.log('detect .json→', detectFileFormat('x.json', '{"title":"T","artist":"A","lyrics":[]}'));
console.log('detect .txt SS →', detectFileFormat('x.txt', 'TITLE=T\nARTIST=A\nNOTE=0,1,60,x\n'));
console.log('detect .txt US →', detectFileFormat('x.txt', '#TITLE:T\n#ARTIST:A\n#BPM:120\n: 0 1 60 Hi\nE\n'));
console.log('detect .txt ?? →', detectFileFormat('x.txt', 'garbage'));
const ss = parseSingStarData('TITLE=T\nARTIST=A\nNOTE=0,100,60,la\nNOTE=1200,100,62,la\n');
console.log('singstar →', JSON.stringify(ss));
console.log('convertToSong(singstar) →', JSON.stringify(convertToSong(ss!, 'singstar')));
console.log('stepmania →', JSON.stringify(parseStepMania('#TITLE:X;\n#ARTIST:Y;\n#BPMS:0=140.000;\n')));
console.log('km →', JSON.stringify(parseKaraokeMugen('{"title":"T","artist":"A","lyrics":[{"start":0,"end":1000,"text":"la"}]}')));
console.log('ass →', JSON.stringify(parseAssKaraoke('[Script Info]\nTitle: A - T\n\n[Events]\nFormat: ...\nDialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\k100}Ka{\\k150}ra{\\k200}oke\n')));
console.log('midi(null bei le ArrayBuffer) →', parseMIDIKaraoke(new ArrayBuffer(0)));

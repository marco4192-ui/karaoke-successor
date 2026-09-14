#!/usr/bin/env python3
# Task 12-b (TEMP): add missing i18n keys to nl, no, pl, pt, ru, sv, zh
# - profile.ts: 4 country keys, profileAuth section (29), characterScreen.loadProfile, 58 achievements
# - game.ts: 58 camelCase achievements (+15 rewardTitle), remove 3 dead battleRoyale keys
# - mobile.ts: 6 mirrorJukeboxVideo* + 8 brGame* keys
import io, os, sys

BASE = '/home/z/my-project/src/lib/i18n/locales'

# ordered achievement ids: (snake, camel, has_reward_title)
ACH = [
    ('score_9800', 'score9800', False), ('score_9900', 'score9900', True),
    ('combo_300', 'combo300', False), ('combo_500', 'combo500', True),
    ('accuracy_92', 'accuracy92', False), ('accuracy_94', 'accuracy94', False),
    ('accuracy_96', 'accuracy96', False), ('accuracy_97', 'accuracy97', False),
    ('accuracy_98', 'accuracy98', False),
    ('perfect_75', 'perfect75', False), ('perfect_100', 'perfect100', False),
    ('perfect_150', 'perfect150', False), ('golden_30', 'golden30', False),
    ('golden_40', 'golden40', False), ('perfect_500', 'perfect500', False),
    ('perfect_1000', 'perfect1000', False), ('perfect_5000', 'perfect5000', False),
    ('perfect_10000', 'perfect10000', True), ('golden_250', 'golden250', False),
    ('golden_1000', 'golden1000', False), ('golden_5000', 'golden5000', True),
    ('songs_250', 'songs250', False), ('songs_500', 'songs500', False),
    ('songs_1000', 'songs1000', True), ('games_50', 'games50', False),
    ('games_100', 'games100', False), ('games_250', 'games250', False),
    ('games_500', 'games500', True), ('level_25', 'level25', False),
    ('level_50', 'level50', True), ('level_100', 'level100', True),
    ('daily_100', 'daily100', False), ('daily_250', 'daily250', False),
    ('daily_500', 'daily500', True), ('streak_60', 'streak60', False),
    ('streak_100', 'streak100', False), ('streak_180', 'streak180', True),
    ('streak_365', 'streak365', True), ('weekly_15', 'weekly15', False),
    ('weekly_30', 'weekly30', False), ('weekly_52', 'weekly52', True),
    ('encore_10', 'encore10', False), ('duets_25', 'duets25', False),
    ('duets_50', 'duets50', False), ('duets_100', 'duets100', True),
    ('duels_5', 'duels5', False), ('duels_10', 'duels10', False),
    ('duels_25', 'duels25', True), ('party_10', 'party10', False),
    ('party_25', 'party25', False), ('party_50', 'party50', False),
    ('disney_25', 'disney25', False), ('disney_50', 'disney50', 'SPECIAL'),
    ('genres_8', 'genres8', False), ('genres_10', 'genres10', False),
    ('clean_sheet', 'cleanSheet', False), ('weekend_singer', 'weekendSinger', False),
    ('lunch_break', 'lunchBreak', False),
]

AUTH_KEYS = [
    'accountTitle', 'accountDesc', 'email', 'emailPlaceholder', 'emailInvalid',
    'emailTaken', 'password', 'passwordPlaceholder', 'passwordRepeat',
    'passwordsDontMatch', 'passwordTooShort', 'registerFailed', 'loginTitle',
    'loginDesc', 'loginButton', 'loginFailed', 'loginSuccess', 'noSnapshot',
    'emailNote', 'changePassword', 'currentPassword', 'newPassword',
    'passwordChanged', 'passwordChangeFailed', 'hasAccount',
    'registrationPending', 'registrationSuccess', 'registrationSuccessTitle',
    'loginSuccessTitle',
]

MOBILE_KEYS = [
    'mirrorJukeboxVideoAdd', 'mirrorJukeboxVideoPlaceholder',
    'mirrorJukeboxVideoButton', 'mirrorJukeboxVideoInvalid',
    'mirrorJukeboxVideoAdded', 'mirrorJukeboxVideoHint',
]

BR_KEYS = [
    'brGameSingNow', 'brGameYourVoice', 'brGameMicActive', 'brGameWaiting',
    'brGameVoting', 'brGameCountdown', 'brGameEliminated', 'brGameSnippet',
]

L = {}

# ------------------------------------------------------------------ NL
L['nl'] = {
 'country': {
   'countrySearch': 'Land zoeken…', 'noCountryFound': 'Geen land gevonden',
   'popularCountries': 'Populair', 'allCountries': 'Alle landen',
 },
 'loadProfile': 'Onlineprofiel laden',
 'auth': {
   'accountTitle': 'Online account (optioneel)',
   'accountDesc': 'Sla een e-mailadres en wachtwoord op, zodat je dit profiel op een ander apparaat kunt laden. Inloggen kan alleen binnen de karaoke-app — er is geen weblogin.',
   'email': 'E-mail', 'emailPlaceholder': 'jouw@email.com',
   'emailInvalid': 'Voer een geldig e-mailadres in',
   'emailTaken': 'Dit e-mailadres is al geregistreerd',
   'password': 'Wachtwoord', 'passwordPlaceholder': 'Minimaal 8 tekens',
   'passwordRepeat': 'Herhaal wachtwoord',
   'passwordsDontMatch': 'De wachtwoorden komen niet overeen',
   'passwordTooShort': 'Het wachtwoord moet minimaal 8 tekens lang zijn',
   'registerFailed': 'Het online account kon niet worden aangemaakt',
   'loginTitle': 'Onlineprofiel laden',
   'loginDesc': 'Voer het e-mailadres en wachtwoord van je onlineprofiel in om het op dit apparaat te laden.',
   'loginButton': 'Inloggen & profiel laden',
   'loginFailed': 'Inloggen mislukt — controleer je e-mailadres en wachtwoord',
   'loginSuccess': 'Profiel "{n}" succesvol geladen!',
   'noSnapshot': 'Er zijn nog geen gesynchroniseerde profielgegevens op de server gevonden',
   'emailNote': 'Wordt alleen gebruikt om in te loggen — nooit openbaar getoond',
   'changePassword': 'Wachtwoord wijzigen', 'currentPassword': 'Huidig wachtwoord',
   'newPassword': 'Nieuw wachtwoord', 'passwordChanged': 'Wachtwoord succesvol gewijzigd',
   'passwordChangeFailed': 'Het wachtwoord kon niet worden gewijzigd',
   'hasAccount': 'Online account ✓',
   'registrationPending': 'Online account wordt aangemaakt…',
   'registrationSuccess': 'Online account aangemaakt — je kunt nu op elk apparaat inloggen',
   'registrationSuccessTitle': '🔐 Online account', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── 100-prestaties-uitbreiding ──',
 'ach': [
   ('Ultraster', 'Score meer dan 9.800 punten'),
   ('Voorbij perfectie', 'Score meer dan 9.900 punten'),
   ('Combo-titan', 'Behaal een combo van 300 noten'),
   ('Onsterfelijke combo', 'Behaal een combo van 500 noten'),
   ('Fijnafstelling', 'Behaal meer dan 92% nauwkeurigheid'),
   ('Studiokwaliteit', 'Behaal meer dan 94% nauwkeurigheid'),
   ('Scherpschutter', 'Behaal meer dan 96% nauwkeurigheid'),
   ('Laserprecisie', 'Behaal meer dan 97% nauwkeurigheid'),
   ('Virtuoos', 'Behaal meer dan 98% nauwkeurigheid'),
   ('Perfecte vijfenzeventig', 'Raak 75 perfecte noten in één nummer'),
   ('Perfecte honderd', 'Raak 100 perfecte noten in één nummer'),
   ('Perfecte storm', 'Raak 150 perfecte noten in één nummer'),
   ('Gouden vloed', 'Raak 30 gouden noten in één nummer'),
   ('Gouden symfonie', 'Raak 40 gouden noten in één nummer'),
   ('Perfecte machine', 'Raak in totaal 500 perfecte noten'),
   ('Precisie-krachtpatser', 'Raak in totaal 1.000 perfecte noten'),
   ('Perfecte lawine', 'Raak in totaal 5.000 perfecte noten'),
   ('Perfecte tienduizend', 'Raak in totaal 10.000 perfecte noten'),
   ('Gouden oogst', 'Raak in totaal 250 gouden noten'),
   ('Gouden stortbui', 'Raak in totaal 1.000 gouden noten'),
   ('Midas-stem', 'Raak in totaal 5.000 gouden noten'),
   ('Songboek-veteraan', 'Voltooi 250 nummers'),
   ('Vijfhonderd-club', 'Voltooi 500 nummers'),
   ('Duizend-nummer-legende', 'Voltooi 1.000 nummers'),
   ('Regelmatige zanger', 'Speel 50 spellen'),
   ('Honderd-club', 'Speel 100 spellen'),
   ('Arcade-stamgast', 'Speel 250 spellen'),
   ('Marathonmaniak', 'Speel 500 spellen'),
   ('Ervaren zanger', 'Bereik niveau 25'),
   ('Elite-zanger', 'Bereik niveau 50'),
   ('Niveau-100-legende', 'Bereik niveau 100'),
   ('Dagelijkse centurio', 'Voltooi 100 dagelijkse uitdagingen'),
   ('Dagelijkse diehard', 'Voltooi 250 dagelijkse uitdagingen'),
   ('Dagelijkse onsterfelijke', 'Voltooi 500 dagelijkse uitdagingen'),
   ('IJzeren wil', 'Houd een dagelijkse reeks van 60 dagen aan'),
   ('Honderd-dagen-held', 'Houd een dagelijkse reeks van 100 dagen aan'),
   ('Halfjaar-toewijding', 'Houd een dagelijkse reeks van 180 dagen aan'),
   ('Jaarlijkse legende', 'Houd een dagelijkse reeks van 365 dagen aan'),
   ('Wekelijkse rots', 'Voltooi 15 wekelijkse uitdagingen'),
   ('Wekelijkse pijler', 'Voltooi 30 wekelijkse uitdagingen'),
   ('Jaar van weken', 'Voltooi 52 wekelijkse uitdagingen'),
   ('Toegift!', 'Speel 10 spellen op één dag'),
   ('Duet-liefhebber', 'Zing 25 duetten'),
   ('Dynamisch duo', 'Zing 50 duetten'),
   ('Eeuw van duetten', 'Zing 100 duetten'),
   ('Duellist', 'Win 5 duels'),
   ('Duel-meester', 'Win 10 duels'),
   ('Duel-overheerser', 'Win 25 duels'),
   ('Feestbeest', 'Speel 10 feestspellen'),
   ('Ziel van het feest', 'Speel 25 feestspellen'),
   ('Feestlegende', 'Speel 50 feestspellen'),
   ('Disney-liefhebber', 'Zing 25 Disney-nummers'),
   ('Er was eens een nummer', 'Zing 50 Disney-nummers'),
   ('Genre-zwerver', 'Zing nummers van 8 verschillende genres'),
   ('Genre-kenner', 'Zing nummers van 10 verschillende genres'),
   ('De nul houden', 'Voltooi een nummer met 50+ noten en nul missers'),
   ('Weekendzanger', 'Voltooi een nummer op zaterdag of zondag'),
   ('Lunchpauze', 'Voltooi een nummer tussen 12 en 14 uur'),
 ],
 'disneyRoyalty': 'Disney-adel',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Videolink in de wachtrij zetten',
   'mirrorJukeboxVideoPlaceholder': 'Plak een link…',
   'mirrorJukeboxVideoButton': 'In de wachtrij',
   'mirrorJukeboxVideoInvalid': 'Link niet herkend — wordt nog niet ondersteund',
   'mirrorJukeboxVideoAdded': 'In de wachtrij gezet! Wordt zo op de desktop afgespeeld.',
   'mirrorJukeboxVideoHint': 'Wordt met geluid achter de gewenste nummers in de wachtrij geplaatst.',
 },
 'br': {
   'brGameSingNow': 'MEEZINGEN!', 'brGameYourVoice': 'Jouw stem',
   'brGameMicActive': 'Microfoon actief', 'brGameWaiting': 'Wachten op de ronde…',
   'brGameVoting': 'Stem op het volgende nummer!', 'brGameCountdown': 'Starten…',
   'brGameEliminated': 'af', 'brGameSnippet': 'Fragment {n}/{m}',
 },
 'brComment': '// ── Battle Royale in de mirror-weergave ──',
}

# ------------------------------------------------------------------ NO
L['no'] = {
 'country': {
   'countrySearch': 'Søk etter land…', 'noCountryFound': 'Ingen land funnet',
   'popularCountries': 'Populære', 'allCountries': 'Alle land',
 },
 'loadProfile': 'Last inn online-profil',
 'auth': {
   'accountTitle': 'Online-konto (valgfritt)',
   'accountDesc': 'Lagre en e-post og et passord, slik at du kan laste inn denne profilen på en annen enhet. Innlogging er kun mulig inne i karaokeappen — det finnes ingen webinnlogging.',
   'email': 'E-post', 'emailPlaceholder': 'din@email.com',
   'emailInvalid': 'Vennligst oppgi en gyldig e-postadresse',
   'emailTaken': 'Denne e-posten er allerede registrert',
   'password': 'Passord', 'passwordPlaceholder': 'Minst 8 tegn',
   'passwordRepeat': 'Gjenta passordet',
   'passwordsDontMatch': 'Passordene samsvarer ikke',
   'passwordTooShort': 'Passordet må være minst 8 tegn langt',
   'registerFailed': 'Kunne ikke opprette online-kontoen',
   'loginTitle': 'Last inn online-profil',
   'loginDesc': 'Skriv inn e-post og passord for online-profilen din for å laste den inn på denne enheten.',
   'loginButton': 'Logg inn og last inn profil',
   'loginFailed': 'Innlogging mislyktes — vennligst kontroller e-post og passord',
   'loginSuccess': 'Profilen «{n}» ble lastet inn!',
   'noSnapshot': 'Fant ennå ingen synkroniserte profildata på serveren',
   'emailNote': 'Brukes kun til innlogging — vises aldri offentlig',
   'changePassword': 'Endre passord', 'currentPassword': 'Nåværende passord',
   'newPassword': 'Nytt passord', 'passwordChanged': 'Passordet ble endret',
   'passwordChangeFailed': 'Kunne ikke endre passordet',
   'hasAccount': 'Online-konto ✓',
   'registrationPending': 'Oppretter online-kontoen…',
   'registrationSuccess': 'Online-konto opprettet — du kan nå logge inn på hvilken som helst enhet',
   'registrationSuccessTitle': '🔐 Online-konto', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── Utvidelse til 100 prestasjoner ──',
 'ach': [
   ('Ultrastjerne', 'Få over 9 800 poeng'),
   ('Forbi det perfekte', 'Få over 9 900 poeng'),
   ('Kombotitan', 'Få en 300 notes kombinasjon'),
   ('Udødelig kombo', 'Få en 500 notes kombinasjon'),
   ('Finstilling', 'Få over 92% presisjon'),
   ('Studiokvalitet', 'Få over 94% presisjon'),
   ('Skarpskytter', 'Få over 96% presisjon'),
   ('Laserpresisjon', 'Få over 97% presisjon'),
   ('Virtuos', 'Få over 98% presisjon'),
   ('Perfekte syttifem', 'Treff 75 perfekte toner i én enkelt sang'),
   ('Perfekte hundre', 'Treff 100 perfekte toner i én enkelt sang'),
   ('Perfekt storm', 'Treff 150 perfekte toner i én enkelt sang'),
   ('Gullflod', 'Treff 30 gullnoter i én enkelt sang'),
   ('Gullsymfoni', 'Treff 40 gullnoter i én enkelt sang'),
   ('Perfekt maskin', 'Treff totalt 500 perfekte toner'),
   ('Presisjonskraftsentrum', 'Treff totalt 1 000 perfekte toner'),
   ('Perfekt snøras', 'Treff totalt 5 000 perfekte toner'),
   ('Perfekte titusen', 'Treff totalt 10 000 perfekte toner'),
   ('Gullhøst', 'Treff totalt 250 gullnoter'),
   ('Gullregn', 'Treff totalt 1 000 gullnoter'),
   ('Midas-stemme', 'Treff totalt 5 000 gullnoter'),
   ('Sangbok-veteran', 'Fullfør 250 sanger'),
   ('Halvtusen-klubben', 'Fullfør 500 sanger'),
   ('Tusen-sang-legende', 'Fullfør 1 000 sanger'),
   ('Hyppig sanger', 'Spill 50 spill'),
   ('Hundre-klubben', 'Spill 100 spill'),
   ('Arcade-stamgjest', 'Spill 250 spill'),
   ('Maratonmaniac', 'Spill 500 spill'),
   ('Erfaren sanger', 'Nå nivå 25'),
   ('Elitesanger', 'Nå nivå 50'),
   ('Nivå 100-legende', 'Nå nivå 100'),
   ('Daglig centurion', 'Fullfør 100 daglige utfordringer'),
   ('Daglig diehard', 'Fullfør 250 daglige utfordringer'),
   ('Daglig udødelig', 'Fullfør 500 daglige utfordringer'),
   ('Jernvilje', 'Hold en 60-dagers daglig streak'),
   ('Hundre dagers helt', 'Hold en 100-dagers daglig streak'),
   ('Et halvt års hengivenhet', 'Hold en 180-dagers daglig streak'),
   ('Årlig legende', 'Hold en 365-dagers daglig streak'),
   ('Ukentlig støttespiller', 'Fullfør 15 ukentlige utfordringer'),
   ('Ukentlig bærebjelke', 'Fullfør 30 ukentlige utfordringer'),
   ('Et år med uker', 'Fullfør 52 ukentlige utfordringer'),
   ('Om igjen!', 'Spill 10 spill på én enkelt dag'),
   ('Duett-entusiast', 'Syng 25 duetter'),
   ('Dynamisk duo', 'Syng 50 duetter'),
   ('Duett-hundre', 'Syng 100 duetter'),
   ('Duelant', 'Vinn 5 dueler'),
   ('Duel-mester', 'Vinn 10 dueler'),
   ('Duel-overherre', 'Vinn 25 dueler'),
   ('Festdyr', 'Spill 10 partyspill'),
   ('Sjelen i selskapet', 'Spill 25 partyspill'),
   ('Fest-legende', 'Spill 50 partyspill'),
   ('Disney-entusiast', 'Syng 25 Disney-sanger'),
   ('Det var en gang en sang', 'Syng 50 Disney-sanger'),
   ('Sjangervandrer', 'Syng sanger fra 8 forskjellige sjangere'),
   ('Sjangerkjenner', 'Syng sanger fra 10 forskjellige sjangere'),
   ('Ren bols', 'Fullfør en sang med 50+ noter og null bommer'),
   ('Helgesanger', 'Fullfør en sang på lørdag eller søndag'),
   ('Lunsjpause', 'Fullfør en sang mellom klokken 12 og 14'),
 ],
 'disneyRoyalty': 'Disney-kongelige',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Legg en videolenke i køen',
   'mirrorJukeboxVideoPlaceholder': 'Lim inn en lenke…',
   'mirrorJukeboxVideoButton': 'Legg i kø',
   'mirrorJukeboxVideoInvalid': 'Ukjent lenke — støttes ikke ennå',
   'mirrorJukeboxVideoAdded': 'Lagt i kø! Spilles snart på skrivebordet.',
   'mirrorJukeboxVideoHint': 'Legges i kø med lyd bak de ønskede sangene.',
 },
 'br': {
   'brGameSingNow': 'SYNG MED!', 'brGameYourVoice': 'Din stemme',
   'brGameMicActive': 'Mikrofon aktiv', 'brGameWaiting': 'Venter på runden…',
   'brGameVoting': 'Stem på neste sang!', 'brGameCountdown': 'Starter…',
   'brGameEliminated': 'ute', 'brGameSnippet': 'Snutt {n}/{m}',
 },
 'brComment': '// ── Battle Royale i speilvisningen ──',
}

# ------------------------------------------------------------------ PL
L['pl'] = {
 'country': {
   'countrySearch': 'Szukaj kraju…', 'noCountryFound': 'Nie znaleziono kraju',
   'popularCountries': 'Popularne', 'allCountries': 'Wszystkie kraje',
 },
 'loadProfile': 'Wczytaj profil online',
 'auth': {
   'accountTitle': 'Konto online (opcjonalnie)',
   'accountDesc': 'Zapisz adres e-mail i hasło, aby móc wczytać ten profil na innym urządzeniu. Logowanie jest możliwe tylko w aplikacji karaoke — nie ma logowania przez przeglądarkę.',
   'email': 'E-mail', 'emailPlaceholder': 'twoj@email.com',
   'emailInvalid': 'Podaj prawidłowy adres e-mail',
   'emailTaken': 'Ten adres e-mail jest już zarejestrowany',
   'password': 'Hasło', 'passwordPlaceholder': 'Co najmniej 8 znaków',
   'passwordRepeat': 'Powtórz hasło',
   'passwordsDontMatch': 'Hasła nie są identyczne',
   'passwordTooShort': 'Hasło musi mieć co najmniej 8 znaków',
   'registerFailed': 'Nie udało się utworzyć konta online',
   'loginTitle': 'Wczytaj profil online',
   'loginDesc': 'Wprowadź e-mail i hasło swojego profilu online, aby wczytać go na tym urządzeniu.',
   'loginButton': 'Zaloguj się i wczytaj profil',
   'loginFailed': 'Logowanie nieudane — sprawdź e-mail i hasło',
   'loginSuccess': 'Profil „{n}” wczytany pomyślnie!',
   'noSnapshot': 'Na serwerze nie znaleziono jeszcze zsynchronizowanych danych profilu',
   'emailNote': 'Używane tylko do logowania — nigdy nie jest pokazywane publicznie',
   'changePassword': 'Zmień hasło', 'currentPassword': 'Obecne hasło',
   'newPassword': 'Nowe hasło', 'passwordChanged': 'Hasło zostało zmienione',
   'passwordChangeFailed': 'Nie udało się zmienić hasła',
   'hasAccount': 'Konto online ✓',
   'registrationPending': 'Tworzenie konta online…',
   'registrationSuccess': 'Konto online utworzone — możesz się teraz zalogować na dowolnym urządzeniu',
   'registrationSuccessTitle': '🔐 Konto online', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── Rozszerzenie do 100 osiągnięć ──',
 'ach': [
   ('Ultragwiazda', 'Zdobądź ponad 9800 punktów'),
   ('Poza perfekcją', 'Zdobądź ponad 9900 punktów'),
   ('Tytan kombosów', 'Zdobądź 300-nutowe kombo'),
   ('Nieśmiertelne kombo', 'Zdobądź 500-nutowe kombo'),
   ('Dostrojenie', 'Uzyskaj ponad 92% celności'),
   ('Jakość studyjna', 'Uzyskaj ponad 94% celności'),
   ('Snajper', 'Uzyskaj ponad 96% celności'),
   ('Laserowa precyzja', 'Uzyskaj ponad 97% celności'),
   ('Wirtuoz', 'Uzyskaj ponad 98% celności'),
   ('Perfekcyjne 75', 'Traf 75 perfekcyjnych nut w jednym utworze'),
   ('Perfekcyjna setka', 'Traf 100 perfekcyjnych nut w jednym utworze'),
   ('Perfekcyjna burza', 'Traf 150 perfekcyjnych nut w jednym utworze'),
   ('Złota fala', 'Traf 30 złotych nut w jednym utworze'),
   ('Złota symfonia', 'Traf 40 złotych nut w jednym utworze'),
   ('Perfekcyjna maszyna', 'Traf łącznie 500 perfekcyjnych nut'),
   ('Potęga precyzji', 'Traf łącznie 1000 perfekcyjnych nut'),
   ('Perfekcyjna lawina', 'Traf łącznie 5000 perfekcyjnych nut'),
   ('Perfekcyjne dziesięć tysięcy', 'Traf łącznie 10 000 perfekcyjnych nut'),
   ('Złote żniwa', 'Traf łącznie 250 złotych nut'),
   ('Złota ulewa', 'Traf łącznie 1000 złotych nut'),
   ('Głos Midasa', 'Traf łącznie 5000 złotych nut'),
   ('Weteran śpiewnika', 'Ukończ 250 utworów'),
   ('Klub pół tysiąca', 'Ukończ 500 utworów'),
   ('Legenda tysiąca utworów', 'Ukończ 1000 utworów'),
   ('Częsty śpiewak', 'Zagraj 50 gier'),
   ('Klub setki', 'Zagraj 100 gier'),
   ('Bywalec Arcade', 'Zagraj 250 gier'),
   ('Maniak maratonów', 'Zagraj 500 gier'),
   ('Wprawiony wokalista', 'Osiągnij poziom 25'),
   ('Elitarny wokalista', 'Osiągnij poziom 50'),
   ('Legenda poziomu 100', 'Osiągnij poziom 100'),
   ('Dzienny centurion', 'Ukończ 100 dziennych wyzwań'),
   ('Dzienny fanatyk', 'Ukończ 250 dziennych wyzwań'),
   ('Dzienny nieśmiertelny', 'Ukończ 500 dziennych wyzwań'),
   ('Żelazna wola', 'Utrzymaj 60-dniową dzienną serię'),
   ('Bohater stu dni', 'Utrzymaj 100-dniową dzienną serię'),
   ('Półroczne oddanie', 'Utrzymaj 180-dniową dzienną serię'),
   ('Legenda roku', 'Utrzymaj 365-dniową dzienną serię'),
   ('Tygodniowy twardziel', 'Ukończ 15 tygodniowych wyzwań'),
   ('Tygodniowy filar', 'Ukończ 30 tygodniowych wyzwań'),
   ('Rok tygodni', 'Ukończ 52 tygodniowe wyzwania'),
   ('Bis!', 'Zagraj 10 gier w ciągu jednego dnia'),
   ('Wielbiciel duetów', 'Zaśpiewaj 25 duetów'),
   ('Dynamiczne duo', 'Zaśpiewaj 50 duetów'),
   ('Duetowa setka', 'Zaśpiewaj 100 duetów'),
   ('Duelant', 'Wygraj 5 duelów'),
   ('Mistrz duelów', 'Wygraj 10 duelów'),
   ('Władca duelów', 'Wygraj 25 duelów'),
   ('Imprezowicz', 'Zagraj w 10 gier imprezowych'),
   ('Dusza towarzystwa', 'Zagraj w 25 gier imprezowych'),
   ('Legenda imprez', 'Zagraj w 50 gier imprezowych'),
   ('Entuzjasta Disneya', 'Zaśpiewaj 25 piosenek Disneya'),
   ('Dawno, dawno temu piosenka', 'Zaśpiewaj 50 piosenek Disneya'),
   ('Wędrowiec gatunków', 'Zaśpiewaj piosenki z 8 różnych gatunków'),
   ('Koneser gatunków', 'Zaśpiewaj piosenki z 10 różnych gatunków'),
   ('Czyste konto', 'Ukończ utwór z ponad 50 nutami i bez ani jednego pudła'),
   ('Weekendowy śpiewak', 'Ukończ utwór w sobotę lub niedzielę'),
   ('Przerwa na obiad', 'Ukończ utwór między godziną 12 a 14'),
 ],
 'disneyRoyalty': 'Arystokracja Disneya',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Dodaj link do filmu do kolejki',
   'mirrorJukeboxVideoPlaceholder': 'Wklej link…',
   'mirrorJukeboxVideoButton': 'Dodaj do kolejki',
   'mirrorJukeboxVideoInvalid': 'Nierozpoznany link — jeszcze nieobsługiwany',
   'mirrorJukeboxVideoAdded': 'Dodano do kolejki! Wkrótce zagra na desktopie.',
   'mirrorJukeboxVideoHint': 'Dodawane do kolejki z dźwiękiem, za żądanymi piosenkami.',
 },
 'br': {
   'brGameSingNow': 'ŚPIEWAJ RAZEM!', 'brGameYourVoice': 'Twój głos',
   'brGameMicActive': 'Mikrofon aktywny', 'brGameWaiting': 'Oczekiwanie na rundę…',
   'brGameVoting': 'Zagłosuj na następną piosenkę!', 'brGameCountdown': 'Start…',
   'brGameEliminated': 'poza grą', 'brGameSnippet': 'Fragment {n}/{m}',
 },
 'brComment': '// ── Battle Royale w widoku lustra ──',
}

# ------------------------------------------------------------------ PT
L['pt'] = {
 'country': {
   'countrySearch': 'Procurar país…', 'noCountryFound': 'Nenhum país encontrado',
   'popularCountries': 'Populares', 'allCountries': 'Todos os países',
 },
 'loadProfile': 'Carregar Perfil Online',
 'auth': {
   'accountTitle': 'Conta online (opcional)',
   'accountDesc': 'Guarda um e-mail e uma palavra-passe para poderes carregar este perfil noutro dispositivo. O início de sessão só é possível dentro da app de karaoke — não existe login na web.',
   'email': 'E-mail', 'emailPlaceholder': 'oteu@email.com',
   'emailInvalid': 'Introduz um endereço de e-mail válido',
   'emailTaken': 'Este e-mail já está registado',
   'password': 'Palavra-passe', 'passwordPlaceholder': 'Pelo menos 8 caracteres',
   'passwordRepeat': 'Repetir palavra-passe',
   'passwordsDontMatch': 'As palavras-passe não coincidem',
   'passwordTooShort': 'A palavra-passe tem de ter pelo menos 8 caracteres',
   'registerFailed': 'Não foi possível criar a conta online',
   'loginTitle': 'Carregar perfil online',
   'loginDesc': 'Introduz o e-mail e a palavra-passe do teu perfil online para o carregares neste dispositivo.',
   'loginButton': 'Entrar e carregar perfil',
   'loginFailed': 'Falha no início de sessão — verifica o e-mail e a palavra-passe',
   'loginSuccess': 'Perfil "{n}" carregado com sucesso!',
   'noSnapshot': 'Ainda não foram encontrados dados de perfil sincronizados no servidor',
   'emailNote': 'Usado apenas para iniciar sessão — nunca é mostrado publicamente',
   'changePassword': 'Alterar palavra-passe', 'currentPassword': 'Palavra-passe atual',
   'newPassword': 'Nova palavra-passe', 'passwordChanged': 'Palavra-passe alterada com sucesso',
   'passwordChangeFailed': 'Não foi possível alterar a palavra-passe',
   'hasAccount': 'Conta online ✓',
   'registrationPending': 'A criar a conta online…',
   'registrationSuccess': 'Conta online criada — agora podes iniciar sessão em qualquer dispositivo',
   'registrationSuccessTitle': '🔐 Conta online', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── Expansão para 100 conquistas ──',
 'ach': [
   ('Estrela Ultra', 'Pontua mais de 9.800 pontos'),
   ('Além da Perfeição', 'Pontua mais de 9.900 pontos'),
   ('Titã do Combo', 'Alcança um combo de 300 notas'),
   ('Imortal do Combo', 'Alcança um combo de 500 notas'),
   ('Afinamento Fino', 'Obtém mais de 92% de precisão'),
   ('Qualidade de Estúdio', 'Obtém mais de 94% de precisão'),
   ('Tiro Certeiro', 'Obtém mais de 96% de precisão'),
   ('Precisão Laser', 'Obtém mais de 97% de precisão'),
   ('Virtuoso', 'Obtém mais de 98% de precisão'),
   ('Setenta e Cinco Perfeitas', 'Acerta 75 notas perfeitas numa única música'),
   ('Centena Perfeita', 'Acerta 100 notas perfeitas numa única música'),
   ('Tempestade Perfeita', 'Acerta 150 notas perfeitas numa única música'),
   ('Maré Dourada', 'Acerta 30 notas douradas numa única música'),
   ('Sinfonia Dourada', 'Acerta 40 notas douradas numa única música'),
   ('Máquina Perfeita', 'Acerta 500 notas perfeitas no total'),
   ('Potência de Precisão', 'Acerta 1.000 notas perfeitas no total'),
   ('Avalanche Perfeita', 'Acerta 5.000 notas perfeitas no total'),
   ('Dez Mil Perfeitas', 'Acerta 10.000 notas perfeitas no total'),
   ('Colheita Dourada', 'Acerta 250 notas douradas no total'),
   ('Aguaceiro Dourado', 'Acerta 1.000 notas douradas no total'),
   ('Voz de Midas', 'Acerta 5.000 notas douradas no total'),
   ('Veterano do Cancioneiro', 'Completa 250 músicas'),
   ('Clube do Meio Milhar', 'Completa 500 músicas'),
   ('Lenda das Mil Músicas', 'Completa 1.000 músicas'),
   ('Cantor Frequente', 'Joga 50 partidas'),
   ('Clube da Centena', 'Joga 100 partidas'),
   ('Habitual da Arcada', 'Joga 250 partidas'),
   ('Maníaco da Maratona', 'Joga 500 partidas'),
   ('Cantor Experiente', 'Alcança o nível 25'),
   ('Vocalista de Elite', 'Alcança o nível 50'),
   ('Lenda do Nível 100', 'Alcança o nível 100'),
   ('Centurião Diário', 'Completa 100 desafios diários'),
   ('Fanático Diário', 'Completa 250 desafios diários'),
   ('Imortal Diário', 'Completa 500 desafios diários'),
   ('Vontade de Ferro', 'Mantém uma sequência diária de 60 dias'),
   ('Herói dos Cem Dias', 'Mantém uma sequência diária de 100 dias'),
   ('Devoção de Meio Ano', 'Mantém uma sequência diária de 180 dias'),
   ('Lenda Anual', 'Mantém uma sequência diária de 365 dias'),
   ('Inabalável Semanal', 'Completa 15 desafios semanais'),
   ('Pilar Semanal', 'Completa 30 desafios semanais'),
   ('Um Ano de Semanas', 'Completa 52 desafios semanais'),
   ('Bis!', 'Joga 10 partidas num só dia'),
   ('Devoto dos Duetos', 'Canta 25 duetos'),
   ('Duo Dinâmico', 'Canta 50 duetos'),
   ('Centena de Duetos', 'Canta 100 duetos'),
   ('Duelista', 'Vence 5 duelos'),
   ('Mestre dos Duelos', 'Vence 10 duelos'),
   ('Senhor dos Duelos', 'Vence 25 duelos'),
   ('Animal de Festa', 'Joga 10 jogos de festa'),
   ('Alma da Festa', 'Joga 25 jogos de festa'),
   ('Lenda da Festa', 'Joga 50 jogos de festa'),
   ('Entusiasta da Disney', 'Canta 25 músicas Disney'),
   ('Era Uma Vez uma Canção', 'Canta 50 músicas Disney'),
   ('Andarilho de Géneros', 'Canta músicas de 8 géneros diferentes'),
   ('Conhecedor de Géneros', 'Canta músicas de 10 géneros diferentes'),
   ('Registo Limpo', 'Termina uma música com mais de 50 notas e zero erros'),
   ('Cantor de Fim de Semana', 'Termina uma música ao sábado ou domingo'),
   ('Pausa para o Almoço', 'Termina uma música entre as 12 e as 14 horas'),
 ],
 'disneyRoyalty': 'Realeza Disney',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Colocar um link de vídeo na fila',
   'mirrorJukeboxVideoPlaceholder': 'Cola um link…',
   'mirrorJukeboxVideoButton': 'Colocar na fila',
   'mirrorJukeboxVideoInvalid': 'Link não reconhecido — ainda não suportado',
   'mirrorJukeboxVideoAdded': 'Na fila! Toca no desktop em breve.',
   'mirrorJukeboxVideoHint': 'Colocada na fila com som, atrás das músicas pedidas.',
 },
 'br': {
   'brGameSingNow': 'CANTA JUNTO!', 'brGameYourVoice': 'A tua voz',
   'brGameMicActive': 'Microfone ativo', 'brGameWaiting': 'A aguardar a ronda…',
   'brGameVoting': 'Vota na próxima música!', 'brGameCountdown': 'A começar…',
   'brGameEliminated': 'fora', 'brGameSnippet': 'Excerto {n}/{m}',
 },
 'brComment': '// ── Battle Royale no espelho ──',
}

# ------------------------------------------------------------------ RU
L['ru'] = {
 'country': {
   'countrySearch': 'Поиск страны…', 'noCountryFound': 'Страна не найдена',
   'popularCountries': 'Популярные', 'allCountries': 'Все страны',
 },
 'loadProfile': 'Загрузить онлайн-профиль',
 'auth': {
   'accountTitle': 'Онлайн-аккаунт (необязательно)',
   'accountDesc': 'Сохраните e-mail и пароль, чтобы загрузить этот профиль на другом устройстве. Вход возможен только внутри приложения для караоке — веб-версии для входа нет.',
   'email': 'E-mail', 'emailPlaceholder': 'vash@email.com',
   'emailInvalid': 'Пожалуйста, введите корректный адрес e-mail',
   'emailTaken': 'Этот e-mail уже зарегистрирован',
   'password': 'Пароль', 'passwordPlaceholder': 'Не менее 8 символов',
   'passwordRepeat': 'Повторите пароль',
   'passwordsDontMatch': 'Пароли не совпадают',
   'passwordTooShort': 'Пароль должен содержать не менее 8 символов',
   'registerFailed': 'Не удалось создать онлайн-аккаунт',
   'loginTitle': 'Загрузить онлайн-профиль',
   'loginDesc': 'Введите e-mail и пароль вашего онлайн-профиля, чтобы загрузить его на это устройство.',
   'loginButton': 'Войти и загрузить профиль',
   'loginFailed': 'Не удалось войти — проверьте e-mail и пароль',
   'loginSuccess': 'Профиль «{n}» успешно загружен!',
   'noSnapshot': 'Синхронизированные данные профиля на сервере пока не найдены',
   'emailNote': 'Используется только для входа — никогда не показывается публично',
   'changePassword': 'Сменить пароль', 'currentPassword': 'Текущий пароль',
   'newPassword': 'Новый пароль', 'passwordChanged': 'Пароль успешно изменён',
   'passwordChangeFailed': 'Не удалось изменить пароль',
   'hasAccount': 'Онлайн-аккаунт ✓',
   'registrationPending': 'Создание онлайн-аккаунта…',
   'registrationSuccess': 'Онлайн-аккаунт создан — теперь вы можете войти на любом устройстве',
   'registrationSuccessTitle': '🔐 Онлайн-аккаунт', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── Расширение до 100 достижений ──',
 'ach': [
   ('Сверхзвезда', 'Наберите более 9800 очков'),
   ('За пределами совершенства', 'Наберите более 9900 очков'),
   ('Титан комбо', 'Наберите комбо из 300 нот'),
   ('Бессмертное комбо', 'Наберите комбо из 500 нот'),
   ('Тонкая настройка', 'Достигните точности более 92%'),
   ('Студийное качество', 'Достигните точности более 94%'),
   ('Снайпер', 'Достигните точности более 96%'),
   ('Лазерная точность', 'Достигните точности более 97%'),
   ('Виртуоз', 'Достигните точности более 98%'),
   ('Идеальные 75', 'Попадите в 75 идеальных нот за одну песню'),
   ('Идеальная сотня', 'Попадите в 100 идеальных нот за одну песню'),
   ('Идеальный шторм', 'Попадите в 150 идеальных нот за одну песню'),
   ('Золотой прилив', 'Попадите в 30 золотых нот за одну песню'),
   ('Золотая симфония', 'Попадите в 40 золотых нот за одну песню'),
   ('Идеальная машина', 'Попадите в 500 идеальных нот за всё время'),
   ('Мощь точности', 'Попадите в 1000 идеальных нот за всё время'),
   ('Идеальная лавина', 'Попадите в 5000 идеальных нот за всё время'),
   ('Идеальные десять тысяч', 'Попадите в 10 000 идеальных нот за всё время'),
   ('Золотой урожай', 'Попадите в 250 золотых нот за всё время'),
   ('Золотой ливень', 'Попадите в 1000 золотых нот за всё время'),
   ('Голос Мидаса', 'Попадите в 5000 золотых нот за всё время'),
   ('Ветеран песенника', 'Завершите 250 песен'),
   ('Клуб полутысячи', 'Завершите 500 песен'),
   ('Легенда тысячи песен', 'Завершите 1000 песен'),
   ('Постоянный певец', 'Сыграйте 50 партий'),
   ('Клуб сотни', 'Сыграйте 100 партий'),
   ('Завсегдатай аркады', 'Сыграйте 250 партий'),
   ('Марафонский маньяк', 'Сыграйте 500 партий'),
   ('Опытный певец', 'Достигните уровня 25'),
   ('Элитный вокалист', 'Достигните уровня 50'),
   ('Легенда уровня 100', 'Достигните уровня 100'),
   ('Дейли-центурион', 'Завершите 100 ежедневных вызовов'),
   ('Дейли-фанатик', 'Завершите 250 ежедневных вызовов'),
   ('Дейли-бессмертный', 'Завершите 500 ежедневных вызовов'),
   ('Железная воля', 'Поддерживайте ежедневную серию в 60 дней'),
   ('Герой ста дней', 'Поддерживайте ежедневную серию в 100 дней'),
   ('Полгода преданности', 'Поддерживайте ежедневную серию в 180 дней'),
   ('Легенда года', 'Поддерживайте ежедневную серию в 365 дней'),
   ('Еженедельная опора', 'Завершите 15 еженедельных вызовов'),
   ('Еженедельный столп', 'Завершите 30 еженедельных вызовов'),
   ('Год недель', 'Завершите 52 еженедельных вызова'),
   ('На бис!', 'Сыграйте 10 партий за один день'),
   ('Поклонник дуэтов', 'Спойте 25 дуэтов'),
   ('Динамичный дуэт', 'Спойте 50 дуэтов'),
   ('Сотня дуэтов', 'Спойте 100 дуэтов'),
   ('Дуэлянт', 'Выиграйте 5 дуэлей'),
   ('Мастер дуэлей', 'Выиграйте 10 дуэлей'),
   ('Повелитель дуэлей', 'Выиграйте 25 дуэлей'),
   ('Тусовщик', 'Сыграйте в 10 партийных игр'),
   ('Душа компании', 'Сыграйте в 25 партийных игр'),
   ('Легенда вечеринок', 'Сыграйте в 50 партийных игр'),
   ('Энтузиаст Disney', 'Спойте 25 песен Disney'),
   ('Жила-была песня', 'Спойте 50 песен Disney'),
   ('Странник жанров', 'Спойте песни из 8 разных жанров'),
   ('Знаток жанров', 'Спойте песни из 10 разных жанров'),
   ('Игра на ноль', 'Завершите песню с 50+ нотами и нулём промахов'),
   ('Певец выходного дня', 'Завершите песню в субботу или воскресенье'),
   ('Обеденный перерыв', 'Завершите песню между 12 и 14 часами'),
 ],
 'disneyRoyalty': 'Монарх Disney',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Добавить ссылку на видео в очередь',
   'mirrorJukeboxVideoPlaceholder': 'Вставьте ссылку…',
   'mirrorJukeboxVideoButton': 'В очередь',
   'mirrorJukeboxVideoInvalid': 'Ссылка не распознана — пока не поддерживается',
   'mirrorJukeboxVideoAdded': 'Добавлено в очередь! Скоро проиграется на компьютере.',
   'mirrorJukeboxVideoHint': 'Ставится в очередь со звуком после запрошенных песен.',
 },
 'br': {
   'brGameSingNow': 'ПОЙТЕ ВМЕСТЕ!', 'brGameYourVoice': 'Ваш голос',
   'brGameMicActive': 'Микрофон активен', 'brGameWaiting': 'Ожидание раунда…',
   'brGameVoting': 'Голосуйте за следующую песню!', 'brGameCountdown': 'Начало…',
   'brGameEliminated': 'выбыл', 'brGameSnippet': 'Отрывок {n}/{m}',
 },
 'brComment': '// ── Battle Royale в зеркальном режиме ──',
}

# ------------------------------------------------------------------ SV
L['sv'] = {
 'country': {
   'countrySearch': 'Sök land…', 'noCountryFound': 'Inget land hittades',
   'popularCountries': 'Populära', 'allCountries': 'Alla länder',
 },
 'loadProfile': 'Ladda online-profil',
 'auth': {
   'accountTitle': 'Online-konto (valfritt)',
   'accountDesc': 'Spara en e-post och ett lösenord så att du kan ladda den här profilen på en annan enhet. Inloggning är bara möjlig i karaokeappen — det finns ingen webbinloggning.',
   'email': 'E-post', 'emailPlaceholder': 'din@email.com',
   'emailInvalid': 'Ange en giltig e-postadress',
   'emailTaken': 'Den här e-posten är redan registrerad',
   'password': 'Lösenord', 'passwordPlaceholder': 'Minst 8 tecken',
   'passwordRepeat': 'Upprepa lösenordet',
   'passwordsDontMatch': 'Lösenorden matchar inte',
   'passwordTooShort': 'Lösenordet måste vara minst 8 tecken långt',
   'registerFailed': 'Det gick inte att skapa online-kontot',
   'loginTitle': 'Ladda online-profil',
   'loginDesc': 'Ange e-post och lösenord för din online-profil för att ladda den på den här enheten.',
   'loginButton': 'Logga in och ladda profil',
   'loginFailed': 'Inloggningen misslyckades — kontrollera e-post och lösenord',
   'loginSuccess': 'Profilen "{n}" har laddats!',
   'noSnapshot': 'Inga synkroniserade profildata hittades på servern ännu',
   'emailNote': 'Används endast för inloggning — visas aldrig offentligt',
   'changePassword': 'Byt lösenord', 'currentPassword': 'Nuvarande lösenord',
   'newPassword': 'Nytt lösenord', 'passwordChanged': 'Lösenordet har ändrats',
   'passwordChangeFailed': 'Det gick inte att ändra lösenordet',
   'hasAccount': 'Online-konto ✓',
   'registrationPending': 'Skapar online-kontot…',
   'registrationSuccess': 'Online-konto skapat — du kan nu logga in på valfri enhet',
   'registrationSuccessTitle': '🔐 Online-konto', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── Utbyggnad till 100 prestationer ──',
 'ach': [
   ('Ultrastjärna', 'Få över 9 800 poäng'),
   ('Bortom perfektion', 'Få över 9 900 poäng'),
   ('Kombotitan', 'Få en 300-noters kombo'),
   ('Odödlig kombo', 'Få en 500-noters kombo'),
   ('Finjustering', 'Få över 92% noggrannhet'),
   ('Studiokvalitet', 'Få över 94% noggrannhet'),
   ('Prickskytten', 'Få över 96% noggrannhet'),
   ('Laserprecision', 'Få över 97% noggrannhet'),
   ('Virtuos', 'Få över 98% noggrannhet'),
   ('Perfekta sjuttiofem', 'Träffa 75 perfekta toner i en enda låt'),
   ('Perfekta hundra', 'Träffa 100 perfekta toner i en enda låt'),
   ('Perfekt storm', 'Träffa 150 perfekta toner i en enda låt'),
   ('Guldflod', 'Träffa 30 guldnoter i en enda låt'),
   ('Guldsymfoni', 'Träffa 40 guldnoter i en enda låt'),
   ('Perfekt maskin', 'Träffa totalt 500 perfekta toner'),
   ('Precisionskraftverk', 'Träffa totalt 1 000 perfekta toner'),
   ('Perfekt lavin', 'Träffa totalt 5 000 perfekta toner'),
   ('Perfekta tiotusen', 'Träffa totalt 10 000 perfekta toner'),
   ('Guldskörd', 'Träffa totalt 250 guldnoter'),
   ('Guldskyfall', 'Träffa totalt 1 000 guldnoter'),
   ('Midas-stämma', 'Träffa totalt 5 000 guldnoter'),
   ('Sångboksveteran', 'Fullfölj 250 låtar'),
   ('Halvtusenklubben', 'Fullfölj 500 låtar'),
   ('Tusenlåtslegend', 'Fullfölj 1 000 låtar'),
   ('Flitig sångare', 'Spela 50 spel'),
   ('Hundraklubben', 'Spela 100 spel'),
   ('Stammis i arkaden', 'Spela 250 spel'),
   ('Marathongalning', 'Spela 500 spel'),
   ('Erfaren sångare', 'Nå nivå 25'),
   ('Elitsångare', 'Nå nivå 50'),
   ('Nivå 100-legend', 'Nå nivå 100'),
   ('Daglig centurio', 'Fullfölj 100 dagliga utmaningar'),
   ('Daglig fanatiker', 'Fullfölj 250 dagliga utmaningar'),
   ('Daglig odödlig', 'Fullfölj 500 dagliga utmaningar'),
   ('Järnvilja', 'Håll en 60-dagars daglig svit'),
   ('Hundradagarhjälte', 'Håll en 100-dagars daglig svit'),
   ('Halvårs hängivenhet', 'Håll en 180-dagars daglig svit'),
   ('Årlig legend', 'Håll en 365-dagars daglig svit'),
   ('Pålitlig veckokämpe', 'Fullfölj 15 veckoutmaningar'),
   ('Veckans pelare', 'Fullfölj 30 veckoutmaningar'),
   ('Ett år av veckor', 'Fullfölj 52 veckoutmaningar'),
   ('Om igen!', 'Spela 10 spel på en enda dag'),
   ('Duettentusiast', 'Sjung 25 duetter'),
   ('Dynamiskt duo', 'Sjung 50 duetter'),
   ('Duetthundra', 'Sjung 100 duetter'),
   ('Duellant', 'Vinn 5 dueller'),
   ('Duellmästare', 'Vinn 10 dueller'),
   ('Duellhärskare', 'Vinn 25 dueller'),
   ('Festprisse', 'Spela 10 partyspel'),
   ('Festens mittpunkt', 'Spela 25 partyspel'),
   ('Festlegend', 'Spela 50 partyspel'),
   ('Disney-entusiast', 'Sjung 25 Disney-låtar'),
   ('Det var en gång en sång', 'Sjung 50 Disney-låtar'),
   ('Genrevandrare', 'Sjung låtar från 8 olika genrer'),
   ('Genrekännare', 'Sjung låtar från 10 olika genrer'),
   ('Håll nollan', 'Fullfölj en låt med 50+ noter och noll missar'),
   ('Helgsångare', 'Fullfölj en låt på en lördag eller söndag'),
   ('Lunchrast', 'Fullfölj en låt mellan klockan 12 och 14'),
 ],
 'disneyRoyalty': 'Disney-kunglighet',
 'mobile': {
   'mirrorJukeboxVideoAdd': 'Köa en videolänk',
   'mirrorJukeboxVideoPlaceholder': 'Klistra in en länk…',
   'mirrorJukeboxVideoButton': 'Köa',
   'mirrorJukeboxVideoInvalid': 'Okänd länk — stöds inte än',
   'mirrorJukeboxVideoAdded': 'Köad! Spelas på skrivbordet snart.',
   'mirrorJukeboxVideoHint': 'Köas med ljud bakom de önskade låtarna.',
 },
 'br': {
   'brGameSingNow': 'SJUNG MED!', 'brGameYourVoice': 'Din röst',
   'brGameMicActive': 'Mikrofon aktiv', 'brGameWaiting': 'Väntar på rundan…',
   'brGameVoting': 'Rösta på nästa låt!', 'brGameCountdown': 'Startar…',
   'brGameEliminated': 'ute', 'brGameSnippet': 'Snutt {n}/{m}',
 },
 'brComment': '// ── Battle Royale i spegelläget ──',
}

# ------------------------------------------------------------------ ZH
L['zh'] = {
 'country': {
   'countrySearch': '搜索国家…', 'noCountryFound': '未找到国家',
   'popularCountries': '热门', 'allCountries': '所有国家',
 },
 'loadProfile': '加载在线档案',
 'auth': {
   'accountTitle': '在线账号（可选）',
   'accountDesc': '保存电子邮箱和密码，即可在其他设备上加载此档案。登录仅可在卡拉OK应用内进行——没有网页登录。',
   'email': '电子邮箱', 'emailPlaceholder': '你的@email.com',
   'emailInvalid': '请输入有效的电子邮箱地址',
   'emailTaken': '该电子邮箱已被注册',
   'password': '密码', 'passwordPlaceholder': '至少 8 个字符',
   'passwordRepeat': '再次输入密码',
   'passwordsDontMatch': '两次输入的密码不一致',
   'passwordTooShort': '密码至少需要 8 个字符',
   'registerFailed': '无法创建在线账号',
   'loginTitle': '加载在线档案',
   'loginDesc': '输入在线档案的电子邮箱和密码，即可在此设备上加载。',
   'loginButton': '登录并加载档案',
   'loginFailed': '登录失败——请检查电子邮箱和密码',
   'loginSuccess': '档案“{n}”加载成功！',
   'noSnapshot': '服务器上尚未找到已同步的档案数据',
   'emailNote': '仅用于登录——绝不会公开显示',
   'changePassword': '修改密码', 'currentPassword': '当前密码',
   'newPassword': '新密码', 'passwordChanged': '密码修改成功',
   'passwordChangeFailed': '无法修改密码',
   'hasAccount': '在线账号 ✓',
   'registrationPending': '正在创建在线账号…',
   'registrationSuccess': '在线账号创建成功——你现在可以在任何设备上登录',
   'registrationSuccessTitle': '🔐 在线账号', 'loginSuccessTitle': '✅ {n}',
 },
 'achComment': '// ── 100 成就扩展 ──',
 'ach': [
   ('至尊之星', '得分超过 9,800 分'),
   ('超越完美', '得分超过 9,900 分'),
   ('连击泰坦', '达成 300 连击'),
   ('不朽连击', '达成 500 连击'),
   ('精细调校', '准确率超过 92%'),
   ('录音室品质', '准确率超过 94%'),
   ('神射手', '准确率超过 96%'),
   ('激光精度', '准确率超过 97%'),
   ('歌艺大师', '准确率超过 98%'),
   ('完美七十五', '在一首歌中获得 75 个完美音符'),
   ('完美一百', '在一首歌中获得 100 个完美音符'),
   ('完美风暴', '在一首歌中获得 150 个完美音符'),
   ('金色浪潮', '在一首歌中命中 30 个金色音符'),
   ('金色交响', '在一首歌中命中 40 个金色音符'),
   ('完美机器', '累计命中 500 个完美音符'),
   ('精准强者', '累计命中 1,000 个完美音符'),
   ('完美雪崩', '累计命中 5,000 个完美音符'),
   ('完美一万', '累计命中 10,000 个完美音符'),
   ('金色丰收', '累计命中 250 个金色音符'),
   ('金色骤雨', '累计命中 1,000 个金色音符'),
   ('点金之嗓', '累计命中 5,000 个金色音符'),
   ('曲库老将', '完成 250 首歌'),
   ('五百俱乐部', '完成 500 首歌'),
   ('千曲传奇', '完成 1,000 首歌'),
   ('常客歌手', '游玩 50 场游戏'),
   ('百场俱乐部', '游玩 100 场游戏'),
   ('街机常客', '游玩 250 场游戏'),
   ('马拉松狂人', '游玩 500 场游戏'),
   ('实力唱将', '达到 25 级'),
   ('精英歌手', '达到 50 级'),
   ('百级传奇', '达到 100 级'),
   ('每日百夫长', '完成 100 个每日挑战'),
   ('每日铁杆', '完成 250 个每日挑战'),
   ('每日不朽', '完成 500 个每日挑战'),
   ('钢铁意志', '保持连续 60 天的每日挑战记录'),
   ('百日英雄', '保持连续 100 天的每日挑战记录'),
   ('半年坚守', '保持连续 180 天的每日挑战记录'),
   ('年度传奇', '保持连续 365 天的每日挑战记录'),
   ('每周中坚', '完成 15 个每周挑战'),
   ('每周支柱', '完成 30 个每周挑战'),
   ('五十二周之年', '完成 52 个每周挑战'),
   ('安可！', '在一天内游玩 10 场游戏'),
   ('对唱爱好者', '演唱 25 首对唱歌曲'),
   ('黄金搭档', '演唱 50 首对唱歌曲'),
   ('对唱百曲', '演唱 100 首对唱歌曲'),
   ('决斗者', '赢得 5 场对决'),
   ('对决大师', '赢得 10 场对决'),
   ('对决霸主', '赢得 25 场对决'),
   ('派对动物', '游玩 10 场派对游戏'),
   ('派对灵魂', '游玩 25 场派对游戏'),
   ('派对传奇', '游玩 50 场派对游戏'),
   ('迪士尼发烧友', '演唱 25 首迪士尼歌曲'),
   ('从前有首歌', '演唱 50 首迪士尼歌曲'),
   ('流派漫游者', '演唱 8 种不同流派的歌曲'),
   ('流派行家', '演唱 10 种不同流派的歌曲'),
   ('零失误', '完成一首超过 50 个音符且零失误的歌曲'),
   ('周末歌手', '在周六或周日完成一首歌'),
   ('午休时光', '在中午 12 点到下午 2 点之间完成一首歌'),
 ],
 'disneyRoyalty': '迪士尼皇室',
 'mobile': {
   'mirrorJukeboxVideoAdd': '将视频链接加入队列',
   'mirrorJukeboxVideoPlaceholder': '粘贴链接…',
   'mirrorJukeboxVideoButton': '加入队列',
   'mirrorJukeboxVideoInvalid': '无法识别的链接——暂不支持',
   'mirrorJukeboxVideoAdded': '已加入队列！即将在桌面端播放。',
   'mirrorJukeboxVideoHint': '带声音排在点播歌曲之后。',
 },
 'br': {
   'brGameSingNow': '一起唱！', 'brGameYourVoice': '你的声音',
   'brGameMicActive': '麦克风已开启', 'brGameWaiting': '等待回合…',
   'brGameVoting': '为下一首歌投票！', 'brGameCountdown': '即将开始…',
   'brGameEliminated': '出局', 'brGameSnippet': '片段 {n}/{m}',
 },
 'brComment': '// ── 大乱斗镜像画面 ──',
}

# ------------------------------------------------------------------ helpers
def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read().split('\n')

def write(p, lines):
    with io.open(p, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

def find_line(lines, needle):
    hits = [i for i, l in enumerate(lines) if l.strip().startswith(needle)]
    assert len(hits) == 1, f"anchor {needle!r} found {len(hits)}x"
    return hits[0]

def block_close(lines, start_idx):
    indent = len(lines[start_idx]) - len(lines[start_idx].lstrip())
    close = ' ' * indent + '},'
    for j in range(start_idx + 1, len(lines)):
        if lines[j] == close:
            return j
    raise AssertionError('no close found')

def sq(v):
    assert "'" not in v, f"unescaped apostrophe: {v}"
    return "'" + v + "'"

def dq(v):
    assert '"' not in v, f"unescaped double quote: {v}"
    return '"' + v + '"'

# ------------------------------------------------------------------ main
for loc, D in L.items():
    assert len(D['ach']) == 58, loc
    assert len(D['auth']) == 29, (loc, len(D['auth']))
    assert '{n}' in D['auth']['loginSuccess'] and '{n}' in D['auth']['loginSuccessTitle'], loc
    assert '{n}/{m}' in D['br']['brGameSnippet'], loc

    # ---------------- profile.ts ----------------
    p = os.path.join(BASE, loc, 'profile.ts')
    lines = read(p)

    # 1) country keys after storageMode close (inside profile)
    sm = find_line(lines, 'storageMode: {')
    sm_close = block_close(lines, sm)
    ins = [f"  {k}: {sq(D['country'][k])}," for k in
           ('countrySearch', 'noCountryFound', 'popularCountries', 'allCountries')]
    lines[sm_close + 1:sm_close + 1] = ins

    # 2) profileAuth top-level section after profile close (before characterScreen)
    prof = find_line(lines, 'profile: {')
    prof_close = block_close(lines, prof)
    auth_lines = ['profileAuth: {']
    auth_lines += [f"  {k}: {sq(D['auth'][k])}," for k in AUTH_KEYS]
    auth_lines += ['},']
    lines[prof_close + 1:prof_close + 1] = auth_lines

    # 3) characterScreen.loadProfile after leaderboardParticipationDesc
    lp = find_line(lines, 'leaderboardParticipationDesc:')
    lines[lp + 1:lp + 1] = [f"  loadProfile: {sq(D['loadProfile'])},"]

    # 4) 58 achievements after marathon_singer block
    ms = find_line(lines, 'marathon_singer: {')
    ms_close = block_close(lines, ms)
    ach_lines = ['', f"  {D['achComment']}"]
    for (snake, camel, rew), (name, desc) in zip(ACH, D['ach']):
        ach_lines.append(f'  {snake}: {{')
        ach_lines.append(f'    name: {sq(name)},')
        ach_lines.append(f'    description: {sq(desc)},')
        ach_lines.append('  },')
    lines[ms_close + 1:ms_close + 1] = ach_lines

    write(p, lines)

    # ---------------- game.ts ----------------
    p = os.path.join(BASE, loc, 'game.ts')
    lines = read(p)

    ms = find_line(lines, 'marathonSinger: {')
    ms_close = block_close(lines, ms)
    ach_lines = ['', f"  {D['achComment']}"]
    for (snake, camel, rew), (name, desc) in zip(ACH, D['ach']):
        ach_lines.append(f'  {camel}: {{')
        ach_lines.append(f'    name: {sq(name)},')
        ach_lines.append(f'    description: {sq(desc)},')
        if rew is True:
            ach_lines.append(f'    rewardTitle: {sq(name)},')
        elif rew == 'SPECIAL':
            ach_lines.append(f'    rewardTitle: {sq(D["disneyRoyalty"])},')
        ach_lines.append('  },')
    lines[ms_close + 1:ms_close + 1] = ach_lines

    br = find_line(lines, 'battleRoyale: {')
    br_close = block_close(lines, br)
    dead = 0
    for j in range(br + 1, br_close):
        s = lines[j].strip()
        if s.startswith('title:') or s.startswith('playersLabel:') or s.startswith('timeLeft:'):
            lines[j] = None
            dead += 1
    assert dead == 3, f"{loc}: expected 3 dead keys, got {dead}"
    lines = [l for l in lines if l is not None]

    write(p, lines)

    # ---------------- mobile.ts ----------------
    p = os.path.join(BASE, loc, 'mobile.ts')
    lines = read(p)

    up = find_line(lines, 'mirrorJukeboxUpNext:')
    ins = [f"  {k}: {sq(D['mobile'][k])}," for k in MOBILE_KEYS]
    lines[up + 1:up + 1] = ins

    wt = find_line(lines, 'cptmWaitingForStart:')
    ins = ['', f"  {D['brComment']}"]
    ins += [f"  {k}: {dq(D['br'][k])}," for k in BR_KEYS]
    lines[wt + 1:wt + 1] = ins

    write(p, lines)
    print(f"{loc}: OK")

print("ALL LOCALES PATCHED")

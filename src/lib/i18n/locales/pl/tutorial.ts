// PL translations — tutorial
// Teksty samouczków / interaktywnych przewodników (podstawy + edytor + ustawienia
// + R29: profil, kolejka, czat, companion, osiągnięcia) — na podstawie pliku EN.
// Każdy krok może mieć opcjonalny tekst `details` — przycisk „Więcej informacji”
// w dymku rozwija dogłębny opis (najpierw krótki body, szczegóły na życzenie).
export const tutorialTranslations = {
  tutorial: {
    // ?-menu pomocy
    helpButtonTitle: 'Pomoc i samouczki',
    helpDialogTitle: 'Pomoc i samouczki',
    helpDialogDesc: 'Obejrzyj kompletne samouczki ponownie — albo przejdź od razu do konkretnego tematu i poznaj tylko ten fragment.',
    helpFooter: 'Klawiatura w samouczku: → dalej · ← wstecz · Esc zakończ',
    startFullTour: 'Pełny samouczek',
    stepsCount: '{n} kroków',
    completedBadge: 'Ukończono',
    // Grupy samouczków w menu pomocy (R29: 8 samouczków wymaga struktury)
    groupGettingStarted: 'Pierwsze kroki',
    groupAreas: 'Obszary i funkcje',
    groupAdvanced: 'Dla zaawansowanych',
    // Sterowanie nakładką
    ariaLabel: 'Samouczek',
    skipTour: 'Zakończ samouczek',
    back: 'Wstecz',
    next: 'Dalej',
    finish: 'Gotowe',
    clickHint: 'Kliknij to teraz',
    // Rozwijanie „Więcej informacji” (R29)
    moreDetails: 'Więcej informacji',
    lessDetails: 'Pokaż mniej',
    // Oferta przy pierwszym uruchomieniu
    offerTitle: 'Witaj w Karaoke ZERO!',
    offerBody: 'Chcesz krótki przewodnik po podstawach? W 2 minuty poznasz codzienne wyzwania, tryby śpiewania, bibliotekę i gry imprezowe.',
    offerStart: 'Rozpocznij samouczek',
    offerLater: 'Może później',
    offerHint: 'Dostępne w każdej chwili przez ikonę ? na pasku menu.',

    // ═══ Samouczek: podstawy ═══
    basic: {
      title: 'Podstawy',
      desc: 'Pełna trasa: wyzwania, tryby śpiewania, biblioteka, impreza i więcej.',
      chapters: {
        welcome: 'Witaj',
        challenges: 'Codzienne i tygodniowe',
        singing: 'Śpiew na start',
        party: 'Tryby imprezowe',
        more: 'Więcej obszarów',
      },
      steps: {
        welcome: {
          title: 'Witaj! 👋',
          body: 'To jest samouczek na żywo: podświetlam ważne miejsca i je wyjaśniam.\n\nSterowanie: „Dalej” (lub klawisz →), „Wstecz” (←) i „Zakończ samouczek” (Esc). Zaczynajmy!',
          details: 'Samouczek możesz w każdej chwili wstrzymać i wrócić do niego później: ikona ? na pasku menu otwiera menu pomocy ze wszystkimi samouczkami — można je przechodzić także rozdział po rozdziale.\n\nWiele kroków ma na dole przycisk „Więcej informacji”: rozwija dodatkowe szczegóły, nie tracąc krótkiego opisu.',
        },
        heroButtons: {
          title: 'Szybki start',
          body: '„Zacznij śpiewać” przenosi Cię od razu do biblioteki. „Tryb imprezy” otwiera 9 gier imprezowych dla grup.',
          details: 'Karty szybkiego startu to skróty do najczęstszych ścieżek:\n• „Zacznij śpiewać” = otwórz bibliotekę, wybierz piosenkę, do dzieła (solo, duel lub duet).\n• „Tryb imprezy” = kolekcja gier dla 2–24 graczy, telefony mogą dołączyć jako mikrofony.\n\nWszystko, co tu widzisz, osiągniesz też przez pasek menu — karty oszczędzają tylko klikanie.',
        },
        dailyCard: {
          title: 'Codzienne wyzwanie',
          body: '5 slotów dziennie z rotującymi się zadaniami — im więcej slotów zaliczysz, tym większy bonus XP. Świeże zadania pojawiają się o północy.',
          details: 'Jak działa system:\n• Każdy z 5 slotów zawiera inny typ zadania (np. „zaśpiewaj piosenkę z lat 80.”, „zdobądź 8000 punktów”).\n• Sloty odblokowują się po kolei — slot 2 dopiero po ukończeniu (lub pominięciu) slotu 1.\n• Każde zadanie jest grywalne na kilku poziomach trudności; wyższe dają więcej XP (mnożnik do 3×).\n• Bonus rośnie wraz z liczbą zaliczonych slotów: 5/5 zdobywa pełny bonus dzienny.\n\nZadania pochodzą z TWOJEJ biblioteki — wybór zawsze dopasowuje się do Twoich piosenek.',
        },
        weeklyCard: {
          title: 'Tygodniowe wyzwanie',
          body: 'Tygodniowy odpowiednik: 5 slotów rozłożonych na tydzień z większymi nagrodami XP. Idealne na długoterminowe cele.',
          details: 'Tygodniowe wyzwania działają jak codzienne, ale:\n• 5 slotów biegnie 7 dni — bez codziennego resetu, zbieraj we własnym tempie.\n• Nagrody XP za slot są znacznie większe (np. 500–2000 XP zamiast 100–400).\n• Reset następuje w poniedziałek rano.\n\nWskazówka: codzienne i tygodniowe biegną równolegle — granie w oba podnosi poziom najszybciej.',
        },
        modeLauncher: {
          title: 'Śpiew: Solo, Duel i Duet',
          body: '🎤 Solo: jeden gracz, jeden mikrofon.\n⚔️ Duel: dwóch graczy na TEJ SAMEJ piosence — wygrywa więcej punktów.\n🎭 Duet: dwa głosy na dwóch ścieżkach — biblioteka automatycznie pokazuje tylko pasujące duety.',
          details: 'Trzy tryby szczegółowo:\n• Solo: klasyczne karaoke — śpiewasz wszystkie nuty, a Twój wynik trafia na tabele wyników.\n• Duel: obaj gracze śpiewają jednocześnie tę samą ścieżkę nut. Punkty liczą się osobno — porównanie na końcu pokazuje, kto był lepszy. Idealne na rewanże.\n• Duet: piosenka ma dwa osobne głosy (P1/P2) — każdy śpiewa „swoje” części, wspólne frazy dają bonus drużynowy. Duety znajdziesz w bibliotece przez filtr 🎭.\n\nMikrofony: możesz przypisać dowolną liczbę mikrofonów lub smartfonów (patrz Ustawienia → Mikrofon).',
        },
        libraryNav: {
          title: 'Biblioteka',
          body: 'Tu mieszkają wszystkie Twoje piosenki. Szukaj po tytule lub wykonawcy — wyszukiwanie rozmyte wybacza nawet literówki.',
          details: 'Wskazówki do wyszukiwania:\n• Wyszukiwanie rozmyte znajduje „Dancing Qun” → „Dancing Queen”. Ignoruje wielkość liter i pojedyncze literówki.\n• Przeszukuje jednocześnie tytuł, wykonawcę I gatunek — „Rock” znajdzie też piosenki z gatunku Rock.\n\nSortowanie przez listę rozwijaną (tytuł A–Z, wykonawca, ostatnio dodane). Piosenki trafiają do biblioteki przez import, skanowanie folderów lub playlisty — ścieżkę ustawiasz w zakładce Biblioteka w ustawieniach.',
        },
        filters: {
          title: 'Filtry',
          body: 'Gatunek, język, rok, dekada, duety i viralowe hity — potnij bibliotekę, jak chcesz.',
          details: 'Filtry można łączyć — np. „Gatunek: Rock + Język: angielski + Epoka: lata 80.” pokaże dokładnie angielskie rockowe piosenki z osiemdziesiątych.\n\nFiltry specjalne:\n• Duet: tylko piosenki z dwiema ścieżkami wokalnymi.\n• Viralowe hity: piosenki aktualnie na listach viralowych (dane z Ustawienia → Wirusowe listy przebojów).\n• Własne gatunki i języki: twórz własne kategorie w Ustawienia → Gatunki i języki — natychmiast pojawiają się w tych filtrach.\n\n„Resetuj filtry” (✕) czyści wszystko za jednym zamachem.',
        },
        songCard: {
          title: 'Piosenki',
          body: 'Kliknięcie karty piosenki otwiera okno startowe: tryb, gracze, mikrofony i poziom trudności.',
          details: 'Każda karta piosenki pokazuje:\n• Okładkę plus tytuł/wykonawcę\n• Poziom trudności (łatwy/średni/trudny/ekspert) i ocenę gwiazdkową\n• Kluczowe metadane jak gatunek i język — prosto z piosenki lub zharmonizowane przez AI (Edytor → Metadata Studio)\n\nIkona podglądu uruchamia krótki teaser bez otwierania okna startowego.',
        },
        startModal: {
          title: 'Okno startowe',
          body: 'Tutaj ustawiasz wszystko: tryb (solo/duel/duet), kto śpiewa, jaki mikrofon dostaje każdy i poziom trudności.\n\nPotem kliknij „Rozpocznij grę” — i do dzieła!',
          details: 'Najważniejsze opcje:\n• Tryb: solo, duel (2 graczy, ta sama ścieżka) lub duet (2 głosy) — w trybie duetu obaj gracze wybierają swój głos (P1/P2).\n• Mikrofony: każdy gracz może dostać własne urządzenie wejściowe — albo smartfon jako mikrofon (aplikacja kompana).\n• Poziom trudności: wpływa na punktację — wyższe trudności mniej wybaczają, a nagradzają precyzję (wyższy potencjał punktów, więcej XP).\n• „Dodaj do kolejki” zamiast „Rozpocznij grę”: piosenka trafia do kolejki zamiast startować od razu — idealne, gdy chce śpiewać kilka osób.',
        },
        partyCard: {
          title: 'Tryby imprezowe',
          body: '9 gier dla 2–24 graczy: Battle Royale, Przekaż mikrofon, Medley Contest, turniej, Brakujące słowa, Ślepe karaoke i więcej — telefony dołączają jako mikrofony.',
          details: '9 trybów w pigułce:\n• Battle Royale: śpiewają wszyscy, najsłabszy odpada każdej rundy — ostatni na scenie wygrywa.\n• Przekaż mikrofon: mikrofon krąży od gracza do gracza — każdy śpiewa swoją część.\n• Medley Contest: drużyny śpiewają krótkie fragmenty piosenek ze specjalnymi zasadami.\n• Turniej: drabinka z duelami — zwycięzca awansuje co rundę.\n• Brakujące słowa: słowa z tekstu znikają — zaśpiewaj brakujące słowo, by zdobyć punkty.\n• Ślepe karaoke: bez wyświetlania nut, tylko słuch!\n• Rate my Song, Śpiew z Companionem i więcej — każda karta trybu wyjaśnia się sama.\n\nPrawie wszystkie tryby obsługują aplikację kompana jako mikrofon i pilota.',
        },
        partyModes: {
          title: 'Wybór trybu',
          body: 'Tu wybierasz tryb imprezowy: Battle Royale (ostatni na scenie), Przekaż mikrofon, turniej (drabinka), medley i więcej.\n\nKażda karta pokazuje, czego się spodziewać — jedno kliknięcie otwiera wybór graczy.',
          details: 'Po kliknięciu karty trybu następuje wybór graczy: wybierz profile (lub podłącz urządzenia kompanów), a potem ustaw wielkości drużyn, liczby rund lub limity czasu — zależnie od trybu.\n\nWskazówka o imprezie tematycznej: gdy w ustawieniach aktywny jest motyw (np. „Impreza lat 80.”), każdy wybór piosenki w trybie imprezowym sięga automatycznie tylko pasujących utworów — impreza trzyma się tematu.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke bez rywalizacji: buduj playlisty, ustawiaj piosenki w kolejce, dziel się ulubionymi. Doskonała rozrywka w tle.',
          details: 'Jukebox to relaksujący tryb:\n• Wybierz playlisty lub pojedyncze piosenki jako pulę.\n• Opcjonalne przerwy na wideo między utworami, żeby klimat się nie urwał.\n• Bez punktacji, bez mikrofonów — piosenki po prostu lecą z tekstem.\n\nIdealne na całonocną rozrywkę albo rozśpiewanie przed pierwszą rundą.',
        },
        jukeboxView: {
          title: 'W środku menu jukeboxa',
          body: '„Przeglądaj playlisty” daje bezpośredni dostęp do każdej zapisanej playlisty — także do tych stworzonych w bibliotece. Jedno kliknięcie dodaje całą playlistę do kolejki.',
          details: 'Ustawienia playlist jukeboxa oferują:\n• Czy wideo jest pokazywane (jeśli piosenki je mają)\n• Tryb przerw na wideo: filmy przerywnikowe między piosenkami, np. na ogłoszenia\n• Czy pula jest tasowana, czy leci w stałej kolejności\n\nStart na pełnym ekranie — wyjście przez Escape lub przycisk zatrzymania u góry.',
        },
        highscoreCard: {
          title: 'Najlepsze wyniki',
          body: 'Najlepsze wyniki na piosenkę i poziom trudności — pokonaj znajomych (albo siebie).',
          details: 'Tabele pamiętają dla każdej piosenki i trudności:\n• Wynik, celność, złote nuty i datę\n• Który gracz ustanowił wpis (avatar profilu)\n• Czy wpis przyszedł przez aplikację kompana (ikona telefonu), czy z komputera\n\nPrzy włączonym trybie online (ekran profilu) widzisz dodatkowo globalne tabele i rywalizujesz z graczami z innych instalacji.',
        },
        highscoreView: {
          title: 'Tablice wyników',
          body: 'Filtrowane po piosence i trudności — z paskiem filtrów na górze. Ikony telefonu pokazują użycie aplikacji kompana.',
          details: 'Górny pasek filtrów pozwala:\n• Szukać po piosence lub graczu\n• Filtrować według trudności\n• Przełączać lokalne/globalne (gdy online jest włączone)\n\nAnty-cheat: każdy wpis zawiera sygnaturę piosenki — zmanipulowane wyniki są wykrywane i oznaczane.',
        },
        settingsCard: {
          title: 'Ustawienia',
          body: 'Mikrofony, język, dostrajanie rozgrywki, wygląd i grafika — wszystkie pokrętła mieszkają tutaj.',
          details: '12 zakładek ustawień w skrócie:\n• Ogólne: język, domyślna trudność, online\n• Rozgrywka: punktacja, cząsteczki, autoodtwarzanie kolejki\n• Wygląd: motywy, styl tekstów, tło\n• Grafika / Dźwięk: urządzenie wyjściowe, głośność, jakość YouTube\n• Mikrofon: urządzenia, czułość, bramka szumu, presety\n• Mobilne: łącz i zarządzaj urządzeniami kompanów\n• Kamera internetowa: kamera jako tło\n• Biblioteka: folder piosenek, import, reset\n• Gatunki i języki: własne kategorie\n• Impreza tematyczna: aktywuj i skonfiguruj motyw\n• Sync i kopie zapasowe: bezpieczniki\n\nDla wszystkich zakładek jest osobny, obszerny samouczek ustawień w menu pomocy ?.',
        },
        settingsView: {
          title: 'Zakładki ustawień',
          body: 'Wybierz sekcję na górze: Ogólne (język), Rozgrywka, Wygląd, Grafika / Dźwięk, Mikrofon, Mobilne (połączenie z telefonem) i więcej.',
          details: 'Od R28 krótki tekst wprowadzenia na górze każdej zakładki wyjaśnia, co robi — nigdy więcej zgadywania, gdzie należy która opcja.\n\nPasujący samouczek: „Ustawienia” w menu pomocy ? przeprowadzi Cię przez każdą zakładkę.',
        },
        finish: {
          title: 'Gotowe! 🎉',
          body: 'Znasz już podstawy.\n\nWskazówka: ikona ? na pasku menu zawsze Cię tu przywróci — także do pojedynczych rozdziałów tematycznych, samouczka edytora i samouczka ustawień.',
          details: 'Co teraz? Kilka podpowiedzi na pierwsze minuty:\n1. Utwórz profil (Profile na pasku menu) — bez niego grasz, ale nie zbierasz XP.\n2. Zaimportuj piosenki (Ustawienia → Biblioteka).\n3. Kilka rund codziennych wyzwań na boost XP.\n4. Nadchodzą znajomi? Wypróbuj tryb imprezy — aplikacja kompana zamienia każdy telefon w mikrofon (jest osobny samouczek o companionie).',
        },
      },
    },

    // ═══ Samouczek: edytor ═══
    editor: {
      title: 'Samouczek edytora',
      desc: 'Nuty, teksty, głosy i harmonizacja — skrzynka narzędziowa piosenek.',
      chapters: {
        entry: 'Wejście',
        layout: 'Układ',
        notes: 'Edycja nut',
        extras: 'Dodatki i harmonizacja',
      },
      steps: {
        welcome: {
          title: 'Edytor ✏️',
          body: 'To tu piosenki stają się grywalnymi ścieżkami karaoke: rozmieszczaj nuty, timinguj teksty, przypisuj głosy.\n\nWskazówka sandbox: poćwicz na piosence testowej — zmiany cofniesz przez Ctrl+Z.',
          details: 'Edytor pracuje w formacie UltraStar: każda nuta ma czas startu, czas trwania, wysokość i tekst (sylabę). Wiele nut tworzy autostradę nut, którą widzisz w grze.\n\nŹródła nowych piosenek:\n• Import tekstu (UltraStar/TXT) w edytorze\n• Import MIDI (nuty wygenerowane z MIDI)\n• Harmonizacja AI: tekst + audio → propozycje nut\n\nWszystko jest nieniszczące: do momentu zapisu oryginalna piosenka pozostaje nietknięta.',
        },
        songList: {
          title: 'Wybór piosenki',
          body: 'Wyszukaj piosenkę, żeby ją otworzyć. Filtry wyławiają piosenki z brakującymi metadanymi — te edytor zharmonizuje później.',
          details: 'Płytki filtrów nad listą pokazują piosenki bez gatunku/języka/roku — najszybsza droga do utworów, których Metadata Studio jeszcze nie przerobiło.\n\nWyszukiwanie obejmuje tytuł i wykonawcę — wielkość liter nie ma znaczenia.',
        },
        noSongs: {
          title: 'Jeszcze brak piosenek',
          body: 'Edytor potrzebuje piosenek w bibliotece. Najpierw zaimportuj utwory (biblioteka → import / skan folderu) i wróć.',
          details: 'Jak zdobyć piosenki:\n• Ustawienia → Biblioteka → ustaw folder piosenek: każdy podfolder jest czytany jako jedna piosenka (audio/wideo + tekst UltraStar).\n• Alternatywnie pojedyncze pliki przez okno importu.\n• Albo utwórz nową piosenkę w edytorze („Nowa piosenka”) i sam połącz tekst z audio.',
        },
        openSong: {
          title: 'Otwórz piosenkę',
          body: 'Kliknij teraz piosenkę na liście, aby otworzyć ją w edytorze.',
          details: 'Po otwarciu zobaczysz u góry pasek narzędzi (nagłówek) oraz oś czasu z falą dźwiękową, pasmami nut i tekstem.\n\nPiosenka pozostaje otwarta, dopóki nie zamkniesz jej przez „Wstecz” — niezapisane zmiany najpierw proszą o potwierdzenie.',
        },
        leftPanel: {
          title: 'Pasek narzędzi',
          body: 'Wszystko dla nut: dodawanie, duplikowanie, usuwanie, dzielenie, łączenie — plus typy nut, głosy i tryb tap (zaraz się pojawi).',
          details: 'Narzędzia po kolei:\n• ➕ Dodaj nutę: wpada na głowicę odtwarzania\n• ⧉ Duplikuj: kopiuje zaznaczoną nutę tuż za nią\n• 🗑 Usuń: usuwa zaznaczenie\n• ✂ Podziel: jedna nuta → dwie (w połowie)\n• ⇄ Połącz: dwie zaznaczone → jedna\n\nZaznaczanie przez kliknięcie; shift+klik dla wielu. Potem przejmuje klawiatura: ⌫ usuwa, ↑/↓ transponuje, ←/→ dosuwa.',
        },
        lyricsPanel: {
          title: 'Panel tekstu',
          body: 'Linijki tekstu siedzą po lewej. Dwuklik na linijce przeskakuje odtwarzanie dokładnie w to miejsce — tekst i timing są tu edytowalne.',
          details: 'Panel tekstu to tekst I timing w jednym:\n• Kliknięcie sylaby zaznacza pasującą nutę na osi czasu.\n• Dwuklik przeskakuje na miejsce (odtwarzanie podąża).\n• Prawy przycisk (albo ikona pióra) otwiera edycję linijki: zmień tekst, dziel sylaby na granicach słów, przesuń timing całej linijki.\n\nDzielenie na granicach słów używa wykrywania języka, by rozdzielić sylaby między słowa rozsądnie — koniec z ręcznym krojeniem.',
        },
        subHeaderTools: {
          title: 'Edycja nut',
          body: 'Nuty to bloki na pasmach wysokości: dodawanie, duplikowanie, usuwanie, dzielenie (jedna → dwie) i łączenie (dwie → jedna).\n\nZaznaczone nuty edytujesz w biegu: ⌫ usuwa, ↑/↓ transponuje.',
          details: 'Wskazówki precyzyjne:\n• Zoom: Ctrl+kółko myszy nad osią czasu — przybliż dla precyzyjnego timingu.\n• Odtwarzanie: Spacja przełącza play/pauza, Shift+Spacja odtwarza samo zaznaczenie.\n• Transpozycja wielu nut: zaznacz je wszystkie, ↑/↓ przesuwa całą paczkę.\n\nTiming: start nuty musi trafić w wejście sylaby w wokalu — fala dźwiękowa pomaga znaleźć wejścia.',
        },
        noteTypes: {
          title: 'Typy nut',
          body: '5 typów dla nowych nut:\n: Zwykła (liczy się wysokość)\n* Złota (dodatkowe punkty)\nF Freestyle (liczy się każda nuta)\nR Rap (tylko timing)\nG Rap-złota',
          details: 'Co każdy typ znaczy w grze:\n• Zwykła (:): klasyczna nuta wokalna — liczy się wysokość i timing.\n• Złota (*): renderowana na złoto, podwójne punkty za trafienia. Idealna na kulminacje piosenki.\n• Freestyle (F): wysokość nieistotna, liczy się tylko tekst/timing — dobre na partie mówione.\n• Rap (R): ocenia timing i rytm zamiast melodii.\n• Rap-złota (G): jak rap, ale z dodatkowymi punktami.\n\nTyp można zmienić później: zaznacz nutę i wybierz nowy typ w pasku narzędzi.',
        },
        voices: {
          title: 'Głosy',
          body: 'P1 = gracz 1, P2 = gracz 2 (duet!), P4/P8 = trzeci/czwarty głos. Każda nuta należy do głosu — tak powstają duety z osobnymi partiami.',
          details: 'Przypisywanie głosów:\n• Lista rozwijana głosów wybiera ścieżkę, na którą trafiają nowe nuty.\n• Rozstawione nuty mogą się przenieść: zaznacz i przełącz głos.\n• W trybie duetu w grze każdy gracz wybiera swoją ścieżkę — biblioteka automatycznie filtruje piosenki z co najmniej 2 głosami.\n\nP4/P8 pozwalają nawet na kwartety; główne tryby gry używają P1/P2.',
        },
        tapMode: {
          title: 'Tryb tap — turbo 🥁',
          body: 'Włącz tryb i stukaj w rytm: każde kliknięcie zrzuca nutę na bieżącą pozycję odtwarzania, linijka po linijce. Twórz nuty w czasie rzeczywistym.',
          details: 'Jak przebiega nagrywanie tap:\n1. Aktywuj tryb tap w pasku narzędzi.\n2. Start odtwarzania — piosenka leci ze słyszalnym dźwiękiem.\n3. Klikaj w rytmie sylab — każde kliknięcie zrzuca nutę na głowicę z ostatnio wybraną wysokością.\n4. Potem doszlifuj: popraw wysokości (↑/↓ na zaznaczonych nutach) i długości.\n\nTryb tap jest 5–10× szybszy niż ręczne rozmieszczanie nut — całe piosenki w minuty zamiast godzin.',
        },
        panels: {
          title: 'Panele nagłówka',
          body: 'Trzy panele w prawym górnym rogu: metadane (gatunek/język/rok), analiza audio i asystent AI.',
          details: 'Co potrafią trzy panele:\n• Metadane: edytuj gatunek, język i rok otwartej piosenki wprost — zasilają filtry i imprezę tematyczną.\n• Analiza audio: analizuje plik audio (głośność, tonację, BPM) i podpowiada wartości.\n• Asystent AI: uzupełnianie tekstów, rozpoznawanie piosenek i harmonizacja nut przez AI — wymaga skonfigurowanego dostawcy AI (Ustawienia → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Turbo harmonizacji: sugestie AI i regułowe dla gatunku, języka i roku — z odsłuchiem przed przypisaniem, ręczną korektą i kolejką przeglądu dla niepewnych dopasowań.',
          details: 'Przepływ pracy w studiu:\n1. „Analizuj wszystkie piosenki” — silnik reguł (ścieżki plików, tagi) i opcjonalnie AI proponują gatunek/język/rok.\n2. Sugestie niosą pewność: zielona = pewna, żółta = do przeglądu.\n3. Odsłuch: kliknięcie piosenki odtwarza fragment — najszybsza weryfikacja sugestii.\n4. Przypisz pojedynczo albo „zastosuj wszystkie zielone”.\n\nKolejka przeglądu zbiera niepewne dopasowania na później — nic nie ginie.',
        },
        shortcuts: {
          title: 'Skróty',
          body: 'Wszystkie skróty klawiszowe w jednym miejscu — edytor to instrument klawiszowy. Klikaj i poznawaj!',
          details: 'Najważniejsze skróty:\n• Ctrl+Z / Ctrl+Y: cofnij / ponów\n• Spacja: play/pauza\n• ⌫: usuń zaznaczone nuty\n• ↑/↓: transpozycja · ←/→: dosunięcie w czasie\n• S: podziel nutę · M: połącz\n• 1–5: wybór typu nuty\n\nW panelu skrótów możesz przeglądać klawisze i przypisywać je na nowo.',
        },
        finish: {
          title: 'Gotowi do budowania! 🛠️',
          body: 'Znasz już skrzynkę narzędziową edytora.\n\nZapamiętaj: Ctrl+Z ratuje wszystko, a ikona ? na pasku menu zawsze przywróci Cię do tych rozdziałów.',
          details: 'Zalecana kolejność dla nowej piosenki:\n1. Podłącz audio/wideo (zakładka informacji o piosence)\n2. Zaimportuj lub wpisz tekst (zakładka tekstu)\n3. Stukaj nuty (tryb tap) albo harmonizacja AI\n4. Zadbaj o metadane (gatunek/język/rok — ważne dla filtrów!)\n5. Zapisz — od teraz piosenka pojawia się w bibliotece.',
        },
      },
    },

    // ═══ Samouczek: ustawienia (R28) ═══
    settings: {
      title: 'Ustawienia',
      desc: 'Wszystkie ustawienia w pigułce: zakładki, ustawienia ogólne, audio, biblioteka, urządzenia kompanów i kopie zapasowe.',
      chapters: {
        overview: 'Przegląd',
        basics: 'Ustawienia podstawowe',
        sound: 'Audio i mikrofon',
        library: 'Biblioteka i motyw',
        devices: 'Urządzenia i Companion',
        data: 'Sync, kopie zapasowe i info',
      },
      steps: {
        welcome: {
          title: 'Ustawienia 👋',
          body: 'Ten samouczek oprowadza Cię wyłącznie po ustawieniach — zakładka po zakładce.\n\nAutomatycznie przełączam się na każdą zakładkę i wyjaśniam, co w niej znajdziesz.',
          details: 'Zakładki w kolejności samouczka: Ogólne, Rozgrywka, Wygląd, Grafika / Dźwięk, Mikrofon, Mobilne (companion), Kamera internetowa, Biblioteka, Gatunki i języki, Impreza tematyczna, Wirusowe listy przebojów, Sync i kopie zapasowe oraz O programie.\n\nKażda zakładka ma u góry krótkie wprowadzenie — ten samouczek pogłębia je krok po kroku.',
        },
        tabBar: {
          title: 'Pasek zakładek',
          body: 'Wszystkie ustawienia są zorganizowane w zakładki: Ogólne, Rozgrywka, Wygląd, Audio, Mikrofon, Mobilne, Kamera internetowa, Biblioteka, Gatunki i języki, Impreza tematyczna, Sync i kopie zapasowe oraz O programie.\n\nOd R28 krótki tekst wprowadzenia na górze każdej zakładki wyjaśnia, co robi.',
          details: 'Pomoc w orientacji — szukając, zapytaj siebie…\n• „Jak gra SIĘ ZACHOWUJE?” → Rozgrywka\n• „Jak WYGLĄDA?” → Wygląd\n• „Jak BRZMI?” → Grafika / Dźwięk / Mikrofon\n• „Podłączyć urządzenia?” → Mobilne (companion) / Mikrofon\n• „Moje piosenki?” → Biblioteka\n• „Zabezpieczyć dane?” → Sync i kopie zapasowe\n\nZakładki przewijają się poziomo w wąskich oknach — po prostu przesuń w prawo.',
        },
        general: {
          title: 'Ogólne',
          body: 'Język interfejsu, domyślna trudność, aktywności online i pełny przegląd skrótów klawiszowych.',
          details: 'Język: dostępnych jest 16 języków. Zmiana działa na żywo w całym interfejsie.\n\nDomyślna trudność: obowiązuje w nowych rundach, chyba że okno startowe wybierze inną.\n\nAktywności online sterują tym, czy najlepsze wyniki trafiają globalnie i czy codzienne wyzwania generują się online.',
        },
        gameplay: {
          title: 'Rozgrywka',
          body: 'Punktacja wł/wył, efekty cząsteczkowe, autoodtwarzanie kolejki i więcej przełączników zachowania dla rund i wyników.',
          details: 'Kluczowe przełączniki:\n• Punktacja: dla czystej zabawy w śpiew bez wyświetlania wyniku.\n• Autoodtwarzanie kolejki: po zakończeniu piosenki następny wpis kolejki startuje automatycznie — idealne na noc imprezową bez prowadzącego.\n• Cząsteczki i efekty: wyłącz na słabszych maszynach.\n\nDodatkowo: zachowanie po rundach (ekran wyników, natychmiastowy restart) i wyświetlanie combo.',
        },
        appearance: {
          title: 'Wygląd',
          body: 'Motywy, animowane tło albo własne wideo w tle, styl i rozmiar tekstów, wyświetlanie nut oraz tryb wydajności dla słabszych maszyn.',
          details: 'Styl tekstów: „Karaoke” (wypełnianie słowa kolorem), „UltraStar” (bloki sylab) albo „Minimalny”.\n\nTło: poza motywami działa też własne wideo — w grze leci wygaszone za nutami.\n\nTryb wydajności radykalnie ścina animacje i tła — wart uwagi od sprzętu z ok. 2015 roku.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Urządzenie wyjściowe (w tym ASIO), głośność główna i podglądu, czułość mikrofonu, normalizacja głośności i jakość wideo z YouTube.',
          details: 'ASIO: istotne tylko dla Windows i kart dźwiękowych z obsługą ASIO — zmniejsza opóźnienie monitoringu mikrofonu.\n\nNormalizacja głośności wyrównuje różnice głośności między piosenkami — domyślne wartości są dobrze dobrane.\n\nJakość YouTube: dotyczy piosenek ze źródłem wideo z YouTube; wyższa jakość = większe zużycie łącza.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Wybór urządzenia, czułość, bramka szumu i poziom na żywo — plus presety. Smartfony łączysz przez zakładkę Mobilne.',
          details: 'Presety: typowe konfiguracje („mikrofon wokalny dynamiczny”, „słuchawki z mikrofonem”, „telefon”) ustawiają czułość i bramkę szumu w rozsądnych kombinacjach.\n\nBramka szumu: odfiltrowuje oddechy i szumy pomieszczenia — poziom na żywo pokazuje w czasie rzeczywistym, co przepuszcza.\n\nWażne dla gry wieloosobowej: KAŻDY gracz może dostać WŁASNE urządzenie — przypisanie odbywa się w oknie startowym przy każdej rundzie.',
        },
        libraryTab: {
          title: 'Biblioteka',
          body: 'Ustaw folder piosenek (każdy podfolder = jedna piosenka) i go zeskanuj, zresetuj bibliotekę albo usuń wszystkie dane — plus import z innych systemów karaoke.',
          details: 'Format folderu: jeden podfolder na piosenkę z audio/wideo + TXT (format UltraStar). Skaner rozpoznaje typowe zestawy (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport z innych systemów: archiwum SingStar? Kolekcja UltraStar? Konwerter importu przejmuje metadane i teksty automatycznie.\n\nUwaga na „usuń wszystkie dane”: podwójne potwierdzenie pyta dwa razy — mimo to zrób najpierw kopię zapasową (zakładka Sync i kopie zapasowe).',
        },
        taxonomy: {
          title: 'Gatunki i języki',
          body: 'Twórz własne gatunki i języki — pojawiają się we wszystkich listach rozwijanych i zasilają harmonizację AI.',
          details: 'Po co własne wpisy? Standardowe listy nie obejmują wszystkiego („Schlager”, „K-Pop”, „gwara”…). Własne wpisy:\n• pojawiają się natychmiast w filtrach biblioteki\n• są do wyboru w edytorze i Metadata Studio\n• harmonizują się razem (AI podpowiada je do pasujących piosenek)\n\nUsuwanie też działa — piosenki zachowują wpis do ponownego przypisania.',
        },
        motto: {
          title: 'Impreza tematyczna',
          body: 'Ustaw całą grę w jednym motywie (np. impreza lat 80.): gdy motyw jest aktywny, zastępuje wszystkie pola wyszukiwania i filtry — każdy wybór piosenki sięga tylko pasujących utworów.',
          details: 'Filtr motywu zna kilka pól, swobodnie łączonych (logika I):\n• Gatunek (np. rock)\n• Język (np. angielski)\n• Epoka/rok (np. 1980–1989)\n\nEfekt: biblioteka, wybór piosenek na imprezie ORAZ aplikacja kompana pokazują tylko pulę motywu — goście nie wybiorą nic spoza tematu.\n\nWyłączenie motywu przywraca wszystko do normalnego widoku natychmiast; zagrane piosenki i wyniki zostają nietknięte.',
        },
        mobile: {
          title: 'Mobilne i Companion',
          body: 'Podłącz smartfony przez kod QR — jako mikrofon, pilota albo urządzenie do wspólnego śpiewania. Widzisz wszystkie podłączone urządzenia i ich kody połączenia.',
          details: 'Połączenie: zeskanuj kod QR (ta sama sieć Wi-Fi!) albo wpisz adres URL — szczegóły tłumaczy osobny samouczek o companionie w menu pomocy ?.\n\nTa zakładka pokazuje też:\n• Wszystkie podłączone urządzenia ze statusem (aktywne, rola, ostatnia aktywność)\n• Przypisywanie profili do urządzeń\n• Wyrzucanie pojedynczych urządzeń\n\nKody QR przypisane do profili (do przejmowania) znajdują się w karcie ustawień na ekranie profilu.',
        },
        webcam: {
          title: 'Kamera internetowa',
          body: 'Użyj kamery jako animowanego tła piosenki: rozdzielczość, lustrzane odbicie, nasycenie, rozmycie i więcej efektów — z podglądem na żywo.',
          details: 'Tło z kamery leci podczas piosenki za nutami — oglądacie, jak sami śpiewacie!\n\nEfekty: lustro (jak selfie), nasycenie, delikatne rozmycie, sepia — od razu widoczne w podglądzie na żywo.\n\nPrywatność: kamera działa tylko lokalnie, nic nie jest zapisywane ani wysyłane.',
        },
        sync: {
          title: 'Sync i kopie zapasowe',
          body: 'Twórz i przywracaj kopie zapasowe, synchronizuj dane między urządzeniami. W wersji desktop dane graczy są dodatkowo trwale kopiowane do folderu AppData.',
          details: 'Kopia zapasowa zawiera: profile (z XP i postępami), najlepsze wyniki, ustawienia i definicje playlist — jako jeden plik do archiwizacji lub przenoszenia.\n\nKopia w AppData (wersja desktop) chroni przed utratą danych przeglądarki: nawet gdy pamięć przeglądarki zostanie wyczyszczona, wersja desktop przywróci wszystko.\n\nPrzywracanie nadpisuje bieżące dane — jeszcze raz: najpierw zrób kopię.',
        },
        about: {
          title: 'O programie',
          body: 'Wersja, platforma, licencje i projekty, z których korzystamy — cyfrowa wizytówka Karaoke ZERO.',
          details: 'Widzisz też kanał wydania (web/desktop) i możesz sprawdzić aktualizacje. Licencje wymieniają użyte projekty open source — dzięki wszystkim zaangażowanym!',
        },
        finish: {
          title: 'W pełni skonfigurowane! ⚙️',
          body: 'Znasz już wszystkie ustawienia.\n\nIkona ? na pasku menu zawsze przywróci Cię do tego samouczka — jeśli chcesz, rozdział po rozdziale.',
          details: 'Rekomendacja na pierwszy wieczór konfiguracji:\n1. Zakładka Biblioteka: zeskanuj folder piosenek\n2. Zakładka Mikrofon: wybierz preset i sprawdź poziom na żywo\n3. Zakładka Mobilne: podłącz telefony (samouczek o companionie!)\n4. Zakładka motywu: pomyśl o motywie imprezy\n5. Sync i kopie zapasowe: zrób pierwszą kopię\n\nZ tym wieczór karaoke jedzie po szynach.',
        },
      },
    },

    // ═══ Samouczek: profile (R29) ═══
    profile: {
      title: 'Profile i postacie',
      desc: 'Twórz graczy, śledź XP i postępy, synchronizację online i przejmowanie profili przez companiony.',
      chapters: {
        overview: 'Przegląd',
        characters: 'Postacie i postępy',
        online: 'Online i Companion',
      },
      steps: {
        welcome: {
          title: 'Twoje profile graczy 👤',
          body: 'Profile to tożsamości w grze: XP, poziom, statystyki i osiągnięcia żyją na profilu — a najlepsze wyniki noszą Twoje imię.\n\nTen samouczek pokazuje, jak tworzyć i zarządzać profilami.',
          details: 'Po co profile?\n• XP i poziom: zaśpiewane piosenki, wyzwania i osiągnięcia zbierają doświadczenie — poziom rośnie wraz z tytułem rangi (początkujący → legenda karaoke).\n• Tablice wyników: wpisy pokazują Twój avatar.\n• Tryby imprezowe: każdy wybór graczy czerpie z tej listy.\n• Urządzenia kompanów mogą „przejąć” profil i śpiewać pod jego tożsamością.\n\nProfile żyją w pamięci przeglądarki (lokalnie) albo na koncie online (sync) — wybierasz to przy tworzeniu.',
        },
        topBar: {
          title: 'Pasek akcji',
          body: 'Tu u góry przełączasz tablice online, zmieniasz lokalne/globalne i otwierasz formularz tworzenia nowych profili.',
          details: 'Elementy paska:\n• Przełącznik online: globalnie włącza/wyłącza funkcje online (tablice, rejestracja konta)\n• Lokalne/Globalne: która tablica pokazuje się w widoku wyników\n• „Wczytaj profil”: loguje Cię kodem synchronizacji i ściąga Twój profil online na to urządzenie\n• „Nowy profil”: otwiera formularz tworzenia (następny krok)',
        },
        createButton: {
          title: 'Tworzenie profilu',
          body: '„Nowy profil” otwiera formularz: nazwa, obrazek avatara, kraj i tryb zapisu (lokalny albo z kontem online).',
          details: 'Pola formularza:\n• Nazwa: widoczna na tablicach wyników i na imprezach\n• Avatar: wgraj własny obrazek albo inicjał na kolorze\n• Kraj: flaga na globalnych tablicach\n• Tryb zapisu: „Lokalnie” zapisuje tylko na tym urządzeniu; „Online” opcjonalnie rejestruje konto (e-mail + hasło) i pozwala synchronizować między urządzeniami.\n\nKonta online istnieją tylko przy włączonym trybie online — rejestracja biegnie w tle, profil jest od razu użyteczny.',
        },
        empty: {
          title: 'Jeszcze brak profili',
          body: 'Tu nabierają kształtu Twoi gracze. Kliknij „Nowy profil” i stwórz pierwszą postać — wszystko działa i bez profilu, ale XP i osiągnięcia zbierają się tylko na profilach.',
        },
        cards: {
          title: 'Karty postaci',
          body: 'Każda karta pokazuje avatar, poziom, rangę i tryb zapisu. Kliknięcie wybiera profil i pokazuje jego szczegóły poniżej.\n\nKropka w prawym górnym rogu: zielona = aktywny, czerwona = dezaktywowany.',
          details: 'Symbole na kartach:\n• ✓ bąbelek: aktualnie aktywny profil (okno startowe go pamięta)\n• Ikona rangi + „Poz. X”: postępy profilu\n• Odznaka 💾/🌐: zapisany lokalnie lub online\n• Odznaka 📱: ten profil jest przejęty przez urządzenie kompana\n• Flaga: wybrany kraj\n\nKliknięcie karty = wybór. Dezaktywacja (czerwona) działa na karcie postępów — zdezaktywowane profile znikają z wyboru graczy, ale zachowują wszystkie dane.',
        },
        progression: {
          title: 'Karta postępów',
          body: 'Pasek XP do kolejnego poziomu plus kluczowe statystyki: zaśpiewane piosenki, złote nuty, najlepsze combo i wynik łączny.\n\nPrzełącznik aktywności po prawej tymczasowo dezaktywuje profil.',
          details: 'Jak czytać statystyki:\n• Zagrane piosenki: liczy się każda ukończona runda\n• Złote nuty: zbierane na piosenkę — pokazują, jak celnie trafiasz w kulminacje\n• Najlepsze combo: najdłuższy bezbłędny ciąg w historii\n• Wynik łączny: suma wszystkich wyników\n\nPrzełącznik aktywności: zdezaktywowane profile znikają z wyboru graczy i kolejki (piosenki duel/duet proszą wtedy o ponowny wybór), ale NIE tracą niczego — wystarczy ponownie aktywować.',
        },
        settingsCard: {
          title: 'Ustawienia profilu',
          body: 'Edytuj nazwę i avatar, zmień kraj, opcje prywatności — oraz kod QR profilu, którym telefon może go przejąć.',
          details: 'Prywatność: steruje tym, które statystyki są widoczne na globalnych tablicach.\n\nPokaż kod QR: generuje kod wskazujący BEPOŚREDNIO ten profil — telefon, który go zeskanuje, łączy się jako ten profil (idealne: każdy śpiewak ma swój telefon ze swoim profilem).\n\nUsunięcie usuwa profil na stałe — najlepsze wyniki zostają jako anonimowe wpisy. Przy profilach online aplikacja dopytuje przed usunięciem.',
        },
        onlineToggle: {
          title: 'Tablice online',
          body: 'Przełącznik włącza funkcje online: globalne wyniki, rejestrację konta i synchronizację profili między urządzeniami.',
          details: 'Wyłączone = całkowicie offline: wszystko zostaje lokalnie, żadnych zapytań sieciowych o tabele.\n\nWłączone = dostajesz zakładkę „Globalne” w tablicach i możesz tworzyć/wczytywać profile online.\n\nPrzełączanie działa natychmiast — już zebrane lokalne wyniki zostają zawsze.',
        },
        loginButton: {
          title: 'Wczytywanie profilu',
          body: 'Masz już konto? „Wczytaj profil” ściąga Twój profil online przez e-mail/kod synchronizacji na to urządzenie — postępy i wyniki przyjeżdżają z nim.',
          details: 'Okno logowania zna dwie drogi:\n• E-mail + hasło (jak przy rejestracji)\n• Kod synchronizacji: krótki kod z Twojego profilu — wygodniejszy na cudzym komputerze\n\nPo zalogowaniu wczytany profil łączy się z lokalnym (wygrywa wyższy postęp). Synchronizacje potem działają automatycznie w tle.',
        },
        companionClaim: {
          title: 'Przejmowanie przez companiony 📱',
          body: 'Gdy telefon łączy się z profilem, karta pokazuje 📱. Telefon śpiewa i wybiera pod tym profilem — nazwa, XP i osiągnięcia spływają właśnie tam.',
          details: 'Konfiguracja przejmowania (3 drogi):\n1. Zeskanuj kod QR w ustawieniach profilu — łączy się BEPOŚREDNIO z tym profilem\n2. Na telefonie po połączeniu wybierz profil z listy\n3. Tutaj w zakładce Mobilne ustawień: urządzenie → przypisz profil\n\nJeden profil może być naraz przejęty tylko przez JEDNO urządzenie. Rozłączenie: w zakładce Mobilne albo z samego telefonu.',
        },
        finish: {
          title: 'Drużyna kompletna! 🎭',
          body: 'Wiesz już, jak działają profile — od XP przez sync online po przejmowanie telefonem.\n\nKontynuuj z osiągnięciami: samouczek „Osiągnięcia i postępy” pokazuje, co Twój profil może zebrać.',
        },
      },
    },

    // ═══ Samouczek: kolejka (R29) ═══
    queue: {
      title: 'Kolejka',
      desc: 'Dodawanie piosenek, zmiana kolejności, zasady i żądania z companionów.',
      chapters: {
        overview: 'Przegląd',
        manage: 'Zarządzanie',
        companion: 'Companion i autoodtwarzanie',
      },
      steps: {
        welcome: {
          title: 'Kolejka 🎶',
          body: 'Kolejka organizuje Twój wieczór karaokowy: piosenki ustawiają się w szereg, każdy dostaje swoją kolej — nikt nie musi pilnować komputera.\n\nTen samouczek obejmuje dodawanie, sortowanie i zasady.',
          details: 'Trzy drogi dodawania do kolejki:\n1. Biblioteka → kliknij piosenkę → w oknie startowym wybierz „Dodaj do kolejki” zamiast „Rozpocznij grę”\n2. Po piosence: „Odtwórz następną piosenkę” na ekranie wyników utrzymuje flow\n3. Przez aplikację kompana: goście dodają z telefonów (oznaczone odznakami 📱)\n\nPasek menu pokazuje długość kolejki jako licznik na przycisku — widzisz, jak wieczór nadchodzi.',
        },
        navButton: {
          title: 'Przycisk kolejki',
          body: 'Na pasku menu „Kolejka” prowadzi tutaj — liczba na przycisku pokazuje, ile piosenek czeka.',
        },
        title: {
          title: 'Kolejka piosenek',
          body: 'Lista pokazuje wszystkie oczekujące piosenki z pozycją, trybem (solo/duel/duet) i graczami — posortowane według czasu dodania.',
        },
        empty: {
          title: 'Jeszcze pusto',
          body: 'Nie ma jeszcze piosenek w kolejce. Dodaj trochę z biblioteki (okno startowe → „Dodaj do kolejki”) — albo pozwól gościom dodawać przez aplikację kompana.',
        },
        list: {
          title: 'Lista kolejki',
          body: 'Każda karta: pozycja, piosenka, odznaka trybu i gracze. Kliknięcie karty startuje piosenkę natychmiast — nawet poza kolejnością.',
          details: 'Odznaki:\n• 🎤 Solo / ⚔️ Duel / 🎭 Duet — tryb, w jakim piosenka została dodana\n• 📱 — dodane przez aplikację kompana\n\nKliknięcie karty = odtwórz teraz. Przycisk ✕ po prawej usuwa wpis, ▶ go startuje.\n\nKlawiatura: Enter odtwarza, Delete usuwa, ↑/↓ chodzi po liście.',
        },
        reorder: {
          title: 'Zmiana kolejności',
          body: 'Przeciągnij karty na nowe pozycje — przesuwalne są tylko lokalne wpisy, żądania z companionów zachowują swoją kolejność.',
          details: 'Przeciągnij i upuść: złap kartę i przeciągnij ją w górę lub w dół z wciśniętym przyciskiem. Lista pokazuje pozycję upuszczenia na żywo.\n\nDlaczego wpisy companionów zostają na miejscu: aplikacja gościa sortuje według czasu zgłoszenia — gdyby gospodarz mógł przestawiać, żądania wyglądałyby na zmanipulowane. Usunąć je jednak możesz.',
        },
        playNext: {
          title: 'Odtwórz następną piosenkę',
          body: 'Przycisk startuje wpis z góry — standardowy ruch między rundami. Alternatywnie kliknij bezpośrednio dowolną kartę.',
          details: 'Ekran wyników po każdej piosence oferuje ten sam przycisk („Odtwórz następną piosenkę”) — flow biegnie bez okrężnej drogi przez widok kolejki.\n\nPrzy włączonym autoodtwarzaniu (Ustawienia → Rozgrywka) aplikacja sama przechodzi dalej.',
        },
        clearAll: {
          title: 'Czyszczenie wszystkiego',
          body: '„Wyczyść wszystko” opróżnia całą kolejkę — wraz z wpisami companionów. Drogi powrotnej nie ma, używaj z rozwagą.',
        },
        rules: {
          title: 'Zasady',
          body: 'Oficjalny regulamin siedzi na dole: maks. 3 piosenki na gracza, kolejność FIFO, usuwanie własnych piosenek, najpierw wybór postaci …',
          details: 'Zasady szczegółowo:\n• Maks. 3 piosenki na gracza naraz — nikt nie zablokuje kolejki. Kto zaśpiewał, może dodać ponownie.\n• FIFO: pierwszy wchodzący = pierwszy do gry. Przeciąganie zmienia kolejność lokalnie.\n• Własne piosenki usuwasz zawsze; cudze tylko przez „Wyczyść wszystko” albo jako gospodarz.\n• Najpierw postać: kolejka potrzebuje aktywnych profili do duel/duet, inaczej przy starcie prosi o ponowny wybór.\n• Żądania companionów noszą odznakę 📱 i liczą się jak własne.',
        },
        companionAdd: {
          title: 'Żądania z telefonów 📱',
          body: 'Goście dodają piosenki przez aplikację kompana — pojawiają się na liście z odznaką 📱 i liczą się do ich limitu 3 piosenek.',
          details: 'Jak to widzą goście: w aplikacji wybierają piosenkę, tryb, wysyłają — żądanie ląduje na tej liście.\n\nTy jako gospodarz widzisz od razu: kto zgłosił (avatar gracza) i że to żądanie z telefonu (📱). Limit 3 pozycji obowiązuje per profil — także przez telefon.\n\nWięcej w samouczku o companionie.',
        },
        autoplay: {
          title: 'Autoodtwarzanie i skrót',
          body: 'Włącz autoodtwarzanie (Ustawienia → Rozgrywka), aby po każdej rundzie następna piosenka startowała automatycznie. A także: Ctrl+Q startuje wpis z góry kolejki z dowolnego miejsca.',
          details: 'Łańcuch autoodtwarzania: piosenka się kończy → wynik pokazuje się krótko → startuje następny wpis kolejki. Gdy kolejka się wyczerpie, łańcuch czysto się zatrzymuje.\n\nCtrl+Q działa z każdego miejsca — klasyka, gdy kolejna runda ma ruszyć od razu.',
        },
        finish: {
          title: 'Kolejka czeka! 🎧',
          body: 'Znasz już dodawanie, sortowanie i zasady.\n\nWskazówka: połącz autoodtwarzanie z żądaniami companionów — a wieczór karaoke kręci się sam.',
        },
      },
    },

    // ═══ Samouczek: czat (R29) ═══
    chat: {
      title: 'Czat',
      desc: 'Otwieranie panelu, wysyłanie wiadomości, wybór „wyślij jako” i wyzwania muzyczne.',
      chapters: {
        basics: 'Otwieranie czatu',
        usage: 'Wysyłanie wiadomości',
        challenges: 'Wyzwania',
      },
      steps: {
        welcome: {
          title: 'Czat imprezowy 💬',
          body: 'Czat łączy komputer i aplikacje kompanów: rozmawiajcie bez przerywania śpiewu — a nawet rzucajcie sobie wyzwania na pojedynki muzyczne.\n\nZa chwilę otworzę Ci panel.',
          details: 'Co potrafi czat:\n• Wiadomości tekstowe między komputerem (gospodarzem) a wszystkimi podłączonymi telefonami\n• Wybór nadawcy: gospodarz może pisać w imieniu gracza\n• Wyzwania muzyczne: goście wzywają do duelów — zaakceptuj na komputerze i do dzieła\n\nWarunek: żeby telefony brały udział w rozmowie, urządzenia kompanów muszą być podłączone (zakładka Mobilne w ustawieniach — patrz samouczek o companionie).',
        },
        navButton: {
          title: 'Otwieranie czatu',
          body: 'Przycisk czatu na pasku menu otwiera panel — wysuwa się jako panel boczny nad ekranem i zamyka przez ✕ albo kliknięcie obok.',
        },
        panel: {
          title: 'Panel czatu',
          body: 'Historia biegnie po lewej, piszesz na dole. Panel zostaje otwarty, dopóki go nie zamkniesz — nawet przy przełączaniu ekranów.',
        },
        messages: {
          title: 'Historia',
          body: 'Twoje wiadomości pojawiają się po prawej na cyjanowo (jako gospodarz), wiadomości z telefonów po lewej na fioletowo. Każda wiadomość ma swój znacznik czasu.',
          details: 'Aktualizacje w tle: panel co 3 sekundy pobiera nowe wiadomości — niczego nie przegapisz, nawet gdy działa w tle.\n\nPowiadomienie czatu na komputerze (dzwonek) pokazuje nieprzeczytane wiadomości nawet przy zamkniętym panelu.',
        },
        sendAs: {
          title: '„Wyślij jako”',
          body: 'Jesteś gospodarzem — ale możesz pisać w imieniu gracza: lista rozwijana wybiera tożsamość. 🖥️ = gospodarz, 📱 = gracz.',
          details: 'Do czego to się przydaje:\n• Gospodarz pisze za kogoś bez telefonu („Anna mówi: jeszcze raz refren!”)\n• Ogłoszenia ze sceny w imieniu profilu prowadzącego\n\nKolorowa kropka obok listy pokazuje kolor gracza — historia jasno pokazuje, kto „mówił”.'
        },
        input: {
          title: 'Pisanie wiadomości',
          body: 'Wpisz tekst w pole (maks. 200 znaków) i naciśnij Enter — albo użyj przycisku wysyłania.',
        },
        send: {
          title: 'Wysyłanie',
          body: 'Wyślij przez Enter albo przycisk — wiadomość pojawia się natychmiast w historii i na każdym podłączonym telefonie.',
        },
        songChallenges: {
          title: 'Wyzwania muzyczne ⚔️',
          body: 'Goście mogą rzucić Ci wyzwanie prosto z aplikacji: w czacie pojawia się karta wyzwania — „Przyjmij wyzwanie” startuje duel.',
          details: 'Jak przebiega wyzwanie:\n1. Gość wybiera piosenkę w aplikacji i klepie „Wyzwij”\n2. Karta pojawia się w czacie z piosenką, wyzywającym i przyciskiem akceptacji\n3. Zaakceptuj na komputerze — okno startowe otworzy się z preselekcją trybu duel\n4. Śpiewajcie! Zwycięzca zgarnia chwałę (i punkty)\n\nUwaga: „Wyślij jako” musi być ustawione na gracza — przeciwnik musi być rozpoznawalny.',
        },
        companionSide: {
          title: 'Na telefonach',
          body: 'Aplikacja kompana ma własną zakładkę czatu — tam piszą goście. Co widzisz tutaj, oni widzą w czasie rzeczywistym i odwrotnie.',
        },
        finish: {
          title: 'Wiadomość dostarczona! 💌',
          body: 'Znasz już czat — od panelu po wyzwania muzyczne.\n\nW połączeniu z samouczkiem o companionie staje się jasne, jak telefony i komputer ze sobą współpracują.',
        },
      },
    },

    // ═══ Samouczek: companion (R29) ═══
    companion: {
      title: 'Aplikacja Companion',
      desc: 'Podłącz smartfony: mikrofon, pilot, żądania piosenek i wspólny śpiew.',
      chapters: {
        connect: 'Łączenie',
        features: 'Co potrafi aplikacja',
        manage: 'Zarządzanie urządzeniami',
      },
      steps: {
        welcome: {
          title: 'Telefony jako akcesoria 📱',
          body: 'Aplikacja kompana zamienia każdy smartfon w akcesorium karaoke: mikrofon, pilot, wybór piosenek i czat — bez instalacji, prosto w przeglądarce.\n\nTen samouczek obejmuje stronę komputerową całego przepływu.',
          details: 'Zasada: komputer jest gospodarzem (muzyka, nuty, punkty) — telefony łączą się przez Wi-Fi i stają się wedle potrzeb:\n• 🎤 Mikrofonami (z detekcją wysokości na telefonie!)\n• 🎮 Pilotami (sterowanie ekranami)\n• 🎵 Przeglądarkami piosenek z żądaniami do kolejki\n• 💬 Uczestnikami czatu\n• 🪞 Żywymi lustrami ekranu komputera\n\nBez sklepu z aplikacjami, bez konta — zeskanuj kod QR i gotowe.',
        },
        mobileTab: {
          title: 'Otwieranie zakładki Mobilne',
          body: 'Połączenie startuje w Ustawienia → Mobilne. Właśnie otworzyłem Ci tę zakładkę.',
        },
        qrCode: {
          title: 'Skanowanie kodu QR',
          body: 'Duży kod po lewej to bezpośrednia droga: otwórz aparat w telefonie, zeskanuj, a aplikacja wczyta się w przeglądarce. Ważne: telefon i komputer w tej samej sieci Wi-Fi.',
          details: 'Kod QR zawiera adres LAN komputera (np. http://192.168.1.42:3000/mobile) — dlatego oba urządzenia muszą dzielić sieć.\n\nGdy kod nie chce się zeskanować: adres URL poniżej można wpisać lub skopiować (przycisk). W publicznym Wi-Fi bez widoczności urządzeń połączenie niestety nie zadziała — użyj osobistego hotspotu.',
        },
        connectionInfo: {
          title: 'URL i przycisk kopiowania',
          body: 'Po prawej adres jako tekst — z przyciskiem kopiowania do udostępnienia (np. przez komunikator gościom). Zielona linia potwierdza wykryte IP sieci.',
          details: 'Wskazówka przed imprezą: wyślij URL gościom jeszcze przed party — gdy tylko komputer wystartuje, wszyscy łączą się od razu.\n\nŻółte ostrzeżenie pojawia się, gdy nie wykryto adresu LAN (np. czysta praca na localhost) — wtedy osiągnie go tylko ta sama maszyna.',
        },
        roles: {
          title: 'Role aplikacji',
          body: 'Po połączeniu aplikacja oferuje, zależnie od kontekstu:\n\n🎤 Widok mikrofonu z wyświetlaniem wysokości\n🎮 Pilot do komputera\n🎵 Przeglądarka piosenek + żądania do kolejki\n💬 Czat\n🪞 Żywe lustro ekranu',
          details: 'Role szczegółowo:\n• Mikrofon: telefon mierzy wysokość dźwięku i przesyła ją na żywo — komputer pokazuje nuty jak z „prawdziwego” mikrofonu. Działa we wszystkich trybach (duel też: dwa telefony!).\n• Pilot: ekrany, przyciski i potwierdzenia z telefonu — świetne dla gospodarzy chodzących po sali.\n• Przeglądarka piosenek: cała biblioteka na telefonie — z podglądem i żądaniami do kolejki z odznaką 📱 na komputerze.\n• Czat: wiadomości do komputera i innych gości.\n• Lustro: ekran komputera (gra, wyniki) jest dublowany na telefonie — goście widzą wszystko ze swoich miejsc.',
        },
        chatRole: {
          title: 'Czat na komputerze',
          body: 'To, co goście wpiszą w czacie aplikacji, ląduje w czacie na komputerze (przycisk czatu na pasku menu) — i z powrotem. Jest o tym osobny samouczek czatu.',
        },
        queueRole: {
          title: 'Żądania w kolejce',
          body: 'Goście dodają piosenki z telefonów — na komputerze pojawiają się w kolejce z odznaką 📱. O tym też jest osobny samouczek.',
        },
        singAlong: {
          title: 'Tryby wspólnego śpiewu 🎶',
          body: 'W trybach imprezowych Śpiew z Companionem i Przekaż mikrofon goście śpiewają wprost przez telefony — detekcja wysokości działa na urządzeniu, komputer dyryguje.',
          details: 'Śpiew z Companionem: każdy gość dostaje tekst i wyświetlanie wysokości na telefonie — komputer pokazuje wspólną autostradę nut.\n\nPrzekaż mikrofon: mikrofon krąży — nawet na zmianę telefon i fizyczny mikrofon.\n\nW obu przypadkach: im lepsze Wi-Fi, tym płynniejsza wysokość. Jeśli się zacina, pomaga urządzenie bliżej routera.',
        },
        deviceList: {
          title: 'Lista urządzeń',
          body: 'Z powrotem w zakładce Mobilne: wszystkie podłączone urządzenia pokazują czas połączenia, rolę, przypisany profil i ostatnią aktywność — plus przycisk wyrzucenia.',
          details: 'Karta urządzenia pokazuje:\n• Czas trwania połączenia („od 12 min”)\n• Co urządzenie robi (mikrofon aktywny, pilot …)\n• Przejęty profil — lista rozwijana przypisuje inny\n• Wyrzuć: rozłącza urządzenie (może natychmiast połączyć się ponownie)\n\nWskazówka: dawaj profilom mówiące nazwy — lista zostaje czytelna nawet przy wielu gościach.',
        },
        profileClaim: {
          title: 'Przejmowanie profili',
          body: 'Każde urządzenie może przejąć profil: gość śpiewa potem pod własnym imieniem z własnym XP — ekran profilu pokazuje przejęcie odznaką 📱.',
          details: 'Drogi przejęcia:\n1. Zeskanuj kod QR profilu w ustawieniach profilu (najbardziej bezpośrednio)\n2. W aplikacji po połączeniu wybierz z listy\n3. Tutaj na liście urządzeń przez listę rozwijaną\n\nSzczegóły także w samouczku profili.',
        },
        microphoneFallback: {
          title: 'Telefon zamiast konfiguracji mikrofonu',
          body: 'Gdy wszyscy śpiewają przez telefon, możesz całkiem pominąć zakładkę mikrofonu — aplikacja sama reguluje czułość. Fizyczne mikrofony konfigurujesz w zakładce mikrofonu, jak pokazano.',
        },
        finish: {
          title: 'Połączeni! 🔗',
          body: 'Wiesz już, jak telefony się podłączają i co potrafią.\n\nNastępny krok: otwórz URL na własnym telefonie i zrób pierwszy test — tryb mikrofonu robi największe wrażenie.',
        },
      },
    },

    // ═══ Samouczek: osiągnięcia (R29) ═══
    achievements: {
      title: 'Osiągnięcia i postępy',
      desc: 'Osiągnięcia, poziomy XP, rzadkości i codzienne wyzwania.',
      chapters: {
        overview: 'Przegląd',
        unlock: 'Odblokowywanie osiągnięć',
        daily: 'Codzienne wyzwania',
      },
      steps: {
        welcome: {
          title: 'Osiągnięcia i postępy 🏆',
          body: 'Wszystko, co zbierasz: osiągnięcia z rzadkościami, poziomy XP z tytułami rang i codzienne wyzwania jako silnik XP.\n\nTen samouczek oprowadza po ekranie osiągnięć i wyzwaniach.',
          details: 'Trzy systemy razem:\n• XP: „paliwo” — z piosenek, wyzwań i osiągnięć\n• Poziomy i rangi: rosną z XP (początkujący → legenda), pokazują postęp jednym rzutem oka\n• Osiągnięcia: kamienie milowe z nagrodami — niektóre tajemnicze do czasu odblokowania\n\nWszystko wisi na profilu — kto śpiewa, ten zbiera (patrz samouczek profili).',
        },
        navButton: {
          title: 'Przycisk osiągnięć',
          body: 'Na pasku menu trofeum prowadzi do osiągnięć — sąsiedni przycisk z trofeum otwiera tablice wyników.',
        },
        playerSelector: {
          title: 'Wybór gracza',
          body: 'Tu u góry wybierasz, czyje osiągnięcia oglądasz — wygodne do popisywania się kolekcją. Liczba przy profilu pokazuje liczbę odblokowanych.',
        },
        stats: {
          title: 'Karty statystyk',
          body: 'Cztery karty w jednym rzucie oka: odblokowane osiągnięcia, zebrane z nich XP, kompletność w procentach i aktualny poziom z tytułem rangi.',
          details: 'Karta procentowa liczy: odblokowane ÷ wszystkie osiągnięcia. 100 % to próg kolekcjonera — zwykle nagradzany własnym tajemnym osiągnięciem.\n\nKarta poziomu pokazuje dodatkowo tytuł rangi („Gwiazda wschodząca”, „Legenda karaoke”…) — tytuły pochodzą z systemu postępów profilu.',
        },
        filters: {
          title: 'Filtry',
          body: 'Po lewej: filtry statusu (wszystkie / odblokowane / zablokowane). Po prawej: kategorie: występy, postępy, społeczne i specjalne.',
          details: 'Znaczenie kategorii:\n• Występy: śpiewacze wyczyny (komba, złote nuty, perfekcyjne rundy)\n• Postępy: kamienie milowe kolekcji (zagrane piosenki, ilości XP, poziomy)\n• Społeczne: akcje imprezowe i wieloosobowe (duele, rundy z companionem)\n• Specjalne: sekrety i ciekawostki — opis odsłania się dopiero przy odblokowaniu\n\nŁączalne: „Zablokowane + Specjalne” pokazuje, co jeszcze na Ciebie czeka.',
        },
        grid: {
          title: 'Karty osiągnięć',
          body: 'Każda karta: ikona, nazwa, opis, rzadkość i nagroda XP. Odblokowane świecą na złoto z datą — zablokowane zostają szare.',
          details: 'Rzadkości (kodowane kolorem):\n• Pospolite — przychodzą same przy regularnej grze\n• Rzadkie — wymagają celowego działania\n• Epickie — ciężka praca albo szczęśliwe trafy\n• Legendarne — dla nielicznych\n\nOdblokowanie następuje automatycznie, gdy tylko warunek zostanie spełniony — wraz z powiadomieniem toast. XP ląduje na profilu od razu.',
        },
        xpSystem: {
          title: 'Jak płynie XP',
          body: 'XP pochodzi z trzech źródeł: zaśpiewanych piosenek (wg trudności), wyzwań (codziennych/tygodniowych) i osiągnięć. Poziomy odblokowują rangi — i niektóre funkcje, jak odznaki profilu.',
          details: 'Źródła XP w pigułce:\n• Ukończona piosenka: bazowe XP wg trudności (łatwy → ekspert, rosnąco)\n• Slot dzienny: 100–400 XP + bonusy\n• Slot tygodniowy: 500–2000 XP\n• Osiągnięcie: jednorazowo na osiągnięcie (25–1000 XP wg rzadkości)\n\nPasek poziomu na ekranie profilu pokazuje drogę do kolejnego poziomu; rangi zmieniają się co kilka poziomów.',
        },
        navDaily: {
          title: 'Do wyzwań',
          body: 'Codzienne wyzwania mają własny ekran — przycisk gwiazdki na pasku menu tam prowadzi. Przechodzimy tam teraz.',
        },
        playerSelection: {
          title: 'Krok 1: wybierz graczy',
          body: 'Sterowany przepływ: najpierw wybierz, kto gra — dopiero potem pojawią się zadania. Możliwych jest wielu graczy; statystyki należą do pierwszego.',
          details: 'Dlaczego najpierw wybór? Sloty i statystyki są per profil — bez wybranego gracza nie byłoby czego liczyć.\n\nKarta pokazuje wszystkie aktywne profile; wybór przez kliknięcie. Potem rozwijają się krok 2 (zadania) i krok 3 (gra).',
        },
        slots: {
          title: 'Krok 2: 5 slotów',
          body: 'Pięć slotów zadań dziennie, odblokowujących się po kolei. Każdy slot pokazuje zadanie, grywalne trudności i wartość XP — wyższe trudności mnożą.',
          details: 'Mechanika slotów:\n• Sloty 2–5 otwierają się dopiero po ukończeniu lub pominięciu poprzedniego — łańcuch wymusza różnorodność.\n• Każde zadanie to warunek na następną piosenkę („gatunek rock”, „co najmniej 80 % celności”…) — biblioteka automatycznie filtruje pasujące piosenki.\n• Wybór trudności na slot: do 3× mnożnika XP na ekspert.\n\nO północy spada pięć świeżych zadań — łańcuch startuje od nowa.',
        },
        badges: {
          title: 'Odznaki i tygodniówka',
          body: 'Zaliczenie kilku slotów przynosi codzienne odznaki (brąz/srebro/złoto) z dodatkowym XP. Tygodniowy odpowiednik biegnie 7 dni z bogatymi nagrodami — ta sama mechanika, większa pula.',
          details: 'Poziomy odznak dziennie:\n• Brąz: 2 sloty\n• Srebro: 3–4 sloty\n• Złoto: wszystkie 5 slotów — plus bonusowe XP dzienne\n\nTygodniówka: 5 slotów przez 7 dni, 500–2000 XP na slot, reset w poniedziałki. Granie codzienne I tygodniowe podnosi poziom wyraźnie szybciej niż same piosenki.',
        },
        challengeModes: {
          title: 'Tryby wyzwań',
          body: 'Poza slotami są wolne tryby wyzwań z modyfikatorami (np. „2× tempo”, „bez nut”) — na własne zasady i dodatkowe XP ponad codzienne zadania.',
          details: 'Tryby są swobodnie konfigurowalne: wybierz tryb, łącz modyfikatory, a pula XP rośnie z trudnością.\n\nUkończenia odblokowują nowe modyfikatory — karta kolekcji w strefie wyzwań pokazuje, co masz.',
        },
        finish: {
          title: 'Czas na kolekcję! 🏅',
          body: 'Znasz już osiągnięcia, XP i wyzwania — trzy silniki postępu.\n\nWskazówka na start: zagraj dziś 2 codzienne sloty — reszta przyjdzie sama.',
        },
      },
    },
  },
};

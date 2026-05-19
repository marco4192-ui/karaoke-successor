/**
 * Rate my Song — AI Critic Comments
 *
 * Funny + snarky bilingual critic commentary based on rating score.
 */

// ── Types ──

interface CommentBucket {
  min: number;
  max: number;
  en: string[];
  de: string[];
}

// ── Comment Buckets ──

const CRITIC_COMMENTS: CommentBucket[] = [
  {
    min: 9.5,
    max: 10.0,
    en: [
      "Okay, we get it. You're talented. Now go audition for The Voice and leave some dignity for the rest of us.",
      "I'm not crying, you're crying. That was angelic. I need a moment... and a tissue.",
      "Ed Sheeran just felt a disturbance in the force. Move over, superstar.",
    ],
    de: [
      "Okay, wir haben es kapiert. Du bist talentiert. Jetzt geh bei The Voice auditionieren und lass den Rest von uns wenigstens ein bisschen Würde.",
      "Ich weine nicht, du weinst. Das war himmlisch. Ich brauche einen Moment... und ein Taschentuch.",
      "Ed Sheeran hat gerade eine Störung in der Macht gespürt. Mach Platz, Superstar.",
    ],
  },
  {
    min: 9.0,
    max: 9.4,
    en: [
      "Beyoncé called. She wants her vocal cords back. Seriously though, that was dangerously good.",
      "That was so good, I almost forgot I'm supposed to be judging you. Almost.",
      "If talent were a crime, you'd be serving a life sentence. A standing ovation from this judge.",
    ],
    de: [
      "Beyoncé hat angerufen. Sie will ihre Stimmbänder zurück. Aber im Ernst: Das war gefährlich gut.",
      "Das war so gut, ich habe fast vergessen, dass ich dich bewerten soll. Fast.",
      "Wenn Talent ein Verbrechen wäre, würdest du lebenslänglich bekommen. Stehende Ovation von diesem Juroren.",
    ],
  },
  {
    min: 8.0,
    max: 8.9,
    en: [
      "That was actually impressive. I'm not saying I'd pay to hear it again... okay maybe I would.",
      "Solid performance! If this were a talent show, you'd definitely make it past the first round.",
      "Nice! You've got genuine skills. The world needs more people who can actually sing.",
    ],
    de: [
      "Das war tatsächlich beeindruckend. Ich sage nicht, dass ich dafür bezahlen würde... na gut, vielleicht doch.",
      "Solider Auftritt! Wenn das eine Castingshow wäre, würdest du definitiv in die nächste Runde kommen.",
      "Nicht schlecht! Du hast echtes Können. Die Welt braucht mehr Leute, die tatsächlich singen können.",
    ],
  },
  {
    min: 7.0,
    max: 7.9,
    en: [
      "Solid performance! You won't be winning any Grammys, but you also won't be causing any hearing damage.",
      "Not bad at all! You've got potential. Like a rough diamond — just needs a bit more polishing.",
      "That was... genuinely decent. I was ready to cringe and you didn't make me. Respect.",
    ],
    de: [
      "Solider Auftritt! Du gewinnst zwar keinen Grammy, aber du verursachst zumindest auch keinen Gehörschaden.",
      "Gar nicht schlecht! Du hast Potenzial. Wie ein roher Diamant — braucht nur noch etwas mehr Politur.",
      "Das war... echt ordentlich. Ich war bereit zu grauen und du hast es mich nicht tun lassen. Respekt.",
    ],
  },
  {
    min: 6.0,
    max: 6.9,
    en: [
      "You tried. And honestly, that's what matters. Results? Not so much. But effort? 10/10.",
      "I've heard worse. Not many, but they exist. Somewhere. Probably at 3 AM in a lonely karaoke bar.",
      "Average. Not in a bad way — in a 'you exist and that's fine' kind of way.",
    ],
    de: [
      "Du hast es versucht. Und ehrlich, das zählt. Das Ergebnis? Eher weniger. Aber die Mühe? 10/10.",
      "Ich habe schon Schlechteres gehört. Nicht viel, aber es gibt es. Irgendwo. Wahrscheinlich um 3 Uhr morgens in einer einsamen Karaoke-Bar.",
      "Durchschnitt. Nicht auf eine schlechte Art — eher auf eine 'du existierst und das ist okay' Art.",
    ],
  },
  {
    min: 5.0,
    max: 5.9,
    en: [
      "Somewhere between 'shower singing' and 'drunk at a wedding.' But hey, at least you had the courage!",
      "You know what? It wasn't terrible. It wasn't good either. But it wasn't terrible.",
      "Mediocrity has a name, and it's... well, let's just say you're passionate. That counts for something.",
    ],
    de: [
      "Irgendwo zwischen 'Duschsingen' und 'betrunken auf einer Hochzeit'. Aber hey, wenigstens hattest du den Mut!",
      "Weißt du was? Es war nicht schrecklich. Es war auch nicht gut. Aber nicht schrecklich.",
      "Mittelmaß hat einen Namen, und der ist... naja, lass uns einfach sagen, du bist leidenschaftlich. Das zählt für was.",
    ],
  },
  {
    min: 4.0,
    max: 4.9,
    en: [
      "I've heard better singing from a GPS navigation system. But I admire the confidence.",
      "Your passion is undeniable. Your pitch... also undeniable, but for different reasons.",
      "The good news is you finished the song. The bad news is... it's over and we all heard it.",
    ],
    de: [
      "Ich habe schon besseres Singen von einem Navi gehört. Aber ich bewundere das Selbstbewusstsein.",
      "Deine Leidenschaft ist unbestreitbar. Deine Tonlage... auch unbestreitbar, aber aus anderen Gründen.",
      "Die gute Nachricht: Du hast das Lied beendet. Die schlechte: Es ist vorbei und wir haben es alle gehört.",
    ],
  },
  {
    min: 3.0,
    max: 3.9,
    en: [
      "Remember: Karaoke is supposed to be fun. Keyword: fun. Let's work on that definition together.",
      "That was an experience. Not a good one, but definitely an experience. We grew from this. Mostly me.",
      "I'm going to need therapy after that. But on the bright side, you can only go up from here!",
    ],
    de: [
      "Erinnerung: Karaoke soll Spaß machen. Stichwort: Spaß. Lass uns gemeinsam an dieser Definition arbeiten.",
      "Das war ein Erlebnis. Kein gutes, aber definitiv ein Erlebnis. Wir sind daran gewachsen. Hauptsächlich ich.",
      "Ich brauche nach dem eine Therapie. Aber auf der hellen Seite: Von hier aus kann es nur besser werden!",
    ],
  },
  {
    min: 2.0,
    max: 2.9,
    en: [
      "The good news: You can only improve from here. The bad news: That's a very low bar.",
      "Did the cat walk across the keyboard? Because that's the only explanation I'll accept for that performance.",
      "I've seen better performances from malfunctioning vending machines. But hey, keep at it!",
    ],
    de: [
      "Die gute Nachricht: Von hier aus kann es nur besser werden. Die schlechte Nachricht: Das ist eine sehr niedrige Latte.",
      "Ist die Katze über die Tastatur gelaufen? Das ist die einzige Erklärung, die ich für diesen Auftritt akzeptiere.",
      "Ich habe schon bessere Auftritte von kaputten Getränkeautomaten gesehen. Aber hey, weiter so!",
    ],
  },
  {
    min: 1.0,
    max: 1.9,
    en: [
      "You know that feeling when you accidentally play a song at 2x speed? Yeah... that. Please don't quit your day job.",
      "I'm not saying that was the worst thing I've ever heard, but it's definitely in the top five. Today.",
      "On the bright side, at least the song eventually ended. On the dark side, I was there for all of it.",
    ],
    de: [
      "Du kennst dieses Gefühl, wenn man versehentlich ein Lied mit 2x Geschwindigkeit abspielt? Ja... genau so. Bitte kündige nicht deinen Job.",
      "Ich sage nicht, dass das das Schlechteste war, was ich je gehört habe, aber es ist definitiv in den Top 5. Heute.",
      "Auf der hellen Seite: Das Lied hat irgendwann aufgehört. Auf der dunklen Seite: Ich war für die ganze Zeit da.",
    ],
  },
];

// ── Public API ──

/**
 * Generate a snarky AI critic comment based on rating.
 * Comments are shuffled randomly so the same score doesn't always produce the same text.
 */
export function getAICriticComment(rating: number, lang: 'en' | 'de'): string {
  const clamped = Math.max(1.0, Math.min(10.0, rating));

  // Find the matching bucket
  const bucket = CRITIC_COMMENTS.find(b => clamped >= b.min && clamped <= b.max);

  if (!bucket) {
    // Fallback (should never happen)
    return lang === 'en'
      ? "I have no words. Literally no words."
      : "Ich habe keine Worte. Wirklich keine Worte.";
  }

  const comments = lang === 'en' ? bucket.en : bucket.de;
  const idx = Math.floor(Math.random() * comments.length);
  return comments[idx];
}

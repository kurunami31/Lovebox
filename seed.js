/* ============================================================
   The Keepsake Box — seed content for the default box
   ============================================================ */

const DEFAULT_CODE = 'NOELL';

const LETTER = `Hi baby, happy 4 years and 6 months nato po. 🥹❤️ Grabe no, 4 years and 6 months na diay ta. Murag dugay nagud diay ta together, layo na pero layo pa diba. And after everything we've been through, I'm still so thankful nga ikaw akong kauban.

Thank you kaayo sa pag-keep up sa akong kabadlongon ug sa akong pagka-gahi ug ulo. 😭😂 Kabalo ko nga usahay lisod ko sabton, usahay samokan kaayo ko, ug naa gyud koy mga moments nga kabalo ko samok kaayo ko, kanang murag gusto na nimo ko kumoton tungod sa akong kabadlongon HAHAHA 😭😂. Pero despite all of that, naa gihapon ka. Thank you kay patient ka sa akoa and for choosing to understand me even during the times nga lisod ko sabton. Thank you pud kaayo for always making me feel beautiful, especially sa mga times nga feeling nako pangit kaayo ko. Thank you for reminding me nga beautiful ko even when I can't see it myself. Thank you sa pag-boost sa akong confidence sa mga panahon nga ako mismo dili kabalo unsaon pag-believe sa akong sarili. Sometimes, I forget my worth, I doubt myself, and I become too hard on myself, pero somehow, you always find a way to remind me that I am enough. Thank you for always making me feel loved and appreciated, labi na gyud sa mga times nga makalimot ko unsaon pag-love ug appreciate sa akong sarili. You have this way of making me feel safe and loved without even realizing how much it means to me. And I hope you know nga tanan nimong little efforts, even the smallest ones, na-appreciate gyud nako. Bisan dili nako pirmi maingon or ma-express, please know nga I notice them and I keep them close to my heart.

Spending this day with you feels extra special. Special man gyud ang every day nga naa ka sa akong life, pero mas special lang gyud ron kay monthsary nato hehe. 🥹❤️ Another month, another memory, another reminder kung unsa ta kalayo na ang naagian together. I know nga dili perfect atong relationship, and I know pud nga lisod atong situation karon. Daghan pa siguro tag challenges nga atubangon, ug naa gyud mga panahon nga mahimong kapoy ug lisod ang tanan. Pero despite everything, naa koy salig sa atong duha. I believe in us, and I believe nga kaya nato ni i-face as long as magpabilin tang mag uban, mag-sinabtanay, ug dili ta ma stop choosing each other. Thank you for staying. Thank you for loving me the way you do. Thank you for being patient with me, for making me smile, for comforting me, and for being one of the best parts of my life. I may not always say it perfectly, and sometimes kulang ra gyud akong words para ma-explain unsa ko ka-thankful nga naa ka, pero I hope you always know how much you mean to me.

Happy 4 years and 6 months, baby. ❤️ I love you so much, palangga. And no matter how difficult things get, I hope we continue choosing each other, just like how we did from the very beginning. Here's to more months, more years, more memories, more kulit, more away nga ma-solve ra gihapon 😂, and more moments together.

I love you so much, palangga. Thank you for being you, and thank you for staying with me through everything. Happy 4 years and 6 months to us. ❤️🥹`;

const LILY = `fun fact: lilies were considered one of the most beautiful and sacred flowers in ancient Egypt. And just like a lily, you are sacred and beautiful to me. Among all the people I have seen and known, you are the most beautiful person in my eyes — not just because of how you look, but because of who you are and the way you make my world feel so special. 🤍🌸`;

function seedBox(store) {
  const now = Date.now();
  const greetingNote = {
    id: 'greeting',
    ts: now,
    sender: 'your palangga',
    content: LETTER,
    sealed: false,
    read: false,
  };
  const lilyNote = {
    id: 'lilies',
    ts: now + 1,
    sender: 'your palangga',
    content: LILY,
    sealed: false,
    read: false,
  };

  if (!store.boxes[DEFAULT_CODE]) {
    store.boxes[DEFAULT_CODE] = {
      code: DEFAULT_CODE,
      name: "Noelle's Lovebox",
      createdAt: now,
      notes: [greetingNote, lilyNote],
      reads: 0,
      spins: 0,
      cover: '/photos/noelle-01.jpg',
      invite: { asked: true, confirmed: false, by: '', at: null },
    };
    return true;
  }

  let changed = false;
  const b = store.boxes[DEFAULT_CODE];

  const greeting = (b.notes || []).find((n) => n.id === 'greeting');
  if (greeting && !/monthsary/.test(greeting.content)) {
    greeting.content = LETTER;
    changed = true;
  }
  if (!(b.notes || []).some((n) => n.id === 'lilies')) {
    b.notes = b.notes || [];
    b.notes.unshift(lilyNote);
    b.notes = b.notes.slice(-200);
    changed = true;
  }
  if (!b.invite) {
    b.invite = { asked: true, confirmed: false, by: '', at: null };
    changed = true;
  }
  return changed;
}

module.exports = { DEFAULT_CODE, LETTER, LILY, seedBox };
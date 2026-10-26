/* SongBridge listening suggestions. IDs stay fixed; only browsing order changes.
   These overlapping lists are an editorial starting point, not age restrictions.
   Future songs remain in All audiences and use their audience tags as a fallback. */
(() => {
  'use strict';
  const defaultOrder = [
    0,  // I Am Me
    12, // Learning's Journey
    7,  // Brighter Than Before
    1,  // Not Yet, Still Here
    21, // Mariposa · Español
    14, // Before You Ask Them to Learn
    16, // The Space to Learn
    4,  // Many Ways Forward
    20, // Aún No, Sigo Aquí
    19, // Finding Our Way
    3,  // Every Voice Belongs
    13, // Joy Stays
    26, // We Begin Here
    15, // Learning What Holds
    8,  // Pass It On
    24, // Aquí, aquí
    25, // Volvemos
    5,  // We Come Back
    23, // Muchas Formas de Avanzar
    2,  // Mariposa · English + Español
    22, // Mariposa · English
    10, // The Language Dance
    27, // Slow and Fast
    6,  // Breathe Me Back to Center
    18, // Belonging Is the Compass
    9,  // Echo of My Name
    11, // Language Power
    17, // Find Our Voice
    28  // Unified Field
  ];
  const groups = {
    young: {
      label: 'young learners',
      order: [0,1,4,26,3,24,20,25,5,21,22,10,27,23,9,11,8,15,7],
      fallback: ['Children','All ages']
    },
    older: {
      label: 'older learners',
      order: [12,19,15,3,4,2,21,7,1,20,23,17,8,26,18,6,28,0,5,25],
      fallback: ['Teens & adults','All ages']
    },
    adults: {
      label: 'adults and educators',
      order: [12,16,14,7,19,15,13,18,6,3,8,2,21,28,4,23,1,20,26,17,0,5,25],
      fallback: ['Educators','Teens & adults','All ages']
    },
    community: {
      label: 'families and community',
      order: [7,21,3,8,2,4,23,0,26,1,20,12,19,18,17,22,9,10,11,24,25,5,13],
      fallback: ['All ages']
    }
  };
  const known = new Set(defaultOrder);
  function recommend(songs, audience = '') {
    const group = groups[audience];
    const order = group ? group.order : defaultOrder;
    const rank = new Map(order.map((id,index) => [id,index]));
    return songs
      .filter(song => {
        if (!group || rank.has(song.id)) return true;
        if (known.has(song.id)) return false;
        if (Array.isArray(song.audiences)) return song.audiences.includes(audience);
        return group.fallback.includes(song.audience);
      })
      .map((song,index) => ({song,index}))
      .sort((a,b) => (rank.get(a.song.id) ?? order.length) - (rank.get(b.song.id) ?? order.length) || a.index - b.index)
      .map(item => item.song);
  }
  function description(audience = '') {
    const group = groups[audience];
    return group
      ? 'Suggested matches for ' + group.label + '. Songs can fit more than one audience.'
      : 'A starting mix for different listeners. Choose an audience for suggested matches.';
  }
  window.SongBridgeCuration = Object.freeze({recommend,description});
})();

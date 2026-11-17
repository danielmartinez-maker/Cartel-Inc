const paths={
  map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5zm6-2v16m6-14v16',
  shield:'M12 3l8 3v5c0 5-4 8-8 10-4-2-8-5-8-10V6l8-3zm-4 9l3 3 5-6',
  badge:'M12 3l3 5 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-5z',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6',
  people:'M16 21v-3a4 4 0 00-4-4H6a4 4 0 00-4 4v3m17 0v-3a4 4 0 00-3-3.9M9 3a4 4 0 100 8 4 4 0 000-8m8 1a4 4 0 010 7',
  network:'M12 8V3m0 13v5M8 12H3m13 0h5M8.5 8.5L5 5m10.5 10.5L19 19M15.5 8.5L19 5m-10.5 10.5L5 19M12 8a4 4 0 100 8 4 4 0 000-8',
  book:'M12 5c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0zm0 0v15',
  chart:'M4 3v18h17M8 16v-5m5 5V7m5 9V4',
  coin:'M12 2a10 10 0 100 20 10 10 0 000-20m3 6h-5a2 2 0 000 4h4a2 2 0 010 4H9m3-10v12',
  heart:'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 2 11 8 16 6-5 13-11 8-16z',
  scales:'M12 3v18m-7 0h14M3 7h18M6 7l-4 8h8L6 7zm12 0l-4 8h8l-4-8z',
  flag:'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  check:'M5 12l4 4L19 6',
  play:'M8 4l12 8-12 8V4z',
  pause:'M8 4v16m8-16v16',
  chevron:'M9 5l7 7-7 7',
  down:'M6 9l6 6 6-6',
  close:'M5 5l14 14M19 5L5 19',
  plus:'M12 5v14M5 12h14',
  minus:'M5 12h14',
  target:'M12 4a8 8 0 100 16 8 8 0 000-16m0 4a4 4 0 100 8 4 4 0 000-8M12 1v4m0 14v4M1 12h4m14 0h4',
  clock:'M12 3a9 9 0 100 18 9 9 0 000-18m0 4v5l4 2',
  arrow:'M4 12h16m-7-7l7 7-7 7',
  info:'M12 3a9 9 0 100 18 9 9 0 000-18m0 8v6m0-10v1',
  help:'M12 3a9 9 0 100 18 9 9 0 000-18m-3 5a3 3 0 016 0c0 2-3 2-3 5m0 3v1',
  save:'M4 3h13l4 4v14H3V3h1zm3 0v6h10V3M7 21v-8h10v8',
  upload:'M12 16V3m-5 5l5-5 5 5M4 15v6h16v-6',
  download:'M12 3v13m-5-5l5 5 5-5M4 16v5h16v-5',
  reset:'M3 10a9 9 0 111 8M3 3v7h7',
  volume:'M3 9h4l5-5v16l-5-5H3V9zm13-2a7 7 0 010 10m3-13a11 11 0 010 16',
  mute:'M3 9h4l5-5v16l-5-5H3V9zm13 0l6 6m0-6l-6 6',
  home:'M3 10l9-7 9 7v11h-7v-7h-4v7H3V10z',
  lock:'M6 10V7a6 6 0 0112 0v3M4 10h16v11H4V10zm8 4v3',
  alert:'M12 3L1 21h22L12 3zm0 6v5m0 3v1',
  leaf:'M20 3C8 2 2 7 4 14c3 8 15 4 16-11zM4 20L16 8',
  pin:'M12 22s8-8 8-14a8 8 0 10-16 0c0 6 8 14 8 14zm0-17a3 3 0 100 6 3 3 0 000-6',
  expand:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
};
// Match the approved cream cut-paper emblems at tiny navigation and unit sizes.
// Even-odd cutouts keep the star, iris and windows crisp at every scale.
const solidSymbols={
  shield:'M12 2l9 3v6c0 6-4 9-9 12-5-3-9-6-9-12V5l9-3ZM12 6l1.5 4.5H18l-3.7 2.7 1.4 4.4L12 15l-3.7 2.6 1.4-4.4L6 10.5h4.5Z',
  eye:'M1 12C6 3 18 3 23 12 18 21 6 21 1 12ZM12 7a5 5 0 100 10 5 5 0 000-10ZM12 10a2 2 0 100 4 2 2 0 000-4Z',
  people:'M9 2h6v20H9ZM11 5v2h2V5ZM11 9v2h2V9ZM11 13v2h2v-2ZM11 17v2h2v-2ZM2 8l5-2v16H2ZM4 10v2h1.5v-2ZM4 14v2h1.5v-2ZM4 18v2h1.5v-2ZM17 6l5 2v14h-5ZM18.5 10v2H20v-2ZM18.5 14v2H20v-2ZM18.5 18v2H20v-2Z',
};
export const icon=(name,size=20)=>solidSymbols[name]
  ?`<svg class="icon icon-solid" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${solidSymbols[name]}"/></svg>`
  :`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
export const portrait=(index,extra='')=>`<span class="portrait portrait-${index%6} ${index>=6?'portrait-new':''} ${extra}" role="img" aria-label="Illustrated character portrait"></span>`;
export const badge=index=>`<span class="art-badge badge-${index}" aria-hidden="true"></span>`;
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

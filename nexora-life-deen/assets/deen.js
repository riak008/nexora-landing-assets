/* Nexora Life Deen 1.0.0 — কুরআন শরীফ, হাদিস (বুখারী, মুসলিম, তিরমিযী) আর কুরআন শেখা.
 *
 * Text and audio come from fixed, well-known public sources; nothing here is typed by hand:
 *   Arabic text    : Tanzil Uthmani (Hafs) via fawazahmed0/quran-api  (ara-quranuthmanihaf)
 *   Bangla meaning : Dr. Abu Bakr Muhammad Zakaria (King Fahd Quran Complex) or Muhiuddin Khan (Tanzil)
 *   Ayah audio     : everyayah.com (Alafasy, Abdul Basit, Husary, Minshawi), fallback cdn.islamic.network
 *   Word audio     : quran.com (audio.qurancdn.com, word by word, Alafasy)
 *   Hadith         : fawazahmed0/hadith-api (ben-/ara- bukhari, muslim, tirmidhi)
 * The only things written here are the Bangla lesson notes, surah name spellings and the quiz.
 */
(function () {
  'use strict';
  if (window.NexoraDeen) return;

  var BASE = window.NLO_DEEN_BASE || '';
  var QAPI = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/';
  var HAPI = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';
  var QCOM = 'https://api.quran.com/api/v4/';
  var WBW = 'https://audio.qurancdn.com/';

  var COUNTS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];

  var RECITERS = [
    { id: 'Alafasy_128kbps', name: 'মিশারি রাশিদ আল-আফাসি', fb: 'ar.alafasy' },
    { id: 'Abdul_Basit_Murattal_192kbps', name: 'আবদুল বাসিত (মুরাত্তাল)', fb: 'ar.abdulbasitmurattal' },
    { id: 'Husary_128kbps', name: 'মাহমুদ খলিল আল-হুসারি', fb: 'ar.husary' },
    { id: 'Minshawy_Murattal_128kbps', name: 'মুহাম্মদ সিদ্দিক আল-মিনশাবি', fb: 'ar.minshawi' }
  ];
  var TRANSLATIONS = [
    { id: 'ben-muhiuddinkhan', name: 'মাওলানা মুহিউদ্দীন খান' },
    { id: 'ben-abubakrzakaria', name: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া (বাদশাহ ফাহদ কুরআন কমপ্লেক্স)' }
  ];
  var SPEEDS = [[0.5, 'খুব ধীর'], [0.75, 'ধীর'], [1, 'স্বাভাবিক'], [1.25, 'দ্রুত'], [1.5, 'খুব দ্রুত']];
  var BOOKS = { bukhari: 'সহীহ বুখারী', muslim: 'সহীহ মুসলিম', tirmidhi: 'জামে তিরমিযী' };

  /* ------------------------------------------------------------ helpers */
  var BND = '০১২৩৪৫৬৭৮৯';
  function bn(n) { return String(n).replace(/\d/g, function (d) { return BND[d]; }); }
  function en(s) { return String(s).replace(/[০-৯]/g, function (d) { return BND.indexOf(d); }); }
  function pad(n) { return ('00' + n).slice(-3); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('nld_' + k)); localStorage.setItem('nld_' + k, JSON.stringify(v)); } catch (e) { return null; } }
  function globalAyah(s, a) { var n = 0; for (var i = 0; i < s - 1; i++) n += COUNTS[i]; return n + a; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cleanBn(t) { return String(t || '').replace(/^\s*[০-৯0-9]+\.\s*/, '').replace(/\s*\[[০-৯0-9]+\]/g, '').replace(/\s+([,।;:])/g, '$1').trim(); }

  var MEM = {};
  function getJSON(url, keep) {
    if (MEM[url]) return MEM[url];
    var key = keep ? 'c_' + url.replace(/^https?:\/\//, '') : null;
    var cached = key ? store(key) : null;
    if (cached) { MEM[url] = Promise.resolve(cached); return MEM[url]; }
    MEM[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      if (key) { try { store(key, j); } catch (e) {} }
      return j;
    }).catch(function (e) { delete MEM[url]; throw e; });
    return MEM[url];
  }

  var settings = Object.assign({ reciter: RECITERS[0].id, tr: TRANSLATIONS[0].id, speed: 1, meaningVoice: false, repeat: 1, font: 30, showTr: true }, store('settings') || {});
  function saveSettings() { store('settings', settings); }

  /* ------------------------------------------------------------ data */
  var SURAHS = null; // [n, name, arabic, english, m/d, verses, juz, sajdas]
  var SURAH_BN = {};
  function surahs() {
    if (SURAHS) return Promise.resolve(SURAHS);
    return getJSON(BASE + 'surahs.json', false).then(function (j) {
      SURAHS = j;
      getJSON(QCOM + 'chapters?language=bn', true).then(function (c) {
        (c.chapters || []).forEach(function (x) { SURAH_BN[x.id] = x.translated_name && x.translated_name.name; });
        $$('[data-bnname]').forEach(function (n) { var v = SURAH_BN[n.getAttribute('data-bnname')]; if (v) n.textContent = v; });
      }).catch(function () {});
      return j;
    });
  }
  function surahText(n) {
    return Promise.all([
      getJSON(QAPI + 'ara-quranuthmanihaf/' + n + '.json', true),
      getJSON(QAPI + settings.tr + '/' + n + '.json', true)
    ]).then(function (r) {
      var ar = r[0].chapter, tr = r[1].chapter;
      return ar.map(function (v, i) { return { s: n, a: v.verse, ar: v.text, bn: cleanBn(tr[i] && tr[i].text) }; });
    });
  }
  function verseWords(s, a) {
    return getJSON(QCOM + 'verses/by_key/' + s + ':' + a + '?words=true&word_fields=text_uthmani&word_translation_language=bn', true).then(function (j) {
      return ((j.verse && j.verse.words) || []).filter(function (w) { return w.char_type_name === 'word'; }).map(function (w) {
        return { pos: w.position, ar: w.text_uthmani || w.text, bn: w.translation && w.translation.text, tl: w.transliteration && w.transliteration.text, audio: w.audio_url ? WBW + w.audio_url : null };
      });
    });
  }
  var HBOOKS = null;
  function hadithBooks() { return HBOOKS ? Promise.resolve(HBOOKS) : getJSON(BASE + 'hadith-books.json', false).then(function (j) { HBOOKS = j; return j; }); }
  function hadith(book, num) {
    return Promise.all([
      getJSON(HAPI + 'ben-' + book + '/' + num + '.json', true).catch(function () { return null; }),
      getJSON(HAPI + 'ara-' + book + '/' + num + '.json', true).catch(function () { return null; })
    ]).then(function (r) {
      var b = r[0] && r[0].hadiths && r[0].hadiths[0], a = r[1] && r[1].hadiths && r[1].hadiths[0];
      if (!b && !a) throw new Error('পাওয়া যায়নি');
      var h = b || a;
      return { book: book, num: num, bn: b && b.text, ar: a && a.text, grades: h.grades || [], ref: h.reference, arabicnumber: h.arabicnumber };
    });
  }
  function hadithSection(book, sec) {
    return Promise.all([
      getJSON(HAPI + 'ben-' + book + '/sections/' + sec + '.json', true).catch(function () { return { hadiths: [] }; }),
      getJSON(HAPI + 'ara-' + book + '/sections/' + sec + '.json', true).catch(function () { return { hadiths: [] }; })
    ]).then(function (r) {
      var ar = {}; (r[1].hadiths || []).forEach(function (h) { ar[h.hadithnumber] = h.text; });
      var list = (r[0].hadiths || []).length ? r[0].hadiths : r[1].hadiths || [];
      return list.map(function (h) { return { book: book, num: h.hadithnumber, bn: r[0].hadiths.length ? h.text : '', ar: ar[h.hadithnumber] || '', grades: h.grades || [], arabicnumber: h.arabicnumber }; });
    });
  }

  /* ------------------------------------------------------------ audio */
  var player = new Audio();
  player.preload = 'auto';
  try { player.preservesPitch = true; player.mozPreservesPitch = true; player.webkitPreservesPitch = true; } catch (e) {}
  var queue = null; // { list:[{s,a}], i, rep }
  var onAyah = function () {};

  function ayahUrl(s, a, fallback) {
    var r = RECITERS.filter(function (x) { return x.id === settings.reciter; })[0] || RECITERS[0];
    if (fallback) return 'https://cdn.islamic.network/quran/audio/128/' + r.fb + '/' + globalAyah(s, a) + '.mp3';
    return 'https://everyayah.com/data/' + r.id + '/' + pad(s) + pad(a) + '.mp3';
  }
  function playUrl(url, fallbackUrl) {
    player.onerror = fallbackUrl ? function () { player.onerror = null; player.src = fallbackUrl; player.playbackRate = settings.speed; player.play().catch(function () {}); } : null;
    player.src = url;
    player.playbackRate = settings.speed;
    return player.play().catch(function () {});
  }
  function speakBn(text, done) {
    text = String(text || '').slice(0, 900);
    if (!text) return done();
    var N = window.NexoraLifeNative;
    if (N && N.speak) { try { N.speak(text); } catch (e) {} setTimeout(done, Math.min(60000, 1500 + text.length * 85)); return; }
    if (!window.speechSynthesis) return done();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'bn-BD';
    u.rate = Math.max(0.6, Math.min(1.4, settings.speed));
    var voices = speechSynthesis.getVoices().filter(function (v) { return /^bn/i.test(v.lang); });
    if (voices[0]) u.voice = voices[0];
    u.onend = u.onerror = function () { done(); };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  function playQueue(list, start) {
    stopAll();
    queue = { list: list, i: start || 0, rep: 0 };
    step();
  }
  function step() {
    if (!queue) return;
    var it = queue.list[queue.i];
    if (!it) { queue = null; onAyah(null); updateBar(); return; }
    onAyah(it);
    updateBar();
    playUrl(ayahUrl(it.s, it.a), ayahUrl(it.s, it.a, true));
  }
  player.addEventListener('ended', function () {
    if (!queue) { updateBar(); return; }
    var it = queue.list[queue.i];
    var next = function () {
      if (!queue) return;
      queue.rep++;
      if (queue.rep < (settings.repeat || 1)) { step(); return; }
      queue.rep = 0; queue.i++; step();
    };
    if (settings.meaningVoice && it && it.bn) speakBn(it.bn, next); else next();
  });
  player.addEventListener('play', updateBar);
  player.addEventListener('pause', updateBar);
  function stopAll() { queue = null; try { player.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); onAyah(null); updateBar(); }
  function setSpeed(v) { settings.speed = v; saveSettings(); player.playbackRate = v; $$('.nld-speed').forEach(function (s) { s.value = String(v); }); }

  var bar = null;
  function updateBar() {
    if (!bar) return;
    var it = queue && queue.list[queue.i];
    bar.classList.toggle('show', !!it || !player.paused);
    $('.nld-bar-t', bar).textContent = it ? ('সূরা ' + bn(it.s) + ' · আয়াত ' + bn(it.a)) : 'তিলাওয়াত';
    $('[data-bar=play]', bar).textContent = player.paused ? '▶' : '⏸';
  }

  /* ------------------------------------------------------------ command parser (same rules as the PHP side) */
  var NAMES = { 3: ['আলইমরান', 'আল ইমরান', 'imran'], 6: ['আনআম', 'আনয়াম', 'anam'], 7: ['আরাফ', "আ'রাফ", 'araf'], 17: ['বনিইসরাইল', 'বনী ইসরাঈল', 'ইসরা', 'isra'], 41: ['হামীমসাজদা', 'ফুসসিলাত', 'fussilat'], 32: ['সাজদা', 'সিজদা', 'sajda'], 55: ['আররহমান', 'আর রাহমান', 'রহমান', 'rahman'], 40: ['গাফির', 'মুমিন', 'ghafir'], 23: ['মুমিনুন', 'muminun'], 1: ['ফাতিহা', 'ফাতেহা', 'fatiha'], 2: ['বাকারা', 'বাকারাহ', 'baqara'], 4: ['নিসা', 'nisa'], 5: ['মায়িদা', 'মায়েদা', 'মাইদা', 'maida'], 8: ['আনফাল', 'anfal'], 9: ['তাওবা', 'তওবা', 'tawba'], 10: ['ইউনুস', 'yunus'], 11: ['হুদ', 'hud'], 12: ['ইউসুফ', 'yusuf'], 13: ['রাদ', "রা'দ", 'rad'], 14: ['ইব্রাহিম', 'ইবরাহীম', 'ibrahim'], 15: ['হিজর', 'hijr'], 16: ['নাহল', 'nahl'], 18: ['কাহফ', 'কাহাফ', 'kahf'], 19: ['মারইয়াম', 'মরিয়ম', 'মারিয়াম', 'maryam'], 20: ['ত্বহা', 'তোয়াহা', 'ত্বা-হা', 'taha'], 21: ['আম্বিয়া', 'anbiya'], 22: ['হজ্জ', 'হজ', 'hajj'], 24: ['নূর', 'নুর', 'nur'], 25: ['ফুরকান', 'furqan'], 26: ['শুআরা', 'শোয়ারা', 'shuara'], 27: ['নামল', 'naml'], 28: ['কাসাস', 'qasas'], 29: ['আনকাবুত', 'ankabut'], 30: ['রুম', 'rum'], 31: ['লুকমান', 'luqman'], 33: ['আহযাব', 'আহজাব', 'ahzab'], 34: ['সাবা', 'saba'], 35: ['ফাতির', 'fatir'], 36: ['ইয়াসিন', 'ইয়াসীন', 'ইয়াছিন', 'yasin'], 37: ['সাফফাত', 'saffat'], 38: ['সোয়াদ', 'ছোয়াদ', 'sad'], 39: ['যুমার', 'জুমার', 'zumar'], 42: ['শূরা', 'শুরা', 'shura'], 43: ['যুখরুফ', 'zukhruf'], 44: ['দুখান', 'dukhan'], 45: ['জাসিয়া', 'jathiya'], 46: ['আহকাফ', 'ahqaf'], 47: ['মুহাম্মদ', 'মুহাম্মাদ', 'muhammad'], 48: ['ফাতহ', 'fath'], 49: ['হুজুরাত', 'hujurat'], 50: ['ক্বাফ', 'কাফ', 'qaf'], 51: ['যারিয়াত', 'জারিয়াত', 'dhariyat'], 52: ['তূর', 'তুর', 'tur'], 53: ['নাজম', 'najm'], 54: ['কামার', 'ক্বামার', 'qamar'], 56: ['ওয়াকিয়া', 'ওয়াকিয়াহ', 'ওয়াক্বিয়াহ', 'waqia'], 57: ['হাদিদ', 'হাদীদ', 'hadid'], 58: ['মুজাদালা', 'mujadila'], 59: ['হাশর', 'hashr'], 60: ['মুমতাহিনা', 'mumtahina'], 61: ['সফ', 'ছফ', 'saff'], 62: ['জুমুআ', 'জুমআ', 'জুমা', 'jumuah'], 63: ['মুনাফিকুন', 'munafiqun'], 64: ['তাগাবুন', 'taghabun'], 65: ['তালাক', 'talaq'], 66: ['তাহরীম', 'তাহরিম', 'tahrim'], 67: ['মুলক', 'mulk'], 68: ['কলম', 'কালাম', 'qalam'], 69: ['হাক্কাহ', 'হাক্কা', 'haqqa'], 70: ['মাআরিজ', 'maarij'], 71: ['নূহ', 'নুহ', 'nuh'], 72: ['জিন', 'jinn'], 73: ['মুযযাম্মিল', 'মুজাম্মিল', 'muzzammil'], 74: ['মুদ্দাসসির', 'মুদ্দাছছির', 'muddathir'], 75: ['কিয়ামাহ', 'কিয়ামা', 'qiyama'], 76: ['দাহর', 'ইনসান', 'insan'], 77: ['মুরসালাত', 'mursalat'], 78: ['নাবা', 'naba'], 79: ['নাযিয়াত', 'নাজিয়াত', 'naziat'], 80: ['আবাসা', 'abasa'], 81: ['তাকভীর', 'তাকবির', 'takwir'], 82: ['ইনফিতার', 'infitar'], 83: ['মুতাফফিফীন', 'মুতাফফিফিন', 'mutaffifin'], 84: ['ইনশিকাক', 'inshiqaq'], 85: ['বুরুজ', 'buruj'], 86: ['তারিক', 'tariq'], 87: ['আলা', "আ'লা", 'ala'], 88: ['গাশিয়া', 'ghashiya'], 89: ['ফজর', 'fajr'], 90: ['বালাদ', 'balad'], 91: ['শামস', 'shams'], 92: ['লাইল', 'lail'], 93: ['দুহা', 'দোহা', 'duha'], 94: ['ইনশিরাহ', 'আলাম নাশরাহ', 'শারহ', 'sharh'], 95: ['ত্বীন', 'তীন', 'tin'], 96: ['আলাক', 'alaq'], 97: ['কদর', 'ক্বদর', 'qadr'], 98: ['বাইয়্যিনাহ', 'বাইয়িনাহ', 'bayyina'], 99: ['যিলযাল', 'জিলজাল', 'zalzala'], 100: ['আদিয়াত', 'adiyat'], 101: ['কারিয়া', 'ক্বারিয়াহ', 'qaria'], 102: ['তাকাসুর', 'takathur'], 103: ['আসর', 'asr'], 104: ['হুমাযা', 'হুমাজা', 'humaza'], 105: ['ফীল', 'ফিল', 'fil'], 106: ['কুরাইশ', 'quraish'], 107: ['মাউন', 'maun'], 108: ['কাওসার', 'kawthar'], 109: ['কাফিরুন', 'kafirun'], 110: ['নাসর', 'nasr'], 111: ['লাহাব', 'মাসাদ', 'lahab'], 112: ['ইখলাস', 'ikhlas'], 113: ['ফালাক', 'ফালাক্ব', 'falaq'], 114: ['নাস', 'nas'] };
  function norm(x) { return String(x).replace(/য়/g, 'য়').replace(/[\s\-'’ʼ]+/g, ''); }
  function surahByName(t) {
    if (!/সূরা|surah|sura/.test(t)) return 0;
    t = norm(t);
    var best = 0, len = 0;
    Object.keys(NAMES).forEach(function (n) { NAMES[n].forEach(function (al) { al = norm(al); if (al.length > len && t.indexOf(al) >= 0) { best = +n; len = al.length; } }); });
    return best;
  }
  function parseCommand(text) {
    var t = en(String(text || '').toLowerCase().replace(/য়/g, 'য়'));
    t = t.replace(/সুরা|ছুরা|ছূরা/g, 'সূরা').replace(/আইয়াত|আয়াতের/g, 'আয়াত');
    if (/হাদিস|হাদীস|hadith/.test(t) || /(বুখারী|বুখারি|তিরমিযী|তিরমিজি|bukhari|tirmidhi)/.test(t)) {
      var books = { bukhari: /(বুখারী|বুখারি|বোখারী|bukhari)/, muslim: /(মুসলিম|muslim)/, tirmidhi: /(তিরমিযী|তিরমিজি|তিরমিজী|তিরমিযি|tirmidhi|tirmizi)/ };
      for (var k in books) { var m0 = t.match(/(\d{1,4})/); if (books[k].test(t) && m0) return { kind: 'hadith', book: k, number: +m0[1] }; }
    }
    var isQ = /সূরা|আয়াত|কুরআন|কোরআন|quran|surah|sura|ayah|ayat|তিলাওয়াত|তেলাওয়াত/.test(t) || /^\s*\d{1,3}\s*[:।]\s*\d{1,3}\s*$/.test(t);
    if (!isQ) return null;
    var s = 0, a = 0, m;
    if (/আয়াতুল\s*কুরসি|আয়াতুল\s*কুরসী|ayatul\s*kursi/.test(t)) { s = 2; a = 255; }
    else if ((m = t.match(/(\d{1,3})\s*[:।]\s*(\d{1,3})/))) { s = +m[1]; a = +m[2]; }
    else if ((m = t.match(/(\d{1,3})\s*(?:নং|নম্বর|নাম্বার|নম্বরের|নাম্বারের|no\.?|number)?\s*সূরা[^\d]*?(\d{1,3})\s*(?:নং|নম্বর|নাম্বার)?\s*(?:আয়াত|ayah|ayat)/))) { s = +m[1]; a = +m[2]; }
    else if ((m = t.match(/সূরা\s*(\d{1,3})[^\d]+(\d{1,3})/))) { s = +m[1]; a = +m[2]; }
    else if ((m = t.match(/(\d{1,3})\s*(?:নং|নম্বর|নাম্বার)?\s*(?:আয়াত|ayah|ayat)[^\d]*?(\d{1,3})\s*(?:নং|নম্বর|নাম্বার)?\s*সূরা/))) { s = +m[2]; a = +m[1]; }
    else {
      s = surahByName(t);
      if (s && (m = t.match(/(\d{1,3})\s*(?:নং|নম্বর|নাম্বার)?\s*(?:আয়াত|ayah|ayat)|(?:আয়াত|ayah|ayat)\s*(\d{1,3})/))) a = +(m[1] || m[2]);
      if (!s && (m = t.match(/(\d{1,3})\s*(?:নং|নম্বর|নাম্বার)?\s*সূরা|সূরা\s*(\d{1,3})/))) s = +(m[1] || m[2]);
    }
    if (s < 1 || s > 114) return null;
    if (a > 0) return a > COUNTS[s - 1] ? null : { kind: 'ayah', surah: s, ayah: a };
    return { kind: 'surah', surah: s };
  }

  /* ------------------------------------------------------------ shell */
  var root = null, view = null, state = { tab: 'quran' };

  function panel() {
    root = el('<div class="nld"><div class="nld-tabs">' +
      [['quran', '📖', 'কুরআন'], ['hadith', '📚', 'হাদিস'], ['learn', '🎓', 'শিখুন'], ['quiz', '❓', 'কুইজ'], ['settings', '⚙️', 'সেটিংস']].map(function (t) {
        return '<button data-dt="' + t[0] + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
      }).join('') + '</div><form class="nld-ask"><input placeholder="যেমন: ২ নম্বর সূরার ২৫৫ নম্বর আয়াত, সূরা ইয়াসিন, বুখারী ১" aria-label="কী শুনতে চান"><button>খুঁজুন</button></form><div class="nld-view"></div></div>');
    view = $('.nld-view', root);
    $$('[data-dt]', root).forEach(function (b) { b.onclick = function () { open(b.getAttribute('data-dt')); }; });
    $('.nld-ask', root).onsubmit = function (e) {
      e.preventDefault();
      var q = $('input', root).value, c = parseCommand(q);
      if (c) run(c); else if (q.trim()) { open('hadith'); searchHadithText(q); }
    };
    return root;
  }
  function open(tab, arg) {
    state.tab = tab;
    $$('[data-dt]', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dt') === tab); });
    view.innerHTML = '';
    ({ quran: viewQuran, hadith: viewHadith, learn: viewLearn, quiz: viewQuiz, settings: viewSettings }[tab] || viewQuran)(view, arg);
  }
  function loading(v) { v.innerHTML = '<div class="nld-load">লোড হচ্ছে…</div>'; }
  function fail(v, e) { v.innerHTML = '<div class="nld-err">লোড করা যায়নি (' + esc(e && e.message) + ')। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</div>'; }

  function controls() {
    return '<div class="nld-ctl"><label>গতি <select class="nld-speed">' + SPEEDS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === settings.speed ? ' selected' : '') + '>' + s[1] + ' (' + bn(s[0]) + 'x)</option>'; }).join('') + '</select></label>' +
      '<label>ক্বারী <select class="nld-rec">' + RECITERS.map(function (r) { return '<option value="' + r.id + '"' + (r.id === settings.reciter ? ' selected' : '') + '>' + r.name + '</option>'; }).join('') + '</select></label>' +
      '<label>প্রতি আয়াত <select class="nld-rep">' + [1, 2, 3, 5, 10].map(function (n) { return '<option value="' + n + '"' + (n === settings.repeat ? ' selected' : '') + '>' + bn(n) + ' বার</option>'; }).join('') + '</select></label>' +
      '<label class="nld-chk"><input type="checkbox" class="nld-mv"' + (settings.meaningVoice ? ' checked' : '') + '> তিলাওয়াতের পর বাংলা অর্থ শোনাও</label></div>';
  }
  function bindControls(v) {
    $$('.nld-speed', v).forEach(function (s) { s.onchange = function () { setSpeed(+s.value); }; });
    $$('.nld-rec', v).forEach(function (s) { s.onchange = function () { settings.reciter = s.value; saveSettings(); }; });
    $$('.nld-rep', v).forEach(function (s) { s.onchange = function () { settings.repeat = +s.value; saveSettings(); }; });
    $$('.nld-mv', v).forEach(function (s) { s.onchange = function () { settings.meaningVoice = s.checked; saveSettings(); }; });
  }

  /* ------------------------------------------------------------ Quran */
  function viewQuran(v, arg) {
    if (arg && arg.surah) return viewSurah(v, arg.surah, arg.ayah, arg.play);
    loading(v);
    surahs().then(function (list) {
      var last = store('last');
      v.innerHTML = (last ? '<button class="nld-resume" data-s="' + last.s + '" data-a="' + last.a + '">↩ যেখানে ছিলেন: সূরা ' + bn(last.s) + ', আয়াত ' + bn(last.a) + '</button>' : '') +
        '<input class="nld-filter" placeholder="সূরার নাম বা নম্বর লিখুন"><div class="nld-list">' + list.map(function (x) {
          return '<button class="nld-srow" data-s="' + x[0] + '" data-q="' + esc((x[0] + ' ' + x[1] + ' ' + x[3] + ' ' + bn(x[0]) + ' ' + (NAMES[x[0]] || []).join(' ')).toLowerCase()) + '"><b>' + bn(x[0]) + '</b><span><strong>' + esc(x[1]) + '</strong><small data-bnname="' + x[0] + '">' + esc(SURAH_BN[x[0]] || x[3]) + '</small><small>' + (x[4] === 'm' ? 'মাক্কী' : 'মাদানী') + ' · ' + bn(x[5]) + ' আয়াত · পারা ' + bn(x[6]) + '</small></span><i class="nld-ar">' + esc(x[2]) + '</i></button>';
        }).join('') + '</div>';
      var f = $('.nld-filter', v);
      f.oninput = function () { var q = en(f.value.trim().toLowerCase()); $$('.nld-srow', v).forEach(function (r) { r.style.display = !q || r.getAttribute('data-q').indexOf(q) >= 0 || norm(r.getAttribute('data-q')).indexOf(norm(q)) >= 0 ? '' : 'none'; }); };
      $$('.nld-srow', v).forEach(function (b) { b.onclick = function () { viewSurah(v, +b.getAttribute('data-s')); }; });
      var r = $('.nld-resume', v); if (r) r.onclick = function () { viewSurah(v, +r.getAttribute('data-s'), +r.getAttribute('data-a')); };
    }).catch(function (e) { fail(v, e); });
  }

  function viewSurah(v, n, focusAyah, autoplay) {
    loading(v);
    Promise.all([surahs(), surahText(n)]).then(function (r) {
      var meta = r[0][n - 1], verses = r[1];
      var showBis = n !== 1 && n !== 9;
      v.innerHTML = '<div class="nld-shead"><button class="nld-back">← সব সূরা</button><div><h3>' + bn(n) + '. ' + esc(meta[1]) + ' <span class="nld-ar">' + esc(meta[2]) + '</span></h3><small><span data-bnname="' + n + '">' + esc(SURAH_BN[n] || meta[3]) + '</span> · ' + (meta[4] === 'm' ? 'মাক্কী' : 'মাদানী') + ' · ' + bn(meta[5]) + ' আয়াত</small></div>' +
        '<div class="nld-nav2">' + (n > 1 ? '<button data-go="' + (n - 1) + '">‹ আগের</button>' : '') + (n < 114 ? '<button data-go="' + (n + 1) + '">পরের ›</button>' : '') + '</div></div>' +
        '<div class="nld-playall"><button class="nld-pa">▶ পুরো সূরা তিলাওয়াত</button><button class="nld-stop">⏹ থামাও</button><label>আয়াত নং <input type="number" min="1" max="' + meta[5] + '" class="nld-jump"></label></div>' + controls() +
        (showBis ? '<div class="nld-bis nld-ar" dir="rtl"></div>' : '') +
        '<div class="nld-verses" style="--nldf:' + settings.font + 'px">' + verses.map(function (x) {
          var sajda = meta[7] && meta[7].indexOf(x.a) >= 0;
          return '<div class="nld-v" id="nld-v-' + x.a + '" data-a="' + x.a + '"><div class="nld-vtop"><span class="nld-num">' + bn(n) + ':' + bn(x.a) + '</span>' + (sajda ? '<span class="nld-sajda">۩ সিজদার আয়াত</span>' : '') +
            '<button data-act="play" title="এই আয়াত শুনুন">▶</button><button data-act="from" title="এখান থেকে শেষ পর্যন্ত">⏩</button><button data-act="words" title="শব্দে শব্দে">🔤</button><button data-act="meaning" title="বাংলা অর্থ শুনুন">🗣️</button><button data-act="copy" title="কপি">📋</button></div>' +
            '<div class="nld-arv nld-ar" dir="rtl" lang="ar">' + esc(x.ar) + ' <span class="nld-end">﴿' + arNum(x.a) + '﴾</span></div>' +
            (settings.showTr ? '<div class="nld-bnv">' + esc(x.bn) + '</div>' : '') + '<div class="nld-words"></div></div>';
        }).join('') + '</div><p class="nld-src">আরবি: Tanzil উসমানি (হাফস) · বাংলা অর্থ: ' + esc((TRANSLATIONS.filter(function (t) { return t.id === settings.tr; })[0] || {}).name) + ' · অডিও: everyayah.com</p>';
      bindControls(v);
      // Bismillah is shown from the same Tanzil text (verse 1:1), never typed here
      if (showBis) getJSON(QAPI + 'ara-quranuthmanihaf/1.json', true).then(function (j) { var b = $('.nld-bis', v); if (b) b.textContent = j.chapter[0].text; }).catch(function () {});
      $('.nld-back', v).onclick = function () { stopAll(); viewQuran(v); };
      $$('[data-go]', v).forEach(function (b) { b.onclick = function () { stopAll(); viewSurah(v, +b.getAttribute('data-go')); }; });
      var list = verses.map(function (x) { return { s: n, a: x.a, bn: x.bn }; });
      $('.nld-pa', v).onclick = function () { playQueue(list, 0); };
      $('.nld-stop', v).onclick = stopAll;
      $('.nld-jump', v).onchange = function () { var a = +en(this.value); if (a >= 1 && a <= meta[5]) focus(a, true); };
      onAyah = function (it) {
        $$('.nld-v.playing', v).forEach(function (d) { d.classList.remove('playing'); });
        if (!it || it.s !== n) return;
        var d = $('#nld-v-' + it.a, v);
        if (d) { d.classList.add('playing'); d.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        store('last', { s: it.s, a: it.a });
      };
      function focus(a, play) {
        var d = $('#nld-v-' + a, v);
        if (d) { d.scrollIntoView({ block: 'center' }); d.classList.add('flash'); setTimeout(function () { d.classList.remove('flash'); }, 2500); }
        if (play) playQueue([list[a - 1]], 0);
      }
      $$('.nld-v', v).forEach(function (d) {
        var a = +d.getAttribute('data-a');
        $('.nld-arv', d).onclick = function () { playQueue([list[a - 1]], 0); };
        $$('[data-act]', d).forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation();
            var act = b.getAttribute('data-act');
            if (act === 'play') playQueue([list[a - 1]], 0);
            if (act === 'from') playQueue(list, a - 1);
            if (act === 'meaning') { stopAll(); speakBn(list[a - 1].bn, function () {}); }
            if (act === 'copy') { var t = verses[a - 1].ar + '\n' + verses[a - 1].bn + '\n(সূরা ' + meta[1] + ' ' + bn(n) + ':' + bn(a) + ')'; if (navigator.clipboard) navigator.clipboard.writeText(t); b.textContent = '✓'; }
            if (act === 'words') showWords(d, n, a);
          };
        });
      });
      if (focusAyah) setTimeout(function () { focus(focusAyah, autoplay); }, 60);
      else if (autoplay) playQueue(list, 0);
    }).catch(function (e) { fail(v, e); });
  }
  function arNum(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

  function showWords(d, s, a) {
    var box = $('.nld-words', d);
    if (box.innerHTML) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="nld-load">শব্দ লোড হচ্ছে…</div>';
    verseWords(s, a).then(function (ws) {
      box.innerHTML = '<div class="nld-wrow" dir="rtl">' + ws.map(function (w, i) {
        return '<button class="nld-w" data-i="' + i + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr">' + esc(w.bn || '') + '</small></button>';
      }).join('') + '</div><small class="nld-hint">যে শব্দে চাপবেন, সেই শব্দটা ক্বারীর কণ্ঠে শুনবেন (quran.com শব্দে-শব্দে অডিও)।</small>';
      $$('.nld-w', box).forEach(function (b) { b.onclick = function () { var w = ws[+b.getAttribute('data-i')]; if (w.audio) { stopAll(); playUrl(w.audio); } }; });
    }).catch(function () { box.innerHTML = '<div class="nld-err">শব্দগুলো লোড করা যায়নি।</div>'; });
  }

  /* ------------------------------------------------------------ Hadith */
  function viewHadith(v, arg) {
    loading(v);
    hadithBooks().then(function (B) {
      var book = (arg && arg.book) || state.book || 'bukhari';
      state.book = book;
      var info = B[book];
      v.innerHTML = '<div class="nld-books">' + Object.keys(BOOKS).map(function (k) { return '<button data-book="' + k + '" class="' + (k === book ? 'on' : '') + '">' + BOOKS[k] + '</button>'; }).join('') + '</div>' +
        '<form class="nld-hnum"><label>হাদিস নং (১–' + bn(info.last) + ') <input type="number" min="1" max="' + info.last + '"></label><button>খুলুন</button></form>' +
        '<div class="nld-hout"></div><h4>অধ্যায়সমূহ</h4><div class="nld-secs">' + info.sections.map(function (s) {
          return '<button data-sec="' + s[0] + '"><b>' + bn(s[0]) + '</b> ' + esc(s[1]) + ' <small>(' + bn(s[2]) + '–' + bn(s[3]) + ')</small></button>';
        }).join('') + '</div><p class="nld-src">উৎস: fawazahmed0/hadith-api (বাংলা ও আরবি সংস্করণ)। নম্বর এই সংস্করণের ক্রম অনুযায়ী; আরবি (আন্তর্জাতিক) নম্বরও পাশে দেখানো হয়।</p>';
      $$('[data-book]', v).forEach(function (b) { b.onclick = function () { state.book = b.getAttribute('data-book'); viewHadith(v); }; });
      var out = $('.nld-hout', v);
      $('.nld-hnum', v).onsubmit = function (e) { e.preventDefault(); var n = +en($('input', this).value); if (n >= 1 && n <= info.last) showHadith(out, book, n); };
      $$('[data-sec]', v).forEach(function (b) { b.onclick = function () { showSection(out, book, +b.getAttribute('data-sec'), b.textContent); out.scrollIntoView({ block: 'start' }); }; });
      if (arg && arg.number) showHadith(out, book, arg.number);
    }).catch(function (e) { fail(v, e); });
  }
  function hadithCard(h) {
    var g = (h.grades || []).map(function (x) { return esc(x.name) + ': <b>' + esc(x.grade) + '</b>'; }).join(' · ');
    return '<div class="nld-h"><div class="nld-hhead"><b>' + BOOKS[h.book] + ' · হাদিস নং ' + bn(h.num) + '</b>' + (h.arabicnumber && h.arabicnumber != h.num ? '<small>আরবি নং ' + bn(h.arabicnumber) + '</small>' : '') +
      '<button data-say="1" title="বাংলা পড়ে শোনাও">🗣️</button></div>' + (h.ar ? '<div class="nld-har nld-ar" dir="rtl" lang="ar">' + esc(h.ar) + '</div>' : '') +
      (h.bn ? '<div class="nld-hbn">' + esc(h.bn) + '</div>' : '<div class="nld-hint">এই হাদিসের বাংলা অনুবাদ এই সংস্করণে নেই।</div>') + (g ? '<div class="nld-grade">মান: ' + g + '</div>' : '') + '</div>';
  }
  function bindSay(box, list) { $$('[data-say]', box).forEach(function (b, i) { b.onclick = function () { stopAll(); speakBn(list[i].bn || '', function () {}); }; }); }
  function showHadith(out, book, n) {
    out.innerHTML = '<div class="nld-load">লোড হচ্ছে…</div>';
    hadith(book, n).then(function (h) {
      out.innerHTML = '<div class="nld-hnav"><button data-hn="' + (n - 1) + '"' + (n <= 1 ? ' disabled' : '') + '>‹ আগের</button><button data-hn="' + (n + 1) + '">পরের ›</button></div>' + hadithCard(h);
      bindSay(out, [h]);
      $$('[data-hn]', out).forEach(function (b) { b.onclick = function () { showHadith(out, book, +b.getAttribute('data-hn')); }; });
    }).catch(function (e) { out.innerHTML = '<div class="nld-err">হাদিস নং ' + bn(n) + ' পাওয়া যায়নি (' + esc(e.message) + ')।</div>'; });
  }
  function showSection(out, book, sec, title) {
    out.innerHTML = '<div class="nld-load">অধ্যায় লোড হচ্ছে…</div>';
    hadithSection(book, sec).then(function (list) {
      var q = '';
      out.innerHTML = '<h4>' + esc(title) + '</h4><input class="nld-filter" placeholder="এই অধ্যায়ে শব্দ দিয়ে খুঁজুন"><div class="nld-hlist"></div>';
      var box = $('.nld-hlist', out);
      function paint() {
        var shown = list.filter(function (h) { return !q || (h.bn || '').indexOf(q) >= 0 || (h.ar || '').indexOf(q) >= 0; }).slice(0, 60);
        box.innerHTML = shown.map(hadithCard).join('') + (shown.length === 60 ? '<div class="nld-hint">প্রথম ৬০টি দেখানো হলো; নির্দিষ্ট হাদিসের জন্য নম্বর দিয়ে খুলুন বা শব্দ দিয়ে খুঁজুন।</div>' : '');
        bindSay(box, shown);
      }
      $('.nld-filter', out).oninput = function () { q = this.value.trim(); paint(); };
      paint();
    }).catch(function (e) { out.innerHTML = '<div class="nld-err">অধ্যায় লোড করা যায়নি (' + esc(e.message) + ')।</div>'; });
  }
  function searchHadithText(q) {
    var out = $('.nld-hout', view);
    if (out) out.innerHTML = '<div class="nld-hint">"' + esc(q) + '" — কোনো অধ্যায় খুলে তার ভেতরে শব্দ দিয়ে খুঁজুন, অথবা হাদিস নম্বর দিন।</div>';
  }

  /* ------------------------------------------------------------ Learning (my own notes, standard tajweed) */
  var LETTERS = [
    ['ا', 'আলিফ', 'jawf', 'নিজে কোনো আওয়াজ নেই; হরকত পেলে হামযার মতো পড়া হয়, আর মাদ্দ হলে আগের হরফের আওয়াজ লম্বা করে।'],
    ['ب', 'বা', 'lips', 'দুই ঠোঁট মিলিয়ে, ঠোঁটের ভেজা অংশ থেকে।'],
    ['ت', 'তা', 'tongue', 'জিহ্বার আগা উপরের সামনের দুই দাঁতের গোড়ায় লাগিয়ে, পাতলা আওয়াজ।'],
    ['ث', 'ছা', 'tongue', 'জিহ্বার আগা উপরের সামনের দুই দাঁতের মাথায় লাগিয়ে, নরম শিস-বিহীন আওয়াজ (ইংরেজি th-এর মতো)।'],
    ['ج', 'জীম', 'tongue', 'জিহ্বার মাঝখান উপরের তালুতে লাগিয়ে।'],
    ['ح', 'হা (হা-এ-হুত্তী)', 'throat', 'কণ্ঠনালির মাঝখান থেকে, গলা চেপে পরিষ্কার "হ"।'],
    ['خ', 'খা', 'throat', 'কণ্ঠনালির উপরের অংশ (মুখের দিক) থেকে, মোটা আওয়াজ।'],
    ['د', 'দাল', 'tongue', 'জিহ্বার আগা উপরের সামনের দুই দাঁতের গোড়ায় লাগিয়ে।'],
    ['ذ', 'যাল', 'tongue', 'জিহ্বার আগা উপরের সামনের দুই দাঁতের মাথায় লাগিয়ে (ইংরেজি this-এর th)।'],
    ['ر', 'রা', 'tongue', 'জিহ্বার আগা ও পিঠ উপরের দাঁতের মাড়ির দিকে; বেশিরভাগ জায়গায় মোটা, যেরের সাথে চিকন।'],
    ['ز', 'যা', 'tongue', 'জিহ্বার আগা নিচের সামনের দাঁতের কাছে রেখে, উপর-নিচের দাঁতের ফাঁক দিয়ে বাতাস (ইংরেজি z)।'],
    ['س', 'সীন', 'tongue', 'জিহ্বার আগা নিচের সামনের দাঁতের কাছে, শিসের মতো পাতলা "স"।'],
    ['ش', 'শীন', 'tongue', 'জিহ্বার মাঝখান উপরের তালুতে, বাতাস ছড়িয়ে "শ"।'],
    ['ص', 'সোয়াদ', 'tongue', 'সীনের জায়গা থেকেই, কিন্তু জিহ্বার গোড়া উঁচু করে মোটা আওয়াজ।'],
    ['ض', 'দোয়াদ', 'tongue', 'জিহ্বার পাশ (এক বা দুই দিক) উপরের মাড়ির দাঁতের সাথে লাগিয়ে, মোটা আওয়াজ।'],
    ['ط', 'ত্বোয়া', 'tongue', 'তা-এর জায়গা থেকে, জিহ্বার গোড়া উঁচু করে মোটা আওয়াজ।'],
    ['ظ', 'যোয়া', 'tongue', 'যাল-এর জায়গা থেকে (দাঁতের মাথায়), মোটা আওয়াজ।'],
    ['ع', 'আইন', 'throat', 'কণ্ঠনালির মাঝখান থেকে, গলা একটু চেপে।'],
    ['غ', 'গাইন', 'throat', 'কণ্ঠনালির উপরের অংশ থেকে, গড়গড়ার মতো মোটা আওয়াজ।'],
    ['ف', 'ফা', 'lips', 'নিচের ঠোঁটের ভেতরের অংশ উপরের সামনের দুই দাঁতের মাথায় লাগিয়ে।'],
    ['ق', 'ক্বাফ', 'tongue', 'জিহ্বার একেবারে গোড়া উপরের নরম তালুতে লাগিয়ে, মোটা আওয়াজ।'],
    ['ك', 'কাফ', 'tongue', 'ক্বাফের জায়গার একটু সামনে, জিহ্বার গোড়া তালুতে লাগিয়ে, পাতলা আওয়াজ।'],
    ['ل', 'লাম', 'tongue', 'জিহ্বার আগার কিনারা উপরের সামনের দাঁতের মাড়িতে লাগিয়ে।'],
    ['م', 'মীম', 'lips', 'দুই ঠোঁটের শুকনো অংশ মিলিয়ে; সাথে নাকে গুন্নাহ।'],
    ['ن', 'নূন', 'tongue', 'জিহ্বার আগা উপরের সামনের দাঁতের মাড়িতে (লামের একটু নিচে); সাথে নাকে গুন্নাহ।'],
    ['و', 'ওয়াও', 'lips', 'দুই ঠোঁট গোল করে, পুরো না মিলিয়ে।'],
    ['ه', 'হা (গোল হা)', 'throat', 'কণ্ঠনালির একেবারে নিচের অংশ (বুকের দিক) থেকে, হালকা "হ"।'],
    ['ء', 'হামযা', 'throat', 'কণ্ঠনালির একেবারে নিচের অংশ থেকে, আওয়াজ একটু আটকে ছেড়ে দেওয়া।'],
    ['ي', 'ইয়া', 'tongue', 'জিহ্বার মাঝখান উপরের তালুতে।']
  ];
  var ZONES = { throat: 'হালক (কণ্ঠনালি)', tongue: 'লিসান (জিহ্বা)', lips: 'শাফাতাইন (দুই ঠোঁট)', jawf: 'জাওফ (মুখ ও গলার ফাঁকা জায়গা)' };
  var HEAVY = 'خصضغطقظ', QALQALA = 'قطبجد';

  var LESSONS = [
    { id: 'letters', t: '১. আরবি হরফ চেনা', body: '<p>আরবি লেখা ডান থেকে বামে পড়া হয়। মোট ২৯টি হরফ (হামযাসহ)। প্রতিটা হরফে চাপলে তার নাম আর কোথা থেকে উচ্চারণ হয় দেখবেন, আর কুরআনের একটা আসল শব্দ ক্বারীর কণ্ঠে শুনবেন।</p>', letters: true },
    { id: 'makhraj', t: '২. মাখরাজ (উচ্চারণের জায়গা)', body: '<p>হরফ সঠিকভাবে বের করার জায়গাকে মাখরাজ বলে। মূল জায়গা ৫টি:</p><ul><li><b>জাওফ</b>: মুখ ও গলার ফাঁকা জায়গা। মাদ্দের তিন হরফ: আলিফ (আগে যবর), ওয়াও সাকিন (আগে পেশ), ইয়া সাকিন (আগে যের)।</li><li><b>হালক (কণ্ঠনালি)</b>: নিচের অংশ ء ه · মাঝখান ع ح · উপরের অংশ غ خ।</li><li><b>লিসান (জিহ্বা)</b>: ق ك ج ش ي ض ل ن ر ط د ت ظ ذ ث ص س ز — জিহ্বার বিভিন্ন অংশ থেকে।</li><li><b>শাফাতাইন (দুই ঠোঁট)</b>: ف ب م و।</li><li><b>খাইশুম (নাকের বাঁশি)</b>: গুন্নাহ — নূন ও মীমের নাকি আওয়াজ।</li></ul><p><b>মোটা (পুর) হরফ ৭টি:</b> خ ص ض غ ط ق ظ — এগুলো সবসময় মোটা করে পড়তে হয়। বাকিগুলো সাধারণত পাতলা।</p>', ex: ['1:2', '114:1'] },
    { id: 'harakat', t: '৩. হরকত: যবর, যের, পেশ', body: '<ul><li><b>যবর (ফাতহা)</b> — হরফের উপরে ছোট টান ( َ ): "আ" আওয়াজ। যেমন بَ = বা।</li><li><b>যের (কাসরা)</b> — হরফের নিচে ছোট টান ( ِ ): "ই" আওয়াজ। بِ = বি।</li><li><b>পেশ (দাম্মা)</b> — হরফের উপরে ছোট ওয়াও ( ُ ): "উ" আওয়াজ। بُ = বু।</li></ul><p>হরকত পড়তে হয় ঝটকা দিয়ে, টেনে নয় — এক হরকত সময় (এক আঙুল বন্ধ করতে যত সময় লাগে)।</p>', ex: ['112:1', '1:1'] },
    { id: 'tanween', t: '৪. তানভীন (দুই যবর, দুই যের, দুই পেশ)', body: '<p>শব্দের শেষে দুইটা হরকত মানে হরকতের সাথে একটা "ন" আওয়াজ।</p><ul><li>দুই যবর ( ً ): "আন" — যেমন أَحَدًا</li><li>দুই যের ( ٍ ): "ইন"</li><li>দুই পেশ ( ٌ ): "উন" — যেমন أَحَدٌ</li></ul><p>তানভীন আসলে নূন সাকিন; তাই নূন সাকিনের সব নিয়ম (ইযহার, ইদগাম, ইকলাব, ইখফা) তানভীনেও খাটে। উসমানি লিপিতে তানভীন কখনো একটু তেরছা করে লেখা থাকে, সেটা পরের হরফের নিয়ম বোঝায়।</p>', ex: ['112:4', '103:2'] },
    { id: 'sukun', t: '৫. সাকিন (জযম)', body: '<p>হরফের উপরে ছোট গোল চিহ্ন ( ْ , উসমানি লিপিতে ۡ ) মানে হরফটা হরকত ছাড়া — আগের হরফের সাথে মিলিয়ে থামিয়ে পড়তে হয়। যেমন ٱلْحَمْدُ = আল-হাম-দু। "ম" সাকিন, তাই "হাম" একসাথে।</p>', ex: ['1:2', '108:1'] },
    { id: 'shadda', t: '৬. তাশদীদ', body: '<p>হরফের উপরে "ّ" চিহ্ন মানে হরফটা দুইবার: প্রথমবার সাকিন, দ্বিতীয়বার হরকতসহ। যেমন رَبِّ = রাব-বি। নূন ও মীমে তাশদীদ থাকলে গুন্নাহ (নাকে আওয়াজ) দুই হরকত লম্বা হয়: إِنَّ, ثُمَّ।</p>', ex: ['1:2', '108:3'] },
    { id: 'madd', t: '৭. মাদ্দ (টেনে পড়া)', body: '<p>মাদ্দের হরফ তিনটি — আলিফ, ওয়াও, ইয়া — এবং আগের হরফে মিলে যাওয়া হরকত থাকলে আওয়াজ টানতে হয়:</p><ul><li>যবরের পর আলিফ: "আ—" (قَالَ)</li><li>পেশের পর ওয়াও সাকিন: "উ—" (يَقُولُ)</li><li>যেরের পর ইয়া সাকিন: "ঈ—" (فِيهِ)</li></ul><ul><li><b>মাদ্দে তবয়ী (স্বাভাবিক)</b>: ২ হরকত (এক আলিফ)।</li><li><b>মাদ্দে মুত্তাসিল</b>: একই শব্দে মাদ্দের পর হামযা — ৪ বা ৫ হরকত (جَآءَ)।</li><li><b>মাদ্দে মুনফাসিল</b>: মাদ্দ এক শব্দে, হামযা পরের শব্দে — ৪ বা ৫ হরকত (হাফসের সাধারণ পড়ায়)।</li><li><b>মাদ্দে লাযিম</b>: মাদ্দের পর স্থায়ী সাকিন/তাশদীদ — ৬ হরকত (ٱلضَّآلِّينَ)।</li></ul><p>কুরআনে মাদ্দের ঢেউ চিহ্ন ( ٓ ) দেখলে স্বাভাবিকের চেয়ে বেশি টানতে হয়।</p>', ex: ['1:7', '1:4'] },
    { id: 'noon', t: '৮. নূন সাকিন ও তানভীনের নিয়ম', body: '<ul><li><b>ইযহার</b> (পরিষ্কার পড়া): পরে কণ্ঠনালির ৬ হরফ — ء ه ع ح غ خ। গুন্নাহ ছাড়া স্পষ্ট "ন"।</li><li><b>ইদগাম</b> (মিলিয়ে পড়া): পরে ي ر م ل و ن (يَرْمَلُونَ)। গুন্নাহসহ: ي ن م و; গুন্নাহ ছাড়া: ل ر।</li><li><b>ইকলাব</b> (বদলে পড়া): পরে ب — নূনকে মীমে বদলে গুন্নাহসহ। কুরআনে ছোট মীম ( ۢ ) লেখা থাকে।</li><li><b>ইখফা</b> (লুকিয়ে পড়া): বাকি ১৫ হরফ — নাকে হালকা গুন্নাহ দিয়ে, জিহ্বা পুরো না লাগিয়ে।</li></ul>', ex: ['112:4', '111:1'] },
    { id: 'meem', t: '৯. মীম সাকিনের নিয়ম', body: '<ul><li><b>ইখফা শাফাবি</b>: মীম সাকিনের পর ب — ঠোঁট হালকা মিলিয়ে গুন্নাহসহ।</li><li><b>ইদগাম মিসলাইন</b>: মীম সাকিনের পর م — দুই মীম মিলিয়ে গুন্নাহসহ।</li><li><b>ইযহার শাফাবি</b>: বাকি সব হরফের আগে — মীম পরিষ্কার, গুন্নাহ ছাড়া (বিশেষ করে و ও ف-এর আগে সাবধান)।</li></ul>', ex: ['105:4', '1:7'] },
    { id: 'qalqala', t: '১০. ক্বলক্বলা (প্রতিধ্বনি)', body: '<p>৫টি হরফ — ق ط ب ج د (মনে রাখার শব্দ: "কুতুবু জাদ্দিন") — সাকিন হলে হালকা ধাক্কার মতো প্রতিধ্বনি দিয়ে পড়তে হয়। আয়াতের শেষে থামলে প্রতিধ্বনি একটু বেশি স্পষ্ট হয় (ٱلْفَلَقِ-এ থামলে "ফালাক্ব")।</p>', ex: ['113:1', '112:2'] },
    { id: 'allah', t: '১১. আল্লাহ শব্দের লাম', body: '<ul><li>আগের হরফে যবর বা পেশ থাকলে লাম <b>মোটা</b> (পুর) — قَالَ ٱللَّهُ, رَسُولُ ٱللَّهِ।</li><li>আগের হরফে যের থাকলে লাম <b>চিকন</b> (বারিক) — بِسْمِ ٱللَّهِ, لِلَّهِ।</li></ul>', ex: ['1:1', '112:2'] },
    { id: 'waqf', t: '১২. থামার চিহ্ন (ওয়াকফ)', body: '<ul><li>আয়াতের শেষে গোল চিহ্ন ﴿ ﴾ — থামা উত্তম।</li><li>م — অবশ্যই থামতে হবে।</li><li>لا — থামবেন না।</li><li>ج — থামা বা না থামা দুটোই চলে।</li><li>صلى — না থেমে মিলিয়ে পড়া উত্তম।</li><li>قلى — থামা উত্তম।</li><li>∴ ∴ (তিন বিন্দু দুই জায়গায়) — যেকোনো একটায় থামুন, দুটোতে নয়।</li></ul><p>থামলে শেষ হরফের হরকত বাদ দিয়ে সাকিন করে পড়তে হয়; দুই যবর থামলে "আ" হয়ে যায়।</p>', ex: ['2:2', '1:5'] }
  ];
  var PRACTICE = [[1, 'সূরা আল-ফাতিহা'], [112, 'সূরা আল-ইখলাস'], [113, 'সূরা আল-ফালাক'], [114, 'সূরা আন-নাস'], [108, 'সূরা আল-কাওসার'], [103, 'সূরা আল-আসর'], [110, 'সূরা আন-নাসর'], [109, 'সূরা আল-কাফিরুন']];

  function progress() { return store('progress') || {}; }
  function markDone(id) { var p = progress(); p[id] = Date.now(); store('progress', p); }

  function viewLearn(v, arg) {
    if (arg && arg.lesson) return viewLesson(v, arg.lesson);
    var p = progress();
    var done = LESSONS.filter(function (l) { return p[l.id]; }).length;
    v.innerHTML = '<div class="nld-prog"><div style="width:' + Math.round(done / LESSONS.length * 100) + '%"></div></div><p class="nld-hint">' + bn(done) + '/' + bn(LESSONS.length) + ' পাঠ শেষ। ক্রম অনুযায়ী এগোন; প্রতিটা পাঠে লেখা গাইড, ক্বারীর কণ্ঠে উদাহরণ আর প্র্যাকটিস আছে। শেষে কুইজ দিয়ে যাচাই করুন।</p>' +
      '<div class="nld-lessons">' + LESSONS.map(function (l) { return '<button data-l="' + l.id + '">' + (p[l.id] ? '✅ ' : '⬜ ') + l.t + '</button>'; }).join('') + '</div>' +
      '<h4>🎧 প্র্যাকটিস: ছোট সূরা শব্দে শব্দে</h4><p class="nld-hint">প্রতিটা শব্দ শুনুন, তারপর নিজে বলুন। "সব শব্দ ধীরে" চাপলে পুরো আয়াত শব্দ ধরে ধরে বাজবে, প্রতি শব্দের পর আপনার বলার জন্য একটু বিরতি থাকবে।</p><div class="nld-lessons">' + PRACTICE.map(function (x) { return '<button data-pr="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="nld-prout"></div>';
    $$('[data-l]', v).forEach(function (b) { b.onclick = function () { viewLesson(v, b.getAttribute('data-l')); }; });
    $$('[data-pr]', v).forEach(function (b) { b.onclick = function () { practice($('.nld-prout', v), +b.getAttribute('data-pr')); }; });
  }

  function viewLesson(v, id) {
    var i = LESSONS.map(function (l) { return l.id; }).indexOf(id), l = LESSONS[i];
    v.innerHTML = '<button class="nld-back">← সব পাঠ</button><h3>' + l.t + '</h3><div class="nld-lbody">' + l.body + '</div>' +
      '<button class="nld-sayl">🗣️ গাইডটা বাংলায় পড়ে শোনাও</button>' +
      (l.letters ? '<div class="nld-letters" dir="rtl">' + LETTERS.map(function (x, k) { return '<button data-k="' + k + '" class="' + (HEAVY.indexOf(x[0]) >= 0 ? 'heavy' : '') + '"><span class="nld-ar">' + x[0] + '</span><small>' + x[1] + '</small></button>'; }).join('') + '</div><div class="nld-linfo"></div>' : '') +
      (l.ex ? '<h4>🎧 কুরআন থেকে উদাহরণ (শব্দে চাপুন)</h4><div class="nld-ex"></div>' : '') +
      '<div class="nld-lnav">' + (i > 0 ? '<button data-ln="' + LESSONS[i - 1].id + '">‹ আগের পাঠ</button>' : '') + '<button class="nld-done">✅ পাঠ শেষ</button>' + (i < LESSONS.length - 1 ? '<button data-ln="' + LESSONS[i + 1].id + '">পরের পাঠ ›</button>' : '<button data-quiz="1">কুইজ দিন ›</button>') + '</div>';
    $('.nld-back', v).onclick = function () { stopAll(); viewLearn(v); };
    $('.nld-sayl', v).onclick = function () { stopAll(); speakBn($('.nld-lbody', v).innerText.replace(/[؀-ۿࢠ-ࣿ]+/g, ' '), function () {}); };
    $('.nld-done', v).onclick = function () { markDone(l.id); this.textContent = '✅ শেষ হিসেবে রাখা হলো'; };
    $$('[data-ln]', v).forEach(function (b) { b.onclick = function () { stopAll(); viewLesson(v, b.getAttribute('data-ln')); }; });
    var q = $('[data-quiz]', v); if (q) q.onclick = function () { open('quiz'); };
    if (l.letters) $$('[data-k]', v).forEach(function (b) { b.onclick = function () { letterInfo($('.nld-linfo', v), LETTERS[+b.getAttribute('data-k')]); }; });
    if (l.ex) exampleWords($('.nld-ex', v), l.ex);
  }

  // Finds a real Quran word that starts with (or contains) the letter, from verses fetched live, and plays it
  var LETTER_SOURCES = ['1:1', '1:2', '1:4', '1:5', '1:6', '1:7', '112:1', '112:2', '112:3', '112:4', '113:1', '113:2', '113:3', '113:4', '113:5', '114:1', '114:2', '114:4', '114:5', '114:6', '2:255', '108:1', '108:2', '108:3', '103:1', '103:2', '103:3', '105:1', '105:2', '105:3', '105:4', '105:5'];
  function baseLetters(w) { return String(w).replace(/[ً-ٰٟۖ-ࣰۭ-ࣿـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه'); }
  function letterInfo(box, x) {
    box.innerHTML = '<div class="nld-lcard"><span class="nld-ar big">' + x[0] + '</span><div><b>' + x[1] + '</b> · ' + ZONES[x[2]] + (HEAVY.indexOf(x[0]) >= 0 ? ' · <i>মোটা হরফ</i>' : '') + (QALQALA.indexOf(x[0]) >= 0 ? ' · <i>ক্বলক্বলার হরফ</i>' : '') + '<p>' + x[3] + '</p><div class="nld-lex">কুরআনের শব্দ খোঁজা হচ্ছে…</div></div></div>';
    speakBn(x[1], function () {});
    var target = x[0] === 'ء' ? null : x[0];
    var tries = LETTER_SOURCES.slice();
    (function next() {
      var key = tries.shift();
      if (!key) { $('.nld-lex', box).textContent = ''; return; }
      var p = key.split(':');
      verseWords(+p[0], +p[1]).then(function (ws) {
        var w = ws.filter(function (w) { var b = baseLetters(w.ar); return target ? b.charAt(0) === target || (target === 'ا' && b.charAt(0) === 'ا') : /[ءأإؤئ]/.test(w.ar); })[0] ||
          ws.filter(function (w) { return target ? baseLetters(w.ar).indexOf(target) > 0 : false; })[0];
        if (!w) return next();
        $('.nld-lex', box).innerHTML = 'উদাহরণ: <button class="nld-w"><span class="nld-ar">' + esc(w.ar) + '</span><small>' + esc(w.bn || '') + ' · ' + bn(key) + '</small></button>';
        $('.nld-lex .nld-w', box).onclick = function () { stopAll(); playUrl(w.audio); };
      }).catch(next);
    })();
  }
  function exampleWords(box, keys) {
    box.innerHTML = '';
    keys.forEach(function (key) {
      var p = key.split(':');
      var row = el('<div class="nld-exrow"><small>' + bn(key) + '</small><div class="nld-wrow" dir="rtl"><span class="nld-load">…</span></div></div>');
      box.appendChild(row);
      verseWords(+p[0], +p[1]).then(function (ws) {
        $('.nld-wrow', row).innerHTML = ws.map(function (w, i) { return '<button class="nld-w" data-i="' + i + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr">' + esc(w.bn || '') + '</small></button>'; }).join('');
        $$('.nld-w', row).forEach(function (b) { b.onclick = function () { stopAll(); playUrl(ws[+b.getAttribute('data-i')].audio); }; });
      }).catch(function () { $('.nld-wrow', row).textContent = 'লোড করা যায়নি'; });
    });
  }

  function practice(box, s) {
    box.innerHTML = '<div class="nld-load">লোড হচ্ছে…</div>';
    var n = COUNTS[s - 1], keys = [];
    for (var a = 1; a <= n; a++) keys.push(a);
    Promise.all(keys.map(function (a) { return verseWords(s, a); })).then(function (all) {
      box.innerHTML = controls() + all.map(function (ws, i) {
        return '<div class="nld-exrow"><div class="nld-prhead"><b>আয়াত ' + bn(i + 1) + '</b><button data-slow="' + i + '">🐢 সব শব্দ ধীরে</button><button data-full="' + (i + 1) + '">▶ পুরো আয়াত</button><button data-ok="' + (i + 1) + '">✅ পেরেছি</button></div><div class="nld-wrow" dir="rtl">' +
          ws.map(function (w, j) { return '<button class="nld-w" data-v="' + i + '" data-j="' + j + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr">' + esc(w.tl || '') + '</small></button>'; }).join('') + '</div></div>';
      }).join('');
      bindControls(box);
      $$('.nld-w', box).forEach(function (b) { b.onclick = function () { stopAll(); playUrl(all[+b.getAttribute('data-v')][+b.getAttribute('data-j')].audio); }; });
      $$('[data-full]', box).forEach(function (b) { b.onclick = function () { playQueue([{ s: s, a: +b.getAttribute('data-full') }], 0); }; });
      $$('[data-ok]', box).forEach(function (b) { b.onclick = function () { var p = store('practice') || {}; p[s + ':' + b.getAttribute('data-ok')] = (p[s + ':' + b.getAttribute('data-ok')] || 0) + 1; store('practice', p); b.textContent = '✅ ' + bn(p[s + ':' + b.getAttribute('data-ok')]) + ' বার'; }; });
      $$('[data-slow]', box).forEach(function (b) {
        b.onclick = function () {
          stopAll();
          var ws = all[+b.getAttribute('data-slow')], j = 0, btns = $$('.nld-w[data-v="' + b.getAttribute('data-slow') + '"]', box);
          var token = {}; slowToken = token;
          (function one() {
            if (slowToken !== token || j >= ws.length) { btns.forEach(function (x) { x.classList.remove('playing'); }); return; }
            btns.forEach(function (x, k) { x.classList.toggle('playing', k === j); });
            var w = ws[j++];
            player.onended = null;
            playUrl(w.audio);
            var done = function () { player.removeEventListener('ended', done); setTimeout(one, Math.max(1200, (player.duration || 1) * 1000 / settings.speed + 600)); };
            player.addEventListener('ended', done);
          })();
        };
      });
    }).catch(function (e) { fail(box, e); });
  }
  var slowToken = null;

  /* ------------------------------------------------------------ Quiz */
  var RULE_Q = [
    ['কোন হরকত "ই" আওয়াজ দেয়?', ['যের (কাসরা)', 'যবর (ফাতহা)', 'পেশ (দাম্মা)', 'সাকিন'], 0],
    ['بُ কীভাবে পড়বেন?', ['বু', 'বা', 'বি', 'ব্'], 0],
    ['মোটা (পুর) হরফ কয়টি?', ['৭টি', '৫টি', '৬টি', '২৯টি'], 0],
    ['ক্বলক্বলার হরফ কোনগুলো?', ['ق ط ب ج د', 'ء ه ع ح غ خ', 'ي ر م ل و ن', 'خ ص ض غ ط ق ظ'], 0],
    ['নূন সাকিনের পর ب এলে কোন নিয়ম?', ['ইকলাব', 'ইযহার', 'ইদগাম', 'ইখফা'], 0],
    ['নূন সাকিনের পর কণ্ঠনালির হরফ (ء ه ع ح غ خ) এলে?', ['ইযহার', 'ইকলাব', 'ইখফা', 'ইদগাম'], 0],
    ['গুন্নাহ ছাড়া ইদগাম কোন দুই হরফে?', ['ل ر', 'م ن', 'ي و', 'ب م'], 0],
    ['মীম সাকিনের পর ب এলে কোন নিয়ম?', ['ইখফা শাফাবি', 'ইদগাম মিসলাইন', 'ইযহার শাফাবি', 'ইকলাব'], 0],
    ['মাদ্দে তবয়ী কত হরকত টানতে হয়?', ['২ হরকত', '৪ হরকত', '৬ হরকত', '১ হরকত'], 0],
    ['মাদ্দে লাযিম কত হরকত?', ['৬ হরকত', '২ হরকত', '৪ হরকত', '৩ হরকত'], 0],
    ['بِسْمِ ٱللَّهِ — এখানে আল্লাহ শব্দের লাম কেমন?', ['চিকন (বারিক)', 'মোটা (পুর)', 'পড়া হয় না', 'গুন্নাহসহ'], 0],
    ['قَالَ ٱللَّهُ — এখানে লাম কেমন?', ['মোটা (পুর)', 'চিকন (বারিক)', 'পড়া হয় না', 'ক্বলক্বলা'], 0],
    ['তাশদীদ ( ّ ) মানে কী?', ['হরফ দুইবার: প্রথমে সাকিন, পরে হরকতসহ', 'হরফ পড়া হয় না', 'হরফ টেনে পড়া', 'নাকে পড়া'], 0],
    ['ওয়াকফ চিহ্ন "م" মানে?', ['অবশ্যই থামতে হবে', 'থামবেন না', 'থামা বা না থামা সমান', 'মিলিয়ে পড়া উত্তম'], 0],
    ['ওয়াকফ চিহ্ন "لا" মানে?', ['থামবেন না', 'অবশ্যই থামুন', 'থামা উত্তম', 'সিজদা করুন'], 0],
    ['ف কোথা থেকে উচ্চারণ হয়?', ['নিচের ঠোঁটের ভেতর ও উপরের দাঁতের মাথা', 'কণ্ঠনালির মাঝখান', 'জিহ্বার গোড়া', 'দুই ঠোঁট মিলিয়ে'], 0],
    ['ع ও ح কোথা থেকে উচ্চারণ হয়?', ['কণ্ঠনালির মাঝখান', 'কণ্ঠনালির নিচের অংশ', 'জিহ্বার মাঝখান', 'দুই ঠোঁট'], 0],
    ['কুরআনের কোন সূরার শুরুতে বিসমিল্লাহ নেই?', ['সূরা আত-তাওবা', 'সূরা আল-ফাতিহা', 'সূরা আল-বাকারা', 'সূরা আন-নাস'], 0]
  ];
  function viewQuiz(v) {
    var best = store('quizbest') || 0;
    v.innerHTML = '<p class="nld-hint">প্রতিবার ১০টা প্রশ্ন: হরফ চেনা, শুনে শব্দ চেনা আর তাজবীদের নিয়ম। সর্বোচ্চ স্কোর: ' + bn(best) + '/১০</p><button class="nld-start">▶ কুইজ শুরু</button><div class="nld-qbox"></div>';
    $('.nld-start', v).onclick = function () { runQuiz($('.nld-qbox', v)); this.style.display = 'none'; };
  }
  function makeQuestions() {
    var qs = [];
    shuffle(LETTERS).slice(0, 3).forEach(function (x) {
      qs.push({ q: 'এই হরফের নাম কী? <span class="nld-ar big">' + x[0] + '</span>', o: shuffle([x[1]].concat(shuffle(LETTERS.filter(function (y) { return y !== x; })).slice(0, 3).map(function (y) { return y[1]; }))), a: x[1] });
    });
    var x = shuffle(LETTERS)[0];
    qs.push({ q: '"' + x[1] + '" কোন হরফ?', o: shuffle([x[0]].concat(shuffle(LETTERS.filter(function (y) { return y !== x; })).slice(0, 3).map(function (y) { return y[0]; }))), a: x[0], ar: true });
    var hz = shuffle(LETTERS.filter(function (y) { return y[0] !== 'ا' && y[0] !== 'ء'; }))[0];
    qs.push({ q: '<span class="nld-ar big">' + hz[0] + '</span> হরফটা মোটা না পাতলা?', o: ['মোটা (পুর)', 'পাতলা'], a: HEAVY.indexOf(hz[0]) >= 0 ? 'মোটা (পুর)' : 'পাতলা' });
    shuffle(RULE_Q).slice(0, 4).forEach(function (r) { qs.push({ q: r[0], o: shuffle(r[1]), a: r[1][r[2]] }); });
    qs.push({ listen: true });
    return shuffle(qs).slice(0, 10);
  }
  function runQuiz(box) {
    var qs = makeQuestions(), i = 0, score = 0;
    function show() {
      if (i >= qs.length) {
        var best = Math.max(score, store('quizbest') || 0); store('quizbest', best);
        box.innerHTML = '<div class="nld-score">আপনার স্কোর: <b>' + bn(score) + '/' + bn(qs.length) + '</b></div><button class="nld-again">↻ আবার দিন</button>';
        $('.nld-again', box).onclick = function () { runQuiz(box); };
        return;
      }
      var q = qs[i];
      if (q.listen) return listenQ(q);
      paint(q);
    }
    function paint(q) {
      box.innerHTML = '<div class="nld-qn">প্রশ্ন ' + bn(i + 1) + '/' + bn(qs.length) + '</div><div class="nld-q">' + q.q + '</div><div class="nld-opts">' + q.o.map(function (o) { return '<button' + (q.ar ? ' class="nld-ar"' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' + (q.play ? '<button class="nld-replay">🔁 আবার শুনুন</button>' : '');
      if (q.play) { $('.nld-replay', box).onclick = q.play; q.play(); }
      $$('.nld-opts button', box).forEach(function (b) {
        b.onclick = function () {
          var ok = b.textContent === q.a;
          if (ok) score++;
          $$('.nld-opts button', box).forEach(function (x) { x.disabled = true; if (x.textContent === q.a) x.classList.add('ok'); });
          if (!ok) b.classList.add('bad');
          setTimeout(function () { i++; show(); }, ok ? 700 : 1600);
        };
      });
    }
    function listenQ(q) {
      box.innerHTML = '<div class="nld-load">শব্দ আনা হচ্ছে…</div>';
      var keys = ['1:2', '1:5', '112:1', '113:1', '114:1', '103:2', '108:1'];
      var key = shuffle(keys)[0].split(':');
      verseWords(+key[0], +key[1]).then(function (ws) {
        if (ws.length < 3) { i++; return show(); }
        var w = shuffle(ws)[0];
        paint({ q: 'শুনে বলুন কোন শব্দ পড়া হলো (সূরা ' + bn(key[0]) + ':' + bn(key[1]) + ')', o: shuffle(ws.slice(0, 4).indexOf(w) >= 0 ? ws.slice(0, 4) : [w].concat(ws.filter(function (x) { return x !== w; }).slice(0, 3))).map(function (x) { return x.ar; }), a: w.ar, ar: true, play: function () { stopAll(); playUrl(w.audio); } });
      }).catch(function () { i++; show(); });
    }
    show();
  }

  /* ------------------------------------------------------------ Settings */
  function viewSettings(v) {
    v.innerHTML = '<div class="nld-set"><label>বাংলা অর্থ (অনুবাদ) <select class="nld-tr">' + TRANSLATIONS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === settings.tr ? ' selected' : '') + '>' + t.name + '</option>'; }).join('') + '</select></label>' +
      '<label>আরবি লেখার আকার <input type="range" min="20" max="48" value="' + settings.font + '" class="nld-font"> <span class="nld-ar nld-fprev" style="font-size:' + settings.font + 'px">ٱلْحَمْدُ لِلَّهِ</span></label>' +
      '<label class="nld-chk"><input type="checkbox" class="nld-st"' + (settings.showTr ? ' checked' : '') + '> আয়াতের নিচে বাংলা অর্থ দেখাও</label></div>' + controls() +
      '<p class="nld-src">কুরআনের লেখা ও অনুবাদ সরাসরি নির্ভরযোগ্য উৎস থেকে আসে (Tanzil উসমানি হাফস, বাদশাহ ফাহদ কুরআন কমপ্লেক্সের বাংলা অনুবাদ, মুহিউদ্দীন খানের অনুবাদ)। এখানে কিছু হাতে টাইপ করা হয়নি। একবার খোলা সূরা ফোনে জমা থাকে, পরের বার দ্রুত খোলে।</p><button class="nld-clear">জমা রাখা সূরা মুছে নতুন করে আনো</button>';
    bindControls(v);
    $('.nld-tr', v).onchange = function () { settings.tr = this.value; saveSettings(); };
    $('.nld-font', v).oninput = function () { settings.font = +this.value; saveSettings(); $('.nld-fprev', v).style.fontSize = this.value + 'px'; };
    $('.nld-st', v).onchange = function () { settings.showTr = this.checked; saveSettings(); };
    $('.nld-clear', v).onclick = function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('nld_c_') === 0) localStorage.removeItem(k); }); } catch (e) {} for (var k in MEM) delete MEM[k]; this.textContent = '✓ মুছে ফেলা হয়েছে'; };
  }

  /* ------------------------------------------------------------ run a parsed command */
  function run(c) {
    if (!c) return false;
    show();
    if (c.kind === 'ayah') open('quran', { surah: c.surah, ayah: c.ayah, play: true });
    else if (c.kind === 'surah') open('quran', { surah: c.surah, play: true });
    else if (c.kind === 'hadith') open('hadith', { book: c.book, number: c.number });
    return true;
  }

  /* ------------------------------------------------------------ mount inside Nexora Life OS */
  var mounted = false;
  function show() {
    var host = $('#nlo-view');
    if (!root) panel();
    if (host) {
      if (!host.contains(root)) { host.innerHTML = ''; host.appendChild(root); }
      $$('[data-tab]').forEach(function (b) { b.classList.remove('on'); });
      $$('[data-deen]').forEach(function (b) { b.classList.add('on'); });
      try { history.replaceState(null, '', '#deen'); } catch (e) {}
    } else if (!document.body.contains(root)) {
      root.classList.add('nld-float');
      document.body.appendChild(root);
    }
    if (!view.innerHTML) open(state.tab);
    mounted = true;
  }
  function addNav() {
    $$('.nlo-nav').forEach(function (nav) {
      if ($('[data-deen]', nav)) return;
      var b = el('<button data-deen="1" type="button"><span class="ic">📖</span><span class="bn">কুরআন ও হাদিস</span></button>');
      var after = $('[data-tab="health"]', nav) || $('[data-tab="jobs"]', nav);
      if (after && after.nextSibling) nav.insertBefore(b, after.nextSibling); else nav.appendChild(b);
      b.onclick = function (e) { e.preventDefault(); show(); window.scrollTo(0, 0); };
    });
    // the hub replaces #nlo-view on every tab change; when another tab is opened, our button turns off
    $$('[data-tab]').forEach(function (b) { if (!b._nld) { b._nld = 1; b.addEventListener('click', function () { $$('[data-deen]').forEach(function (x) { x.classList.remove('on'); }); stopAll(); }); } });
  }
  function playerBar() {
    bar = el('<div class="nld-bar"><span class="nld-bar-t">তিলাওয়াত</span><button data-bar="play">▶</button><select class="nld-speed" title="গতি">' + SPEEDS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === settings.speed ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select><button data-bar="stop">⏹</button></div>');
    document.body.appendChild(bar);
    $('[data-bar=play]', bar).onclick = function () { if (player.paused) { if (player.src) player.play(); } else player.pause(); };
    $('[data-bar=stop]', bar).onclick = stopAll;
    $('.nld-speed', bar).onchange = function () { setSpeed(+this.value); };
  }

  // Riak agent: our PHP answers the command and adds a `deen` item; open it here
  var _fetch = window.fetch;
  window.fetch = function (input, init) {
    var p = _fetch.apply(this, arguments);
    try {
      var url = typeof input === 'string' ? input : input && input.url;
      if (url && url.indexOf('nexora-life/v1/command') >= 0) {
        p.then(function (r) { return r.clone().json(); }).then(function (j) { if (j && j.deen) setTimeout(function () { run(j.deen); }, 300); }).catch(function () {});
      }
    } catch (e) {}
    return p;
  };

  function boot() {
    playerBar();
    addNav();
    new MutationObserver(function () { addNav(); if (location.hash === '#deen' && $('#nlo-view') && !$('#nlo-view').contains(root || document.createElement('i'))) show(); }).observe(document.body, { childList: true, subtree: true });
    if (/^#deen/.test(location.hash)) setTimeout(show, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NexoraDeen = { parse: parseCommand, run: run, show: show, open: function (t, a) { show(); open(t, a); }, stop: stopAll, setSpeed: setSpeed };
})();

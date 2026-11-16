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
    { id: 'ben-abubakrzakaria', name: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া (বাদশাহ ফাহদ কুরআন কমপ্লেক্স)' },
    { id: 'eng-ummmuhammad', name: 'English — Saheeh International' },
    { id: 'eng-muhammadtaqiudd', name: 'English — Hilali & Muhsin Khan' }
  ];
  /** The hub's interface language: Bangla unless the hub shows its menu in another language (then meanings come in English). */
  function uiLang() {
    try {
      var n = document.querySelector('.nlo-nav'); if (!n) return 'bn';
      var t = (n.innerText || '').replace(/কুরআন ও হাদিস/g, '');
      var bnC = (t.match(/[\u0980-\u09FF]/g) || []).length, laC = (t.match(/[A-Za-z]/g) || []).length;
      return laC > bnC * 2 ? 'en' : 'bn';
    } catch (e) { return 'bn'; }
  }
  function trEdition() { var en = uiLang() === 'en'; if (en && /^ben-/.test(settings.tr) && !settings.trPicked) return 'eng-ummmuhammad'; return settings.tr; }
  function hLang() { return uiLang() === 'en' ? 'eng-' : 'ben-'; }
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
      getJSON(QAPI + trEdition() + '/' + n + '.json', true)
    ]).then(function (r) {
      var ar = r[0].chapter, tr = r[1].chapter;
      return ar.map(function (v, i) { return { s: n, a: v.verse, ar: v.text, bn: cleanBn(tr[i] && tr[i].text) }; });
    });
  }
  function verseWords(s, a) {
    return getJSON(QCOM + 'verses/by_key/' + s + ':' + a + '?language=' + (uiLang() === 'en' ? 'en' : 'bn') + '&words=true&word_fields=text_uthmani&word_translation_language=' + (uiLang() === 'en' ? 'en' : 'bn'), true).then(function (j) {
      return ((j.verse && j.verse.words) || []).filter(function (w) { return w.char_type_name === 'word'; }).map(function (w) {
        return { pos: w.position, ar: w.text_uthmani || w.text, bn: w.translation && w.translation.text, tl: w.transliteration && w.transliteration.text, audio: w.audio_url ? WBW + w.audio_url : null };
      });
    });
  }
  var HBOOKS = null;
  function hadithBooks() { return HBOOKS ? Promise.resolve(HBOOKS) : getJSON(BASE + 'hadith-books.json', false).then(function (j) { HBOOKS = j; return j; }); }
  function hadith(book, num) {
    return Promise.all([
      getJSON(HAPI + hLang() + book + '/' + num + '.json', true).catch(function () { return null; }),
      getJSON(HAPI + 'ara-' + book + '/' + num + '.json', true).catch(function () { return null; })
    ]).then(function (r) {
      var b = r[0] && r[0].hadiths && r[0].hadiths[0], a = r[1] && r[1].hadiths && r[1].hadiths[0];
      if (b && !String(b.text || '').trim()) b = null;
      if (a && !String(a.text || '').trim()) a = null;
      if (!b && !a) throw new Error('এই নম্বরে এই সংস্করণে কোনো লেখা নেই');
      var h = b || a;
      return { book: book, num: num, bn: b && b.text, ar: a && a.text, grades: h.grades || [], ref: h.reference, arabicnumber: h.arabicnumber };
    });
  }
  function hadithSection(book, sec) {
    return Promise.all([
      getJSON(HAPI + hLang() + book + '/sections/' + sec + '.json', true).catch(function () { return { hadiths: [] }; }),
      getJSON(HAPI + 'ara-' + book + '/sections/' + sec + '.json', true).catch(function () { return { hadiths: [] }; })
    ]).then(function (r) {
      var ar = {}; (r[1].hadiths || []).forEach(function (h) { ar[h.hadithnumber] = h.text; });
      var list = ((r[0].hadiths || []).length ? r[0].hadiths : r[1].hadiths || []).filter(function (h) { return String(h.text || '').trim() || ar[h.hadithnumber]; });
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
  var ttsAudio = new Audio(); ttsAudio.preload = 'auto';
  function chunks(text) {
    var out = [], parts = String(text).replace(/\s+/g, ' ').split(/(?<=[।.!?,;:—])\s+/);
    parts.forEach(function (p) { while (p.length > 180) { var k = p.lastIndexOf(' ', 180); if (k < 60) k = 180; out.push(p.slice(0, k)); p = p.slice(k).trim(); } if (p.trim()) out.push(p.trim()); });
    return out;
  }
  /** Spoken audio from Google's TTS (works on any computer/phone, no voice pack needed). */
  function webTTS(text, lang, done) {
    var list = chunks(text), i = 0, tok = {}; webTTS.tok = tok;
    (function next() {
      if (webTTS.tok !== tok) return;
      var t = list[i++]; if (!t) return done();
      ttsAudio.onended = function () { next(); };
      ttsAudio.onerror = function () { done(); };
      ttsAudio.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + lang + '&q=' + encodeURIComponent(t);
      ttsAudio.playbackRate = Math.max(0.5, Math.min(1.5, settings.speed));
      var pr = ttsAudio.play(); if (pr && pr.catch) pr.catch(function () { done(); });
    })();
  }
  function stopTTS() { webTTS.tok = null; try { ttsAudio.pause(); } catch (e) {} }
  function hasVoice(re) { try { return window.speechSynthesis && speechSynthesis.getVoices().some(function (v) { return re.test(v.lang); }); } catch (e) { return false; } }
  function speakBn(text, done) {
    text = String(text || '').slice(0, 900);
    if (!text) return done();
    var N = window.NexoraLifeNative;
    // App 1.0.x+: say() always speaks and speaking() tells when it finished
    if (N && N.say && N.speaking) {
      try { N.say(text); } catch (e) { return done(); }
      var t0 = Date.now();
      (function wait() { setTimeout(function () { var busy = false; try { busy = N.speaking(); } catch (e) {} if ((busy || Date.now() - t0 < 900) && Date.now() - t0 < 120000) wait(); else done(); }, 400); })();
      return;
    }
    if (N && N.speak) { try { N.speak(text); } catch (e) {} setTimeout(done, Math.min(60000, 1500 + text.length * 85)); return; }
    if (!hasVoice(/^bn/i)) return webTTS(text, uiLang() === 'en' ? 'bn' : 'bn', done);
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
    segs = null;
    var token = queue;
    // quran.com has word timings for these reciters: play their file and light up each word as it is read
    var rid = QCOM_RECITER[settings.reciter];
    if (!rid) { playUrl(ayahUrl(it.s, it.a), ayahUrl(it.s, it.a, true)); return; }
    var done = false;
    var fallback = setTimeout(function () { if (!done && queue === token) { done = true; playUrl(ayahUrl(it.s, it.a), ayahUrl(it.s, it.a, true)); } }, 2500);
    getJSON(QCOM + 'recitations/' + rid + '/by_ayah/' + it.s + ':' + it.a + '?fields=segments', false).then(function (j) {
      if (done || queue !== token) return;
      var f = j.audio_files && j.audio_files[0];
      if (!f || !f.url) throw new Error('no audio');
      done = true; clearTimeout(fallback);
      segs = { s: it.s, a: it.a, list: (f.segments || []).map(function (x) { return x.length >= 4 ? [x[x.length - 3], x[x.length - 2], x[x.length - 1]] : x; }) };
      playUrl(/^https?:/.test(f.url) ? f.url : 'https://verses.quran.com/' + f.url.replace(/^\/+/, ''), ayahUrl(it.s, it.a));
    }).catch(function () { if (!done && queue === token) { done = true; clearTimeout(fallback); playUrl(ayahUrl(it.s, it.a), ayahUrl(it.s, it.a, true)); } });
  }
  var QCOM_RECITER = { Alafasy_128kbps: 7, Abdul_Basit_Murattal_192kbps: 2, Husary_128kbps: 6, Minshawy_Murattal_128kbps: 9 };
  var segs = null, litWord = null;
  // karaoke: follow the voice word by word (smooth, every animation frame) and keep the word in view
  var rafOn = false;
  function lightTick() {
    if (!segs || !segs.list.length || player.paused) { rafOn = false; return; }
    var ms = player.currentTime * 1000, pos = 0;
    for (var i = 0; i < segs.list.length; i++) { var g = segs.list[i]; if (ms >= g[1] - 60 && ms < g[2] + 150) { pos = g[0]; break; } if (ms >= g[2]) pos = g[0]; }
    var v = document.querySelector('#nld-v-' + segs.a);
    if (v && v.getAttribute('data-s') != segs.s) v = null;
    var el = (pos && v) ? v.querySelector('.nld-tok[data-w="' + pos + '"]') : null;
    if (el !== litWord) {
      if (litWord) { litWord.classList.remove('lit'); litWord.classList.add('read'); }
      litWord = el;
      if (el) {
        el.classList.add('lit'); el.classList.remove('read');
        var r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 170) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
      }
    }
    requestAnimationFrame(lightTick);
  }
  function startLight() {
    document.querySelectorAll('.nld-tok.read,.nld-tok.lit').forEach(function (x) { if (!segs || !x.closest('#nld-v-' + segs.a)) x.classList.remove('read', 'lit'); });
    if (!rafOn) { rafOn = true; requestAnimationFrame(lightTick); }
  }
  player.addEventListener('play', startLight);
  player.addEventListener('playing', startLight);
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
  // keep the phone screen on while a recitation is playing (app only)
  player.addEventListener('play', function () { native('keepAwake', true); updateBar(); syncPP(); });
  player.addEventListener('ended', function () { setTimeout(syncPP, 50); });
  player.addEventListener('pause', function () { if (!queue) native('keepAwake', false); updateBar(); syncPP(); });
  function native(fn, arg) { var N = window.NexoraLifeNative; try { if (N && N[fn]) N[fn](arg); } catch (e) {} }
  function stopAll() { stopTTS(); guideToken = null; segs = null; if (litWord) { litWord.classList.remove('lit'); litWord = null; } queue = null; slowToken = null; try { player.pause(); } catch (e) {} if (window.speechSynthesis) speechSynthesis.cancel(); native('stopSpeaking'); onAyah(null); updateBar(); }
  function setSpeed(v) { settings.speed = v; saveSettings(); player.playbackRate = v; try { ttsAudio.playbackRate = v; } catch (e) {} $$('.nld-speed,.nld-vspeed').forEach(function (s) { s.value = String(v); }); }
  function syncPP() {
    var cur = queue && queue.list[queue.i];
    $$('.nld-pp').forEach(function (b) {
      var d = b.closest('.nld-v'), on = cur && d && +d.getAttribute('data-a') === cur.a && +d.getAttribute('data-s') === cur.s && !player.paused;
      b.textContent = on ? '⏸' : '▶'; b.classList.toggle('on', !!on);
    });
  }

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
  function norm(x) { return String(x).replace(/য়/g, 'য়').replace(/[\s\-'’ʼ.]+/g, ''); }
  // English spellings: "Al-Waaqia", "waqia", "Yaseen", "yasin" all become the same key
  function latin(x) { return String(x).toLowerCase().replace(/^(aal|al|an|ar|as|at|ad|adh|az|ash)[-'’ ]/, '').replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1').replace(/o/g, 'u').replace(/e/g, 'i').replace(/q/g, 'k'); }
  var LATIN = null;
  function latinNames() {
    if (LATIN && (LATIN._full || !SURAHS)) return LATIN;
    LATIN = { _full: !!SURAHS };
    (SURAHS || []).forEach(function (x) { LATIN[x[0]] = [latin(x[1])]; });
    Object.keys(NAMES).forEach(function (n) { NAMES[n].forEach(function (al) { if (/^[a-z]+$/.test(al)) (LATIN[n] = LATIN[n] || []).push(latin(al)); }); });
    return LATIN;
  }
  /** Longest name found wins ("আলাক" is not "আলা", "an-nasr" is not "an-nas"). */
  function surahByName(t, strict) {
    var said = /সূরা|surah|sura/.test(t);
    var bnT = norm(t), laT = String(t).toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1').replace(/o/g, 'u').replace(/e/g, 'i').replace(/q/g, 'k');
    var best = 0, len = 0;
    Object.keys(NAMES).forEach(function (n) { NAMES[n].forEach(function (al) { if (/[a-z]/.test(al)) return; al = norm(al); if (al.length > len && (said || al.length >= 3) && bnT.indexOf(al) >= 0) { best = +n; len = al.length; } }); });
    var L = latinNames(), words = [];
    // strict (no "সূরা" said): an English name must be a whole word, "alarm" is not "al-a'la"
    if (strict) { var ws = String(t).toLowerCase().split(/[^a-z'’-]+/).filter(Boolean); ws.forEach(function (w, i) { words.push(latin(w)); if (ws[i + 1]) words.push(latin(w + '-' + ws[i + 1])); }); }
    Object.keys(L).forEach(function (n) { if (n === '_full') return; L[n].forEach(function (al) { if (al.length > len && (said || al.length >= 3) && (strict ? words.indexOf(al) >= 0 : laT.indexOf(al) >= 0)) { best = +n; len = al.length; } }); });
    return best;
  }
  var NUMW = '(?:নং|নম্বর|নাম্বার|নম্বরের|নাম্বারের|তম|number|num|no\\.?|nong|nombor|nambar|nmbr|nom|th)?';
  function parseCommand(text) {
    var t = en(String(text || '').toLowerCase().replace(/য়/g, 'য়'));
    t = t.replace(/সুরা|ছুরা|ছূরা/g, 'সূরা').replace(/আইয়াত|আয়াতের/g, 'আয়াত').replace(/আয়াতুল\s*কুরসি|আয়াতুল\s*কুরসী|ayat?u?l\s*kursi|\bkursi\b|কুরসি/g, ' kursi255 ').replace(/\b(su+r+a+h?|surat|surar|surahr|surah?er|shu+r+a+h?|sora+h?|sure|surae)\b/g, 'সূরা').replace(/\b(a+y+a+t+h?|ayah|aiat|ayet|ayot|ayater|ayate|ayatta|ayat?ta|aayat|ayaat|ayath|verse)\b/g, 'আয়াত');
    if (/kursi255/.test(t)) return { kind: 'ayah', surah: 2, ayah: 255 };
    if (/হাদিস|হাদীস|hadith|hadis/.test(t) || /(বুখারী|বুখারি|তিরমিযী|তিরমিজি|bukhari|tirmidhi|tirmizi)/.test(t)) {
      var books = { bukhari: /(বুখারী|বুখারি|বোখারী|bukhari|bokhari)/, muslim: /(মুসলিম|muslim)/, tirmidhi: /(তিরমিযী|তিরমিজি|তিরমিজী|তিরমিযি|tirmidhi|tirmizi)/ };
      for (var k in books) { var m0 = t.match(/(\d{1,4})/); if (books[k].test(t) && m0) return { kind: 'hadith', book: k, number: +m0[1] }; }
    }
    if ((/আযান|আজান|সেহরি|সাহরি|ইফতার|ওয়াক্ত|prayer time|azan|ajan/.test(t) || (/নামাজ|নামায|namaz|namaj/.test(t) && /সময়|কখন|সূচি|time|somoy/.test(t))) && !/সূরা|আয়াত|রিমাইন্ডার|reminder|অ্যালার্ম দাও/.test(t)) return { kind: 'prayer' };
    var isQ = /সূরা|আয়াত|কুরআন|কোরআন|quran|koran|তিলাওয়াত|তেলাওয়াত|tilawat|telawat/.test(t) || /^\s*\d{1,3}\s*[:।]\s*\d{1,3}\s*$/.test(t);
    // a surah name plus "read / play" is enough: "fatiha poro", "ইয়াসিন শোনাও"
    if (!isQ && (new RegExp('পড|শোনা|শুনা|শুনাও|তিলাওয়াত|তেলাওয়াত|\\b(poro|poren|porun|portesi|shunao|sunao|sonao|shonao|shunau|sunau|tilawat|telawat|telwat|tilwat|recite|play|chalao|calao)\\b').test(t) || /\d/.test(t)) && surahByName(t, true)) isQ = true;
    if (!isQ) return null;
    var s = 0, a = 0, m;
    if (/আয়াতুল\s*কুরসি|আয়াতুল\s*কুরসী|ayatul\s*kursi|আয়াতul\s*kursi/.test(t)) return { kind: 'ayah', surah: 2, ayah: 255 };
    if ((m = t.match(/(\d{1,3})\s*[:।]\s*(\d{1,3})/))) { s = +m[1]; a = +m[2]; }
    else {
      // surah number first: "২ নম্বর সূরা", "সূরা ২", "56. Al-Waaqia" (a number that starts the request)
      var sAt = -1;
      if ((m = t.match(new RegExp('(\\d{1,3})\\s*' + NUMW + '\\s*সূরা'))) || (m = t.match(new RegExp('সূরা\\s*' + NUMW + '\\s*(\\d{1,3})'))) || (m = t.match(/^\s*(\d{1,3})\s*[.)।,-]/))) { s = +m[1]; sAt = m.index + m[0].indexOf(m[1]); }
      // ayah number: "আয়াত ১৫" or "১৫ নম্বর আয়াত" (but not the surah's own number in "সূরা ১৮ আয়াত ১০")
      var re = new RegExp('(\\d{1,3})\\s*' + NUMW + '\\s*আয়াত', 'g'), mm;
      while ((mm = re.exec(t))) { if (mm.index !== sAt) { a = +mm[1]; break; } }
      if (!a && (m = t.match(new RegExp('আয়াত\\s*' + NUMW + '\\s*(\\d{1,3})'))) && m.index + m[0].indexOf(m[1]) !== sAt) a = +m[1];
      var byName = false;
      if (!s) { s = surahByName(t); byName = !!s; }
      // "সূরা বাকারা ২৫৫": a name and one bare number — the number is the ayah
      if (byName && !a) { var ns = t.match(/\d{1,3}/g) || []; if (ns.length === 1) a = +ns[0]; }
      // two numbers and only one known: the other one is the surah
      if (!s && a) { var nums = (t.match(/\d{1,3}/g) || []).map(Number); var rest = nums.filter(function (x) { return x !== a; }); if (rest.length === 1) s = rest[0]; }
    }
    if (s < 1 || s > 114) return null;
    if (a > 0) return a > COUNTS[s - 1] ? null : { kind: 'ayah', surah: s, ayah: a };
    return { kind: 'surah', surah: s };
  }

  /* ------------------------------------------------------------ shell */
  var root = null, view = null, state = { tab: 'home' };

  // hub language switched: redraw at once (fresh Bangla text, which the hub then translates; meanings/hadith switch edition)
  var lastLang = null;
  function watchLang() {
    var check = function () {
      var l = uiLang();
      if (lastLang === null) { lastLang = l; return; }
      if (l === lastLang) return;
      lastLang = l;
      if (root && view && document.body.contains(root)) { try { open(state.tab, state.arg); } catch (e) {} }
    };
    setInterval(check, 600);
    document.addEventListener('change', function () { setTimeout(check, 150); setTimeout(check, 900); }, true);
    document.addEventListener('click', function () { setTimeout(check, 300); }, true);
  }
  function panel() {
    if (!watchLang._on) { watchLang._on = 1; watchLang(); }
    applyArFont();
    // data-nt: the hub machine-translates Bangla text when its language is not Bangla; Quran, hadith and lessons stay as written
    root = el('<div class="nld"><div class="nld-sticky"><div class="nld-tabs">' +
      [['home', '🏠', 'হোম'], ['namaz', '🕌', 'নামাজ'], ['quran', '📖', 'কুরআন'], ['hadith', '📚', 'হাদিস'], ['learn', '🎓', 'শিখুন'], ['quiz', '❓', 'কুইজ'], ['settings', '⚙️', 'সেটিংস']].map(function (t) {
        return '<button data-dt="' + t[0] + '"><span>' + t[1] + '</span>' + t[2] + '</button>';
      }).join('') + '</div><form class="nld-ask"><input placeholder="যেমন: ২ নম্বর সূরার ২৫৫ নম্বর আয়াত, সূরা ইয়াসিন, বুখারী ১" aria-label="কী শুনতে চান"><button>খুঁজুন</button></form></div><div class="nld-view"></div></div>');
    view = $('.nld-view', root);
    // keep the tabs + search (and a surah's title bar) pinned while scrolling
    try { var stk = $('.nld-sticky', root); var setH = function () { root.style.setProperty('--nld-stick', stk.offsetHeight + 'px'); }; if (window.ResizeObserver) new ResizeObserver(setH).observe(stk); setTimeout(setH, 50); } catch (e) {}
    $$('[data-dt]', root).forEach(function (b) { b.onclick = function () { open(b.getAttribute('data-dt')); }; });
    $('.nld-ask', root).onsubmit = function (e) {
      e.preventDefault();
      var q = $('input', root).value, c = parseCommand(q);
      if (c) run(c); else if (q.trim()) { open('hadith'); searchHadithText(q); }
    };
    return root;
  }
  function open(tab, arg) {
    state.tab = tab; state.arg = arg;
    $$('[data-dt]', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dt') === tab); });
    view.innerHTML = '';
    ({ home: viewHome, namaz: viewNamaz, quran: viewQuran, hadith: viewHadith, learn: viewLearn, quiz: viewQuiz, settings: viewSettings }[tab] || viewQuran)(view, arg);
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
          return '<div class="nld-v" id="nld-v-' + x.a + '" data-a="' + x.a + '" data-s="' + n + '"><div class="nld-vtop"><span class="nld-num">' + bn(n) + ':' + bn(x.a) + '</span>' + (sajda ? '<span class="nld-sajda">۩ সিজদার আয়াত</span>' : '') +
            '<button data-act="play" class="nld-pp" title="এই আয়াত চালান / থামান">▶</button><select class="nld-vspeed" title="গতি">' + SPEEDS.map(function (sp) { return '<option value="' + sp[0] + '"' + (sp[0] === settings.speed ? ' selected' : '') + '>' + sp[1] + '</option>'; }).join('') + '</select><button data-act="from" title="এখান থেকে শেষ পর্যন্ত">⏩</button><button data-act="words" title="শব্দে শব্দে">🔤</button><button data-act="meaning" title="বাংলা অর্থ শুনুন">🗣️</button><button data-act="copy" title="কপি">📋</button></div>' +
            '<div class="nld-arv nld-ar" dir="rtl" lang="ar">' + words(x.ar) + ' <span class="nld-end">﴿' + arNum(x.a) + '﴾</span></div>' +
            (settings.showTr ? '<div class="nld-bnv" data-nt="1">' + esc(x.bn) + '</div>' : '') + '<div class="nld-words"></div></div>';
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
        // a word plays only that word (quran.com word audio); the ▶ button plays the whole ayah
        $$('.nld-tok', d).forEach(function (t) { t.onclick = function (e) {
          e.stopPropagation(); stopAll();
          var p3 = function (x) { return ('00' + x).slice(-3); };
          $$('.nld-tok.lit,.nld-tok.read', v).forEach(function (x) { x.classList.remove('lit', 'read'); });
          t.classList.add('lit');
          playUrl(WBW + 'wbw/' + p3(n) + '_' + p3(a) + '_' + p3(t.getAttribute('data-w')) + '.mp3');
          var off = function () { t.classList.remove('lit'); player.removeEventListener('ended', off); player.removeEventListener('pause', off); };
          player.addEventListener('ended', off); player.addEventListener('pause', off);
        }; });
        var vs = $('.nld-vspeed', d); vs.onclick = function (e) { e.stopPropagation(); }; vs.onchange = function () { setSpeed(+this.value); };
        $$('[data-act]', d).forEach(function (b) {
          b.onclick = function (e) {
            e.stopPropagation();
            var act = b.getAttribute('data-act');
            if (act === 'play') {
              var cur = queue && queue.list[queue.i];
              if (cur && cur.s === n && cur.a === a && queue.list.length === 1) { if (player.paused) player.play(); else player.pause(); }
              else playQueue([list[a - 1]], 0);
            }
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
  /** Arabic text as word spans (numbered like quran.com words; pause marks and signs are not words). */
  function words(ar) {
    var n = 0;
    return String(ar).split(' ').map(function (tok) {
      if (!/[\u0621-\u064A\u066E-\u06D3\u06FA-\u06FF]/.test(tok)) return esc(tok);
      n++;
      return '<span class="nld-tok" data-w="' + n + '">' + esc(tok) + '</span>';
    }).join(' ');
  }
  function arNum(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

  function showWords(d, s, a) {
    var box = $('.nld-words', d);
    if (box.innerHTML) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="nld-load">শব্দ লোড হচ্ছে…</div>';
    verseWords(s, a).then(function (ws) {
      box.innerHTML = '<div class="nld-wrow" dir="rtl">' + ws.map(function (w, i) {
        return '<button class="nld-w" data-i="' + i + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr" data-nt="1">' + esc(w.bn || '') + '</small></button>';
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
        '<form class="nld-hnum"><label>হাদিস নং <input type="number" min="1" step="any"></label><select class="nld-hmode"><option value="own">এই সংস্করণের ক্রমিক নং (১–' + bn(info.last) + ')</option><option value="ar"' + (book === 'muslim' ? ' selected' : '') + '>আরবি/আন্তর্জাতিক নং (ফুয়াদ আবদুল বাকী)</option></select><button>খুলুন</button></form>' +
        '<div class="nld-hout"></div><h4>অধ্যায়সমূহ</h4><div class="nld-secs">' + info.sections.map(function (s) {
          return '<button data-sec="' + s[0] + '"><b>' + bn(s[0]) + '</b> ' + esc(s[1]) + ' <small>(' + bn(s[2]) + '–' + bn(s[3]) + ')</small></button>';
        }).join('') + '</div><p class="nld-src">উৎস: fawazahmed0/hadith-api (বাংলা ও আরবি সংস্করণ)। নম্বর এই সংস্করণের ক্রম অনুযায়ী; আরবি (আন্তর্জাতিক) নম্বরও পাশে দেখানো হয়।</p>';
      $$('[data-book]', v).forEach(function (b) { b.onclick = function () { state.book = b.getAttribute('data-book'); viewHadith(v); }; });
      var out = $('.nld-hout', v);
      $('.nld-hnum', v).onsubmit = function (e) {
        e.preventDefault();
        var n = +en($('input', this).value);
        if (!(n >= 1)) return;
        if ($('.nld-hmode', v).value === 'ar') return byArabicNumber(out, book, n, info);
        if (n <= info.last) showHadith(out, book, Math.floor(n));
      };
      $$('[data-sec]', v).forEach(function (b) { b.onclick = function () { showSection(out, book, +b.getAttribute('data-sec'), b.textContent); out.scrollIntoView({ block: 'start' }); }; });
      // Muslim is cited by the Arabic number almost everywhere; Bukhari and Tirmidhi numbers are the same in both
      if (arg && arg.number) { if (book === 'muslim') byArabicNumber(out, book, arg.number, info); else showHadith(out, book, arg.number); }
    }).catch(function (e) { fail(v, e); });
  }
  function hadithCard(h) {
    var g = (h.grades || []).map(function (x) { return esc(x.name) + ': <b>' + esc(x.grade) + '</b>'; }).join(' · ');
    return '<div class="nld-h"><div class="nld-hhead"><b>' + BOOKS[h.book] + ' · হাদিস নং ' + bn(h.num) + '</b>' + (h.arabicnumber && h.arabicnumber != h.num ? '<small>আরবি নং ' + bn(h.arabicnumber) + '</small>' : '') +
      '<button data-say="1" title="বাংলা পড়ে শোনাও">🗣️</button></div>' + (h.ar ? '<div class="nld-har nld-ar" dir="rtl" lang="ar">' + esc(h.ar) + '</div>' : '') +
      (h.bn ? '<div class="nld-hbn" data-nt="1">' + esc(h.bn) + '</div>' : '<div class="nld-hint">এই হাদিসের বাংলা অনুবাদ এই সংস্করণে নেই।</div>') + (g ? '<div class="nld-grade">মান: ' + g + '</div>' : '') + '</div>';
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
  // Muslim is usually cited by the Arabic (Fuad Abdul Baqi) number, e.g. "Muslim 8" = the hadith of Jibril (8.01 here)
  function byArabicNumber(out, book, n, info) {
    var sec = info.sections.filter(function (s) { return n >= Math.floor(s[4]) && n <= Math.floor(s[5]); })[0];
    if (!sec) { out.innerHTML = '<div class="nld-err">আরবি নং ' + bn(n) + ' খুঁজে পাওয়া যায়নি।</div>'; return; }
    out.innerHTML = '<div class="nld-load">খোঁজা হচ্ছে…</div>';
    hadithSection(book, sec[0]).then(function (list) {
      var hit = list.filter(function (h) { return Math.floor(+h.arabicnumber) === Math.floor(n) && (n % 1 === 0 || +h.arabicnumber === n); });
      if (!hit.length) { out.innerHTML = '<div class="nld-err">আরবি নং ' + bn(n) + ' এই সংস্করণে পাওয়া যায়নি।</div>'; return; }
      out.innerHTML = '<div class="nld-hint">আরবি নং ' + bn(n) + (hit.length > 1 ? ' — ' + bn(hit.length) + 'টি বর্ণনা (একই হাদিসের ভিন্ন সনদ)' : '') + '</div>' + hit.map(hadithCard).join('');
      bindSay(out, hit);
    }).catch(function (e) { out.innerHTML = '<div class="nld-err">লোড করা যায়নি (' + esc(e.message) + ')।</div>'; });
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
  var LESSON_GUIDE = {"harakat": [["قُلْ — ক্বাফে পেশ, তাই কু; লাম সাকিন, তাই কুল।", "112:1", 1], ["هُوَ — হা-তে পেশ হু, ওয়াও-তে যবর ওয়া: হুওয়া।", "112:1", 2]], "tanween": [["أَحَدٌ — শেষে দুই পেশ, তাই আহাদুন। থামলে আহাদ।", "112:4", 5], ["كُفُوًا — দুই যবর: কুফুওয়ান।", "112:4", 4]], "sukun": [["ٱلْحَمْدُ — লাম আর মীম সাকিন: আল-হাম-দু।", "1:2", 1]], "shadda": [["رَبِّ — বা-তে তাশদীদ: রাব-বি।", "1:2", 3], ["إِنَّا — নূনে তাশদীদ, তাই দুই হরকত গুন্নাহ: ইন্না।", "108:1", 1]], "madd": [["مَٰلِكِ — মীমের পর খাড়া যবর, দুই হরকত টানুন: মা—লিকি।", "1:4", 1], ["ٱلضَّآلِّينَ — মাদ্দের পর তাশদীদ, তাই মাদ্দে লাযিম, ছয় হরকত টানুন।", "1:7", 9]], "noon": [["يَكُن لَّهُۥ — নূন সাকিনের পর লাম, গুন্নাহ ছাড়া ইদগাম: ইয়াকুল্লাহু।", "112:4", 2], ["كُفُوًا أَحَدٌ — তানভীনের পর হামযা, ইযহার: পরিষ্কার নূন।", "112:4", 4], ["لَهَبٍ وَتَبَّ — তানভীনের পর ওয়াও, গুন্নাহসহ ইদগাম।", "111:1", 4], ["لَيُنۢبَذَنَّ — নূন সাকিনের পর বা, ইকলাব: নূন মীম হয়ে যায়।", "104:4", 2], ["مِّن سِجِّيلٍ — নূন সাকিনের পর সীন, ইখফা: নাকে লুকিয়ে পড়ুন।", "105:4", 3]], "meem": [["تَرْمِيهِم بِحِجَارَةٍ — মীম সাকিনের পর বা, ইখফা শাফাবি।", "105:4", 1], ["أَطْعَمَهُم مِّن — মীম সাকিনের পর মীম, ইদগাম মিসলাইন।", "106:4", 2], ["عَلَيْهِمْ غَيْرِ — মীম সাকিনের পর গাইন, ইযহার শাফাবি: পরিষ্কার মীম।", "1:7", 4]], "qalqala": [["ٱلْفَلَقِ — শেষে ক্বাফে থামলে ক্বলক্বলা: ফালাক্ব।", "113:1", 3], ["ٱلصَّمَدُ — শেষে দালে থামলে ক্বলক্বলা: সামাদ।", "112:2", 2]], "allah": [["بِسْمِ ٱللَّهِ — আগে যের, তাই আল্লাহর লাম চিকন।", "1:1", 2], ["هُوَ ٱللَّهُ — আগে যবর, তাই লাম মোটা।", "112:1", 3]]};
  /* ------------------------------------------------------------ Qaida (Noorani style) with voice */
  var ARNAMES = ['أَلِف', 'بَاء', 'تَاء', 'ثَاء', 'جِيم', 'حَاء', 'خَاء', 'دَال', 'ذَال', 'رَاء', 'زَاي', 'سِين', 'شِين', 'صَاد', 'ضَاد', 'طَاء', 'ظَاء', 'عَيْن', 'غَيْن', 'فَاء', 'قَاف', 'كَاف', 'لَام', 'مِيم', 'نُون', 'وَاو', 'هَاء', 'هَمْزَة', 'يَاء'];
  var BNC = { 'ا': '', 'ب': 'ব', 'ت': 'ত', 'ث': 'ছ', 'ج': 'জ', 'ح': 'হ', 'خ': 'খ', 'د': 'দ', 'ذ': 'য', 'ر': 'র', 'ز': 'য', 'س': 'স', 'ش': 'শ', 'ص': 'স', 'ض': 'দ', 'ط': 'ত', 'ظ': 'য', 'ع': '', 'غ': 'গ', 'ف': 'ফ', 'ق': 'ক', 'ك': 'ক', 'ل': 'ল', 'م': 'ম', 'ن': 'ন', 'و': 'ওয়', 'ه': 'হ', 'ء': '', 'ي': 'ইয়' };
  var NOJOIN = 'اأدذرزوء';
  var DRILL_LETTERS = LETTERS.map(function (x) { return x[0]; }).filter(function (c) { return c !== 'ا'; }).map(function (c) { return c === 'ء' ? 'أ' : c; });
  // Bangla reading of a syllable: consonant + vowel sign
  function bnSyl(c, v) {
    var k = BNC[c === 'أ' ? 'ء' : c];
    var full = { a: 'আ', i: 'ই', u: 'উ', aa: 'আ—', ii: 'ঈ—', uu: 'ঊ—' }, sign = { a: 'া', i: 'ি', u: 'ু', aa: 'া—', ii: 'ী—', uu: 'ূ—' };
    if (!k) return full[v];
    if (/য়$/.test(k)) return k.replace(/^ও|^ই/, '') ? (k === 'ওয়' ? { a: 'ওয়া', i: 'উয়ি', u: 'উয়ু', aa: 'ওয়া—', ii: 'উয়ী—', uu: 'উয়ূ—' }[v] : { a: 'ইয়া', i: 'ইয়ি', u: 'ইয়ু', aa: 'ইয়া—', ii: 'ইয়ী—', uu: 'ইয়ূ—' }[v]) : full[v];
    return k + sign[v];
  }
  var QAIDA = [
    { id: 'q-forms', t: 'হরফের যুক্ত রূপ (মুরাক্কাবাত)', body: '<p>আরবি হরফ শব্দের শুরু, মাঝে আর শেষে একটু ভিন্ন আকারে লেখা হয়, কিন্তু উচ্চারণ একই থাকে। ا د ذ ر ز و — এই ছয়টি হরফ পরের হরফের সাথে জোড়া লাগে না। প্রতিটা ঘরে চাপলে হরফের নাম আরবিতে শুনবেন।</p>', forms: true },
    { id: 'q-muqattaat', t: 'হুরুফে মুকাত্তাআত', body: '<p>কিছু সূরার শুরুতে আলাদা আলাদা হরফ থাকে — এগুলো মিলিয়ে নয়, প্রতিটা হরফের <b>নাম</b> ধরে পড়তে হয়। যেমন الٓمٓ = আলিফ-লাম-মীম। চাপলে ক্বারীর কণ্ঠে শুনবেন।</p>', muq: true },
    { id: 'q-fatha', t: 'যবর, যের, পেশ অনুশীলন', body: '<p>প্রতিটা হরফ তিন হরকতে: যবরে "আ", যেরে "ই", পেশে "উ"। ঝটকা দিয়ে, না টেনে পড়ুন। ঘরে চাপলে উচ্চারণ শুনবেন; "গাইডসহ শুনুন" চাপলে বাংলায় নিয়ম বলে একে একে সব পড়ে শোনাবে।</p>', drill: { v: [['َ', 'a'], ['ِ', 'i'], ['ُ', 'u']] }, say: 'যবর হলে আ, যের হলে ই, পেশ হলে উ। ঝটকা দিয়ে পড়ুন, টানবেন না। এখন শুনুন আর সাথে সাথে বলুন।' },
    { id: 'q-tanween', t: 'তানভীন অনুশীলন', body: '<p>দুই যবর "আন", দুই যের "ইন", দুই পেশ "উন"। দুই যবরের পর সাধারণত একটা আলিফ লেখা থাকে, সেটা পড়া হয় না (থামলে "আ" হয়)।</p>', drill: { v: [['ًا', 'an'], ['ٍ', 'in'], ['ٌ', 'un']] }, say: 'দুই যবর হলে আন, দুই যের হলে ইন, দুই পেশ হলে উন। শুনুন আর সাথে বলুন।' },
    { id: 'q-madd', t: 'মাদ্দ (টেনে পড়া) অনুশীলন', body: '<p>যবরের পর আলিফ, যেরের পর ইয়া সাকিন, পেশের পর ওয়াও সাকিন থাকলে আওয়াজ দুই হরকত (এক আলিফ) টেনে পড়তে হয়: بَا = বা—, بِي = বী—, بُو = বূ—।</p>', drill: { v: [['َا', 'aa'], ['ِي', 'ii'], ['ُو', 'uu']] }, say: 'যবরের পর আলিফ, যেরের পর ইয়া, পেশের পর ওয়াও থাকলে দুই হরকত টেনে পড়তে হয়। শুনুন।' },
    { id: 'q-sukun', t: 'সাকিন (জযম) অনুশীলন', body: '<p>সাকিন হরফ আগের হরকতওয়ালা হরফের সাথে মিলিয়ে থামিয়ে পড়া হয়: أَبْ = আব্, إِبْ = ইব্, أُبْ = উব্। ক্বলক্বলার হরফ (ق ط ب ج د) সাকিন হলে হালকা প্রতিধ্বনি দিন।</p>', drill: { pre: true, v: [['ْ', 'a'], ['ْ', 'i'], ['ْ', 'u']] }, say: 'সাকিন হরফ আগের হরফের সাথে মিলিয়ে থামিয়ে পড়ুন। যেমন আলিফে যবর, বা সাকিন — আব্। শুনুন।' },
    { id: 'q-shadda', t: 'তাশদীদ অনুশীলন', body: '<p>তাশদীদওয়ালা হরফ দুইবার পড়া হয়: প্রথমে আগের হরফের সাথে সাকিন হয়ে, তারপর নিজের হরকতে। أَبَّ = আব্‌বা, إِبِّ = ইব্‌বি, أُبُّ = উব্‌বু। নূন ও মীমে তাশদীদ হলে গুন্নাহ দুই হরকত।</p>', drill: { pre: true, shadda: true, v: [['َّ', 'a'], ['ِّ', 'i'], ['ُّ', 'u']] }, say: 'তাশদীদ মানে হরফ দুইবার। আগে সাকিন, তারপর হরকতসহ। যেমন আব্বা, ইব্বি, উব্বু। শুনুন।' },
    { id: 'q-leen', t: 'লীন অনুশীলন', body: '<p>যবরের পর ওয়াও সাকিন বা ইয়া সাকিন হলে নরম করে পড়তে হয়: بَوْ = বাও, بَيْ = বাই। ক্বুরাইশ সূরার خَوْفٍ, بَيْتِ এর উদাহরণ।</p>', drill: { v: [['َوْ', 'aw'], ['َيْ', 'ay']] }, say: 'যবরের পর ওয়াও বা ইয়া সাকিন হলে নরম করে পড়ুন — বাও, বাই। শুনুন।' }
  ];
  var MUQ = [['الٓمٓ', 'আলিফ-লাম-মীম', 2, 1], ['الٓمٓصٓ', 'আলিফ-লাম-মীম-সোয়াদ', 7, 1], ['الٓر', 'আলিফ-লাম-রা', 10, 1], ['الٓمٓر', 'আলিফ-লাম-মীম-রা', 13, 1], ['كٓهيعٓصٓ', 'কাফ-হা-ইয়া-আইন-সোয়াদ', 19, 1], ['طه', 'ত্বোয়া-হা', 20, 1], ['طسٓمٓ', 'ত্বোয়া-সীন-মীম', 26, 1], ['طسٓ', 'ত্বোয়া-সীন', 27, 1], ['يسٓ', 'ইয়া-সীন', 36, 1], ['صٓ', 'সোয়াদ', 38, 1], ['حمٓ', 'হা-মীম', 40, 1], ['عٓسٓقٓ', 'আইন-সীন-ক্বাফ', 42, 2], ['قٓ', 'ক্বাফ', 50, 1], ['نٓ', 'নূন', 68, 1]];
  function drillCells(d) {
    var out = [];
    DRILL_LETTERS.forEach(function (c) {
      if (d.v[0][1] === 'aw' && c === 'أ') return;
      var row = d.v.map(function (m) {
        var ar, tl;
        if (d.pre) {
          if (c === 'أ') return null;
          var lead = { a: 'أَ', i: 'إِ', u: 'أُ' }[m[1]];
          ar = lead + c + (d.shadda ? m[0] : m[0]);
          var k = BNC[c] || ''; if (c === 'و') k = 'ও'; if (c === 'ي') k = 'ই';
          var V = { a: 'আ', i: 'ই', u: 'উ' }[m[1]], semi = c === 'و' || c === 'ي';
          tl = d.shadda ? V + (semi ? k : k + '্') + bnSyl(c, m[1]) : V + (k ? (semi ? k : k + '্') : '');
        } else if (/an|in|un/.test(m[1])) {
          ar = c + m[0]; tl = bnSyl(c, m[1].charAt(0)) + 'ন';
          if (m[1] === 'an' && 'ة'.indexOf(c) >= 0) ar = c + 'ً';
        } else if (m[1] === 'aw' || m[1] === 'ay') {
          ar = c + m[0]; tl = bnSyl(c, 'a') + (m[1] === 'aw' ? 'ও' : 'ই');
        } else { ar = c + m[0]; tl = bnSyl(c, m[1]); }
        return [ar, tl];
      }).filter(Boolean);
      if (row.length) out.push(row);
    });
    return out;
  }
  // Arabic voice: the app's Arabic engine (1.0.26+), else the browser's Arabic voice
  function arVoice() { var v = window.speechSynthesis ? speechSynthesis.getVoices().filter(function (x) { return /^ar/i.test(x.lang); }) : []; return v[0] || null; }
  function sayAr(text, done) {
    done = done || function () {};
    var N = window.NexoraLifeNative;
    if (N && N.sayAr) {
      var st = 0; try { st = N.arReady(); } catch (e) {}
      if (st === 3) return webTTS(text, 'ar', done);
      try { N.sayAr(text); } catch (e) { return done(); }
      var t0 = Date.now();
      (function wait() { setTimeout(function () { var busy = false; try { busy = N.speaking(); } catch (e) {} if ((busy || Date.now() - t0 < 700) && Date.now() - t0 < 15000) wait(); else done(); }, 250); })();
      return;
    }
    if (!hasVoice(/^ar/i)) return webTTS(text, 'ar', done);
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = Math.max(0.5, Math.min(1.2, 0.8 * settings.speed));
    var vv = arVoice(); if (vv) u.voice = vv;
    u.onend = u.onerror = function () { done(); };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  var toasted = {};
  function toastOnce(msg) { if (toasted[msg]) return; toasted[msg] = 1; var t = el('<div class="nld-toast">' + esc(msg) + '</div>'); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000); }
  // Plays steps one after another: {bn}, {ar}, {url}, {cell} to highlight
  var guideToken = null;
  function guide(steps) {
    stopAll(); var token = {}; guideToken = token; var i = 0;
    (function next() {
      if (guideToken !== token) return;
      $$('.nld-cell.lit,.nld-w.lit').forEach(function (x) { x.classList.remove('lit'); });
      var s = steps[i++]; if (!s) { guideToken = null; return; }
      if (s.cell) { s.cell.classList.add('lit'); try { s.cell.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
      var after = function () { setTimeout(next, s.gap == null ? 500 : s.gap); };
      if (s.bn) speakBn(s.bn, after);
      else if (s.ar) sayAr(s.ar, after);
      else if (s.url) { playUrl(s.url); var end = function () { player.removeEventListener('ended', end); after(); }; player.addEventListener('ended', end); }
      else after();
    })();
  }
  function qaidaBlock(v, l) {
    var box = $('.nld-qaida', v); if (!box) return;
    if (l.forms) {
      box.innerHTML = '<div class="nld-forms">' + LETTERS.map(function (x, k) {
        var c = x[0]; if (c === 'ء') return '';
        var f = NOJOIN.indexOf(c) >= 0 ? [c, c, 'ـ' + c, 'ـ' + c] : [c, c + 'ـ', 'ـ' + c + 'ـ', 'ـ' + c];
        return '<button class="nld-cell" data-k="' + k + '"><b>' + x[1] + '</b><span class="nld-ar" dir="rtl">' + f.join('  ') + '</span></button>';
      }).join('') + '</div><p class="nld-hint">ক্রম: একা · শুরুতে · মাঝে · শেষে</p>';
      $$('.nld-cell', box).forEach(function (b) { b.onclick = function () { var k = +b.getAttribute('data-k'); guide([{ cell: b, ar: ARNAMES[k], gap: 0 }]); }; });
    }
    if (l.muq) {
      box.innerHTML = '<div class="nld-muq">' + MUQ.map(function (m, i) { return '<button class="nld-cell" data-i="' + i + '"><span class="nld-ar">' + m[0] + '</span><small>' + m[1] + ' · সূরা ' + bn(m[2]) + '</small></button>'; }).join('') + '</div>';
      $$('.nld-cell', box).forEach(function (b) { b.onclick = function () { var m = MUQ[+b.getAttribute('data-i')]; guide([{ cell: b, url: ayahUrl(m[2], m[3]) }]); }; });
    }
    if (l.drill) {
      var rows = drillCells(l.drill);
      box.innerHTML = '<div class="nld-gbar"><button class="nld-gplay">▶ গাইডসহ শুনুন</button><button class="nld-gstop">⏹ থামাও</button></div><div class="nld-drill">' + rows.map(function (r, ri) {
        return '<div class="nld-drow" dir="rtl">' + r.map(function (c, ci) { return '<button class="nld-cell" data-r="' + ri + '" data-c="' + ci + '"><span class="nld-ar">' + c[0] + '</span><small>' + c[1] + '</small></button>'; }).join('') + '</div>';
      }).join('') + '</div>';
      var cellOf = function (ri, ci) { return $('.nld-cell[data-r="' + ri + '"][data-c="' + ci + '"]', box); };
      $$('.nld-cell', box).forEach(function (b) { b.onclick = function () { var c = rows[+b.getAttribute('data-r')][+b.getAttribute('data-c')]; guide([{ cell: b, ar: c[0], gap: 0 }]); }; });
      $('.nld-gstop', box).onclick = function () { guideToken = null; stopAll(); };
      $('.nld-gplay', box).onclick = function () {
        var body = ($('.nld-lbody', v) || {}).innerText || ''; body = body.replace(/[؀-ۿࢠ-ࣿ]+/g, ' ');
        var steps = [{ bn: body, gap: 500 }, { bn: l.say, gap: 700 }];
        rows.forEach(function (r, ri) { r.forEach(function (c, ci) { steps.push({ cell: cellOf(ri, ci), ar: c[0], gap: 900 }); }); });
        guide(steps);
      };
    }
  }
  // spoken walk-through of a rule lesson: say where the rule is, then the qari reads that word
  function ruleGuide(l, btn) {
    var steps = [{ bn: $('.nld-lbody').innerText.replace(/[؀-ۿࢠ-ࣿ]+/g, ' '), gap: 600 }];
    var jobs = (l.guide || []).map(function (g) { var p = g[1].split(':'); return verseWords(+p[0], +p[1]).then(function (ws) { return { g: g, w: ws[g[2] - 1] }; }).catch(function () { return null; }); });
    btn.textContent = '⏳ তৈরি হচ্ছে…';
    Promise.all(jobs).then(function (rs) {
      btn.textContent = '🗣️ নিয়মসহ গাইড শোনাও';
      rs.forEach(function (r) { if (r && r.w) { steps.push({ bn: r.g[0], gap: 300 }); steps.push({ url: r.w.audio, gap: 900 }); } });
      guide(steps);
    });
  }

  /* ------------------------------------------------------------ Ampara and the whole Quran, in order */
  function viewAmpara(v) {
    var p = store('practice') || {}, done = store('amDone') || {};
    var list = []; for (var s = 78; s <= 114; s++) list.push(s);
    var cnt = list.filter(function (s) { return done[s]; }).length;
    v.innerHTML = '<button class="nld-back">← শিখুন</button><h3>ধাপ ২: আমপারা (৩০তম পারা)</h3><div class="nld-prog"><div style="width:' + Math.round(cnt / list.length * 100) + '%"></div></div><p class="nld-hint">' + bn(cnt) + '/' + bn(list.length) + ' সূরা শেষ। ছোট সূরা (১১৪ নং) থেকে শুরু করুন। "শব্দে শব্দে" চাপলে প্রতিটা শব্দ শুনে নিজে বলবেন; "পুরো তিলাওয়াত" চাপলে ক্বারীর সাথে সাথে শব্দ হাইলাইট হবে।</p><div class="nld-amlist">' +
      list.slice().reverse().map(function (s) { var nm = (SURAHS && SURAHS[s - 1]) ? SURAHS[s - 1][2] || SURAHS[s - 1][1] : ''; return '<div class="nld-am"><b>' + (done[s] ? '✅ ' : '') + bn(s) + '. ' + esc(nm) + '</b><small>' + bn(COUNTS[s - 1]) + ' আয়াত</small><span><button data-pw="' + s + '">🐢 শব্দে শব্দে</button><button data-pf="' + s + '">▶ পুরো তিলাওয়াত</button><button data-pd="' + s + '">✅</button></span></div>'; }).join('') + '</div><div class="nld-prout"></div>';
    $('.nld-back', v).onclick = function () { stopAll(); viewLearn(v); };
    $$('[data-pw]', v).forEach(function (b) { b.onclick = function () { var o = $('.nld-prout', v); practice(o, +b.getAttribute('data-pw')); try { o.scrollIntoView({ behavior: 'smooth' }); } catch (e) {} }; });
    $$('[data-pf]', v).forEach(function (b) { b.onclick = function () { run({ kind: 'surah', surah: +b.getAttribute('data-pf') }); }; });
    $$('[data-pd]', v).forEach(function (b) { b.onclick = function () { var d = store('amDone') || {}; d[b.getAttribute('data-pd')] = Date.now(); store('amDone', d); viewAmpara(v); }; });
  }

  (function () { var at = 1; QAIDA.forEach(function (x, k) { LESSONS.splice(at + k, 0, x); }); LESSONS.forEach(function (l) { l.t = l.t.replace(/^[০-৯0-9]+\.\s*/, ''); l.guide = LESSON_GUIDE[l.id]; }); })();
  function progress() { return store('progress') || {}; }
  function markDone(id) { var p = progress(); p[id] = Date.now(); store('progress', p); }

  function viewLearn(v, arg) {
    if (arg && arg.lesson) return viewLesson(v, arg.lesson);
    if (arg && arg.ampara) return viewAmpara(v);
    var p = progress();
    var done = LESSONS.filter(function (l) { return p[l.id]; }).length;
    var am = store('amDone') || {}, amN = Object.keys(am).length;
    v.innerHTML = '<div class="nld-steps"><div class="nld-step on"><b>ধাপ ১</b>কায়দা<small>' + bn(done) + '/' + bn(LESSONS.length) + '</small></div><div class="nld-step" data-go="ampara"><b>ধাপ ২</b>আমপারা<small>' + bn(amN) + '/৩৭</small></div><div class="nld-step" data-go="quran"><b>ধাপ ৩</b>পূর্ণ কুরআন<small>১১৪ সূরা</small></div></div>' +
      '<h3>ধাপ ১: নূরানী কায়দা ও তাজবীদ</h3><div class="nld-prog"><div style="width:' + Math.round(done / LESSONS.length * 100) + '%"></div></div><p class="nld-hint">' + bn(done) + '/' + bn(LESSONS.length) + ' পাঠ শেষ। ক্রম অনুযায়ী এগোন: হরফ → হরকত → তানভীন → মাদ্দ → সাকিন → তাশদীদ → তাজবীদের নিয়ম। প্রতিটা পাঠে বাংলা ভয়েস গাইড, আরবি উচ্চারণ আর ক্বারীর কণ্ঠে উদাহরণ আছে।</p>' +
      '<div class="nld-lessons">' + LESSONS.map(function (l, i) { return '<button data-l="' + l.id + '">' + (p[l.id] ? '✅ ' : '⬜ ') + bn(i + 1) + '. ' + l.t + '</button>'; }).join('') + '</div>' +
      '<div class="nld-stepnext"><button data-go="ampara">📗 ধাপ ২: আমপারা শুরু করুন ›</button><button data-go="quran">📖 ধাপ ৩: পূর্ণ কুরআন ›</button></div>' +
      '<h4>🎧 প্র্যাকটিস: ছোট সূরা শব্দে শব্দে</h4><p class="nld-hint">প্রতিটা শব্দ শুনুন, তারপর নিজে বলুন। "সব শব্দ ধীরে" চাপলে পুরো আয়াত শব্দ ধরে ধরে বাজবে, প্রতি শব্দের পর আপনার বলার জন্য একটু বিরতি থাকবে।</p><div class="nld-lessons">' + PRACTICE.map(function (x) { return '<button data-pr="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="nld-prout"></div>';
    $$('[data-l]', v).forEach(function (b) { b.onclick = function () { viewLesson(v, b.getAttribute('data-l')); }; });
    $$('[data-go]', v).forEach(function (b) { b.onclick = function () { stopAll(); if (b.getAttribute('data-go') === 'ampara') viewAmpara(v); else open('quran'); }; });
    $$('[data-pr]', v).forEach(function (b) { b.onclick = function () { practice($('.nld-prout', v), +b.getAttribute('data-pr')); }; });
  }

  function viewLesson(v, id) {
    var i = LESSONS.map(function (l) { return l.id; }).indexOf(id), l = LESSONS[i];
    v.innerHTML = '<button class="nld-back">← সব পাঠ</button><h3>' + bn(i + 1) + '. ' + l.t + '</h3><div class="nld-lbody">' + l.body + '</div>' +
      '<div class="nld-gbar"><button class="nld-sayl">🗣️ ' + (l.guide ? 'নিয়মসহ গাইড শোনাও' : 'গাইডটা বাংলায় পড়ে শোনাও') + '</button><button class="nld-gstop2">⏹ থামাও</button></div>' +
      ((l.forms || l.muq || l.drill) ? '<div class="nld-qaida"></div>' : '') +
      (l.letters ? '<div class="nld-letters" dir="rtl">' + LETTERS.map(function (x, k) { return '<button data-k="' + k + '" class="' + (HEAVY.indexOf(x[0]) >= 0 ? 'heavy' : '') + '"><span class="nld-ar">' + x[0] + '</span><small>' + x[1] + '</small></button>'; }).join('') + '</div><div class="nld-linfo"></div>' : '') +
      (l.ex ? '<h4>🎧 কুরআন থেকে উদাহরণ (শব্দে চাপুন)</h4><div class="nld-ex"></div>' : '') +
      '<div class="nld-lnav">' + (i > 0 ? '<button data-ln="' + LESSONS[i - 1].id + '">‹ আগের পাঠ</button>' : '') + '<button class="nld-done">✅ পাঠ শেষ</button>' + (i < LESSONS.length - 1 ? '<button data-ln="' + LESSONS[i + 1].id + '">পরের পাঠ ›</button>' : '<button data-quiz="1">কুইজ দিন ›</button>') + '</div>';
    $('.nld-back', v).onclick = function () { guideToken = null; stopAll(); viewLearn(v); };
    $('.nld-sayl', v).onclick = function () { if (l.guide) ruleGuide(l, this); else guide([{ bn: $('.nld-lbody', v).innerText.replace(/[؀-ۿࢠ-ࣿ]+/g, ' ') }]); };
    $('.nld-gstop2', v).onclick = function () { guideToken = null; stopAll(); };
    qaidaBlock(v, l);
    $('.nld-done', v).onclick = function () { markDone(l.id); this.textContent = '✅ শেষ হিসেবে রাখা হলো'; };
    $$('[data-ln]', v).forEach(function (b) { b.onclick = function () { guideToken = null; stopAll(); viewLesson(v, b.getAttribute('data-ln')); }; });
    var q = $('[data-quiz]', v); if (q) q.onclick = function () { open('quiz'); };
    if (l.letters) $$('[data-k]', v).forEach(function (b) { b.onclick = function () { letterInfo($('.nld-linfo', v), LETTERS[+b.getAttribute('data-k')]); }; });
    if (l.ex) exampleWords($('.nld-ex', v), l.ex);
  }

  // Finds a real Quran word that starts with (or contains) the letter, from verses fetched live, and plays it
  var LETTER_SOURCES = ['1:1', '1:2', '1:4', '1:5', '1:6', '1:7', '112:1', '112:2', '112:3', '112:4', '113:1', '113:2', '113:3', '113:4', '113:5', '114:1', '114:2', '114:4', '114:5', '114:6', '2:255', '108:1', '108:2', '108:3', '103:1', '103:2', '103:3', '105:1', '105:2', '105:3', '105:4', '105:5'];
  function baseLetters(w) { return String(w).replace(/[ً-ٰٟۖ-ࣰۭ-ࣿـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/ة/g, 'ه'); }
  function letterInfo(box, x) {
    box.innerHTML = '<div class="nld-lcard"><span class="nld-ar big">' + x[0] + '</span><div><b>' + x[1] + '</b> · ' + ZONES[x[2]] + (HEAVY.indexOf(x[0]) >= 0 ? ' · <i>মোটা হরফ</i>' : '') + (QALQALA.indexOf(x[0]) >= 0 ? ' · <i>ক্বলক্বলার হরফ</i>' : '') + '<p>' + x[3] + '</p><div class="nld-lex">কুরআনের শব্দ খোঁজা হচ্ছে…</div></div></div>';
    var ki = LETTERS.indexOf(x); guide([{ ar: ARNAMES[ki], gap: 400 }, { ar: (x[0] === 'ء' ? 'أ' : x[0] === 'ا' ? 'أ' : x[0]) + 'َ ' + (x[0] === 'ا' || x[0] === 'ء' ? 'إ' : x[0]) + 'ِ ' + (x[0] === 'ا' || x[0] === 'ء' ? 'أ' : x[0]) + 'ُ', gap: 300 }, { bn: x[1] + '। ' + x[3] }]);
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

  /* ------------------------------------------------------------ word broken into letters (হরফ ভেঙে ভেঙে) */
  var MARKS = /[ً-ٰٟۖ-ۭٓ-ٕ]/;
  function clusters(w) {
    var out = [];
    Array.from(String(w)).forEach(function (ch) {
      if (MARKS.test(ch) && out.length) out[out.length - 1] += ch;
      else if (ch !== 'ـ' && ch.trim()) out.push(ch);
    });
    return out;
  }
  function clusterBn(cl, prev) {
    var base = cl.charAt(0), b = baseLetters(base) || base, k;
    if ('ٱ' === base) return prev ? '' : 'আ';            // hamzat al-wasl: silent in the middle
    k = BNC[b === 'ة' ? 'ه' : b]; if (b === 'ة') k = 'ত'; if (k == null) k = '';
    if (b === 'و') k = 'ও'; if (b === 'ي' || b === 'ى') k = 'ই';
    var v = /َ|ٰ/.test(cl) ? 'া' : /ِ/.test(cl) ? 'ি' : /ُ/.test(cl) ? 'ু' : /ً/.test(cl) ? 'ান' : /ٍ/.test(cl) ? 'িন' : /ٌ/.test(cl) ? 'ুন' : /[ْۡ]/.test(cl) ? '্' : '';
    if (!k) { var full = { 'া': 'আ', 'ি': 'ই', 'ু': 'উ', 'ান': 'আন', 'িন': 'ইন', 'ুন': 'উন', '্': '', '': (b === 'ا' || b === 'ى' ? '—' : 'আ') }; return full[v]; }
    if (!v && (b === 'ا' || b === 'و' || b === 'ي' || b === 'ى')) return '—'; // madd letter: stretch the sound before it
    var dbl = /ّ/.test(cl) ? k + '্' : '';
    if (v === '্' && (b === 'و' || b === 'ي')) return k;
    return dbl + k + (v === '্' ? '্' : v);
  }
  function spellPanel(box, w) {
    var cls = clusters(w.ar);
    box.innerHTML = '<div class="nld-spell"><div class="nld-spell-w nld-ar" dir="rtl">' + esc(w.ar) + '</div>' + (w.bn ? '<small>' + esc(w.bn) + (w.tl ? ' · ' + esc(w.tl) : '') + '</small>' : '') +
      '<div class="nld-spell-row" dir="rtl">' + cls.map(function (c, i) { return '<button class="nld-cell" data-sp="' + i + '"><span class="nld-ar">' + esc(c) + '</span><small>' + (clusterBn(c, i > 0) || '·') + '</small></button>'; }).join('') + '</div>' +
      '<div class="nld-gbar"><button class="nld-gplay">🔤 হরফ ভেঙে ভেঙে শুনুন</button><button data-full="1">▶ পুরো শব্দ (ক্বারী)</button><button class="nld-gstop">⏹</button></div></div>';
    var cells = $$('[data-sp]', box);
    cells.forEach(function (b) { b.onclick = function () { guide([{ cell: b, ar: cls[+b.getAttribute('data-sp')], gap: 0 }]); }; });
    $('[data-full]', box).onclick = function () { guide([{ url: w.audio }]); };
    $('.nld-gstop', box).onclick = function () { guideToken = null; stopAll(); };
    $('.nld-gplay', box).onclick = function () {
      var steps = [{ bn: 'হরফ ভেঙে ভেঙে পড়ি, শুনুন আর সাথে বলুন।', gap: 400 }];
      cls.forEach(function (c, i) { if (clusterBn(c, i > 0) !== '') steps.push({ cell: cells[i], ar: c, gap: 700 }); });
      steps.push({ bn: 'এবার পুরো শব্দ একসাথে।', gap: 300 });
      if (w.audio) steps.push({ url: w.audio, gap: 600 }); else steps.push({ ar: w.ar });
      guide(steps);
    };
    try { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }
  function exampleWords(box, keys) {
    box.innerHTML = '';
    keys.forEach(function (key) {
      var p = key.split(':');
      var row = el('<div class="nld-exrow"><small>' + bn(key) + ' · শব্দে চাপলে শুনবেন, আর হরফ ভেঙে পড়া শিখবেন</small><div class="nld-wrow" dir="rtl"><span class="nld-load">…</span></div><div class="nld-spbox"></div></div>');
      box.appendChild(row);
      verseWords(+p[0], +p[1]).then(function (ws) {
        $('.nld-wrow', row).innerHTML = ws.map(function (w, i) { return '<button class="nld-w" data-i="' + i + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr">' + esc(w.bn || '') + '</small></button>'; }).join('');
        $$('.nld-w', row).forEach(function (b) { b.onclick = function () { var w = ws[+b.getAttribute('data-i')]; stopAll(); playUrl(w.audio); spellPanel($('.nld-spbox', row), w); }; });
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
          ws.map(function (w, j) { return '<button class="nld-w" data-v="' + i + '" data-j="' + j + '"><span class="nld-ar">' + esc(w.ar) + '</span><small dir="ltr">' + esc(w.tl || '') + '</small></button>'; }).join('') + '</div><div class="nld-spbox" data-spv="' + i + '"></div></div>';
      }).join('');
      bindControls(box);
      $$('.nld-w', box).forEach(function (b) { b.onclick = function () { var vi = b.getAttribute('data-v'), w = all[+vi][+b.getAttribute('data-j')]; stopAll(); playUrl(w.audio); spellPanel($('[data-spv="' + vi + '"]', box), w); }; });
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


  /* ------------------------------------------------------------ Namaz: times, timetable, azan */
  var AZAN_URL = 'https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3';
  // muezzin voices to choose from (one for all prayers, or a different one per prayer); 'ring' = phone alarm tone
  var AZANS = [['aaqib', 'আকিব আজিজ', AZAN_URL], ['makkah', 'মক্কা শরীফ', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Makkah.mp3'], ['alafasy', 'মিশারি আলাফাসি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Mishary%20Alafasi.mp3'], ['menshawy', 'মুহাম্মদ আল-মিনশাভি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Mohammad%20Almenshawy.mp3'], ['refaat', 'মুহাম্মদ রিফআত', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Mohammad%20Ref3at.mp3'], ['zahrani', 'মানসুর আজ-জাহরানি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Mansoor%20Az-Zahrani.mp3'], ['qatami', 'নাসির আল-কাতামি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Nasser%20Alqatami.mp3'], ['arkani', 'ইব্রাহিম আল-আরকানি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Ibrahim%20Al-Arkani.mp3'], ['hamathani', 'মাজেদ আল-হামাদানি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Majed%20Al-hamathani.mp3'], ['malki', 'হামদান আল-মালিকি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Hamdan%20Almalki.mp3'], ['deghreri', 'হামাদ আদ-দাগরিরি', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Hamad%20Deghreri.mp3'], ['khatba', 'সুহাইব খাতবা', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Suhaib%20Khatba.mp3'], ['basit', 'আবদুল বাসিত', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Abed%20Albase6.mp3'], ['nuyne', 'আহমদ নুয়াইনা', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Ahmad%20Nuyne3.mp3'], ['fajr', 'ফজরের আযান (মালেক শাবায়ে)', 'https://raw.githubusercontent.com/abodehq/Athan-MP3/master/Sounds/Athan%20Al-fajer%20-%20Malek%20chebae.mp3'], ['ring', 'শুধু অ্যালার্মের শব্দ', 'ring']];
  function azanFor(c, p) { return (c.sounds && c.sounds[p]) || c.sound || AZAN_URL; }
  var AZAN_CREDIT = 'আযানের অডিও: Aaqib Azeez, Wikimedia Commons (CC BY-SA 4.0)';
  // all 64 districts of Bangladesh (district town), with division
  var CITIES = 'ঢাকা,23.8103,90.4125,ঢাকা;গাজীপুর,24.0023,90.4264,ঢাকা;নারায়ণগঞ্জ,23.6238,90.5000,ঢাকা;নরসিংদী,23.9322,90.7151,ঢাকা;মানিকগঞ্জ,23.8617,90.0003,ঢাকা;মুন্সিগঞ্জ,23.5422,90.5305,ঢাকা;টাঙ্গাইল,24.2513,89.9167,ঢাকা;কিশোরগঞ্জ,24.4449,90.7766,ঢাকা;ফরিদপুর,23.6070,89.8429,ঢাকা;গোপালগঞ্জ,23.0050,89.8266,ঢাকা;মাদারীপুর,23.1641,90.1897,ঢাকা;শরীয়তপুর,23.2423,90.4348,ঢাকা;রাজবাড়ী,23.7574,89.6444,ঢাকা;চট্টগ্রাম,22.3569,91.7832,চট্টগ্রাম;কক্সবাজার,21.4272,92.0058,চট্টগ্রাম;কুমিল্লা,23.4607,91.1809,চট্টগ্রাম;ফেনী,23.0159,91.3976,চট্টগ্রাম;নোয়াখালী,22.8696,91.0995,চট্টগ্রাম;লক্ষ্মীপুর,22.9425,90.8412,চট্টগ্রাম;চাঁদপুর,23.2333,90.6713,চট্টগ্রাম;ব্রাহ্মণবাড়িয়া,23.9571,91.1115,চট্টগ্রাম;রাঙ্গামাটি,22.6533,92.1750,চট্টগ্রাম;খাগড়াছড়ি,23.1193,91.9847,চট্টগ্রাম;বান্দরবান,22.1953,92.2184,চট্টগ্রাম;রাজশাহী,24.3745,88.6042,রাজশাহী;নাটোর,24.4206,89.0003,রাজশাহী;নওগাঁ,24.7936,88.9318,রাজশাহী;চাঁপাইনবাবগঞ্জ,24.5965,88.2776,রাজশাহী;পাবনা,24.0064,89.2372,রাজশাহী;সিরাজগঞ্জ,24.4534,89.7007,রাজশাহী;বগুড়া,24.8465,89.3773,রাজশাহী;জয়পুরহাট,25.0968,89.0227,রাজশাহী;খুলনা,22.8456,89.5403,খুলনা;যশোর,23.1664,89.2081,খুলনা;সাতক্ষীরা,22.7185,89.0705,খুলনা;বাগেরহাট,22.6516,89.7859,খুলনা;কুষ্টিয়া,23.9013,89.1204,খুলনা;ঝিনাইদহ,23.5450,89.1726,খুলনা;মাগুরা,23.4855,89.4198,খুলনা;নড়াইল,23.1725,89.5127,খুলনা;চুয়াডাঙ্গা,23.6402,88.8418,খুলনা;মেহেরপুর,23.7622,88.6318,খুলনা;বরিশাল,22.7010,90.3535,বরিশাল;পটুয়াখালী,22.3596,90.3299,বরিশাল;ভোলা,22.6859,90.6482,বরিশাল;পিরোজপুর,22.5791,89.9759,বরিশাল;ঝালকাঠি,22.6406,90.1987,বরিশাল;বরগুনা,22.1591,90.1262,বরিশাল;সিলেট,24.8949,91.8687,সিলেট;মৌলভীবাজার,24.4829,91.7774,সিলেট;হবিগঞ্জ,24.3745,91.4155,সিলেট;সুনামগঞ্জ,25.0658,91.3950,সিলেট;রংপুর,25.7439,89.2752,রংপুর;দিনাজপুর,25.6217,88.6354,রংপুর;ঠাকুরগাঁও,26.0336,88.4616,রংপুর;পঞ্চগড়,26.3411,88.5542,রংপুর;নীলফামারী,25.9310,88.8560,রংপুর;লালমনিরহাট,25.9923,89.2847,রংপুর;কুড়িগ্রাম,25.8072,89.6295,রংপুর;গাইবান্ধা,25.3288,89.5286,রংপুর;ময়মনসিংহ,24.7471,90.4203,ময়মনসিংহ;জামালপুর,24.9375,89.9372,ময়মনসিংহ;শেরপুর,25.0205,90.0153,ময়মনসিংহ;নেত্রকোনা,24.8709,90.7279,ময়মনসিংহ'.split(';').map(function (r) { r = r.split(','); return [r[0], +r[1], +r[2], r[3]]; });
  var PNAMES = { fajr: 'ফজর', sunrise: 'সূর্যোদয়', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'ইশা' };
  var FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  function pcfg() {
    var c = Object.assign({ city: 'ঢাকা', lat: 23.8103, lng: 90.4125, method: 'karachi', asr: 'hanafi', offsets: {}, on: {}, sounds: {}, sound: AZAN_URL }, store('prayer') || {});
    c.sound = c.sound || AZAN_URL;
    return c;
  }
  function savePcfg(c) {
    store('prayer', c);
    var N = window.NexoraLifeNative;
    try { if (N && N.azanConfig) N.azanConfig(JSON.stringify({ lat: c.lat, lng: c.lng, method: c.method, asr: c.asr, offsets: c.offsets, on: c.on, sound: c.sound, sounds: c.sounds || {}, label: c.city })); } catch (e) {}
    webAzan();
  }
  function tzOf(d) { return -d.getTimezoneOffset() / 60; }
  function dayTimes(d, c) { return window.NexoraPrayer ? NexoraPrayer.times(d, c.lat, c.lng, tzOf(d), c) : null; }
  function hm(h) { return window.NexoraPrayer ? NexoraPrayer.fmt(h, true) : ''; }
  var HMONTHS = ['মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'];
  function hijri(d) {
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
      var g = function (t) { return parseInt((p.filter(function (x) { return x.type === t; })[0] || {}).value, 10); };
      var m = g('month');
      if (!(m >= 1 && m <= 12)) return '';
      return bn(g('day')) + ' ' + HMONTHS[m - 1] + ' ' + bn(g('year')) + ' হিজরি';
    } catch (e) { return ''; }
  }
  /** "রাজশাহী, রাজশাহী বিভাগ, বাংলাদেশ" from coordinates (BigDataCloud, free, no key); nearest big city if offline. */
  function placeName(lat, lng) {
    var near = CITIES.map(function (x) { return [x[0], Math.pow(x[1] - lat, 2) + Math.pow(x[2] - lng, 2)]; }).sort(function (a, b) { return a[1] - b[1]; })[0];
    var guess = near && near[1] < 0.6 ? near[0] + ' (কাছাকাছি)' : 'আমার লোকেশন';
    return fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lng + '&localityLanguage=bn').then(function (r) { return r.json(); }).then(function (j) {
      var parts = [j.city || j.locality, j.principalSubdivision, j.countryName].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
      return parts.length ? parts.join(', ') : guess;
    }).catch(function () { return guess; });
  }
  function nextPrayer(c) {
    var now = new Date();
    for (var k = 0; k < 2; k++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k), t = dayTimes(d, c);
      for (var i = 0; i < FIVE.length; i++) { var at = NexoraPrayer.toDate(d, t[FIVE[i]]); if (at > now) return { p: FIVE[i], at: at }; }
    }
    return null;
  }
  var tick = null;
  var PICON = { fajr: '🌄', sunrise: '🌅', dhuhr: '☀️', asr: '🌤️', maghrib: '🌇', isha: '🌙' };
  function left(ms) {
    var m = Math.max(0, Math.round(ms / 60000)), H = Math.floor(m / 60), M = m % 60;
    return (H ? bn(H) + ' ঘণ্টা ' : '') + bn(M) + ' মিনিট';
  }
  /** The prayer whose time is running now (with when it ends), and the next one. */
  function waqtNow(c) {
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var y = new Date(today.getTime() - 864e5), tt = dayTimes(today, c), ty = dayTimes(y, c), tn = dayTimes(new Date(today.getTime() + 864e5), c);
    var D = function (d, h) { return NexoraPrayer.toDate(d, h); };
    var spans = [
      ['isha', D(y, ty.isha), D(today, tt.fajr)],
      ['fajr', D(today, tt.fajr), D(today, tt.sunrise)],
      ['dhuhr', D(today, tt.dhuhr), D(today, tt.asr)],
      ['asr', D(today, tt.asr), D(today, tt.maghrib)],
      ['maghrib', D(today, tt.maghrib), D(today, tt.isha)],
      ['isha', D(today, tt.isha), D(new Date(today.getTime() + 864e5), tn.fajr)]
    ];
    var cur = spans.filter(function (s) { return now >= s[1] && now < s[2]; })[0] || null;
    var nx = nextPrayer(c);
    return { cur: cur, next: nx, now: now };
  }
  /* ------------------------------------------------------------ Home dashboard */
  var BMONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
  var SEASONS = ['গ্রীষ্মকাল', 'বর্ষাকাল', 'শরৎকাল', 'হেমন্তকাল', 'শীতকাল', 'বসন্তকাল'];
  /** Bangladesh's revised Bangla calendar (from 1426): 1 Boishakh = 14 April; Boishakh–Ashwin 31 days, Kartik–Magh 30, Falgun 29 (30 in a leap year), Chaitra 30. */
  function bangla(d) {
    var y = d.getFullYear(), start = new Date(y, 3, 14);
    if (d < start) { y--; start = new Date(y, 3, 14); }
    var leap = function (g) { return (g % 4 === 0 && g % 100 !== 0) || g % 400 === 0; };
    var len = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap(y + 1) ? 30 : 29, 30];
    var n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5), m = 0;
    while (m < 11 && n >= len[m]) { n -= len[m]; m++; }
    return { day: n + 1, month: m, year: y - 593, season: SEASONS[Math.floor(m / 2)] };
  }
  function nowH(d) { return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
  function dur(h) { var m = Math.max(0, Math.round(h * 60)), hh = Math.floor(m / 60), mm = m % 60; return (hh ? bn(hh) + ' ঘণ্টা ' : '') + bn(mm) + ' মিনিট'; }
  /** The prayer we are in now, its start/end (hours, may run past midnight) and the next one. */
  function currentWaqt(t, h) {
    var segs = [['fajr', t.fajr, t.sunrise], ['ishraq', t.sunrise, t.dhuhr], ['dhuhr', t.dhuhr, t.asr], ['asr', t.asr, t.maghrib], ['maghrib', t.maghrib, t.isha], ['isha', t.isha, t.fajr + 24]];
    if (h < t.fajr) h += 24;
    for (var i = 0; i < segs.length; i++) if (h >= segs[i][1] && h < segs[i][2]) return { p: segs[i][0], from: segs[i][1], to: segs[i][2], h: h, next: segs[(i + 1) % segs.length][0] === 'ishraq' ? 'dhuhr' : segs[(i + 1) % segs.length][0] };
    return { p: 'isha', from: t.isha, to: t.fajr + 24, h: h, next: 'fajr' };
  }
  var homeTick = null;
  function viewHome(v) {
    if (!window.NexoraPrayer) { loading(v); setTimeout(function () { if (state.tab === 'home') viewHome(v); }, 600); return; }
    var c = pcfg(), now = new Date(), t = dayTimes(now, c), h = nowH(now), w = currentWaqt(t, h), b = bangla(now);
    var city = String(c.city || '').split(',')[0].replace(' (কাছাকাছি)', '');
    var name = w.p === 'ishraq' ? 'ইশরাক / চাশত' : PNAMES[w.p];
    var prog = Math.max(0, Math.min(1, (w.h - w.from) / (w.to - w.from)));
    // sun (day) or moon (night) on an arc from sunrise to sunset
    var day = h >= t.sunrise && h < t.maghrib;
    var f = day ? (h - t.sunrise) / (t.maghrib - t.sunrise) : ((h < t.sunrise ? h + 24 : h) - t.maghrib) / (t.sunrise + 24 - t.maghrib);
    f = Math.max(0, Math.min(1, f));
    var ang = Math.PI * (1 - f), cx = 200 + 170 * Math.cos(ang), cy = 120 - 95 * Math.sin(ang);
    var right = w.p === 'isha' ? ['তাহাজ্জুদ শেষ', t.fajr] : w.p === 'ishraq' ? ['যোহর শুরু', t.dhuhr] : ['পরের: ' + PNAMES[w.next], t[w.next]];
    v.innerHTML =
      '<div class="nlh-top"><div class="nlh-chip">📅 ' + now.toLocaleDateString('bn-BD', { month: 'long', day: 'numeric' }) + '</div><button class="nlh-chip nlh-loc">📍 ' + esc(city) + ' ▾</button></div>' +
      '<div class="nlh-hello"><small>আসসালামু আলাইকুম</small><b>' + (h < 12 ? 'শুভ সকাল' : h < 17 ? 'শুভ দুপুর' : h < 19 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি') + '</b></div>' +
      '<div class="nlh-card nlh-cal"><b>' + (hijri(now) || '') + ' ' + (day ? '☀️' : '🌙') + '</b><span>' + now.toLocaleDateString('bn-BD', { weekday: 'long' }) + ', ' + bn(b.day) + ' ' + BMONTHS[b.month] + ' ' + bn(b.year) + ' বঙ্গাব্দ, ' + b.season + '</span></div>' +
      '<div class="nlh-card nlh-sun ' + (day ? 'is-day' : 'is-night') + '"><svg viewBox="0 0 400 140" class="nlh-arc" aria-hidden="true">' +
        '<defs><linearGradient id="nlhg" x1="0" x2="1"><stop offset="0" stop-color="#fdba74" stop-opacity=".55"/><stop offset="1" stop-color="#fde68a" stop-opacity=".15"/></linearGradient></defs>' +
        '<path d="M30 120 Q30 120 30 120 A170 95 0 0 1 370 120" fill="none" stroke="#f59e0b" stroke-opacity=".45" stroke-width="2" stroke-dasharray="5 6"/>' +
        '<path d="M30 120 A170 95 0 0 1 ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' L' + cx.toFixed(1) + ' 120 Z" fill="url(#nlhg)"/>' +
        '<g class="nlh-mosque" fill="#0f766e" fill-opacity=".07"><path d="M120 120v-30a80 80 0 0 1 160 0v30z"/><rect x="88" y="62" width="10" height="58"/><rect x="302" y="62" width="10" height="58"/><circle cx="93" cy="58" r="7"/><circle cx="307" cy="58" r="7"/></g>' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="13" fill="' + (day ? '#facc15' : '#fde68a') + '" stroke="#fff" stroke-width="3"/>' + (day ? '' : '<circle cx="' + (cx + 5).toFixed(1) + '" cy="' + (cy - 4).toFixed(1) + '" r="10" fill="#fff"/>') +
      '</svg>' +
        '<div class="nlh-now"><div><small>এখন</small><b>' + name + ' ' + hm(w.from % 24) + '</b></div><div class="nlh-sep"></div><div><small>' + right[0] + '</small><b>' + hm(right[1]) + '</b></div></div>' +
        '<div class="nlh-sunrow"><span>🌅 ' + hm(t.sunrise) + '</span><span class="nlh-clock">' + now.toLocaleTimeString('bn-BD', { hour: 'numeric', minute: '2-digit' }) + '</span><span>🌇 ' + hm(t.maghrib) + '</span></div>' +
        '<div class="nlh-waqt"><div class="nlh-wrow"><b>' + name + '</b><span>' + hm(w.from % 24) + ' – ' + hm(w.to % 24) + '</span></div><div class="nlh-bar"><i style="width:' + Math.round(prog * 100) + '%"></i></div><div class="nlh-wrow"><span class="nlh-live">● চলমান</span><span>' + dur(w.to - w.h) + ' বাকি</span></div></div>' +
      '</div>' +
      '<div class="nlh-times">' + FIVE.map(function (p) { return '<div class="' + (p === w.p ? 'on' : p === w.next ? 'nx' : '') + '"><small>' + PNAMES[p] + '</small><b>' + hm(t[p]) + '</b></div>'; }).join('') + '</div>' +
      '<div class="nlh-head"><span></span><b>ইলম ও আমল</b><button class="nlh-search" title="খুঁজুন">🔍</button></div>' +
      '<div class="nlh-grid">' + [['quran', '📖', 'কুরআন'], ['hadith', '📚', 'হাদীস'], ['namaz', '🕌', 'নামাযের সময়'], ['tilawat', '🎙️', 'তিলাওয়াত'], ['learn', '🎓', 'কুরআন শিক্ষা'], ['ampara', '📗', 'আমপারা'], ['azan', '📢', 'আযান'], ['quiz', '❓', 'কুইজ']].map(function (x) {
        return '<button data-home="' + x[0] + '"><span>' + x[1] + '</span>' + x[2] + '</button>';
      }).join('') + '</div>' +
      '<div class="nlh-head"><span class="o"></span><b>আজকের আয়াত</b></div><div class="nlh-card nlh-daily"></div>';
    $('.nlh-loc', v).onclick = function () { open('namaz'); setTimeout(function () { var lb = $('.nld-locbox'); if (lb) lb.hidden = false; }, 50); };
    $('.nlh-search', v).onclick = function () { var i = $('.nld-ask input', root); if (i) { i.focus(); i.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
    $$('[data-home]', v).forEach(function (x) { x.onclick = function () {
      var k = x.getAttribute('data-home');
      if (k === 'tilawat') { open('quran'); return; }
      if (k === 'ampara') { open('learn', { ampara: 1 }); return; }
      if (k === 'azan') { open('namaz'); setTimeout(function () { var e = $('.nld-voices'); if (e) e.scrollIntoView({ behavior: 'smooth' }); }, 80); return; }
      open(k);
    }; });
    // a different ayah every day, with meaning and audio
    var dn = Math.floor((now - new Date(2020, 0, 1)) / 864e5), pick = [[2, 255], [2, 286], [3, 8], [3, 139], [13, 28], [20, 114], [39, 53], [94, 5], [94, 6], [65, 3], [2, 152], [2, 186], [21, 87], [25, 74], [17, 24], [3, 173], [9, 51], [40, 60], [2, 201], [59, 22]][dn % 20];
    surahText(pick[0]).then(function (all) { var j = all[pick[1] - 1];
      var box = $('.nlh-daily', v); if (!box) return;
      box.innerHTML = '<div class="nld-ar" dir="rtl">' + esc(j.ar) + '</div><p>' + esc(j.bn) + '</p><div class="nlh-drow"><small>সূরা ' + bn(pick[0]) + ', আয়াত ' + bn(pick[1]) + '</small><button>▶ শুনুন</button></div>';
      $('button', box).onclick = function () { run({ kind: 'ayah', surah: pick[0], ayah: pick[1] }); };
    }).catch(function () { var box = $('.nlh-daily', v); if (box) box.parentNode.removeChild(box); });
    clearInterval(homeTick);
    homeTick = setInterval(function () { if (state.tab !== 'home' || !document.body.contains(v)) { clearInterval(homeTick); return; } viewHome(v); }, 60000);
  }
  function viewNamaz(v) {
    if (!window.NexoraPrayer) { v.innerHTML = '<div class="nld-load">লোড হচ্ছে…</div>'; setTimeout(function () { if (state.tab === 'namaz') viewNamaz(v); }, 600); return; }
    var c = pcfg(), now = new Date(), t = dayTimes(now, c);
    if (/^আমার লোকেশন/.test(c.city) && !viewNamaz._named) { viewNamaz._named = 1; placeName(c.lat, c.lng).then(function (name) { if (name !== c.city) { c.city = name; savePcfg(c); if (state.tab === 'namaz') viewNamaz(v); } }); }
    var isApp = !!(window.NexoraLifeNative && window.NexoraLifeNative.azanConfig);
    var ends = { fajr: t.sunrise, dhuhr: t.asr, asr: t.maghrib, maghrib: t.isha, isha: t.fajr };
    var anyOn = FIVE.some(function (p) { return c.on[p]; });
    v.innerHTML =
      '<div class="nld-hero"><div class="nld-hero-top"><button class="nld-loc">📍 ' + esc(c.city) + ' <span>▾ বদলান</span></button>' +
      '<div class="nld-date">' + now.toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' }) + (hijri(now) ? '<br>' + hijri(now) : '') + '</div></div>' +
      '<div class="nld-hero-main"></div></div>' +
      '<div class="nld-locbox" hidden><button class="nld-gps">📡 আমার বর্তমান লোকেশন ব্যবহার করুন</button><p class="nld-gpsmsg"></p><p>অথবা আপনার জেলা বেছে নিন:</p><input class="nld-csearch" placeholder="জেলার নাম লিখুন, যেমন রাজশাহী"><div class="nld-cities">' + CITIES.map(function (x, i) { return '<button data-ci="' + i + '" data-cn="' + x[0] + ' ' + x[3] + '">' + x[0] + '<small>' + x[3] + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="nld-sec-title"><b>আজকের নামাজের সময়</b><button class="nld-alloff">' + (anyOn ? '🔕 সব আযান বন্ধ' : '🔔 সব ওয়াক্তে আযান') + '</button></div>' +
      '<div class="nld-ptimes">' + FIVE.map(function (p) {
        return '<div class="nld-pt" data-p="' + p + '"><span class="nld-pic">' + PICON[p] + '</span><div class="nld-pname"><b>' + PNAMES[p] + '</b><small>শেষ ' + hm(ends[p]) + '</small></div><span class="nld-ptime">' + hm(t[p]) + '</span>' +
          '<label class="nld-sw" title="আযান অ্যালার্ম"><input type="checkbox" data-bell="' + p + '"' + (c.on[p] ? ' checked' : '') + '><span></span><em>আযান</em></label></div>';
      }).join('') + '</div>' +
      '<details class="nld-pset nld-voices" open><summary>🎵 আযানের কণ্ঠ বেছে নিন</summary><p class="nld-note">সব ওয়াক্তে একই কণ্ঠ, অথবা প্রতি ওয়াক্তে আলাদা — ▶ চেপে শুনে দেখুন।</p>' +
      '<div class="nld-vrow"><b>সব ওয়াক্ত</b>' + azanSelect('all', c.sound) + '<button data-prev="all">▶</button></div>' +
      FIVE.map(function (p) { return '<div class="nld-vrow"><span>' + PNAMES[p] + '</span>' + azanSelect(p, (c.sounds || {})[p] || '', true) + '<button data-prev="' + p + '">▶</button></div>'; }).join('') + '</details>' +
      '<button class="nld-test">▶ আযান শুনে দেখুন</button>' +
      '<p class="nld-note">' + (isApp ? '🔔 সুইচ চালু করলে সেই ওয়াক্তে ফোনে আযান বাজবে — অ্যাপ বন্ধ থাকলেও।' : '🔔 ওয়েবে আযান বাজে শুধু এই পেজ খোলা থাকলে; ফোনের অ্যাপে অ্যাপ বন্ধ থাকলেও বাজে।') + '</p>' +
      '<div class="nld-sec-title"><b>আজকের অন্যান্য সময়</b></div>' +
      '<div class="nld-extra"><div><span>🌅</span><small>সূর্যোদয়</small><b>' + hm(t.sunrise) + '</b></div><div><span>🍽️</span><small>সেহরির শেষ</small><b>' + hm(t.fajr) + '</b></div><div><span>🌇</span><small>ইফতার</small><b>' + hm(t.maghrib) + '</b></div><div><span>🌙</span><small>তাহাজ্জুদ শুরু</small><b>' + hm(t.lastThird) + '</b></div></div>' +
      '<div class="nld-forbid"><b>⛔ এই সময়ে নামাজ পড়া নিষেধ</b><div><span>সূর্যোদয়ের সময়</span><b>' + hm(t.sunrise) + ' – ' + hm(t.sunrise + 15 / 60) + '</b></div><div><span>ঠিক দুপুর</span><b>' + hm(t.dhuhr - 6 / 60) + ' – ' + hm(t.dhuhr) + '</b></div><div><span>সূর্যাস্তের সময়</span><b>' + hm(t.maghrib - 15 / 60) + ' – ' + hm(t.maghrib) + '</b></div></div>' +
      '<details class="nld-pset nld-mwrap"><summary>📅 এই মাসের সময়সূচি</summary><div class="nld-month"></div></details>' +
      '<details class="nld-pset"><summary>⚙️ হিসাবের নিয়ম ও মিনিট সমন্বয়</summary><p class="nld-note">সময় বের হয় সূর্যের অবস্থান থেকে। আপনার মসজিদের সাথে মিলিয়ে নিন; দরকার হলে মিনিট কম-বেশি করুন।</p><label>পদ্ধতি <select class="nld-meth">' + Object.keys(NexoraPrayer.METHODS).map(function (k) { return '<option value="' + k + '"' + (k === c.method ? ' selected' : '') + '>' + NexoraPrayer.METHODS[k].name + '</option>'; }).join('') + '</select></label>' +
      '<label>আসর <select class="nld-asr"><option value="hanafi"' + (c.asr !== 'shafi' ? ' selected' : '') + '>হানাফী (বাংলাদেশে প্রচলিত)</option><option value="shafi"' + (c.asr === 'shafi' ? ' selected' : '') + '>শাফেয়ী/অন্যান্য</option></select></label>' +
      '<div class="nld-offs">' + ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(function (p) { return '<label>' + PNAMES[p] + ' <input type="number" step="1" min="-30" max="30" data-off="' + p + '" value="' + (c.offsets[p] || 0) + '"> মিনিট</label>'; }).join('') + '</div></details>' +
      '<p class="nld-src">' + AZAN_CREDIT + '</p>';

    function paintHero() {
      var box = $('.nld-hero-main', v);
      if (!box || !document.body.contains(box)) { clearInterval(tick); return; }
      var w = waqtNow(c), html = '';
      if (w.cur) html += '<div class="nld-cur"><small>এখন চলছে</small><b>' + PICON[w.cur[0]] + ' ' + PNAMES[w.cur[0]] + '</b><span>শেষ হবে ' + hm(w.cur[2].getHours() + w.cur[2].getMinutes() / 60) + ' · আর ' + left(w.cur[2] - w.now) + ' বাকি</span></div>';
      else html += '<div class="nld-cur"><small>এখন</small><b>কোনো ফরজ নামাজের ওয়াক্ত নেই</b><span>সূর্যোদয়ের পর থেকে যোহর পর্যন্ত</span></div>';
      if (w.next) html += '<div class="nld-nx"><small>পরের নামাজ</small><b>' + PNAMES[w.next.p] + ' · ' + hm(w.next.at.getHours() + w.next.at.getMinutes() / 60) + '</b><span>' + left(w.next.at - w.now) + ' পর</span></div>';
      box.innerHTML = html;
      $$('.nld-pt', v).forEach(function (r) { var p = r.getAttribute('data-p'); r.classList.toggle('now', !!(w.cur && w.cur[0] === p)); r.classList.toggle('next', !!(w.next && w.next.p === p)); });
    }
    clearInterval(tick); paintHero(); tick = setInterval(paintHero, 20000);

    var y = now.getFullYear(), mo = now.getMonth(), days = new Date(y, mo + 1, 0).getDate(), rows = '';
    for (var d = 1; d <= days; d++) {
      var dd = new Date(y, mo, d), tt = dayTimes(dd, c);
      rows += '<tr' + (d === now.getDate() ? ' class="today"' : '') + '><td>' + bn(d) + '</td><td>' + hm(tt.fajr) + '</td><td>' + hm(tt.sunrise) + '</td><td>' + hm(tt.dhuhr) + '</td><td>' + hm(tt.asr) + '</td><td>' + hm(tt.maghrib) + '</td><td>' + hm(tt.isha) + '</td></tr>';
    }
    $('.nld-month', v).innerHTML = '<table><thead><tr><th>তারিখ</th><th>ফজর</th><th>সূর্যোদয়</th><th>যোহর</th><th>আসর</th><th>মাগরিব</th><th>ইশা</th></tr></thead><tbody>' + rows + '</tbody></table>';

    $('.nld-loc', v).onclick = function () { var b = $('.nld-locbox', v); b.hidden = !b.hidden; };
    $('.nld-csearch', v).oninput = function () { var q = this.value.trim(); $$('[data-cn]', v).forEach(function (b) { b.hidden = q && b.getAttribute('data-cn').indexOf(q) < 0; }); };
    $$('[data-ci]', v).forEach(function (b) { b.onclick = function () { var x = CITIES[+b.getAttribute('data-ci')]; c.city = x[0] + ', ' + x[3] + ' বিভাগ, বাংলাদেশ'; c.lat = x[1]; c.lng = x[2]; savePcfg(c); viewNamaz(v); }; });
    $('.nld-gps', v).onclick = function () {
      var b = this; b.textContent = '📡 লোকেশন নেওয়া হচ্ছে…';
      locWaiter = function (lat, lng, acc) {
        if (lat == null) { b.textContent = '📡 লোকেশন পাওয়া যায়নি — নিচে জেলা বেছে নিন'; return; }
        // a computer without GPS guesses from the internet line, often the provider's city (Dhaka): say so and keep the district list open
        var rough = acc && acc > 15000;
        c.city = 'আমার লোকেশন'; c.lat = lat; c.lng = lng; savePcfg(c);
        placeName(lat, lng).then(function (name) {
          c.city = name; savePcfg(c);
          if (state.tab !== 'namaz') return;
          viewNamaz(v);
          if (rough) { var lb = $('.nld-locbox', v); lb.hidden = false; $('.nld-gpsmsg', v).innerHTML = '⚠️ এই ডিভাইস সঠিক লোকেশন দেয়নি (আনুমানিক ' + bn(Math.round(acc / 1000)) + ' কিমি ভুল হতে পারে, ইন্টারনেট সংযোগ থেকে ধরা)। আপনি অন্য জেলায় থাকলে নিচ থেকে জেলা বেছে নিন, অথবা ফোনের অ্যাপে GPS চালু করে নিন।'; }
        });
      };
      var N = window.NexoraLifeNative;
      if (N && N.askLocation) N.askLocation();
      else if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function (p) { locWaiter(p.coords.latitude, p.coords.longitude, p.coords.accuracy); }, function () { locWaiter(null); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      else locWaiter(null);
    };
    $$('[data-bell]', v).forEach(function (b) { b.onchange = function () { c.on[b.getAttribute('data-bell')] = b.checked; savePcfg(c); $('.nld-alloff', v).textContent = FIVE.some(function (p) { return c.on[p]; }) ? '🔕 সব আযান বন্ধ' : '🔔 সব ওয়াক্তে আযান'; }; });
    $('.nld-alloff', v).onclick = function () { var any = FIVE.some(function (p) { return c.on[p]; }); FIVE.forEach(function (p) { c.on[p] = !any; }); savePcfg(c); viewNamaz(v); };
    $$('[data-voice]', v).forEach(function (sel) { sel.onchange = function () { var p = sel.getAttribute('data-voice'); if (p === 'all') c.sound = sel.value; else { c.sounds = c.sounds || {}; if (sel.value) c.sounds[p] = sel.value; else delete c.sounds[p]; } savePcfg(c); }; });
    var prevBtn = null;
    var resetPrev = function () { $$('[data-prev]', v).forEach(function (x) { x.textContent = '▶'; x.classList.remove('on'); }); };
    player.addEventListener('pause', function () { if (prevBtn) { resetPrev(); } });
    player.addEventListener('ended', function () { prevBtn = null; resetPrev(); });
    $$('[data-prev]', v).forEach(function (b) { b.onclick = function () {
      var p = b.getAttribute('data-prev'), u = p === 'all' ? c.sound : azanFor(c, p);
      if (u === 'ring') { var N = window.NexoraLifeNative; if (N && N.azanPreview) N.azanPreview('dhuhr', 'ring'); else toastOnce('এটা ফোনের অ্যালার্মের শব্দ — অ্যাপে বাজবে।'); return; }
      if (prevBtn === b && !player.paused) { player.pause(); return; }                 // ⏸ pause
      if (prevBtn === b && player.paused && player.src === u) { player.play(); b.textContent = '⏸'; b.classList.add('on'); return; } // ▶ resume
      stopAll(); prevBtn = b; playUrl(u); player.playbackRate = 1; resetPrev(); b.textContent = '⏸'; b.classList.add('on');
    }; });
    $('.nld-test', v).onclick = function () {
      var N = window.NexoraLifeNative;
      if (N && N.azanTest) { N.azanTest('dhuhr'); return; }
      stopAll(); playUrl(azanFor(c, 'dhuhr') === 'ring' ? AZAN_URL : azanFor(c, 'dhuhr')); player.playbackRate = 1;
    };
    $('.nld-meth', v).onchange = function () { c.method = this.value; savePcfg(c); viewNamaz(v); };
    $('.nld-asr', v).onchange = function () { c.asr = this.value; savePcfg(c); viewNamaz(v); };
    $$('[data-off]', v).forEach(function (i) { i.onchange = function () { c.offsets[i.getAttribute('data-off')] = +en(i.value) || 0; savePcfg(c); viewNamaz(v); var ps = $$('.nld-pset', v); ps[ps.length - 1].open = true; }; });
  }
  function azanSelect(p, cur, inherit) {
    return '<select data-voice="' + p + '">' + (inherit ? '<option value="">— উপরের মতো —</option>' : '') + AZANS.map(function (a) { return '<option value="' + esc(a[2]) + '"' + (a[2] === cur ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select>';
  }
  var locWaiter = function () {};

  // Web: azan while the hub is open (the app sets real alarms instead)
  var webTimer = null;
  function webAzan() {
    clearTimeout(webTimer);
    if (window.NexoraLifeNative && window.NexoraLifeNative.azanConfig) return;
    if (!window.NexoraPrayer) return;
    var c = pcfg();
    if (!FIVE.some(function (p) { return c.on[p]; })) return;
    var now = new Date(), best = null;
    for (var k = 0; k < 2 && !best; k++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k), t = dayTimes(d, c);
      FIVE.forEach(function (p) { var at = NexoraPrayer.toDate(d, t[p]); if (c.on[p] && at > now && (!best || at < best.at)) best = { p: p, at: at }; });
    }
    if (!best) return;
    webTimer = setTimeout(function () { stopAll(); var u = azanFor(c, best.p); if (u === 'ring') u = AZAN_URL; playUrl(u); player.playbackRate = 1; if (bar) $('.nld-bar-t', bar).textContent = '🕌 ' + PNAMES[best.p] + '-এর আযান'; setTimeout(webAzan, 60000); }, Math.min(best.at - now, 2147000000));
  }

  /* ------------------------------------------------------------ Settings */
  // Arabic fonts to choose from (Google Fonts); the choice is saved and used everywhere
  var AR_FONTS = [['Amiri Quran', 'আমিরি কুরআন (উসমানি)'], ['Scheherazade New', 'শাহরাজাদ (পরিষ্কার নাসখ)'], ['Noto Naskh Arabic', 'নোটো নাসখ'], ['Amiri', 'আমিরি'], ['Lateef', 'লতিফ (উপমহাদেশীয় ধাঁচ)'], ['Harmattan', 'হারমাত্তান (বড় ও স্পষ্ট)'], ['Noto Kufi Arabic', 'নোটো কুফি (আধুনিক)'], ['Reem Kufi', 'রিম কুফি']];
  function applyArFont() {
    var f = settings.arFont || 'Amiri Quran';
    if (f !== 'Amiri Quran' && !document.getElementById('nld-arf-' + f.replace(/\s/g, ''))) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.id = 'nld-arf-' + f.replace(/\s/g, '');
      l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;700&display=swap'; document.head.appendChild(l);
    }
    document.documentElement.style.setProperty('--nld-arfont', '"' + f + '"');
  }
  function viewSettings(v) {
    v.innerHTML = '<div class="nld-set"><label>বাংলা অর্থ (অনুবাদ) <select class="nld-tr">' + TRANSLATIONS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === settings.tr ? ' selected' : '') + '>' + t.name + '</option>'; }).join('') + '</select></label>' +
      '<label>আরবি ফন্ট <select class="nld-arf">' + AR_FONTS.map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === (settings.arFont || 'Amiri Quran') ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></label>' +
      '<div class="nld-arfprev nld-ar" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' +
      '<label>আরবি লেখার আকার <input type="range" min="20" max="48" value="' + settings.font + '" class="nld-font"> <span class="nld-ar nld-fprev" style="font-size:' + settings.font + 'px">ٱلْحَمْدُ لِلَّهِ</span></label>' +
      '<label class="nld-chk"><input type="checkbox" class="nld-st"' + (settings.showTr ? ' checked' : '') + '> আয়াতের নিচে বাংলা অর্থ দেখাও</label></div>' + controls() +
      '<p class="nld-src">কুরআনের লেখা ও অনুবাদ সরাসরি নির্ভরযোগ্য উৎস থেকে আসে (Tanzil উসমানি হাফস, বাদশাহ ফাহদ কুরআন কমপ্লেক্সের বাংলা অনুবাদ, মুহিউদ্দীন খানের অনুবাদ)। এখানে কিছু হাতে টাইপ করা হয়নি। একবার খোলা সূরা ফোনে জমা থাকে, পরের বার দ্রুত খোলে।</p><button class="nld-clear">জমা রাখা সূরা মুছে নতুন করে আনো</button>';
    bindControls(v);
    $('.nld-tr', v).onchange = function () { settings.tr = this.value; settings.trPicked = true; saveSettings(); };
    $('.nld-font', v).oninput = function () { settings.font = +this.value; saveSettings(); $('.nld-fprev', v).style.fontSize = this.value + 'px'; };
    $('.nld-arf', v).onchange = function () { settings.arFont = this.value; saveSettings(); applyArFont(); };
    $('.nld-st', v).onchange = function () { settings.showTr = this.checked; saveSettings(); };
    $('.nld-clear', v).onclick = function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('nld_c_') === 0) localStorage.removeItem(k); }); } catch (e) {} for (var k in MEM) delete MEM[k]; this.textContent = '✓ মুছে ফেলা হয়েছে'; };
  }

  /* ------------------------------------------------------------ run a parsed command */
  var lastRun = { k: '', t: 0 };
  function run(c) {
    if (!c) return false;
    var k = JSON.stringify(c);
    if (k === lastRun.k && Date.now() - lastRun.t < 4000) return true; // the page and the app both pass the same command
    lastRun = { k: k, t: Date.now() };
    show();
    if (c.kind === 'ayah') open('quran', { surah: c.surah, ayah: c.ayah, play: true });
    else if (c.kind === 'surah') open('quran', { surah: c.surah, play: true });
    else if (c.kind === 'hadith') open('hadith', { book: c.book, number: c.number });
    else if (c.kind === 'prayer') open('namaz');
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
    // phone app: the "আরো" sheet (grid of tiles)
    $$('.sh-grid').forEach(function (grid) {
      if ($('[data-deen]', grid)) return;
      var t = el('<button data-deen="1" type="button"><span class="ic">📖</span><span class="bn">কুরআন ও হাদিস</span></button>');
      var after = $('[data-tab="health"]', grid) || $('[data-tab="jobs"]', grid);
      if (after && after.nextSibling) grid.insertBefore(t, after.nextSibling); else grid.insertBefore(t, grid.firstChild);
      t.onclick = function (e) {
        e.preventDefault();
        var sh = $('#nlo-sheet');
        if (sh) { sh.classList.remove('open'); setTimeout(function () { sh.hidden = true; }, 220); }
        show(); window.scrollTo(0, 0);
      };
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
    surahs().catch(function () {}); // English surah names for the agent
    playerBar();
    addNav();
    new MutationObserver(function () { addNav(); if (location.hash === '#deen' && $('#nlo-view') && !$('#nlo-view').contains(root || document.createElement('i'))) show(); }).observe(document.body, { childList: true, subtree: true });
    if (/^#deen/.test(location.hash)) setTimeout(show, 400);
    // keep the phone's azan alarms in step with the saved settings, and the web azan timer running
    setTimeout(function () { if (store('prayer')) savePcfg(pcfg()); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.NexoraDeen = { _setSurahs: function (j) { SURAHS = j; LATIN = null; }, parse: parseCommand, run: run, show: show, open: function (t, a) { show(); open(t, a); }, stop: stopAll, setSpeed: setSpeed, onLocation: function (lat, lng, acc) { locWaiter(lat, lng, acc); } };
})();

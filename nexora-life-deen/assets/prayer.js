/* Prayer-time calculation (standard astronomical method, same as PrayTimes.org / Adhan):
 * sun declination and equation of time from the Julian day, Fajr/Isha by sun angle below the horizon,
 * Asr by shadow length (Hanafi = 2x, Shafi = 1x). Two refinement passes. Times in hours (local, by tz offset).
 * Exposed as NexoraPrayer.times(date, lat, lng, tzHours, opts). Also used by the app (ported to Kotlin in Azan.kt).
 */
(function (g) {
  'use strict';
  var METHODS = {
    karachi: { name: 'ইসলামিক ফাউন্ডেশন / করাচি (ফজর ১৮°, ইশা ১৮°)', fajr: 18, isha: 18 },
    mwl: { name: 'মুসলিম ওয়ার্ল্ড লীগ (ফজর ১৮°, ইশা ১৭°)', fajr: 18, isha: 17 },
    isna: { name: 'ISNA উত্তর আমেরিকা (১৫°, ১৫°)', fajr: 15, isha: 15 },
    egypt: { name: 'মিশর (১৯.৫°, ১৭.৫°)', fajr: 19.5, isha: 17.5 },
    makkah: { name: 'উম্মুল কুরা, মক্কা (১৮.৫°, মাগরিবের ৯০ মিনিট পর ইশা)', fajr: 18.5, ishaMin: 90 }
  };
  var D = Math.PI / 180;
  function sin(d) { return Math.sin(d * D); } function cos(d) { return Math.cos(d * D); } function tan(d) { return Math.tan(d * D); }
  function asin(x) { return Math.asin(x) / D; } function acos(x) { return Math.acos(x) / D; } function atan2(y, x) { return Math.atan2(y, x) / D; }
  function acot(x) { return Math.atan(1 / x) / D; }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {
    var Dd = jd - 2451545.0;
    var gA = fix(357.529 + 0.98560028 * Dd, 360);
    var q = fix(280.459 + 0.98564736 * Dd, 360);
    var L = fix(q + 1.915 * sin(gA) + 0.020 * sin(2 * gA), 360);
    var e = 23.439 - 0.00000036 * Dd;
    var RA = atan2(cos(e) * sin(L), cos(L)) / 15;
    var eqt = q / 15 - fix(RA, 24);
    var decl = asin(sin(e) * sin(L));
    return { decl: decl, eqt: eqt };
  }

  function times(date, lat, lng, tz, opts) {
    opts = opts || {};
    var m = METHODS[opts.method || 'karachi'] || METHODS.karachi;
    var asrF = opts.asr === 'shafi' ? 1 : 2;
    var jDate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    function midDay(t) { var e = sunPos(jDate + t).eqt; return fix(12 - e, 24); }
    function angleTime(angle, t, ccw) {
      var dec = sunPos(jDate + t).decl, noon = midDay(t);
      var x = (-sin(angle) - sin(dec) * sin(lat)) / (cos(dec) * cos(lat));
      if (x > 1 || x < -1) return NaN; // high latitudes: no such time today
      var v = acos(x) / 15;
      return noon + (ccw ? -v : v);
    }
    function asrTime(f, t) { var dec = sunPos(jDate + t).decl; return angleTime(-acot(f + tan(Math.abs(lat - dec))), t); }
    // first guess (hours as day fractions), then two refinement passes
    var T = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (var i = 0; i < 2; i++) {
      var f = {}; for (var k in T) f[k] = T[k] / 24;
      T = {
        fajr: angleTime(m.fajr, f.fajr, true),
        sunrise: angleTime(0.833, f.sunrise, true),
        dhuhr: midDay(f.dhuhr),
        asr: asrTime(asrF, f.asr),
        sunset: angleTime(0.833, f.sunset),
        isha: m.ishaMin ? 0 : angleTime(m.isha, f.isha)
      };
    }
    // High latitudes (summer in UK/Europe): when the sun never gets that low, use the angle-based night portion
    var nightH = 24 - (T.sunset - T.sunrise);
    if (!isFinite(T.fajr)) T.fajr = T.sunrise - nightH * m.fajr / 60;
    if (!m.ishaMin && !isFinite(T.isha)) T.isha = T.sunset + nightH * m.isha / 60;
    var adj = tz - lng / 15;
    var out = {};
    for (var k2 in T) out[k2] = T[k2] + adj;
    out.maghrib = out.sunset;
    if (m.ishaMin) out.isha = out.maghrib + m.ishaMin / 60;
    // midnight between sunset and next fajr (for Isha's end) and the last third of the night (tahajjud)
    var night = 24 - (out.sunset - out.fajr);
    out.midnight = out.sunset + night / 2;
    out.lastThird = out.sunset + night * 2 / 3;
    var off = opts.offsets || {};
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (p) { if (off[p]) out[p] += off[p] / 60; });
    return out;
  }

  /** Hours → Date on that day. */
  function toDate(date, h) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    return new Date(d.getTime() + Math.round(h * 3600) * 1000);
  }
  function fmt(h, bn) {
    if (!isFinite(h)) return '—';
    h = fix(h + 0.5 / 60, 24); // round to the nearest minute
    var H = Math.floor(h), M = Math.floor((h - H) * 60);
    var ap = H < 12 ? 'AM' : 'PM', h12 = H % 12 || 12;
    var s = h12 + ':' + (M < 10 ? '0' : '') + M;
    if (bn) s = s.replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; });
    else s += ' ' + ap;
    return s;
  }
  g.NexoraPrayer = { times: times, toDate: toDate, fmt: fmt, METHODS: METHODS };
  if (typeof module !== 'undefined') module.exports = g.NexoraPrayer;
})(typeof window !== 'undefined' ? window : globalThis);

<?php
/**
 * Plugin Name: Nexora Life Deen (Quran & Hadith)
 * Description: 📖 কুরআন শরীফ (১১৪ সূরা, আরবি + বাংলা অর্থ, আয়াত ধরে তিলাওয়াত, গতি কম-বেশি), সহীহ বুখারী, সহীহ মুসলিম, জামে তিরমিযী, আর একদম শুরু থেকে কুরআন শেখা (হরফ, মাখরাজ, হরকত, তাজবীদ, প্র্যাকটিস, কুইজ)। Nexora Life OS-এর ভেতরে (ওয়েব + অ্যাপ) "কুরআন ও হাদিস" ট্যাব হিসেবে আসে, আর Riak agent-কে "২ নম্বর সূরার ২৫৫ নম্বর আয়াত শোনাও" বললে সেটা খুলে তিলাওয়াত করে।
 * Version: 1.3.0
 * Author: Nexora Forward
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class NLO_Deen {

	const VERSION = '1.4.6';

	/**
	 * Spoken Bangla/Arabic for the lessons on computers that have no such voice:
	 * fetched once from Google's TTS on the server, kept in uploads, then served as a plain mp3.
	 */
	public static function tts_route() {
		register_rest_route(
			'nexora-life/v1',
			'/tts',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'tts' ),
			)
		);
	}

	public static function tts( $req ) {
		$tl = (string) $req->get_param( 'tl' );
		$q  = trim( wp_strip_all_tags( (string) $req->get_param( 'q' ) ) );
		if ( ! in_array( $tl, array( 'ar', 'bn', 'en' ), true ) || '' === $q || mb_strlen( $q ) > 200 ) {
			return new WP_Error( 'bad', 'bad request', array( 'status' => 400 ) );
		}
		$up   = wp_upload_dir();
		$dir  = trailingslashit( $up['basedir'] ) . 'nexora-tts';
		$name = md5( $tl . '|' . $q ) . '.mp3';
		$file = $dir . '/' . $name;
		if ( ! file_exists( $file ) || filesize( $file ) < 200 ) {
			wp_mkdir_p( $dir );
			$res = wp_remote_get(
				'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' . $tl . '&q=' . rawurlencode( $q ),
				array(
					'timeout'    => 15,
					'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
				)
			);
			$body = is_wp_error( $res ) ? '' : wp_remote_retrieve_body( $res );
			if ( 200 !== (int) wp_remote_retrieve_response_code( $res ) || strlen( $body ) < 200 ) {
				return new WP_Error( 'tts', 'tts unavailable', array( 'status' => 502 ) );
			}
			file_put_contents( $file, $body ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		header( 'Content-Type: audio/mpeg' );
		header( 'Cache-Control: public, max-age=31536000' );
		header( 'Content-Length: ' . filesize( $file ) );
		readfile( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		exit;
	}

	public static function init() {
		add_action( 'admin_footer-toplevel_page_nexora-life', array( __CLASS__, 'print_ui' ) );
		add_action( 'init', array( __CLASS__, 'app_buffer' ), 0 );
		add_filter( 'rest_pre_dispatch', array( __CLASS__, 'command' ), 8, 3 );
		add_action( 'rest_api_init', array( __CLASS__, 'tts_route' ) );
	}

	/* ------------------------------------------------------------ UI */

	public static function app_buffer() {
		if ( empty( $_GET['nexora_life_app'] ) ) { // phpcs:ignore
			return;
		}
		ob_start( static function ( $html ) {
			return false !== stripos( $html, '</body>' ) ? str_ireplace( '</body>', self::ui() . '</body>', $html ) : $html;
		} );
	}

	public static function print_ui() {
		echo self::ui(); // phpcs:ignore
	}

	/**
	 * The app page is served from LiteSpeed's page cache, so a version number written into the HTML can stay old for
	 * days. The files are therefore added by a tiny inline script with an hourly cache-buster: a new deen.js reaches
	 * every phone within an hour without purging anything.
	 */
	private static function ui() {
		$base = plugins_url( 'assets/', __FILE__ );
		return '<script>(function(){var b=' . wp_json_encode( $base ) . ',v="' . self::VERSION . '-"+Math.floor(Date.now()/36e5);window.NLO_DEEN_BASE=b;'
			. 'var l=document.createElement("link");l.rel="stylesheet";l.href=b+"deen.css?v="+v;document.head.appendChild(l);'
			. 'var p=document.createElement("script");p.src=b+"prayer.js?v="+v;document.head.appendChild(p);'
			. 'var s=document.createElement("script");s.src=b+"deen.js?v="+v;s.defer=true;document.head.appendChild(s);})();</script>';
	}

	/* ------------------------------------------------------------ Agent */

	/**
	 * Answers Quran / hadith requests sent to the Riak agent ("২ নম্বর সূরার ২৫৫ নম্বর আয়াত শোনাও",
	 * "সূরা ইয়াসিন শোনাও", "বুখারী ১ নম্বর হাদিস"). The reply carries a `deen` item that the page script
	 * picks up to open the tab and start the recitation.
	 */
	public static function command( $result, $server, $request ) {
		if ( null !== $result || 'POST' !== $request->get_method() || '/nexora-life/v1/command' !== $request->get_route() ) {
			return $result;
		}
		$text = trim( (string) $request->get_param( 'text' ) );
		$cmd  = self::parse( $text );
		if ( ! $cmd ) {
			$alt = (string) $request->get_param( 'alt' );
			$cmd = '' !== $alt ? self::parse( $alt ) : null;
		}
		if ( ! $cmd ) {
			return $result;
		}
		if ( class_exists( 'NLO_Auth' ) && method_exists( 'NLO_Auth', 'permit' ) && ! NLO_Auth::permit( $request ) ) {
			return $result;
		}
		if ( 'ayah' === $cmd['kind'] ) {
			$reply = sprintf( '📖 সূরা %s, আয়াত %s খুলছি, তিলাওয়াত শুরু হচ্ছে।', self::bn( $cmd['surah'] ), self::bn( $cmd['ayah'] ) );
		} elseif ( 'surah' === $cmd['kind'] ) {
			$reply = sprintf( '📖 সূরা %s খুলছি, শুরু থেকে তিলাওয়াত হবে।', self::bn( $cmd['surah'] ) );
		} elseif ( 'prayer' === $cmd['kind'] ) {
			$reply = '🕌 নামাজের সময়সূচি খুলছি — আজকের ওয়াক্ত, পরের নামাজ আর আযানের সেটিং সেখানে আছে।';
		} else {
			$names = array( 'bukhari' => 'সহীহ বুখারী', 'muslim' => 'সহীহ মুসলিম', 'tirmidhi' => 'জামে তিরমিযী' );
			$reply = sprintf( '📚 %s, হাদিস নং %s খুলছি।', $names[ $cmd['book'] ], self::bn( $cmd['number'] ) );
		}
		return rest_ensure_response( array(
			'reply'      => $reply,
			'reply_src'  => 'bn',
			'reply_lang' => 'bn',
			// app 1.0.25+: opens the Quran & Hadith tab even when the request came by voice with the app in the background
			'actions'    => array( array( 'do' => 'deen', 'cmd' => $cmd ) ),
			'saved'      => array(),
			'parsed'     => array( array_merge( array( 'type' => 'deen' ), $cmd ) ),
			'deen'       => $cmd,
			'ai'         => false,
		) );
	}

	private static function bn( $n ) {
		return strtr( (string) $n, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) );
	}

	/** Same rules as the page script's parseCommand() (assets/deen.js). */
	public static function parse( $text ) {
		$t = str_replace( "\u{09DF}", "\u{09AF}\u{09BC}", mb_strtolower( $text ) );
		$t = strtr( $t, array( '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9' ) );
		$t = str_replace( array( 'সুরা', 'ছুরা', 'ছূরা' ), 'সূরা', $t );
		$t = str_replace( array( 'আইয়াত', 'আয়াতের' ), 'আয়াত', $t );
		$t = preg_replace( '/আয়াতুল\s*কুরসি|আয়াতুল\s*কুরসী|ayat?u?l\s*kursi|\bkursi\b|কুরসি/u', ' kursi255 ', $t );
		if ( false !== strpos( $t, 'kursi255' ) ) {
			return array( 'kind' => 'ayah', 'surah' => 2, 'ayah' => 255 );
		}
		$t = preg_replace( '/\b(su+r+a+h?|surat|surar|surahr|surah?er|shu+r+a+h?|sora+h?|sure|surae)\b/u', 'সূরা', $t );
		$t = preg_replace( '/\b(a+y+a+t+h?|ayah|aiat|ayet|ayot|ayater|ayate|ayatta|ayat?ta|aayat|ayaat|ayath|verse)\b/u', 'আয়াত', $t );

		if ( preg_match( '/হাদিস|হাদীস|hadith|hadis/u', $t ) || preg_match( '/(বুখারী|বুখারি|তিরমিযী|তিরমিজি|bukhari|tirmidhi|tirmizi)/u', $t ) ) {
			$books = array(
				'bukhari'  => '(বুখারী|বুখারি|বোখারী|bukhari|bokhari)',
				'muslim'   => '(মুসলিম|muslim)',
				'tirmidhi' => '(তিরমিযী|তিরমিজি|তিরমিজী|তিরমিযি|tirmidhi|tirmizi)',
			);
			foreach ( $books as $key => $re ) {
				if ( preg_match( '/' . $re . '/u', $t ) && preg_match( '/(\d{1,4})/', $t, $m ) ) {
					return array( 'kind' => 'hadith', 'book' => $key, 'number' => (int) $m[1] );
				}
			}
		}
		// "নামাজের সময় কখন", "মাগরিবের আযান", "সেহরির শেষ সময়" — not "নামাজের রিমাইন্ডার দাও" (that stays with Riak)
		if ( ( preg_match( '/আযান|আজান|সেহরি|সাহরি|ইফতার|ওয়াক্ত|prayer time|azan|ajan/u', $t ) || ( preg_match( '/নামাজ|নামায|namaz|namaj/u', $t ) && preg_match( '/সময়|কখন|সূচি|time|somoy/u', $t ) ) ) && ! preg_match( '/সূরা|আয়াত|রিমাইন্ডার|reminder|অ্যালার্ম দাও/u', $t ) ) {
			return array( 'kind' => 'prayer' );
		}
		$is_quran = preg_match( '/সূরা|আয়াত|কুরআন|কোরআন|quran|koran|তিলাওয়াত|তেলাওয়াত|tilawat|telawat/u', $t ) || preg_match( '/^\s*\d{1,3}\s*[:।]\s*\d{1,3}\s*$/u', $t );
		if ( ! $is_quran && ( preg_match( '/পড|শোনা|শুনা|শুনাও|তিলাওয়াত|তেলাওয়াত|\b(poro|poren|porun|portesi|shunao|sunao|sonao|shonao|shunau|sunau|tilawat|telawat|telwat|tilwat|recite|play|chalao|calao)\b/u', $t ) || preg_match( '/\d/', $t ) ) && self::surah_by_name( $t, true ) ) {
			$is_quran = true;
		}
		if ( ! $is_quran ) {
			return null;
		}
		if ( preg_match( '/আয়াতুল\s*কুরসি|আয়াতুল\s*কুরসী|ayatul\s*kursi|আয়াতul\s*kursi/u', $t ) ) {
			return array( 'kind' => 'ayah', 'surah' => 2, 'ayah' => 255 );
		}
		$num = '(?:নং|নম্বর|নাম্বার|নম্বরের|নাম্বারের|তম|number|num|no\.?|nong|nombor|nambar|nmbr|nom|th)?';
		$s   = 0;
		$a   = 0;
		if ( preg_match( '/(\d{1,3})\s*[:।]\s*(\d{1,3})/u', $t, $m ) ) {
			$s = (int) $m[1];
			$a = (int) $m[2];
		} else {
			$s_at = -1;
			if ( preg_match( '/(\d{1,3})\s*' . $num . '\s*সূরা/u', $t, $m, PREG_OFFSET_CAPTURE ) || preg_match( '/সূরা\s*' . $num . '\s*(\d{1,3})/u', $t, $m, PREG_OFFSET_CAPTURE ) || preg_match( '/^\s*(\d{1,3})\s*[.)।,-]/u', $t, $m, PREG_OFFSET_CAPTURE ) ) {
				$s    = (int) $m[1][0];
				$s_at = $m[1][1];
			}
			if ( preg_match_all( '/(\d{1,3})\s*' . $num . '\s*আয়াত/u', $t, $all, PREG_OFFSET_CAPTURE ) ) {
				foreach ( $all[1] as $hit ) {
					if ( $hit[1] !== $s_at ) {
						$a = (int) $hit[0];
						break;
					}
				}
			}
			if ( ! $a && preg_match( '/আয়াত\s*' . $num . '\s*(\d{1,3})/u', $t, $m, PREG_OFFSET_CAPTURE ) && $m[1][1] !== $s_at ) {
				$a = (int) $m[1][0];
			}
			$by_name = false;
			if ( ! $s ) {
				$s       = self::surah_by_name( $t );
				$by_name = (bool) $s;
			}
			if ( $by_name && ! $a && preg_match_all( '/\d{1,3}/', $t, $ns ) && 1 === count( $ns[0] ) ) {
				$a = (int) $ns[0][0];
			}
			if ( ! $s && $a && preg_match_all( '/\d{1,3}/', $t, $nums ) ) {
				$rest = array_values( array_filter( array_map( 'intval', $nums[0] ), static function ( $x ) use ( $a ) { return $x !== $a; } ) );
				if ( 1 === count( $rest ) ) {
					$s = $rest[0];
				}
			}
		}
		$counts = self::counts();
		if ( $s < 1 || $s > 114 ) {
			return null;
		}
		if ( $a > 0 ) {
			return $a > $counts[ $s - 1 ] ? null : array( 'kind' => 'ayah', 'surah' => $s, 'ayah' => $a );
		}
		return array( 'kind' => 'surah', 'surah' => $s );
	}

	private static function latin( $x, $strip_article = true ) {
		$x = strtolower( $x );
		if ( $strip_article ) {
			$x = preg_replace( '/^(aal|al|an|ar|as|at|ad|adh|az|ash)[-\'’ ]/', '', $x );
		}
		$x = preg_replace( '/[^a-z]/', '', $x );
		$x = preg_replace( '/(.)\1+/', '$1', $x );
		return strtr( $x, array( 'o' => 'u', 'e' => 'i', 'q' => 'k' ) );
	}

	/** Longest Bangla or English name found wins ("আলাক" is not "আলা", "an-nasr" is not "an-nas"). */
	private static function surah_by_name( $t, $strict = false ) {
		$said = (bool) preg_match( '/সূরা|surah|sura/u', $t );
		$norm = static function ( $x ) {
			return str_replace( "\u{09DF}", "\u{09AF}\u{09BC}", preg_replace( '/[\s\-\'’ʼ.]+/u', '', $x ) );
		};
		$bn_t = $norm( $t );
		$la_t = self::latin( $t, false );
		$best = 0;
		$len  = 0;
		$latin_names = array();
		$file = __DIR__ . '/assets/surahs.json';
		$list = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array();
		foreach ( (array) $list as $row ) {
			$latin_names[ (int) $row[0] ][] = self::latin( $row[1] );
		}
		foreach ( self::names() as $n => $aliases ) {
			foreach ( $aliases as $alias ) {
				if ( preg_match( '/^[a-z]+$/', $alias ) ) {
					$latin_names[ $n ][] = self::latin( $alias );
					continue;
				}
				$al = $norm( $alias );
				$l  = mb_strlen( $al );
				if ( $l > $len && ( $said || $l >= 3 ) && false !== mb_strpos( $bn_t, $al ) ) {
					$best = $n;
					$len  = $l;
				}
			}
		}
		// strict (no "সূরা" keyword said): an English name must be a whole word, "alarm" is not "al-a'la"
		$words = array();
		if ( $strict ) {
			$ws = preg_split( '/[^a-z\'’-]+/', strtolower( $t ), -1, PREG_SPLIT_NO_EMPTY );
			foreach ( $ws as $i => $w ) {
				$words[] = self::latin( $w );
				if ( isset( $ws[ $i + 1 ] ) ) {
					$words[] = self::latin( $w . '-' . $ws[ $i + 1 ] );
				}
			}
		}
		foreach ( $latin_names as $n => $aliases ) {
			foreach ( $aliases as $al ) {
				$l = strlen( $al );
				if ( $l > $len && ( $said || $l >= 3 ) && ( $strict ? in_array( $al, $words, true ) : false !== strpos( $la_t, $al ) ) ) {
					$best = $n;
					$len  = $l;
				}
			}
		}
		return $best;
	}

	/** Verses per surah (Hafs, 6236 in all). */
	public static function counts() {
		return array( 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6 );
	}

	/** Bangla spellings people use for each surah. Longer names first where one contains another. */
	public static function names() {
		$list = array(
			3 => array( 'আলইমরান', 'আল ইমরান', 'imran' ), 6 => array( 'আনআম', 'আনয়াম', 'anam' ), 7 => array( 'আরাফ', 'আ\'রাফ', 'araf' ),
			17 => array( 'বনিইসরাইল', 'বনী ইসরাঈল', 'ইসরা', 'isra' ), 41 => array( 'হামীমসাজদা', 'ফুসসিলাত', 'fussilat' ), 32 => array( 'সাজদা', 'সিজদা', 'sajda' ),
			55 => array( 'আররহমান', 'আর রাহমান', 'রহমান', 'rahman' ), 40 => array( 'গাফির', 'মুমিন', 'ghafir' ), 23 => array( 'মুমিনুন', 'muminun' ),
			1 => array( 'ফাতিহা', 'ফাতেহা', 'fatiha' ), 2 => array( 'বাকারা', 'বাকারাহ', 'baqara' ), 4 => array( 'নিসা', 'nisa' ), 5 => array( 'মায়িদা', 'মায়েদা', 'মাইদা', 'maida' ),
			8 => array( 'আনফাল', 'anfal' ), 9 => array( 'তাওবা', 'তওবা', 'tawba' ), 10 => array( 'ইউনুস', 'yunus' ), 11 => array( 'হুদ', 'hud' ), 12 => array( 'ইউসুফ', 'yusuf' ),
			13 => array( 'রাদ', 'রা\'দ', 'rad' ), 14 => array( 'ইব্রাহিম', 'ইবরাহীম', 'ibrahim' ), 15 => array( 'হিজর', 'hijr' ), 16 => array( 'নাহল', 'nahl' ), 18 => array( 'কাহফ', 'কাহাফ', 'kahf' ),
			19 => array( 'মারইয়াম', 'মরিয়ম', 'মারিয়াম', 'maryam' ), 20 => array( 'ত্বহা', 'তোয়াহা', 'ত্বা-হা', 'taha' ), 21 => array( 'আম্বিয়া', 'anbiya' ), 22 => array( 'হজ্জ', 'হজ', 'hajj' ),
			24 => array( 'নূর', 'নুর', 'nur' ), 25 => array( 'ফুরকান', 'furqan' ), 26 => array( 'শুআরা', 'শোয়ারা', 'shuara' ), 27 => array( 'নামল', 'naml' ), 28 => array( 'কাসাস', 'qasas' ),
			29 => array( 'আনকাবুত', 'ankabut' ), 30 => array( 'রুম', 'rum' ), 31 => array( 'লুকমান', 'luqman' ), 33 => array( 'আহযাব', 'আহজাব', 'ahzab' ), 34 => array( 'সাবা', 'saba' ),
			35 => array( 'ফাতির', 'fatir' ), 36 => array( 'ইয়াসিন', 'ইয়াসীন', 'ইয়াছিন', 'yasin' ), 37 => array( 'সাফফাত', 'saffat' ), 38 => array( 'সোয়াদ', 'ছোয়াদ', 'sad' ),
			39 => array( 'যুমার', 'জুমার', 'zumar' ), 42 => array( 'শূরা', 'শুরা', 'shura' ), 43 => array( 'যুখরুফ', 'zukhruf' ), 44 => array( 'দুখান', 'dukhan' ), 45 => array( 'জাসিয়া', 'jathiya' ),
			46 => array( 'আহকাফ', 'ahqaf' ), 47 => array( 'মুহাম্মদ', 'মুহাম্মাদ', 'muhammad' ), 48 => array( 'ফাতহ', 'fath' ), 49 => array( 'হুজুরাত', 'hujurat' ), 50 => array( 'ক্বাফ', 'কাফ', 'qaf' ),
			51 => array( 'যারিয়াত', 'জারিয়াত', 'dhariyat' ), 52 => array( 'তূর', 'তুর', 'tur' ), 53 => array( 'নাজম', 'najm' ), 54 => array( 'কামার', 'ক্বামার', 'qamar' ),
			56 => array( 'ওয়াকিয়া', 'ওয়াকিয়াহ', 'ওয়াক্বিয়াহ', 'waqia' ), 57 => array( 'হাদিদ', 'হাদীদ', 'hadid' ), 58 => array( 'মুজাদালা', 'mujadila' ), 59 => array( 'হাশর', 'hashr' ),
			60 => array( 'মুমতাহিনা', 'mumtahina' ), 61 => array( 'সফ', 'ছফ', 'saff' ), 62 => array( 'জুমুআ', 'জুমআ', 'জুমা', 'jumuah' ), 63 => array( 'মুনাফিকুন', 'munafiqun' ),
			64 => array( 'তাগাবুন', 'taghabun' ), 65 => array( 'তালাক', 'talaq' ), 66 => array( 'তাহরীম', 'তাহরিম', 'tahrim' ), 67 => array( 'মুলক', 'mulk' ), 68 => array( 'কলম', 'কালাম', 'qalam' ),
			69 => array( 'হাক্কাহ', 'হাক্কা', 'haqqa' ), 70 => array( 'মাআরিজ', 'maarij' ), 71 => array( 'নূহ', 'নুহ', 'nuh' ), 72 => array( 'জিন', 'jinn' ), 73 => array( 'মুযযাম্মিল', 'মুজাম্মিল', 'muzzammil' ),
			74 => array( 'মুদ্দাসসির', 'মুদ্দাছছির', 'muddathir' ), 75 => array( 'কিয়ামাহ', 'কিয়ামাহ', 'কিয়ামা', 'qiyama' ), 76 => array( 'দাহর', 'ইনসান', 'insan' ), 77 => array( 'মুরসালাত', 'mursalat' ),
			78 => array( 'নাবা', 'naba' ), 79 => array( 'নাযিয়াত', 'নাজিয়াত', 'naziat' ), 80 => array( 'আবাসা', 'abasa' ), 81 => array( 'তাকভীর', 'তাকবির', 'takwir' ), 82 => array( 'ইনফিতার', 'infitar' ),
			83 => array( 'মুতাফফিফীন', 'মুতাফফিফিন', 'mutaffifin' ), 84 => array( 'ইনশিকাক', 'inshiqaq' ), 85 => array( 'বুরুজ', 'buruj' ), 86 => array( 'তারিক', 'tariq' ), 87 => array( 'আলা', 'আ\'লা', 'ala' ),
			88 => array( 'গাশিয়া', 'ghashiya' ), 89 => array( 'ফজর', 'fajr' ), 90 => array( 'বালাদ', 'balad' ), 91 => array( 'শামস', 'shams' ), 92 => array( 'লাইল', 'lail' ), 93 => array( 'দুহা', 'দোহা', 'duha' ),
			94 => array( 'ইনশিরাহ', 'আলাম নাশরাহ', 'শারহ', 'sharh' ), 95 => array( 'ত্বীন', 'তীন', 'tin' ), 96 => array( 'আলাক', 'alaq' ), 97 => array( 'কদর', 'ক্বদর', 'qadr' ), 98 => array( 'বাইয়্যিনাহ', 'বাইয়িনাহ', 'bayyina' ),
			99 => array( 'যিলযাল', 'জিলজাল', 'zalzala' ), 100 => array( 'আদিয়াত', 'adiyat' ), 101 => array( 'কারিয়া', 'ক্বারিয়াহ', 'qaria' ), 102 => array( 'তাকাসুর', 'takathur' ), 103 => array( 'আসর', 'asr' ),
			104 => array( 'হুমাযা', 'হুমাজা', 'humaza' ), 105 => array( 'ফীল', 'ফিল', 'fil' ), 106 => array( 'কুরাইশ', 'quraish' ), 107 => array( 'মাউন', 'maun' ), 108 => array( 'কাওসার', 'kawthar' ),
			109 => array( 'কাফিরুন', 'kafirun' ), 110 => array( 'নাসর', 'nasr' ), 111 => array( 'লাহাব', 'মাসাদ', 'lahab' ), 112 => array( 'ইখলাস', 'ikhlas' ), 113 => array( 'ফালাক', 'ফালাক্ব', 'falaq' ), 114 => array( 'নাস', 'nas' ),
		);
		return $list;
	}
}

NLO_Deen::init();

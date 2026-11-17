<?php
/**
 * Sec-MS-GEC v2 token for Microsoft's Edge "Read aloud" neural voices — a straight port of edge-tts (MIT, rany2) drm.py.
 */
class NLO_Deen_GEC {
	const M = 0xFFFFFFFF;
	private static function rol16( $v ) { $v &= self::M; return ( ( $v << 16 ) | ( $v >> 16 ) ) & self::M; }
	private static function ror( $v, $n ) { return ( ( $v >> $n ) | ( $v << ( 32 - $n ) ) ) & self::M; }
	private static function mul( $a, $b ) { $a &= self::M; $b &= self::M; return ( ( ( ( $a * ( $b >> 16 ) ) & 0xFFFF ) << 16 ) + $a * ( $b & 0xFFFF ) ) & self::M; }
	private static function s0( $v ) { return ( ( $v >> 7 ) ^ ( $v << 25 ) ^ ( $v >> 18 ) ^ ( $v << 14 ) ^ ( $v >> 3 ) ) & self::M; }
	private static function s1( $v ) { return ( ( $v >> 17 ) ^ ( $v << 15 ) ^ ( $v >> 19 ) ^ ( $v << 13 ) ^ ( $v >> 10 ) ) & self::M; }
	private static function bs1( $e ) { return self::ror( $e, 6 ) ^ self::ror( $e, 11 ) ^ self::ror( $e, 25 ); }
	private static function bs0( $a ) { return self::ror( $a, 2 ) ^ self::ror( $a, 13 ) ^ self::ror( $a, 22 ); }
	private static function rc() { return array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2); }
	private static function rounds( $st, $w, $first = 0 ) {
		list( $a, $b, $c, $d, $e, $f, $g, $h ) = $st;
		$k = self::rc();
		if ( 14 === $first ) { $k[14] = 0xC9DC06A7; }
		for ( $i = $first; $i < 64; $i++ ) {
			$t1 = ( $h + self::bs1( $e ) + ( $g ^ ( $e & ( $f ^ $g ) ) ) + $k[ $i ] + $w[ $i ] ) & self::M;
			$t2 = ( self::bs0( $a ) + ( ( $a & $b ) | ( $c & ( $a | $b ) ) ) ) & self::M;
			$h = $g; $g = $f; $f = $e; $e = ( $d + $t1 ) & self::M; $d = $c; $c = $b; $b = $a; $a = ( $t1 + $t2 ) & self::M;
		}
		return array( $a, $b, $c, $d, $e, $f, $g, $h );
	}
	private static function expand( &$w, $first = 16 ) {
		for ( $i = $first; $i < 64; $i++ ) {
			$w[ $i ] = ( self::s1( $w[ $i - 2 ] ) + $w[ $i - 7 ] + self::s0( $w[ $i - 15 ] ) + $w[ $i - 16 ] ) & self::M;
		}
	}
	private static function init7( $data ) {
		$sched = array(0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA, 0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6, 0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33, 0xD258B060, 0x72766564);
		$rc    = self::rc();
		$w     = array_fill( 0, 14, 0 );
		$w[]   = hexdec( bin2hex( substr( $data, 0, 3 ) ) );
		$w[]   = hexdec( bin2hex( substr( $data, 3, 4 ) ) );
		for ( $i = 16; $i < 30; $i++ ) {
			$v = $sched[ $i - 16 ];
			if ( $i - 2 >= 14 ) { $v += ( 16 === $i ) ? ( self::s1( $w[ $i - 2 ] ) ^ 0x000B92C0 ) : self::s1( $w[ $i - 2 ] ); }
			if ( $i - 7 >= 14 ) { $v += $w[ $i - 7 ]; }
			if ( $i - 15 >= 14 ) { $v += ( 29 === $i ) ? ( self::s0( $w[ $i - 15 ] ) ^ 0x059C0B80 ) : self::s0( $w[ $i - 15 ] ); }
			$w[] = $v & self::M;
		}
		$w[] = ( self::s1( $w[28] ) + $w[23] + self::s0( $w[15] ) + $w[14] + 0xC9DC06A7 - $rc[14] ) & self::M;
		self::expand( $w, 31 );
		$work = self::rounds( array(0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A, 0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2), $w, 14 );
		$ini  = array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
		$out  = array();
		for ( $i = 0; $i < 8; $i++ ) { $out[] = ( $ini[ $i ] + $work[ $i ] ) & self::M; }
		return $out;
	}
	private static function sha( $data ) {
		$len    = 57 + strlen( $data );
		$padded = substr( $data, 7 ) . "\x80" . str_repeat( "\x00", ( ( 55 - $len ) % 64 + 64 ) % 64 ) . pack( 'J', $len * 8 );
		$st     = self::init7( substr( $data, 0, 7 ) );
		for ( $o = 0; $o < strlen( $padded ); $o += 64 ) {
			$w = array_values( unpack( 'N16', substr( $padded, $o, 64 ) ) );
			self::expand( $w );
			$work = self::rounds( $st, $w );
			for ( $i = 0; $i < 8; $i++ ) { $st[ $i ] = ( $st[ $i ] + $work[ $i ] ) & self::M; }
		}
		return pack( 'N8', $st[0], $st[1], $st[2], $st[3], $st[4], $st[5], $st[6], $st[7] );
	}
	private static function cs64( $data, $digest ) {
		$k  = unpack( 'V2', substr( $digest, 0, 8 ) );
		$ka = $k[1] | 1; $kb = $k[2] | 1;
		$f  = array( self::mul( $ka, 0x82893933 ), self::mul( $kb, 0x82893933 ) );
		$co = array( array(0xE82E91B1, 0xB32700D0), array(0x44DE24C6, 0x88DFF51D), array(0x3BEB65BC, 0x29514038), array(0xC89C5933, 0xB328CBDF), array(0x8D1EC211, 0xD405B4D5), array(0x314EF5D5, 0x26E55F3C), array(0xE92491B1, 0x607801C6), array(0xF0A5B9D5, 0x82B2C1FB), array(0x06064CF3, 0xFA51A3DA), array(0xDA79FA60, 0x207CC464), array(0xBED20560, 0x3C3C74F3), array(0x89F9C9F8, 0xD2D14B61), array(0x35FA38C6, 0xBB04A2C1), array(0xCB49E3C6, 0xC5626167) );
		$terms = array(); $offs = array();
		foreach ( $co as $i => $c ) { $terms[] = self::mul( $c[0], $f[ $i % 2 ] ); $offs[] = $c[1]; }
		$d = "\x00" . $data;
		$d .= str_repeat( "\x00", ( 4 - strlen( $d ) % 4 ) % 4 );
		$words = strlen( $d ) ? array_values( unpack( 'V*', $d ) ) : array();
		if ( count( $words ) % 2 ) { $words[] = 0; }
		foreach ( $words as $i => $word ) {
			$term = self::mul( $word, ( 0 === $i % 2 ) ? $ka : $kb );
			$off  = self::mul( self::rol16( $word ), ( 0 === $i % 2 ) ? 0xEF0569FB : 0xC31713DB );
			if ( 0 === $i ) { $term = ( $term + self::mul( 0xF2F90B1A, $f[0] ) ) & self::M; $off = ( $off + 0x0B1A0000 ) & self::M; }
			$terms[] = $term; $offs[] = $off;
		}
		$swap_acc = 0; $swap_last = 0; $state = 0; $acc = 0;
		for ( $i = 0; $i < count( $terms ); $i += 2 ) {
			$x = $terms[ $i ]; $y = $terms[ $i + 1 ];
			$t = self::rol16( ( $offs[ $i ] + $x ) & self::M );
			$q = self::mul( $t, 0x76F50F34 );
			$swap_acc = ( $swap_acc + ( ( self::mul( self::rol16( $q ), 0xC3EFEA97 ) + $q ) & self::M ) ) & self::M;
			$t = self::rol16( ( $offs[ $i + 1 ] + $y ) & self::M );
			$q = self::mul( $t, 0x1881CE3C );
			$swap_last = ( self::mul( self::rol16( $q ), 0x35BD1EC9 ) + $q ) & self::M;
			$swap_acc  = ( $swap_acc + $swap_last ) & self::M;
			$state = ( self::mul( $state, $ka ) + $x ) & self::M;
			$state = self::mul( self::rol16( $state ), 0xCF98B111 );
			$state = self::mul( self::rol16( $state ), 0x87085B9F );
			$state = self::mul( self::rol16( $state ), 0x12CEB96D );
			$state = self::mul( self::rol16( $state ), 0x257E1D83 );
			$acc   = ( $acc + $state ) & self::M;
			$t = ( self::mul( $state, $kb ) + $y ) & self::M;
			$t = self::mul( self::rol16( $t ), 0xA27416F5 );
			$t = self::mul( self::rol16( $t ), 0xD38396FF );
			$state = self::mul( self::rol16( self::mul( self::rol16( $t ), 0x7C932B89 ) ), 0xBFA49F69 );
			$acc   = ( $acc + $state ) & self::M;
		}
		return array( $swap_last ^ $state, $swap_acc ^ $acc );
	}
	public static function token( $unix = null ) {
		$t = ( null === $unix ? time() : $unix ) + 11644473600;
		$t -= $t % 300;
		$s = sprintf( '%.0f', $t * 10000000 ) . '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
		$digest = self::sha( $s );
		$c      = self::cs64( $s, $digest );
		return strtoupper( bin2hex( pack( 'V2', $c[0], $c[1] ) ) ) . '-' . strtoupper( bin2hex( $digest ) );
	}
}

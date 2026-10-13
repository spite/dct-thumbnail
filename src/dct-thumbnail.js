// the image is reduced to this size before it is transformed
const BLOCK_SIZE = 16;

const cosines = ( k, n ) => Float64Array.from( { length: n }, ( _, x ) => Math.cos( k * Math.PI * ( x + .5 ) / n ) );
const clamp = v => Math.max( 0, Math.min( 255, Math.round( v ) ) );

// the pixels of an image, a canvas, a video, an ImageData or { data, width, height } with RGBA
function pixelsOf( source ) {

	if ( source.data !== undefined ) return source;

	const width = source.naturalWidth || source.videoWidth || source.width;
	const height = source.naturalHeight || source.videoHeight || source.height;

	const canvas = document.createElement( 'canvas' );
	canvas.width = BLOCK_SIZE;
	canvas.height = BLOCK_SIZE;

	const ctx = canvas.getContext( '2d', { willReadFrequently: true } );
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage( source, 0, 0, width, height, 0, 0, BLOCK_SIZE, BLOCK_SIZE );

	return ctx.getImageData( 0, 0, BLOCK_SIZE, BLOCK_SIZE );

}

// the image as BLOCK_SIZE x BLOCK_SIZE pixels, each one the average of the ones it covers
function reduce( { data, width, height } ) {

	const block = new Float64Array( BLOCK_SIZE * BLOCK_SIZE * 3 );

	for ( let y = 0; y < BLOCK_SIZE; y ++ ) {

		const y0 = Math.floor( y * height / BLOCK_SIZE );
		const y1 = Math.max( y0 + 1, Math.floor( ( y + 1 ) * height / BLOCK_SIZE ) );

		for ( let x = 0; x < BLOCK_SIZE; x ++ ) {

			const x0 = Math.floor( x * width / BLOCK_SIZE );
			const x1 = Math.max( x0 + 1, Math.floor( ( x + 1 ) * width / BLOCK_SIZE ) );
			const to = ( y * BLOCK_SIZE + x ) * 3;

			for ( let sy = y0; sy < y1; sy ++ ) {

				for ( let sx = x0; sx < x1; sx ++ ) {

					const from = ( sy * width + sx ) * 4;

					for ( let c = 0; c < 3; c ++ ) block[ to + c ] += data[ from + c ];

				}

			}

			for ( let c = 0; c < 3; c ++ ) block[ to + c ] /= ( x1 - x0 ) * ( y1 - y0 );

		}

	}

	return block;

}

// A thumbnail is the lowest frequencies of the image: one byte with how many there are along each side,
// and then a byte for each one and color, by rows. 4 of them is 49 bytes
function encode( source, coefficients = 4 ) {

	const n = Math.max( 1, Math.min( BLOCK_SIZE, Math.floor( coefficients ) ) );
	const block = reduce( pixelsOf( source ) );
	const waves = Array.from( { length: n }, ( _, k ) => cosines( k, BLOCK_SIZE ) );
	const thumb = new Uint8Array( 1 + n * n * 3 );

	thumb[ 0 ] = n;

	for ( let ky = 0; ky < n; ky ++ ) {

		for ( let kx = 0; kx < n; kx ++ ) {

			const sum = [ 0, 0, 0 ];

			for ( let y = 0; y < BLOCK_SIZE; y ++ ) {

				for ( let x = 0; x < BLOCK_SIZE; x ++ ) {

					const wave = waves[ ky ][ y ] * waves[ kx ][ x ];
					const from = ( y * BLOCK_SIZE + x ) * 3;

					for ( let c = 0; c < 3; c ++ ) sum[ c ] += ( block[ from + c ] - 128 ) * wave;

				}

			}

			const scale = ( ky === 0 ? 1 : 2 ) * ( kx === 0 ? 1 : 2 ) / ( BLOCK_SIZE * BLOCK_SIZE );

			for ( let c = 0; c < 3; c ++ ) thumb[ 1 + ( ky * n + kx ) * 3 + c ] = clamp( sum[ c ] * scale + 128 );

		}

	}

	return thumb;

}

// the bytes of a thumbnail, from the bytes or from the string
function bytesOf( thumb ) {

	if ( typeof thumb === 'string' ) thumb = fromBase64( thumb );

	if ( ! thumb || thumb.length < 4 || thumb.length !== 1 + thumb[ 0 ] * thumb[ 0 ] * 3 ) throw new TypeError( 'dct-thumbnail: not a thumbnail' );

	return thumb;

}

// the picture of a thumbnail at any size, as { data, width, height } with RGBA
function decode( thumb, width = 32, height = width ) {

	thumb = bytesOf( thumb );

	const n = thumb[ 0 ];
	const across = Array.from( { length: n }, ( _, k ) => cosines( k, width ) );
	const down = Array.from( { length: n }, ( _, k ) => cosines( k, height ) );
	const data = new Uint8ClampedArray( width * height * 4 );

	for ( let y = 0; y < height; y ++ ) {

		for ( let x = 0; x < width; x ++ ) {

			const sum = [ 128, 128, 128 ];

			for ( let ky = 0; ky < n; ky ++ ) {

				for ( let kx = 0; kx < n; kx ++ ) {

					const wave = down[ ky ][ y ] * across[ kx ][ x ];
					const from = 1 + ( ky * n + kx ) * 3;

					for ( let c = 0; c < 3; c ++ ) sum[ c ] += ( thumb[ from + c ] - 128 ) * wave;

				}

			}

			data.set( [ sum[ 0 ], sum[ 1 ], sum[ 2 ], 255 ], ( y * width + x ) * 4 );

		}

	}

	return { data, width, height };

}

// the color of the whole image, which is its first frequency
function averageColor( thumb ) {

	thumb = bytesOf( thumb );

	return '#' + Array.from( thumb.subarray( 1, 4 ), v => v.toString( 16 ).padStart( 2, '0' ) ).join( '' );

}

function toBase64( thumb ) {

	return btoa( String.fromCharCode( ...thumb ) );

}

function fromBase64( string ) {

	return Uint8Array.from( atob( string ), c => c.charCodeAt( 0 ) );

}

// the picture of a thumbnail in a canvas, for the page
function toCanvas( thumb, width = 32, height = width ) {

	const picture = decode( thumb, width, height );
	const canvas = document.createElement( 'canvas' );
	canvas.width = width;
	canvas.height = height;
	canvas.getContext( '2d' ).putImageData( new ImageData( picture.data, width, height ), 0, 0 );

	return canvas;

}

function toDataURL( thumb, width = 32, height = width ) {

	return toCanvas( thumb, width, height ).toDataURL();

}

export { encode, decode, averageColor, toBase64, fromBase64, toCanvas, toDataURL, BLOCK_SIZE };

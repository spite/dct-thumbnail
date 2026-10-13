import { averageColor, toDataURL } from './dct-thumbnail.js';

// the thumbnail of an image over it, fading away
function fadeOut( img, duration ) {

	const cover = document.createElement( 'div' );

	Object.assign( cover.style, {
		position: 'absolute',
		left: img.offsetLeft + 'px',
		top: img.offsetTop + 'px',
		width: img.offsetWidth + 'px',
		height: img.offsetHeight + 'px',
		borderRadius: getComputedStyle( img ).borderRadius,
		backgroundColor: img.style.backgroundColor,
		backgroundImage: img.style.backgroundImage,
		backgroundSize: '100% 100%',
		pointerEvents: 'none'
	} );

	( img.offsetParent || img.parentNode ).appendChild( cover );

	cover.animate( { opacity: [ 1, 0 ] }, { duration, easing: 'ease-out' } ).finished.then( () => cover.remove(), () => cover.remove() );

}

// Every <img data-thumb="..."> under root shows its thumbnail until the image has loaded.
// The image is a plain one: loading="lazy" makes it lazy, and it works without scripts.
// With fade, the image takes that many milliseconds to appear over its thumbnail
function applyThumbnails( root = document, { fade = 0 } = {} ) {

	const images = [];

	for ( const img of root.querySelectorAll( 'img[data-thumb]' ) ) {

		if ( img.dataset.thumbApplied !== undefined ) continue;

		img.dataset.thumbApplied = '';

		// the ones that are already there don't need it
		if ( img.complete && img.naturalWidth > 0 ) continue;

		try {

			img.style.backgroundColor = averageColor( img.dataset.thumb );
			img.style.backgroundImage = 'url(' + toDataURL( img.dataset.thumb ) + ')';
			img.style.backgroundSize = '100% 100%';

		} catch ( e ) {

			continue;

		}

		// the thumbnail goes away with the image in place, so it's not seen through one with transparency
		img.addEventListener( 'load', function () {

			if ( fade > 0 && img.isConnected ) fadeOut( img, fade );

			img.style.backgroundColor = '';
			img.style.backgroundImage = '';
			img.style.backgroundSize = '';

		}, { once: true } );

		images.push( img );

	}

	return images;

}

export { applyThumbnails };

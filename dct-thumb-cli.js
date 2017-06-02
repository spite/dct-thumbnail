const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const rgbHex = require('rgb-hex');
const Encoder = require('./dct-thumb-encoder.js');

const fname = process.argv[ 2 ];
const baseName = path.basename( fname, path.extname( fname ) );

fs.readFile(__dirname + '/' + fname, function(err, data) {

	var enc = new Encoder();
	var img = new Canvas.Image;
	img.src = data;

	enc.encode( img );

	var pixel = enc.tmpCtx.getImageData( 0, 0, 1, 1 ).data;
	var r = pixel[ 0 ];
	var g = pixel[ 1 ];
	var b = pixel[ 2 ];
	var color = rgbHex(r,g,b);

	var out = fs.createWriteStream(__dirname + '/' + baseName + '-thumb.png')
	var stream = enc.tmpCanvas.pngStream();

	stream.on('data', function(chunk){
		out.write(chunk);
	});

	stream.on('end', function(){

		var str = `
<div thumb-lazy original-src="${fname}" thumb-src="${baseName}-thumb.png" thumb-width="${img.width}" thumb-height="${img.height}" style="background-color: #${color}; width: 100%;" >
  <div style="padding-bottom: ${img.height * 100 / img.width}%">
    <noscript>
      <img src="${fname}" />
    </noscript>
  </div>
</div>`;

		console.log( str );

		console.log('saved png');
	});

});

const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const rgbHex = require('rgb-hex');

class Encoder {

	constructor () {

		this.BLOCK_SIZE = 16;
		this.coefficients = 4;

		this.DCTMatrix = [];
		this.initDCTMatrix();

		this.imgCanvas = new Canvas();
		this.imgCtx = this.imgCanvas.getContext( '2d' );

		this.tmpCanvas = new Canvas();
		this.tmpCtx = this.tmpCanvas.getContext( '2d' );

	}

	initDCTMatrix () {

		for (let k = 0; k < this.BLOCK_SIZE; k++) {

			const tk = k * Math.PI / this.BLOCK_SIZE;

			this.DCTMatrix[k] = [];

			for (let x = 0; x < this.BLOCK_SIZE; x++) {
				this.DCTMatrix[k][x] = Math.cos(tk * (x + 0.5));
			}

		}

	}

	encode ( img ) {

		this.imgCanvas.width = this.imgCanvas.height = this.BLOCK_SIZE;
		this.tmpCanvas.width = this.BLOCK_SIZE;
		this.tmpCanvas.height = this.coefficients;

		this.imgCtx.drawImage( img, 0, 0, img.width, img.height, 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE );

		const imgImageData = this.imgCtx.getImageData( 0, 0, this.BLOCK_SIZE, this.BLOCK_SIZE );
		const tmpImageData = this.tmpCtx.createImageData( this.BLOCK_SIZE, this.coefficients );

		this.forwardDCT( imgImageData.data, tmpImageData.data, this.BLOCK_SIZE, this.BLOCK_SIZE);

		this.tmpCtx.putImageData( tmpImageData, 0, 0 );

	}

	forwardDCT( src, dst, width, height ) {

		const temp = [];
		const acc = [];

		for (let y_block_offset = 0; y_block_offset < height; y_block_offset += this.BLOCK_SIZE) {
			for (let x_block_offset = 0; x_block_offset < width; x_block_offset += this.BLOCK_SIZE) {
				for (var y = 0; y < this.BLOCK_SIZE; y++) {
					for (var k = 0; k < this.BLOCK_SIZE; k++) {
						var dst_offset = ((y_block_offset + y) * width + x_block_offset + k) * 4;
						temp[dst_offset + 0] = 0;
						temp[dst_offset + 1] = 0;
						temp[dst_offset + 2] = 0;

						for (var x = 0; x < this.BLOCK_SIZE; x++) {
							var src_offset = ((y_block_offset + y) * width + x_block_offset + x) * 4;
							temp[dst_offset + 0] += (src[src_offset + 0] - 128) * this.DCTMatrix[k][x];
							temp[dst_offset + 1] += (src[src_offset + 1] - 128) * this.DCTMatrix[k][x];
							temp[dst_offset + 2] += (src[src_offset + 2] - 128) * this.DCTMatrix[k][x];
						}

						var uk = (k == 0 ? 1 : 2) / this.BLOCK_SIZE;
						temp[dst_offset + 0] *= uk;
						temp[dst_offset + 1] *= uk;
						temp[dst_offset + 2] *= uk;
					}
				}

				for (var x = 0; x < this.BLOCK_SIZE; x++) {
					for (var k = 0; k < this.BLOCK_SIZE; k++) {
						var dst_offset = ((y_block_offset + k) * width + x_block_offset + x) * 4;
						acc[0] = 0;
						acc[1] = 0;
						acc[2] = 0;

						for (var y = 0; y < this.BLOCK_SIZE; y++) {
							var src_offset = ((y_block_offset + y) * width + x_block_offset + x) * 4;
							acc[0] += temp[src_offset + 0] * this.DCTMatrix[k][y];
							acc[1] += temp[src_offset + 1] * this.DCTMatrix[k][y];
							acc[2] += temp[src_offset + 2] * this.DCTMatrix[k][y];
						}

						var uk = (k == 0 ? 1 : 2) / this.BLOCK_SIZE;
						acc[0] = acc[0] * uk;
						acc[1] = acc[1] * uk;
						acc[2] = acc[2] * uk;

						dst[dst_offset + 0] = acc[0] + 128;
						dst[dst_offset + 1] = acc[1] + 128;
						dst[dst_offset + 2] = acc[2] + 128;
						dst[dst_offset + 3] = 255;
					}
				}
			}
		}

	}

}

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
  div style="padding-bottom: ${img.height * 100 / img.width}%">
    <noscript>
      <img src="${fname}" />
    </noscript>
  </div>
</div>`;

		console.log( str );

		console.log('saved png');
	});

});

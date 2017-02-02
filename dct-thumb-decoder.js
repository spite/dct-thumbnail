'use strict';

class Decoder {

	constructor () {

		this.BLOCK_SIZE = 16;
		this.coefficients = 1;

		this.DCTMatrix = [];
		this.initDCTMatrix();

		this.imgCanvas = document.createElement( 'canvas' );
		this.imgCtx = this.imgCanvas.getContext( '2d' );

		this.tmpCanvas = document.createElement( 'canvas' );
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

	decode ( img ) {

		this.imgCanvas.width = img.width;
		this.imgCanvas.height = img.height;

		this.tmpCanvas.width = this.tmpCanvas.height = this.BLOCK_SIZE;

		this.imgCtx.drawImage( img, 0, 0 );

		const imgImageData = this.imgCtx.getImageData( 0, 0, this.BLOCK_SIZE, this.coefficients );
		const tmpImageData = this.tmpCtx.createImageData( this.BLOCK_SIZE, this.BLOCK_SIZE );

		this.inverseDCT( imgImageData.data, tmpImageData.data, this.BLOCK_SIZE, this.BLOCK_SIZE, this.coefficients );

		this.tmpCtx.putImageData( tmpImageData, 0, 0 );

	}

	inverseDCT (src, dst, width, height, num_coeff) {

		const temp = [];
		const acc = [];

		const res = [];
		for (let y_block_offset = 0; y_block_offset < height; y_block_offset += this.BLOCK_SIZE) {
			for (let x_block_offset = 0; x_block_offset < width; x_block_offset += this.BLOCK_SIZE) {
				for (var x = 0; x < this.BLOCK_SIZE; x++) {
					for (var k = 0; k < this.BLOCK_SIZE; k++) {
						var dst_offset = ((y_block_offset + k) * width + x_block_offset + x) * 4;
						temp[dst_offset + 0] = 0;
						temp[dst_offset + 1] = 0;
						temp[dst_offset + 2] = 0;

						for (var y = 0; y < num_coeff; y++) {
							var src_offset = ((y_block_offset + y) * width + x_block_offset + x) * 4;
							var v = this.DCTMatrix[y][k];
							temp[dst_offset + 0] += (src[src_offset + 0] - 128) * v;
							temp[dst_offset + 1] += (src[src_offset + 1] - 128) * v;
							temp[dst_offset + 2] += (src[src_offset + 2] - 128) * v;
						}
					}
				}

				for (var y = 0; y < this.BLOCK_SIZE; y++) {
					for (var k = 0; k < this.BLOCK_SIZE; k++) {
						var dst_offset = ((y_block_offset + y) * width + x_block_offset + k) * 4;
						acc[0] = 0;
						acc[1] = 0;
						acc[2] = 0;

						for (var x = 0; x < num_coeff; x++) {
							var src_offset = ((y_block_offset + y) * width + x_block_offset + x) * 4;
							var v = this.DCTMatrix[x][k];
							acc[0] += temp[src_offset + 0] * v;
							acc[1] += temp[src_offset + 1] * v;
							acc[2] += temp[src_offset + 2] * v;
						}

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

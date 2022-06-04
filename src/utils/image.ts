import { createCanvas, loadImage } from 'canvas'

export const unscrambleImage = async (inputImage: Buffer | string, width: number, height: number, scramble: number[]): Promise<Buffer> => {
	const image = await loadImage(inputImage)

	const canvas = createCanvas(width, height)
	const ctx = canvas.getContext('2d')

	for (let i = 0; i < scramble.length; i+=6) {
		const e = scramble[i + 4]
		const g = scramble[i + 5]

		ctx.drawImage(image, scramble[i + 2], scramble[i + 3], e, g, scramble[i], scramble[i + 1], e, g)
	}

	return canvas.toBuffer()
}

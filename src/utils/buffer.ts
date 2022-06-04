import { Readable, Stream } from 'stream'

export const toBuffer = async (stream: Stream): Promise<Buffer> => {
	return new Promise<Buffer>((resolve, reject) => {
		const _buf = Array<any>()
		stream.on("data", chunk => _buf.push(chunk))
		stream.on("end", () => resolve(Buffer.concat(_buf)))
		stream.on("error", err => reject(`error converting stream - ${err}`))
	})
}

export const toStream = async (buffer: Buffer): Promise<Readable> => {
	return Readable.from(buffer.toString())
}
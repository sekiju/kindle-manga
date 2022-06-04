import 'dotenv/config'
import { downloadBook } from './drm'

async function main() {
	if (!process.env.BOOK)
		throw 'Please setup BOOK environment variable in running command or in .env file'
	return downloadBook(`https://read.amazon.co.jp/manga/${process.env.BOOK}`)
}

main()
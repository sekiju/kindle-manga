import { fetch, request } from 'undici'
import { AMAZON_COOKIES, USER_AGENT } from './constants'
import { AmazonPage, AmazonScramble } from './types'
import { createWriteStream, existsSync, mkdirSync, readFile } from 'fs'
import { generateCorrelationId, getPageName } from './utils/string'
import { createUnzip } from 'node:zlib'
import { resolve } from 'path'
import archiver from 'archiver'
import axios from 'axios'
import { unscrambleImage } from './utils/image'

export const downloadBook = async (uri: string) => {
	const bookResponse = await fetch(uri, {
		headers: {
			'User-Agent': USER_AGENT,
			'Cookie': AMAZON_COOKIES,
		},
	}).then(res => {
		if (res.ok)
			return res.text()
		throw res
	}).catch(e => {
		console.log(e)
		return
	})

	if (!bookResponse)
		throw 'Cannot get Book, maybe you dont bought it.'

	console.log('Starting download book: ')

	const requestData = JSON.parse( bookResponse.split('<script type="application/json" id="txtBookManifest">')[1].split('</script>')[0] )
	const requestBook = JSON.parse( bookResponse.split('<script type="application/json" id="bookInfo">')[1].split('</script>')[0] )

	const resources = Object.keys(requestData.manifest.resources).map((key: string) => {
		return {
			name: key,
			...requestData.manifest.resources[key],
			url: JSON.parse(requestData.manifest.resources[key].url),
		}
	})

	const scrambles: AmazonScramble[] = []
	const pages: AmazonPage[] = []

	resources.filter(r => r.type === 'image/jpeg' || r.type === 'application/scramble-map+json')

	const path = `./files/${requestBook.asin}/`

	if (!existsSync(path))
		mkdirSync(path, { recursive: true })

	for (const resource of resources) {
		if (resource.type === 'image/jpeg' && resource.url.directUrl) {
			pages.push({
				name: resource.name,
				scrambleMapBundle: resource.scrambleMapBundle,
				url: resource.url.directUrl,
			})

			continue
		}

		const resourceResponse = await request(resource.url.cde, {
			headers: {
				'User-Agent': USER_AGENT,
				'Cookie': AMAZON_COOKIES,
				"Accept-Language": "en-US",
				"X-ADP-AttemptCount": "1",
				"X-ADP-CorrelationId": generateCorrelationId(),
				"X-ADP-Reason": "DevicePurchase",
				"X-ADP-SW": "1170760200",
				"X-ADP-Transport": "WiFi",
				"x-adp-authentication-token": requestBook.adpDeviceToken,
				"x-adp-request-digest": resource.url.requestDigest,
			},
		})

		if (resourceResponse.statusCode !== 307) {
			console.log(resourceResponse.statusCode)
			continue
		}

		const redirect = await resourceResponse.headers.location as string

		if (resource.type !== 'application/scramble-map+json') {
			if (resource.type === 'image/jpeg') {
				pages.push({
					name: resource.name,
					scrambleMapBundle: resource.scrambleMapBundle,
					url: redirect,
				})
			} continue
		}

		const redirectResponse = await request(redirect, {
			headers: {
				'User-Agent': USER_AGENT,
				'Cookie': AMAZON_COOKIES,
				"Accept-Language": "en-US",
				"X-ADP-AttemptCount": "1",
				"X-ADP-CorrelationId": generateCorrelationId(),
				"X-ADP-Reason": "DevicePurchase",
				"X-ADP-SW": "1170760200",
				"X-ADP-Transport": "WiFi",
				"x-adp-authentication-token": requestBook.adpDeviceToken,
				"x-adp-request-digest": resource.url.requestDigest,
			},
		})

		const unZip = createUnzip()
		await redirectResponse.body.pipe(unZip)
		const output = createWriteStream(resolve(path, resource.name))
		await unZip.pipe(output)

		output.on('finish', () => {
			output.end()

			readFile(resolve(path, resource.name), (err, data) => {
				if (err) {
					console.log(err)
					return
				}

				const json = JSON.parse(data.toString())

				Object.keys(json).map((key: string) => {
					scrambles.push({
						name: key,
						values: json[key],
					})
				})

				output.close()
			})
		})
	}

	const zipPath = resolve(path, `Images.zip`)
	const zipWriteStream = createWriteStream(zipPath)
	const archive = archiver('zip')

	archive.on('warning', err => {
		if (err.code === 'ENOENT')
			console.log('Warning:', err)
		else
			throw err
	})

	archive.on('error', err => { throw err })
	archive.pipe(zipWriteStream)

	return Promise.all(pages.map(async (page) => {
		const imageResponse = await axios.get(page.url, {
			responseType: "arraybuffer", // stream
			headers: {
				'Content-type': 'image/jpeg',
				'User-Agent': USER_AGENT,
				'Cookie': AMAZON_COOKIES,
			},
		}).then(res => {
			console.log(res.status)
			return res.data
		})

		const values = scrambles.find(s => s.name === page.name)?.values
		if (!values)
			return

		const nameArray = page.name.split('_')

		const unImage = await unscrambleImage(imageResponse, parseInt(nameArray[4]), parseInt(nameArray[5]), values)

		archive.append(unImage, { name:`${getPageName(nameArray[1])}.png` })
	})).then(async () => {
		await archive.finalize()
	}).then(() => {
		console.log('book downloading completed. check files folder')
	})
}

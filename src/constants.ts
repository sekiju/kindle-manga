import 'dotenv/config'

// Kindle Cloud Reader doesn't support Opera's UA
export const USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
export const AMAZON_COOKIES = process.env.AMAZON_COOKIES as string

if (!process.env.AMAZON_COOKIES)
	throw 'Please setup AMAZON_COOKIES environment variable in running command or in .env file'
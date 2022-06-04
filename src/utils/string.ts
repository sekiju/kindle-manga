const __gci = () => {
	return (65536 * (1 + Math.random()) | 0).toString(16).substring(1)
}

export const generateCorrelationId = () => {
	return __gci() + __gci() + "-" + __gci() + "-" + __gci() + "-" + __gci() + "-" + __gci() + __gci() + __gci()
}

export const getPageName = (index: number | string) => {
	const str = "" + index
	const pad = "000"

	return pad.substring(0, pad.length - str.length) + str
}
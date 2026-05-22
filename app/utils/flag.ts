const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/

export function getFlag(countryCode: string = '') {
  if (!countryCode || !COUNTRY_CODE_REGEX.test(countryCode))
    return void 0
  return String.fromCodePoint(...countryCode.split('').map(char => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0)))
}

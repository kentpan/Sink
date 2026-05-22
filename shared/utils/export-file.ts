const DOT_REGEX = /^\./

export function createExportFilename(prefix: string, extension: string, date = new Date()): string {
  const normalizedExtension = extension.replace(DOT_REGEX, '')
  const timestamp = date.toISOString().replaceAll(':', '-').replaceAll('.', '-')

  return `${prefix}-${timestamp}.${normalizedExtension}`
}

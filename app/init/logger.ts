import { File, Paths } from 'expo-file-system'
import {
  consoleTransport,
  logger,
  transportFunctionType
} from 'react-native-logs'

const LOG_FILENAME = 'wallet.log'
// Reset the log once it grows past this, emulating the previous single-file cap.
const MAX_LOG_BYTES = 512 * 1024

export function getLogFile(): File {
  return new File(Paths.document, LOG_FILENAME)
}

export function clearLogFile(): void {
  const file = getLogFile()
  if (file.exists) {
    file.delete()
  }
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg
  }
  if (arg instanceof Error) {
    return arg.stack ?? `${arg.name}: ${arg.message}`
  }
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

// Keep the legacy `> <ISO> [LEVEL] <msg>` line format so DeveloperScreen's
// existing log post-processing keeps working.
function formatLogLine(
  level: string,
  _extension: string | null,
  msgs: unknown
): string {
  const args = Array.isArray(msgs) ? msgs : [msgs]
  const text = args.map(stringifyArg).join(' ')
  return `> ${new Date().toISOString()} [${level.toUpperCase()}] ${text}`
}

// Appends each formatted line to wallet.log. expo-file-system's `File.write`
// overwrites rather than appends, so we seek to the end through a FileHandle
// (the same approach react-native-logs' own expo transport uses for the new
// File API).
const fileTransport: transportFunctionType<object> = ({ msg }) => {
  const file = getLogFile()
  if (!file.exists) {
    file.create()
  }
  const handle = file.open()
  try {
    handle.offset = handle.size ?? 0
    handle.writeBytes(new TextEncoder().encode(`${msg}\n`))
  } finally {
    handle.close()
  }
}

export async function initializeLogger() {
  // Bound growth: reset the file when it exceeds the cap before appending.
  const file = getLogFile()
  if (file.exists && file.size > MAX_LOG_BYTES) {
    file.delete()
  }

  const log = logger.createLogger({
    severity: 'debug',
    // consoleTransport tees to the native console (Metro / Xcode / Logcat);
    // fileTransport persists the same lines to wallet.log.
    transport: [consoleTransport, fileTransport],
    formatFunc: formatLogLine
  })

  // Route global console.* through the logger (replaces file-logger's
  // captureConsole). patchConsole keeps the original console for
  // consoleTransport, so native console output is preserved.
  log.patchConsole()
}

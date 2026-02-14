/**
 * Check if the environment supports color.
 */
export function supportsColor(): boolean {
  if (typeof process === 'undefined') {
    return false;
  }

  // Check for --no-color flag.
  if (process.argv?.includes('--no-color') || process.argv?.includes('--no-colors') || process.argv?.includes('--color=false')) {
    return false;
  }
  
  // Check for --color flag.
  if (process.argv?.includes('--color') || process.argv?.includes('--colors') || process.argv?.includes('--color=true') || process.argv?.includes('--color=always')) {
    return true;
  }

  // CI environments usually support color.
  if (process.env.CI) {
    return true;
  }

  // COLORTERM environment variable.
  if (process.env.COLORTERM) {
    return true;
  }

  // TERM environment variable.
  const envTerm = process.env.TERM;
  if (envTerm && envTerm !== 'dumb') {
    if (
      /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(envTerm)
    ) {
      return true;
    }
  }

  // Windows 10 build 10586+ supports ANSI color.
  if (process.platform === 'win32') {
    // Windows 10
    const osRelease = require('os').release().split('.');
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return true;
    }
    // Windows Terminal
    if (process.env.WT_SESSION) {
      return true;
    }
    return false;
  }

  // If stdout is not a TTY, color is not supported (unless forced or detected above).
  if (process.stdout && !process.stdout.isTTY) {
    return false;
  }

  return false;
}

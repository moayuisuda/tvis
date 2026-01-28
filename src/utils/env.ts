/**
 * Check if the environment supports color.
 */
export function supportsColor(): boolean {
  if (typeof process === 'undefined') {
    return false;
  }

  // Check for FORCE_COLOR environment variable.
  if (process.env.FORCE_COLOR) {
    if (process.env.FORCE_COLOR === 'true' || process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === '2' || process.env.FORCE_COLOR === '3') {
      return true;
    }
    if (process.env.FORCE_COLOR === 'false' || process.env.FORCE_COLOR === '0') {
      return false;
    }
  }

  // Check for AI assistant CLI environments (Weavefox/Claude/Gemini) only when not a TTY.
  if ((process.env.GEMINI_CLI || process.env.CLAUDE_CODE_SSE_PORT) && process.stdout && !process.stdout.isTTY) {
    return false;
  }

  // Check for NODE_DISABLE_COLORS environment variable (Node.js standard).


  // Check for --no-color flag.
  if (process.argv?.includes('--no-color') || process.argv?.includes('--no-colors') || process.argv?.includes('--color=false')) {
    return false;
  }
  
  // Check for --color flag.
  if (process.argv?.includes('--color') || process.argv?.includes('--colors') || process.argv?.includes('--color=true') || process.argv?.includes('--color=always')) {
    return true;
  }

  // If stdout is not a TTY, color is not supported (unless forced).
  if (process.stdout && !process.stdout.isTTY) {
    return false;
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

  // CI environments usually support color.
  if (process.env.CI) {
    return true;
  }

  // TERM environment variable.
  const envTerm = process.env.TERM;
  if (!envTerm || envTerm === 'dumb') {
    return false;
  }

  if (
    /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(envTerm)
  ) {
    return true;
  }
  
  // COLORTERM environment variable.
  if (process.env.COLORTERM) {
    return true;
  }

  return false;
}

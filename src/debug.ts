export function startDebug() {
  console.log('== DEBUG ==')
  return (...args: any[]) => {
    console.log('DEBUG: ', ...args)
  }
}

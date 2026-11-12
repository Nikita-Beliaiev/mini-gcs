import { tlogToFlightLog } from './tlogFlightLog'

addEventListener('message', (event: MessageEvent<ArrayBuffer>) => {
  postMessage(tlogToFlightLog(new Uint8Array(event.data)))
})

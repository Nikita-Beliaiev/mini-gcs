import type { SocketLike } from '../transport/webSocketTransport'

export class FakeSocket implements SocketLike {
  readyState = 0
  onmessage: SocketLike['onmessage'] = null
  onclose: SocketLike['onclose'] = null
  sent: string[] = []
  closed = false

  readonly url: string

  constructor(url: string) {
    this.url = url
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = 3
  }

  open(): void {
    this.readyState = 1
  }

  receive(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  receiveJson(message: unknown): void {
    this.receive(JSON.stringify(message))
  }

  dropConnection(): void {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }
}

export function fakeSocketFactory() {
  const sockets: FakeSocket[] = []
  return {
    sockets,
    openSocket: (url: string) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket
    },
    latest: (): FakeSocket => {
      const socket = sockets.at(-1)
      if (!socket) {
        throw new Error('No socket was opened')
      }
      return socket
    },
  }
}

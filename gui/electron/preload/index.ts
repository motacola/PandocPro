import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('pandocPro', {
  startConversion(payload: { docxPath: string; mdPath: string; mode: string; requestId: string }) {
    ipcRenderer.send('conversion:start', payload)
  },
  cancelConversion(requestId: string) {
    ipcRenderer.send('conversion:cancel', requestId)
  },
  onStdout(listener: (data: { requestId: string; chunk: string }) => void) {
    const channel = 'conversion:stdout'
    const handler = (_event: Electron.IpcRendererEvent, payload: { requestId: string; chunk: string }) =>
      listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },
  onStderr(listener: (data: { requestId: string; chunk: string }) => void) {
    const channel = 'conversion:stderr'
    const handler = (_event: Electron.IpcRendererEvent, payload: { requestId: string; chunk: string }) =>
      listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },
  onExit(listener: (data: { requestId: string; code: number }) => void) {
    const channel = 'conversion:exit'
    const handler = (_event: Electron.IpcRendererEvent, payload: { requestId: string; code: number }) =>
      listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },
  onError(listener: (data: { requestId: string; message: string }) => void) {
    const channel = 'conversion:error'
    const handler = (_event: Electron.IpcRendererEvent, payload: { requestId: string; message: string }) =>
      listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },
  async listDocuments() {
    return ipcRenderer.invoke('docs:list')
  },
  async listHistory(limit?: number) {
    return ipcRenderer.invoke('history:list', limit)
  },
  readFile(filePath: string) {
    return ipcRenderer.invoke('file:read', filePath)
  },
  writeFile(filePath: string, contents: string) {
    return ipcRenderer.invoke('file:write', filePath, contents)
  },
  pickDocument() {
    return ipcRenderer.invoke('file:pickDoc')
  },
  startWatch(payload: { docxPath: string; mdPath: string }) {
    return ipcRenderer.invoke('watch:start', payload)
  },
  stopWatch() {
    return ipcRenderer.invoke('watch:stop')
  },
  onWatchUpdate(listener: (data: any) => void) {
    const channel = 'watch:update'
    const handler = (_event: Electron.IpcRendererEvent, payload: any) => listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },
  getSystemInfo() {
    return ipcRenderer.invoke('system:info')
  },
  getSettings() {
    return ipcRenderer.invoke('settings:get')
  },
  updateDocsPath(path: string) {
    return ipcRenderer.invoke('settings:updateDocsPath', path)
  },
  chooseDocsPath() {
    return ipcRenderer.invoke('settings:chooseDocsPath')
  },
  updateSettings(payload: any) {
    return ipcRenderer.invoke('settings:update', payload)
  },
  getFaq() {
    return ipcRenderer.invoke('faq:get')
  },
  getLlmStatus() {
    return ipcRenderer.invoke('llm:status')
  },
  askFaqAi(payload: { question: string; answer: string; followUp: string }) {
    return ipcRenderer.invoke('faq:askAi', payload)
  },
  openInFolder(filePath: string) {
    return ipcRenderer.invoke('file:openInFolder', filePath)
  },
  openFile(filePath: string) {
    return ipcRenderer.invoke('file:open', filePath)
  },
  getTelemetry() {
    return ipcRenderer.invoke('telemetry:stats')
  },
})

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)

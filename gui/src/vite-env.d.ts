/// <reference types="vite/client" />
/// <reference path="./type/pandoc-pro.d.ts" />

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
}

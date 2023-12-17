import { app, BrowserWindow, shell, ipcMain, protocol, net } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'
import fs from 'fs'
import path from 'path'

const sqlite3 = require('sqlite3').verbose()
// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(process.env.VITE_PUBLIC, 'favicon.ico'),
    autoHideMenuBar: true,
    width: 800,
    height: 600,
    resizable: false, // 设置窗口不可放大缩小
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  win.webContents.on('console-message', (event, level, message) => {
    // 将消息记录到文件或其他日志输出方式
    // 例如，将消息写入文件
    const fs = require('fs')
    fs.appendFileSync('console.log', `${new Date().toISOString()}: [${level}] ${message}\n`)
  })

  const db = new sqlite3.Database('heroes.db', (err: any) => {
    if (err) {
      console.error('Could not open database', err)
    } else {
      console.log('Connected to the database')
    }
  })

  ipcMain.on('query-database', (event, att) => {
    const sql = `
      SELECT *
      FROM (
        SELECT ha.*, 
              ROW_NUMBER() OVER (PARTITION BY he.heroCode ORDER BY he.rate DESC) as rn
        FROM hero_equip he
        JOIN hero_ability ha ON he.heroCode = ha.heroCode
        WHERE he.equip_list LIKE '%' || ? || '%'
      ) 
      WHERE rn = 1
    `


    db.all(sql, [att], (err, rows) => {
      if (err) {
        console.error('Error querying database', err)
        event.sender.send('query-result', { error: err.message })
      } else {
        event.sender.send('query-result', { data: rows })
      }
    })
  })
}

app.whenReady().then(() => {
  protocol.handle('tiezhu', (request) =>
    net.fetch('file://' + request.url.slice('tiezhu:/'.length))
  )
  createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

app.commandLine.appendSwitch('disable-features', 'WidgetLayering')

const logPath = path.join(process.cwd(), 'error.log')

process.on('uncaughtException', (error) => {
  fs.appendFileSync(logPath, `${new Date().toISOString()}: ${error.stack}\n`)
})
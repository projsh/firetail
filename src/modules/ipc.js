import { app, ipcMain, shell } from 'electron'
import fs from 'fs'
import db from './database'
import files from './files'
import server from './server'
import BurnJob from './burn'

export default {
    start(win) {
        ipcMain.on('addToLibrary', async (event, locations) => {
            if (locations.length <= 0) return
            win.webContents.send('startOrFinish', true)
            let songs = await files.processFiles(locations)
            db.addToLibrary(songs)
            let library = db.getLibrary()
            win.send('library', library)
        })

        ipcMain.on('library', async () => {
            let library = db.getLibrary()
            win.send('library', library)
        })

        ipcMain.on('deleteLibrary', () => {
            db.deleteLibrary()
            win.send('library', [])
        })

        ipcMain.on('deleteSome', (event, ids) => {
            db.deleteSome(ids)
            let library = db.getLibrary()
            win.send('library', library)
        })

        ipcMain.on('getAllFromColumn', (event, column) => {
            console.log(column)
            let allColumn = db.getAllFromColumn(column)
            win.send('getAllFromColumn', allColumn)
        })

        ipcMain.on('getSomeFromColumn', (event, args) => {
            let someColumn = db.getSomeFromColumn(args[0], args[1])
            event.reply('library', someColumn)
        })

        ipcMain.on('addFavourite', (event, id) => {
            db.addToFavourite(id)
            let favourites = db.getFavourites()
            event.reply('getFavourites', favourites)
        })

        ipcMain.on('removeFavourite', (event, id) => {
            db.removeFromFavourite(id)
            let favourites = db.getFavourites()
            event.reply('getFavourites', favourites)
        })

        ipcMain.on('getFavourites', event => {
            let favourites = db.getFavourites()
            event.reply('getFavourites', favourites)
        })

        ipcMain.handle('hasCustomLanguage', () => {
            if (app.commandLine.hasSwitch('lang')) {
                let locale = app.commandLine.getSwitchValue('lang')
                return locale
            } else {
                return false
            }
        })

        ipcMain.on('openLink', (event, link) => {
            shell.openExternal(link)
        })

        ipcMain.handle('getSpotifyDetails', () => {
            return db.fetchSpotifyDetails()
        })

        ipcMain.handle('getVersion', () => {
            let ver = app.getVersion()
            return ver
        })

        ipcMain.handle('getBuildNum', async () => {
            let buildNum = 'unknown'
            if (app.isPackaged) {
                buildNum = (await fs.promises.readFile(`${__dirname}/build.txt`)).toString()
            } else {
                buildNum = 'dev'
            }
            return buildNum
        })

        ipcMain.handle('getPort', () => {
            return server.app.get('port')
        })

        ipcMain.handle('canBurn', async () => {
            return await BurnJob.canBurn();
        });

        ipcMain.handle('burn', (event, options) => {
            console.log("burn job requested");

            //TODO: make sure we're on Linux
            if (process.platform === "linux") {
                let burnJob = new BurnJob(options, event.sender);
                return burnJob.id;
            } else {
                return null;
            }
        });

        ipcMain.handle('getSomeFromMultiColumn', (event, args) => {
            let columns = db.getSomeFromMultiColumn(args[0], args[1])
            return columns
        })

        ipcMain.on('getAllFromColumnWithArtist', () => {
            let albumWithArtist = db.getAllFromColumnWithArtist()
            win.send('getAllWithColumnArtist', albumWithArtist)
        })

        win.webContents.on('did-navigate-in-page', () => {
            const checkNav = {
                back: win.webContents.canGoBack(),
                forward: win.webContents.canGoForward()
            }
            win.send('updateNav', checkNav)
        })

        ipcMain.on('clearHistory', () => {
            win.webContents.executeJavaScript("history.pushState({}, '', location.href)");
            win.webContents.clearHistory()
        })
    }
}
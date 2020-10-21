import sort from '../../modules/sort'
import store from '../index'
import tr from '../../translation'
import { ipcRenderer } from 'electron'

const state = () => ({
    paused: true,
    currentTime: '-:--',
    duration: '-:--',
    songTitle: tr.t('playingBar.songTitleNotPlaying'),
    songArtist: '',
    currentSong: null,
    currentSongIndex: null,
    queue: [],
    currentList: []
})

const mutations = {
    audioTime(state) {
        if (audio) {
            state.currentTime = audio.currentTime
        }
    },
    newAudioTime(state, newTime) {
        if (audio) {
            audio.currentTime = newTime
        }
    },
    audioDur(state) {
        if (audio) {
            state.duration = audio.duration
        }
    },
    timeUpdate(state, durCur) {
        state.duration = durCur[0]
        state.currentTime = durCur[1]
    },
    songMetadata(state, meta) {
        state.songTitle = meta[0]
        state.songArtist = meta[1]
    },
    updatePause(state) {
        if (audio.paused) {
            state.paused = true
        } else {
            state.paused = false
        }
    },
    updateCurrentSong(state, id) {
        state.currentSongIndex = id
    },
    updateCurrentSongString(state, id) {
        state.currentSong = id
    },
    genNewQueue(state, songs) {
        state.queue = songs
        console.log(this)
        this.commit('nav/updatePlayingView', this.state.nav.currentView)
    },
    updateCurrentList(state, list) {
        let sortedList = sort.sortArray(list, 'artist')
        state.currentList = sortedList
        this.commit('nav/updateScreenCountNum', list.length)
    }
}

const actions = {
    playPause() {
        if (audio.paused) {
            audio.play()
        } else {
            audio.pause()
        }
    },
    playSong(context, song) {
        if (!audio.src) {
            audio.addEventListener('ended', () => {
                context.dispatch('playSong', context.state.queue[context.state.currentSongIndex + 1])
            })
        }
        audio.src = `local-resource://${song.path}`
        context.commit('updateCurrentSong', context.state.queue.indexOf(song))
        context.commit('updateCurrentSongString', song.id)
        context.commit('songMetadata', [song.title, song.artist])
        audio.play()
        audio.addEventListener('timeupdate', timeUpdate)
        audio.addEventListener('pause', () => {
            context.commit('updatePause')
        })
        audio.addEventListener('play', () => {
            context.commit('updatePause')
        })
        updateMediaSession(song)
    },
    removeTimeUpdate() {
        audio.removeEventListener('timeupdate', timeUpdate)
    },
    addTimeUpdate() {
        audio.addEventListener('timeupdate', timeUpdate)
    },
    getAllSongs() {
        ipcRenderer.send('library')
    },
    getSpecificSongs(context, args) {
        ipcRenderer.send('getSomeFromColumn', [args.column, args.q])
    }
}

let audio = new Audio();

let timeUpdate = function() {
    store.commit('audio/timeUpdate', [audio.duration, audio.currentTime])
}

let updateMediaSession = song => {
    let metadata = {
        title: song.title,
        artist: song.artist,
        album: song.album,
    }
    if (song.hasImage == 1) {
        let artistAlbum = `${song.artist}${song.album}`.replace(/[.:<>"*?/{}()'|[\]\\]/g, '_')
        metadata['artwork'] = [{src: `http://localhost:56741/${artistAlbum}.jpg`, sizes: '512x512', type: 'image/jpeg'}]
    }
    setSkipPrevButtons()
    navigator.mediaSession.metadata = new window.MediaMetadata(metadata)
}

let skip = () => {
    store.dispatch('audio/playSong', store.state.audio.queue[store.state.audio.currentSongIndex + 1])
}

let prev = () => {
    store.dispatch('audio/playSong', store.state.audio.queue[store.state.audio.currentSongIndex - 1])
}

let setSkipPrevButtons = () => {
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', skip);
}

export default {
    namespaced: true,
    state,
    actions,
    mutations
}
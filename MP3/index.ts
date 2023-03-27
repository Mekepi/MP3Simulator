//import os from "node:os"
//import fs from "node:fs"
//const getMP3Duration = require('.')


class Album {
    
    songs: Song[] = [];
    author?: string;
    releaseDate?: number;
    duration: number = 0;
    numberOfSongs: number = 0;

    constructor(addingSongs:Song[]){
        this.numberOfSongs = addingSongs.length;
        for (let i=0; i<addingSongs.length; ++i) {
            this.songs.push(addingSongs[i]);
            this.duration += addingSongs[i].duration;
        }
    };
}

class Song {
    author?: string;
    releaseDate?: string;
    duration: number;
    originAlbum?: Album;
    filePath:string;

    /*constructor(path:string) {
        this.filePath = path;
        this.duration = getMP3Duration(path);
    }*/
    constructor (path:string, mp3duration:number) {
        this.duration = mp3duration;
        this.filePath = path;
        
    }
}

type Playlist = Song[];

function addToPlaylist (song:Song, playlist:Playlist) {
    playlist.push(song);
    return true;
}

const Roses = new Song("abc", 36);
var Flores:Playlist = []; 
console.log(addToPlaylist (Roses, Flores));
//import os from "node:os"
import fs from "node:fs"
import path from "node:path"

const { getAudioDurationInSeconds } = require('get-audio-duration');

const printf = function (anything:any) {console.log(anything)};

async function waitingDuration (pth:string){
    let temp;
    await getAudioDurationInSeconds(pth).then((seconds:number) => {temp = seconds});
    return temp;
};

function toTime (duration:number) {
    let tempo = '';
    if (duration>3599) {
        tempo += `${parseInt(`${duration/3600}`)}:`;
        duration%=3600;
        if (duration/60<10) tempo+= '0';
    };
    tempo += `${parseInt(`${duration/60}`)}:`; duration%=60;
    if (duration<10) tempo += '0';
    tempo += `${parseInt(`${duration}`)}`;
    return tempo;
};

class Song {
    readonly name: string;
    readonly duration: number;
    songPath:string;
    author?: string;
    releaseDate?: string;
    originAlbum?: Album;
    inPlaylists: Playlist[] = [];
    
    constructor(pth:string, duration:number, name:string) {
        this.name = name;
        this.duration = duration;
        this.songPath = pth;
    };

    delete() {
        fs.unlinkSync(this.songPath);
        songArray.splice(songArray.indexOf(this),1);
        Object.keys(this).forEach((key) => {delete this[key]});
    };
    
    print(notSongLb?:boolean) { 
        let texto = "Song: ";
        if (notSongLb) {
            texto = "- ";
            texto += `${this.name} (${toTime(this.duration)})`;
        } else {
            texto += `${this.name} (${toTime(this.duration)})`;
            if (this.author) texto += `\nAuthor: ${this.author}`;
            if (this.releaseDate) texto += `\nRelease Date: ${this.releaseDate}`;
            if (this.originAlbum) texto += `\nÁlbum: ${this.originAlbum.name}`;
        }
        return (texto+"\n");
    };
};

async function addSong (pth:string, name?:string) {
    let possibleName = pth.slice(pth.lastIndexOf("-")+2, pth.length-4);
    if (name) {possibleName = name};
    if (songArray.findIndex((searching) => {searching.songPath == pth || searching.name == possibleName}) !== -1) {
        printf("--Already in");
    } else {
        await waitingDuration(pth).then((duration:number) => {
            songArray.push(new Song (pth, duration, possibleName));
            //songArray[possibleName] = new Song (pth, duration, possibleName)
            songArray.sort((a, b) => a.name.localeCompare(b.name));
        });
    };
};

function deleteSong (name:string) {
    let i:number = 0;
    for (i; i < songArray.length && name !== songArray[i].name; ++i) {};
    if (i === songArray.length) {printf("--Song not found")}
    else {
        if (songArray[i].inPlaylists.length > 0) {
            printf(songArray[i].print())
            songArray[i].inPlaylists.forEach((playlist) => {
                playlist.removeSong(songArray[i].name);
            });
        }
        if (songArray[i].originAlbum) {
            printf(songArray[i].print())
            songArray[i].originAlbum.deletingSong(songArray[i]);
        }
        printf(songArray[i].print()) //Problema de memória. Está apagando ++i, nas com menos ações, a função funciona perfeitamente.
        songArray[i].delete(); // Logo afeta o próximo.
    }
};

class Album {
    readonly name: string;
    protected numberOfSongs: number = 0;
    protected songs: Song[];
    protected duration: number = 0;
    protected albumPath: string;
    author?: string;
    releaseDate?: number;

    constructor(name: string, addingSongs:Song[]) {
        if (!this.albumPath) {
            fs.mkdir(`${__dirname}\\${name}`,() => {});
            this.albumPath =`${__dirname}\\${name}`;
        };
        this.name = name;
        this.songs = addingSongs;
        this.numberOfSongs = addingSongs.length;
        for (let i=0; i<addingSongs.length; ++i) {
            this.duration += addingSongs[i].duration;

            let newFilePath: string = this.albumPath+addingSongs[i].songPath.slice(addingSongs[i].songPath.lastIndexOf("\\")); 

            //SEM APAGAR DA ORIGEM
            /*fs.copyFileSync(addingSongs[i].songPath, newFilePath);
            addingSongs[i].songPath = this.albumPath+addingSongs[i].songPath.slice(addingSongs[i].songPath.lastIndexOf("\\"));
            addingSongs[i].originAlbum = this;*/

            //APAGANDO DA ORIGEM
            fs.copyFileSync(addingSongs[i].songPath, newFilePath);
            fs.unlinkSync(addingSongs[i].songPath)
            addingSongs[i].songPath = newFilePath;
            addingSongs[i].originAlbum = this;
        }
        albumArray.push(this);
    };

    delete() {
        this.songs.forEach((song) => {
            song.delete();
        })
        fs.rmdir(this.albumPath, (() => {
            Object.keys(this).forEach ((key) => {delete this[key]});
        }));
    };

    deletingSong (song:Song) {
        let i:number = this.songs.indexOf(song);
        if (i!==-1) {
            --this.numberOfSongs;
            this.duration -= song.duration;
            this.songs.splice(i,1);
            this.print();
        };
    };

    getSong(name:string) {
        let tempSong:Song = this.songs[0];
        this.songs.forEach(song => {
            if (song.name == name) {
                tempSong = song;
            };
        });
        if (tempSong == this.songs[0]) {printf("--Song not found. Using 1st song.");};
        return tempSong;
    };

    getSongs () {
        return this.songs;
    };

    getNumberOfSongs () {
        return this.numberOfSongs;
    };

    print() {
        let texto = `Album: ${this.name} [${this.numberOfSongs}]\n\n`;
        for (let i = 0; i<this.songs.length; ++i) {texto += `${this.songs[i].print(true)}`};
        texto += `\nDuration: ${toTime(this.duration)}`;
        if (this.author) texto += `\n\tAuthor: ${this.author}`;
        if (this.releaseDate) texto += `\n\tRelease Date: ${this.releaseDate}`;
        printf(texto+"\n");
    };
}

class Playlist {
    name: string;
    protected songs: Song[] = [];
    protected duration: number = 0;
    protected numberOfSongs: number = 0;
    
    constructor (name: string){
        this.name = name;
        playlistArray.push(this);
    };

    delete() {
        Object.keys(this).forEach ((key) => {delete this[key]});
    };

    addSong (song:Song, notprint?:boolean) {
        if (this.songs.indexOf(song)==-1) {
            this.songs.push(song);
            ++this.numberOfSongs;
            this.duration += song.duration;
            song.inPlaylists?.push(this);
            if (!notprint) this.print();
            return;
        };
        return "Already in";
    };

    addAlbum (album:Album) {
        for (let i = 0; i<(album.getNumberOfSongs()); ++i) {
            this.addSong(album.getSongs()[i], true);
        }
        this.print();
    };

    removeSong (name:string) {
        let i:number = 0;
        for (i; (i < this.songs.length) && (this.songs[i].name !== name); ++i) {};
        if (i === this.songs.length) {printf("--Song not found")}
        else {
            this.duration -= this.songs[i].duration;
            --this.numberOfSongs;
            this.songs.splice(i, 1)
            this.print();
        }
    };

    print() {
        let texto = `Playlist: ${this.name} [${this.numberOfSongs}]\n`;
        for (let i = 0; i<this.songs.length; ++i) {texto += `${this.songs[i].print(true)}`};
        texto += `\nDuration: ${toTime(this.duration)}`;
        printf(texto+"\n");
    };
};

function addFolder (pth:string) {
    const fullPath = path.join(__dirname, pth);
    fs.readdir(fullPath, (error, songs) => {
        if (error) console.log(error);
        songs.forEach((song) => {
            addSong(fullPath+song).then(() => {
                if (songs[songs.length-1] === song) {
                    continue1();
                };
            });
        });
    });
}

var songArray: Song[] = [];
var albumArray: Album[] = [];
var playlistArray: Playlist[] = [];


addFolder("Songs\\");

function continue1() {

    const Innerspeaker = new Album ("Innerspeaker", songArray);

    Innerspeaker.print()

    const Play1 = new Playlist("Só as brabas");

    Play1.addSong(Innerspeaker.getSong("Expectation"));
    
    Play1.addAlbum(Innerspeaker);
    
    Play1.removeSong("Alter ego");
    
    console.log(songArray, songArray.length); //até aqui, ok

    printf("\n-------------------------------------")
    
    deleteSong("Lucidity"); // A memória muda sozinha o nome da música para a próxima quando antes de executar deleteSong();

    console.log(songArray, songArray.length);
};

function continue2 () {
    const Innerspeaker = new Album ("Innerspeaker", songArray);

    Innerspeaker.print();

    const Play1 = new Playlist("Só as brabas");
    
    Play1.addSong(Innerspeaker.getSong("Expectation"));

    Play1.addAlbum(Innerspeaker);
    
    Play1.removeSong("Alter ego");
    
    /*Innerspeaker.delete();
    printf(Innerspeaker);
    Play1.print();

    Play1.delete();
    printf(Play1);
    */
};

function continue3 () {

    printf(songArray);

    printf("\n-------------------------------------")

    deleteSong("Alter ego");

    printf("\n-------------------------------------")

    printf(songArray);
};
//import os from "node:os"
import fs from "node:fs"
import path from "node:path"

const { getAudioDurationInSeconds } = require('get-audio-duration');

const printf = function (anything:any) {console.log(anything)};

async function waitingDuration (pth:string){
    let temp;
    await getAudioDurationInSeconds(pth).then((seconds:number) => {temp = seconds})
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

    delete(notPrint?:boolean) {
        if (this.inPlaylists.length > 0) {
            if(!notPrint) printf(`--${this.print(true)}`);
            const total = this.inPlaylists.length;
            for (let i=0; i<total; ++i) {this.inPlaylists[0].removeSong(this.name, notPrint)};
        }
        if (this.originAlbum) {
            if(!notPrint) printf(`--${this.print()}\n`)
            this.originAlbum.deletingSong(this, notPrint);
        }
        fs.unlinkSync(this.songPath);
        delete songArray[this.name];
        //for (let i = 0; i<Object.keys(this).length; ++i) {delete this[Object.keys(this)[i]]};
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
    if (!songArray[possibleName]) {
        await waitingDuration(pth).then((duration:number) => {
            songArray[possibleName] = new Song (pth, duration, possibleName)
        });
    } else {
        printf("--Already in");
    };
};

function deleteSong (name:string) {
    if (songArray[name]) songArray[name].delete();
    else printf("--Song not found");
};

class Album {
    readonly name: string;
    protected numberOfSongs: number = 0;
    protected songs: Song[] = [];
    protected duration: number = 0;
    protected albumPath: string;
    author?: string;
    releaseDate?: number;

    constructor(name: string, addingSongs:Song[]) {
        if (!this.albumPath) {
            fs.mkdirSync(`${__dirname}\\Albums\\${name}`, {recursive: true});
            this.albumPath =`${__dirname}\\Albums\\${name}`;
        };
        this.name = name; 
        this.numberOfSongs = Object.keys(addingSongs).length;
        for (let i=0; i<Object.keys(addingSongs).length; ++i) {
            let temp:Song = addingSongs[Object.keys(addingSongs)[i]];
            this.songs.push(temp);
            this.duration += temp.duration;
            let newFilePath: string = this.albumPath+temp.songPath.slice(temp.songPath.lastIndexOf("\\")); 

            //SEM APAGAR DA ORIGEM
            /*fs.copyFileSync(temp.songPath, newFilePath);
            temp.songPath = this.albumPath+temp.songPath.slice(temp.songPath.lastIndexOf("\\"));
            temp.originAlbum = this;*/

            //APAGANDO DA ORIGEM
            fs.copyFileSync(temp.songPath, newFilePath);
            fs.unlinkSync(temp.songPath);
            temp.songPath = newFilePath;
            temp.originAlbum = this;
        };
        albumArray[this.name] = this;
        this.print();
    };

    delete() {
        const total = this.songs.length;
        for (let i = 0; i<total; ++i) {
            this.songs[0].delete(true);
        };
        fs.rmdirSync(this.albumPath);
        const total2 = Object.keys(this).length;
        for (let i=0; i<total2; ++i) {delete this[Object.keys(this)[0]]};
    };

    deletingSong (song:Song, notPrint?:boolean) {
        let i:number = this.songs.indexOf(song);
        if (i!==-1) {
            --this.numberOfSongs;
            this.duration -= song.duration;
            this.songs.splice(i,1);
            if (!notPrint) this.print();
        } else printf(`--Not in ${this.name}`)
    };

    getSong(name:string) {
        let i = this.songs.indexOf(songArray[name]);
        if (i != -1) {
            return songArray[name];
        } else {
            printf("--Song not found. Using 1st song.");
            return this.songs[0];
        }
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
        playlistArray[name] = this;
    };

    delete() {
        const total = Object.keys(this).length;
        for (let i=0; i<total; ++i) {delete this[Object.keys(this)[0]]}
    };

    addSong (song:Song, notprint?:boolean) {
        if (this.songs.indexOf(song)==-1) {
            this.songs.push(song);
            ++this.numberOfSongs;
            this.duration += song.duration;
            song.inPlaylists.push(this);
            if (!notprint) this.print();
        } else return "Already in";
    };

    addAlbum (album:string) {
        if (albumArray[album]) {
            for (let i = 0; i<albumArray[album].getNumberOfSongs(); ++i) {
                this.addSong(albumArray[album].getSongs()[i], true);
            }
            this.print();
        } else printf("--Album not found")
        
    };

    removeSong (name:string, notPrint?:boolean) {
        let i = this.songs.indexOf(songArray[name]);
        if (i != -1) {
            this.duration -= this.songs[i].duration;
            if (this.duration < 1) this.duration = 0;
            --this.numberOfSongs;
            this.songs.splice(i, 1)
            if(!notPrint) this.print();
        }
        else if(!notPrint) printf(`--${name} not found in ${this.name}`);
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
                    continue2();
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

    const Play1 = new Playlist("Só as brabas");

    Play1.addSong(Innerspeaker.getSong("Expectation"));
    
    Play1.addAlbum(albumArray["Innerspeaker"]);
    
    Play1.removeSong("Alter ego");
    
    console.log(Object.keys(songArray).length);

    printf("\n-------------------------------------")
    
    deleteSong("Lucidity");

    console.log(songArray, Object.keys(songArray).length);
};

function continue2 () {
    const Innerspeaker = new Album ("Innerspeaker", songArray);

    const Play1 = new Playlist("Só as brabas");
    
    //Play1.addSong(Innerspeaker.getSong("Expectation"));

    Play1.addAlbum("Innerspeaker");
    
    Play1.removeSong("Alter ego");
    
    Innerspeaker.delete();
    printf(Innerspeaker);
    Play1.print();

    Play1.delete();
    printf(Play1);
    
    printf(songArray);
};
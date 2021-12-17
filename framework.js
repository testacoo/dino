import {confetti} from 'dom-confetti'

let ID_COUNTER = 0;
const SpeechRecognition = SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

export class Action {
    constructor() {
        this.id = 'action' + (++ID_COUNTER);
    }
    invoke(game) {
        console.error("Unimplemented action type", this.constructor)
    }
    state(game) {
        if(!game.state[this.id]) {
            game.state[this.id] = {}
        }
        return game.state[this.id]
    }
}

export class ModifyOnce extends Action {
    constructor({apply, voice: {modified, already}}) {
        super()
        this.apply = apply
        this.modified_action = new Voice(modified);
        this.already_action = new Voice(already);
    }
    invoke(game) {
        let state = this.state(game);
        if(state.visited) {
            this.already_action.invoke(game)
        } else {
            for(let [k, v] of Object.entries(this.apply)) {
                game.inventory[k] += v;
            }
            state.visited = true;
            this.modified_action.invoke(game);
        }
    }
}

export class Voice extends Action {

    constructor(...labels) {
        super()
        let all_labels = []
        for(let item of labels) {
            if(Array.isArray(item)) {
                all_labels = all_labels.concat(item);
            } else {
                all_labels.push(item);
            }
        }
        this.labels = all_labels;
    }
    invoke(game) {
        let item = this.labels[Math.trunc(Math.random()*this.labels.length)];
        if(typeof item == 'function') {
            item = item(game.inventory);
        }
        game.speak(item);
    }

}

export class GoTo extends Action {

    constructor(room) {
        super()
        this.room = room
    }
    invoke(game) {
        game.enter_room(this.room);
    }

}


export class Win extends Voice {
    invoke(game) {
        super.invoke(game);
        game.finish();
    }
}

function confetti3() {
    let i = 2;
    const options = {
        spread: 120,
    }
    confetti(document.getElementById('confetti_center'), options);
    let ivl = setInterval(() => {
        if(--i <= 0) clearInterval(ivl);
        confetti(document.getElementById('confetti_center'), options);
    }, 1000);
}


export class Game {
    constructor(setup) {
        this.setup = setup;
        this.accessible = false;
        this.started = false;
        this.cancel_voice = () => {};
    }
    attach(element) {
        this.base = element;
        this.caption_el = element.querySelector('#caption');
        this.choices_el = element.querySelector('#choices');
        this.picture_el = element.querySelector('#main_img');
        element.querySelector("#restart")
            .addEventListener("click", () => this.restart())
        element.querySelector("#accessible")
            .addEventListener("click", () => this.toggle_accessibility())
        element.querySelector("#microphone")
            .addEventListener("click", () => {
                if(this.started) {
                    this.setup_voice()
                } else {
                    this.start()
                }
            })
    }
    start() {
        if(!this.started) {
            this.caption_el.classList.add('hidden');
            this.choices_el.classList.add('hidden');
            this.restart()
        }
    }
    restart() {
        console.log("(Re)started")
        this.state = {}
        this.started = true;
        this.inventory = {...this.setup.inventory}
        this.enter_room(this.setup.start_room)
        this.update()
    }
    enter_room(room) {
        this.room = room;
        this.current_room = this.setup.maze[room];
        let pic = this.current_room.picture;
        console.log("PIC", pic)
        if(pic) {
            this.picture_el.src = pic;
        }
        this.do_action(this.current_room.enter, str => new Voice(str));

    }
    toggle_accessibility() {
        if(this.accessible) {
            this.caption_el.classList.add('hidden');
            this.choices_el.classList.add('hidden');
            this.accessible = false;
        } else {
            if(!this.started) {
                this.start();
            }
            this.caption_el.classList.remove('hidden');
            this.choices_el.classList.remove('hidden');
            this.accessible = true;
        }
    }
    trigger_action(name) {
        let action = this.current_room.actions[name];
        this.do_action(action, str => new GoTo(str))
        this.update()
    }
    do_action(action, str_func) {
        if(typeof action == 'string') {
            this.do_action(str_func(action));
        } else if(Array.isArray(action)) {
            let one = action[Math.trunc(Math.random() * action.length)];
            this.do_action(one)
        } else if(action instanceof Action) {
            action.invoke(this);
        } else {
            console.error("Undefined action type", action)
        }
    }
    update() {
        clear(this.choices_el);
        for(let action in this.current_room.actions) {
            let label = this.setup.actions[action][0];
            let button = document.createElement('button');
            button.textContent = label;
            button.classList.add('choice');
            button.addEventListener('click', () => this.trigger_action(action));
            this.choices_el.appendChild(button);
        }
        for(let [k, v] of Object.entries(this.inventory)) {
            if(typeof(v) == 'number') {
                this.base.querySelector('#' + k).textContent = String(v);
            }
        }
    }
    setup_voice() {
        this.cancel_voice();
        console.log("Recognizing...");
        var recognition = new SpeechRecognition();
        var speechRecognitionList = new SpeechGrammarList();
        var done = false;
        for(let action in this.current_room.actions) {
            let options = this.setup.actions[action];
            for(let opt of options) {
                var grammar = '#JSGF V1.0; grammar phrase; public <phrase> = ' + opt.toLowerCase() +';';
                speechRecognitionList.addFromString(grammar, 1);
            }
        }
        recognition.grammars = speechRecognitionList;
        recognition.lang = 'uk-UA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();
        recognition.onresult = (event) => {
            if(done)
                return;
            let word = event.results[0][0].transcript;
            for(let action in this.current_room.actions) {
                let options = this.setup.actions[action];
                for(let opt of options) {
                    if(opt.toLowerCase() == word) {
                        this.trigger_action(action);
                        done = true;
                        return
                    }
                }
            }
        }
        recognition.onend = (e) => {
            if(!done) {
                let choices = []
                for(let action in this.current_room.actions) {
                    let options = this.setup.actions[action];
                    choices.push(options[
                        Math.trunc(Math.random()*options.length)
                    ])
                }
                this.speak('Не зрозуміло. Скажіть: ' + choices.join(' або '));
            }
        }
        this.cancel_voice = () => done = true;
    }
    speak(text) {
        let voice = speechSynthesis.getVoices()
            .filter(v => v.lang == 'uk_UA');
        this.caption_el.textContent = text;
        console.log("SPEAKING:", text)
        var msg = new SpeechSynthesisUtterance(text);
        msg.voice = voice[0];
        msg.onend = () => {
            if(this.started) {
                this.setup_voice();
            }
        }
        window.speechSynthesis.speak(msg);
        if(!voice.length) {
            this.base.querySelector("#mute").classList.add("active");
            console.log("SPEAKING SILENTLY:", text)
            if(!this.accessible) this.toggle_accessibility();
            this.setup_voice();
        } else {
            this.base.querySelector("#mute").classList.remove("active");
        }
    }
    finish() {
        this.cancel_voice();
        this.started = false;
        confetti3();
    }
}

function clear(el) {
    while(el.firstChild) {
        el.removeChild(el.lastChild);
    }
}

import {Game, Action, ModifyOnce, Voice, Win} from './framework'

const inventory = {
    coins: 0,
}
const start_room = 'room1'
const maze = {
    room1: {
        enter: `Привіт, ти у лабіринті.`,
        picture: require('./location_images/welcome.svg'),
        actions: {
            north: 'room2',
        },
    },
    room2: {
        enter: `Тут є скриня.`,
        picture: require('./location_images/treasure.svg'),
        actions: {
            north: 'room3',
        },
    },
    room3: {
        enter: `Невеличка дерев'яна скринька`,
        picture: require('./location_images/road_sign.svg'),
        actions: {
            north: 'room4',
            east: 'room5',
        },
    },
    room4: {
        picture: require('./location_images/dead_end.svg'),
        enter: `З'явився привид і вкрав у вас 10 монет`,
        actions: {
            south: 'room3',
        },
    },
    room5: {
        picture: require('./location_images/win.svg'),
        enter: new Win(player => `Ви виграли ${player.coins} монет`),
    },
}
const actions = {
    north: ['північ', 'піти на північ'],
    south: ['південь', 'піти на південь'],
    east: ['схід', 'піти на схід'],
    west: ['захід', 'піти на захід'],
    open: ['відкрити', 'відкрити скриню'],
}

new Game({maze, actions, inventory, start_room}).attach(document.body)

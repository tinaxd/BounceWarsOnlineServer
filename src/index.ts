import net = require('net');
import msgpack = require('@msgpack/msgpack');
import util = require('util');

function showObject(obj: Object) {
    console.log(util.inspect(obj, { compact: true, colors: true, depth: null }));
}

class Pawn {
    idx: number;
    x: number;
    y: number;
    z: number;
    hp: number;
    ownerPlayer?: Player;

    serialize(): {
        x: number,
        y: number,
        z: number
    } {
        return {
            x: this.x,
            y: this.y,
            z: this.z
        }
    }
}

class Player {
    uuid: number;
    pawns: Map<number, Pawn>; // idx => Pawn

    constructor(uuid: number) {
        this.uuid = uuid;
        this.pawns = new Map();
    }

    addPawn(pawnIdx: number, pawn: Pawn) {
        pawn.ownerPlayer = this;
        pawn.idx = pawnIdx;
        this.pawns.set(pawnIdx, pawn);
    }

    serialize(): {
        uuid: number,
        pawns: Map<number, {
            x: number,
            y: number,
            z: number
        }>
    } {
        const pawnMap = new Map<number, { x: number, y: number, z: number }>();
        this.pawns.forEach((v, k) => {
            pawnMap.set(k, v.serialize());
        });
        return {
            uuid: this.uuid,
            pawns: pawnMap
        };
    }
}

class GameState {
    players: Map<number, Player>; // uuid => Player

    constructor() {
        this.players = new Map<number, Player>();
    }

    addUuid(uuid: number) {
        this.players.set(uuid, new Player(uuid));
    }

    serialize(): {
        players: Map<number, {
            uuid: number,
            pawns: Map<number, {
                x: number,
                y: number,
                z: number
            }>
        }>
    } {
        const playerMap = new Map<number, { uuid: number, pawns: Map<number, { x: number, y: number, z: number }> }>();
        this.players.forEach((v, k) => {
            playerMap.set(k, v.serialize());
        });
        return {
            players: playerMap
        };
    }
}

class Server {
    gameState: GameState = new GameState();

    processClientMessage(message: any) {
        if (message.t == null) {
            return;
        }
        switch (message.t as string) {
            case "update":
                this.processUpdateMessage(message);
                break;
            case "register":
                console.log("register message");
                this.processRegisterPlayerMessage(message);
                break;
            default:
                console.log("unknown message: " + message.t);
                break;
        }
    }

    private processRegisterPlayerMessage(message: any) {
        if (message.uuid == null) return;
        this.gameState.addUuid(message.uuid as number);
    }

    private processUpdateMessage(message: any) {
        const msg = message as {
            players: {
                [index: number]: {
                    uuid: number,
                    pawns: {
                        [index: number]: {
                            x: number,
                            y: number,
                            z: number,
                            hp?: number
                        }
                    }
                }
            }
        };

        for (const playerInfoUuid in msg.players) {
            const playerInfo = msg.players[playerInfoUuid];
            const player = this.gameState.players.get(playerInfo.uuid);
            if (player == null) continue;

            //console.log("playerInfo.pawns: " + playerInfo.pawns);
            for (const pawnIdxs in playerInfo.pawns) {
                const pawnIdx = parseInt(pawnIdxs);
                const pawnInfo = playerInfo.pawns[pawnIdxs];
                let pawn = player.pawns.get(pawnIdx);
                if (pawn == null) {
                    pawn = new Pawn();
                    player.addPawn(pawnIdx, pawn);
                }
                pawn.x = pawnInfo.x;
                pawn.y = pawnInfo.y;
                pawn.z = pawnInfo.z;
                if (pawnInfo.hp) {
                    pawn.hp = pawnInfo.hp;
                }
            }
        }
    }
}

const game = new Server();

const server = net.createServer((conn) => {
    console.log('server listening on port 15243');

    conn.on('connect', () => {
        console.log('user connected');
    });

    conn.on('data', (data) => {
        const msg = msgpack.decode(data);
        game.processClientMessage(msg);
        showObject(game);
    });

    conn.on('close', () => {
        console.log('server closed');
    })
});
server.listen(15243);
console.log('main');

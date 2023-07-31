import { Subject } from "rxjs";
import { DataMessage, PositionMessage, WorkerMessage } from "./types";
import { BufferGeometry, Vector3, Vector3Tuple } from "three";
import { TileRequest } from "../core/interfaces";


export class TileManager {
    private workers: { worker: Worker, idle: boolean, load: number }[] = [];
    private pendingTiles: Map<string, number> = new Map();
    private tileReady = new Subject<[BufferGeometry, TileRequest]>();
    tileReady$ = this.tileReady.asObservable();




    constructor(numWorkers: number = 3) {
        for (let i = 0; i < numWorkers; i++) {
            this.workers.push({
                worker: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
                idle: true,
                load: 0
            });
            this.workers[i].worker.onmessage = ((event: MessageEvent<WorkerMessage>) => {
                const message = event.data;
                switch (message.type) {
                    case 'status':
                        this.workers[i].idle = message.idle;
                        if (this.workers[i].idle)
                            console.log(`worker ${i} finished processing`)
                        break;
                    case 'data':
                        this.tileReady.next([message.data as BufferGeometry, message.request]);
                        this.pendingTiles.delete(`${message.request.position}`);
                        this.workers[i].load -= Math.round(Math.pow(3, message.request.lod));
                        // console.log([...this.workers.map(w => w.load)])
                        this.insertInCache(message.data, message.request);
                        break;
                    case "remove":
                        if (this.pendingTiles.get(message.key))
                            this.workers[i].load -= Math.round(Math.pow(3, this.pendingTiles.get(message.key)!));
                        // console.log(`removed ${message.key}`);
                        this.pendingTiles.delete(`${message.key}`);

                }
            }).bind(this);
        }
    }

    requestTile(request: TileRequest) {
        const cacheResult = this.fetchFromCache(request.position, request.lod);
        if (cacheResult) {
            this.tileReady.next([cacheResult[0], { ...request, lod: cacheResult[1] }]);
            return;
        }

        const key = `${request.position}`;

        if (!this.pendingTiles.has(key) || this.pendingTiles.get(key)! < request.lod) {
            const selectedWorker = [...this.workers].sort((w1, w2) => w1.load - w2.load)[0];

            this.pendingTiles.set(key, request.lod);
            selectedWorker.load += Math.round(Math.pow(3, request.lod));
            // console.log([...this.workers.map(w => w.load)])

            const requestMessage: DataMessage = {
                type: 'data',
                data: null,
                request: request
            }
            selectedWorker.worker.postMessage(requestMessage);
        }
    }

    updatePosition(referencePosition: Vector3) {
        for (let worker of this.workers) {
            const updateMessage: PositionMessage = {
                type: 'position',
                pos: referencePosition.toArray()
            };
            worker.worker.postMessage(updateMessage);
        }
    }


    private fetchFromCache(_: Vector3Tuple, __: number): [BufferGeometry, number] | null {
        return null
    }
    private insertInCache(_: BufferGeometry, __: TileRequest) {

    }

}

export function getIdealLOD(referencePosition: Vector3, tilePosition: Vector3, tileDim: Vector3Tuple): number {
    const normalizedReferencePos = referencePosition.clone().divide(new Vector3(...tileDim));
    const normalizedTilePos = tilePosition.clone().divide(new Vector3(...tileDim));

    const manhattanDist = Math.abs(normalizedReferencePos.x - normalizedTilePos.x) + Math.abs(normalizedReferencePos.z - normalizedTilePos.z);
    if (manhattanDist <= 1.5) return 2;
    if (manhattanDist <= 3) return 1;
    return 0;

}

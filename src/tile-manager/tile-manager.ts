import { Subject } from "rxjs";
import { WorkerMessage } from "./types";
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
                        break;
                    case 'data':
                        this.tileReady.next([message.data as BufferGeometry, message.request]);
                        this.pendingTiles.delete(`${message.request.position}`);
                        this.workers[i].load -= Math.round(Math.pow(3, message.request.lod));
                        console.log([...this.workers.map(w => w.load)])
                        this.insertInCache(message.data, message.request);
                        break;
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
            const selectedWorker = [...this.workers].sort((w1,w2) => w1.load - w2.load)[0];

            this.pendingTiles.set(key, request.lod);
            selectedWorker.load += Math.round(Math.pow(3, request.lod));
            console.log([...this.workers.map(w => w.load)])
            selectedWorker.worker.postMessage(request);
        }
    }

    private fetchFromCache(position: Vector3Tuple, lod: number): [BufferGeometry, number] | null {
        return null
    }
    private insertInCache(geometry: BufferGeometry, request: TileRequest) {

    }

}
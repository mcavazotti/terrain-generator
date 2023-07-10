/* eslint-disable no-restricted-globals */

import { generateChunk } from "../terrain-gen/terrain-generator";
import { TileRequest } from "./interfaces";

console.log("start worker")

var isRunning = false;
const chunkQueue = new Map<string, TileRequest>();

function generate() {
    isRunning = true;

    for( let [key, request] of chunkQueue) {
        const geometry = generateChunk([request.position.x, request.position.y, request.position.z], request.dimention, 1 / (1 << (2 - request.lod)), { octaves: 5 + request.lod, type: "OpenSimplex2" });
        chunkQueue.delete(key);
        self.postMessage([geometry, request]);
    }
    isRunning = false;
}

self.onmessage = (e: MessageEvent<TileRequest>) => {
    console.log("new request")
    const request = e.data;
    chunkQueue.set(`${request.relativePosition}`, request);
    if(!isRunning) generate();
    // const geometry = generateChunk([request.position.x, request.position.y, request.position.z], request.dimention, 1 / (1 << (2 - request.lod)), { octaves: 5 + request.lod, type: "OpenSimplex2" });
    // self.postMessage([geometry, request]);
};
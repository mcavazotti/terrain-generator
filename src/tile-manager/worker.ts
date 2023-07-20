/* eslint-disable no-restricted-globals */

import { generateChunk } from "../terrain-gen/terrain-generator";
import { TileRequest } from "../core/interfaces";
import { DataMessage, StatusMessage } from "./types";

console.log("start worker")

var isRunning = false;
const chunkQueue = new Map<string, TileRequest>();

function generate() {
    for (let [key, request] of [...chunkQueue.entries()].sort((a,b) => a[1].lod - b[1].lod)) {
        if (!isRunning) {
            isRunning = true;
            let statusMessage: StatusMessage = {
                type: "status",
                idle: true
            };
            self.postMessage(statusMessage);
        }
        const geometry = generateChunk(request.position, request.dimention, 1 / (1 << (2 - request.lod)), { octaves: 7, type: "Perlin" });
        chunkQueue.delete(key);
        const dataMessage: DataMessage = {  
            type: "data",
            data: geometry,
            request: request
        }
        self.postMessage(dataMessage);
    }
    if (isRunning) {
        isRunning = false;
        let statusMessage: StatusMessage = {
            type: "status",
            idle: false
        };
        self.postMessage(statusMessage);
    }
}

self.onmessage = (e: MessageEvent<TileRequest>) => {
    console.log("new request")
    const request = e.data;
    chunkQueue.set(`${request.relativePosition}`, request);
    if (!isRunning) generate();
    // const geometry = generateChunk([request.position.x, request.position.y, request.position.z], request.dimention, 1 / (1 << (2 - request.lod)), { octaves: 5 + request.lod, type: "OpenSimplex2" });
    // self.postMessage([geometry, request]);
};
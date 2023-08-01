/* eslint-disable no-restricted-globals */

import { generateChunk } from "../terrain-gen/terrain-generator";
import { TileRequest } from "../core/interfaces";
import { DataMessage, PositionMessage, RemoveFromQueueMessage, StatusMessage } from "./types";
import { BufferGeometry, Vector3, Vector3Tuple } from "three";
import { getIdealLOD } from "./helpers";
import { CONFIG } from "../core/config";

console.log("start worker")

var isRunning = false;
const chunkQueue = new Map<string, TileRequest>();
var referencePosition: Vector3Tuple = [0, 0, 0];

function getNextTile(): TileRequest | null {
    return [...chunkQueue.values()].sort((a, b) => {

        // if (!diff) {
        const dist1 = Math.abs(referencePosition[0] - a.position[0]) * Math.abs(referencePosition[0] - a.position[0]) + Math.abs(referencePosition[2] - a.position[2]) * Math.abs(referencePosition[2] - a.position[2]);
        const dist2 = Math.abs(referencePosition[0] - b.position[0]) * Math.abs(referencePosition[0] - b.position[0]) + Math.abs(referencePosition[2] - b.position[2]) * Math.abs(referencePosition[2] - b.position[2]);
        let diff = (dist1 + (CONFIG.tileDim[0] + CONFIG.tileDim[2]) * a.lod * 1.75) - (dist2 + (CONFIG.tileDim[0] + CONFIG.tileDim[2]) * b.lod * 1.75);
        // }
        return diff;
    })[0] ?? null;
}

function cleanQueue() {
    const queueEntries = [...chunkQueue.entries()];
    for (let [key, request] of queueEntries) {
        if (getIdealLOD(new Vector3(...referencePosition), new Vector3(...request.position), CONFIG.tileDim) < request.lod) {
            chunkQueue.delete(key);
            const deleteMessage: RemoveFromQueueMessage = {
                type: 'remove',
                key: key
            };
            postMessage(deleteMessage);
        }
    }
}

async function generate(request: TileRequest): Promise<BufferGeometry> {
    return generateChunk(request.position, request.dimention, 1 / (1 << (2 - request.lod)));
}



function run() {

    const request = getNextTile();
    if (request) {
        isRunning = true;
        generate(request).then(geometry => {
            chunkQueue.delete(`${request.position}`);
            const dataMessage: DataMessage = {
                type: "data",
                data: geometry,
                request: request
            }
            self.postMessage(dataMessage);
            setTimeout(run);
        });
    } else if (isRunning) {
        isRunning = false;
        let statusMessage: StatusMessage = {
            type: "status",
            idle: false
        };
        self.postMessage(statusMessage);
    }
}

self.onmessage = (e: MessageEvent<DataMessage | PositionMessage>) => {
    switch (e.data.type) {
        case "data": {
            const request: TileRequest = e.data.request;
            chunkQueue.set(`${request.position}`, request);
            if (!isRunning) run();
        }
            break;
        case "position": {
            referencePosition = e.data.pos;
            cleanQueue();
        }
            break;
    }

};
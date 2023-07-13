import { BufferGeometry, Vector3 } from "three";
import { TileRequest } from "../core/interfaces";

export interface StatusMessage {
    type: 'status',
    idle: boolean
}

export interface DataMessage {
    type: 'data',
    data: any,
    request: TileRequest
}

export type WorkerMessage = DataMessage | StatusMessage;

export interface TileData {
    geometry: BufferGeometry,
    position: Vector3;
}
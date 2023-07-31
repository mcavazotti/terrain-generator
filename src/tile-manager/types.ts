import { BufferGeometry, Vector3, Vector3Tuple } from "three";
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

export interface PositionMessage {
    type: 'position',
    pos: Vector3Tuple,
}

export interface RemoveFromQueueMessage {
    type: 'remove',
    key: string,
}

export type WorkerMessage = DataMessage | StatusMessage | RemoveFromQueueMessage;

export interface TileData {
    geometry: BufferGeometry,
    position: Vector3;
}
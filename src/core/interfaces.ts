import { Mesh, Vector2Tuple, Vector3, Vector3Tuple } from "three";

export interface Tile {
    lod: number;
    mesh: Mesh;
    position: Vector3;
}

export interface TileRequest {
    position: Vector3;
    lod: number;
    relativePosition: Vector2Tuple;
    dimention: Vector3Tuple;
}
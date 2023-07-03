import { Vector3Tuple } from "three";
import { Grid } from "./types";

export function simplePlane(grid: Grid, height: number) {
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                grid[y][z][x] = (y / grid.length) <= height ? -1 : 1;
            }
        }
    }
}

export function trigSurface(grid: Grid,position: Vector3Tuple, scale: number, frequency: number, height: number, resolution: number) {
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                const scaledX = x/resolution;
                const scaledY = y/resolution;
                const scaledZ = z/resolution;
                const val = (Math.sin(position[0] + scaledX / frequency) + Math.sin(position[2] + scaledZ / frequency)) * scale + height;
                grid[y][z][x] = scaledY - val;
            }
        }
    }
}
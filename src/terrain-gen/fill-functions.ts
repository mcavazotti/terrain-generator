import { Vector3Tuple } from "three";
import { Grid, PerlimParams } from "./types";
import FastNoiseLite from "../third_party/FastNoiseLite";

export function simplePlane(grid: Grid, height: number) {
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                grid[y][z][x] = (y / grid.length) <= height ? -1 : 1;
            }
        }
    }
}

export function trigSurface(grid: Grid, position: Vector3Tuple, scale: number, frequency: number, height: number, resolution: number) {
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                const scaledX = x / resolution;
                const scaledY = y / resolution;
                const scaledZ = z / resolution;
                const val = (Math.sin(position[0] + scaledX / frequency) + Math.sin(position[2] + scaledZ / frequency)) * scale + height;
                grid[y][z][x] = scaledY - val;
            }
        }
    }
}

const DEFAULT_PERLIN_PARAMS: PerlimParams = {
    seed: 0,
    frequency: 0.001,
    octaves: 5,
    amplitude: 300,
    height: 0
}

export function perlin(grid: Grid, position: Vector3Tuple, resolution: number, params?: PerlimParams) {
    const p = { ...DEFAULT_PERLIN_PARAMS, ...params };
    const noise = new FastNoiseLite(p.seed);
    noise.SetNoiseType("Perlin");
    noise.SetFrequency(p.frequency);
    let noiseSum = 0;
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                const scaledX = x / resolution;
                const scaledY = y / resolution;
                const scaledZ = z / resolution; 
                noiseSum = 0;
                for (let o = 1; o <= p.octaves; o++) {
                    noise.SetFrequency(p.frequency * Math.pow(2,o));
                    noiseSum += noise.GetNoise(position[0] + scaledX, position[2] + scaledZ) * p.amplitude * 1 / Math.pow(2, o);
                }
                grid[y][z][x] = position[1] + scaledY - (noiseSum + p.height);
            }
        }
    }
}
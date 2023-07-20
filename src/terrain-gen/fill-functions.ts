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
    octaves: 3,
    amplitude: 300,
    height: 0,
    type: "Perlin"
}
const noise = new FastNoiseLite(0);

export function perlin(grid: Grid, position: Vector3Tuple, resolution: number, params?: PerlimParams) {
    const p = { ...DEFAULT_PERLIN_PARAMS, ...params };
    noise.SetNoiseType(p.type);
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
                    noise.SetFrequency(p.frequency * Math.pow(2, o));
                    noiseSum += noise.GetNoise(position[0] + scaledX, position[2] + scaledZ) * p.amplitude * 1 / Math.pow(2, o);
                }
                grid[y][z][x] = position[1] + scaledY - (noiseSum + p.height);
            }
        }
    }
}

export function terrain(grid: Grid, position: Vector3Tuple, resolution: number) {
    // noise.SetNoiseType("Perlin");
    // noise.SetNoiseType('Perlin');
    // noise.SetFractalOctaves(7);
    // noise.SetFractalGain(0.9);
    // noise.SetFractalWeightedStrength(0.7);
    // noise.SetFractalPingPongStrength(3);
    // noise.SetCellularDistanceFunction("Euclidean");
    // noise.SetCellularReturnType("Distance2Add");
    noise.SetNoiseType("Perlin");
    noise.SetFractalType("FBm");
    
    for (let y = 0; y < grid.length; y++) {
        for (let z = 0; z < grid[0].length; z++) {
            for (let x = 0; x < grid[0][0].length; x++) {
                const scaledX = x / resolution;
                const scaledY = y / resolution;
                const scaledZ = z / resolution;
                
                // noise.SetFractalType("None");
                noise.SetFractalOctaves(3);
                noise.SetFrequency(0.002);
                const mountainess = noise.GetNoise(position[0] + scaledX + 100, position[2] + scaledZ - 1600);
                noise.SetFrequency(0.003);
                noise.SetFractalOctaves(7);
                const tmp = noise.GetNoise(position[0] + scaledX, position[2] + scaledZ) * 300;
                const slope = (1 + 20*mountainess / (1 + Math.abs(20*mountainess))) / 2;
                grid[y][z][x] = position[1] + scaledY - tmp * slope - mountainess * 150;
                // grid[y][z][x] = position[1] + scaledY - mountainess* 100;

            }
        }
    }
}
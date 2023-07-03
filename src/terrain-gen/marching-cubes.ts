import { BufferAttribute, BufferGeometry, Vector3Tuple } from "three";
import { Grid } from "./types";
import *  as mc from "../third_party/MarchingCubes";


export class MarchingCubes {
    private verticesMap: Map<BigInt, number> = new Map();

    // NO SMOOTHING INTERPOLATION
    generateSurface(grid: Grid, resolution: number, threshold: number = 0): BufferGeometry {
        this.verticesMap.clear();
        const positions: Vector3Tuple[] = [];
        const indices: number[] = [];
        for (let y = 0; y < grid.length - 1; y++) {
            for (let z = 0; z < grid[0].length - 1; z++) {
                for (let x = 0; x < grid[0][0].length - 1; x++) {
                    const v0 = grid[y][z][x];
                    const v1 = grid[y][z][x + 1];
                    const v2 = grid[y + 1][z][x];
                    const v3 = grid[y + 1][z][x + 1];
                    const v4 = grid[y][z + 1][x];
                    const v5 = grid[y][z + 1][x + 1];
                    const v6 = grid[y + 1][z + 1][x];
                    const v7 = grid[y + 1][z + 1][x + 1];

                    const configuration = this.getVerticesConfiguration(threshold, v0, v1, v2, v3, v4, v5, v6, v7);

                    for (let i = 0; i < mc.TriangleTable[configuration].length && mc.TriangleTable[configuration][i] != -1; i++) {
                        const edgeId = mc.TriangleTable[configuration][i];
                        let k: BigInt;
                        let position: Vector3Tuple;
                        const scaledX = x / resolution;
                        const scaledY = y / resolution;
                        const scaledZ = z / resolution;
                        switch (edgeId) {
                            case 0:
                                k = this.convertCoordToKey([2 * x + 1, 2 * y, 2 * z]);
                                position = [scaledX + this.interpolate(v0, v1, threshold) / resolution, scaledY, scaledZ];
                                break;
                            case 1:
                                k = this.convertCoordToKey([2 * x + 2, 2 * y + 1, 2 * z]);
                                position = [scaledX + 1 / resolution, scaledY + this.interpolate(v1, v3, threshold) / resolution, scaledZ];
                                break;
                            case 2:
                                k = this.convertCoordToKey([2 * x + 1, 2 * y + 2, 2 * z]);
                                position = [scaledX + this.interpolate(v2, v3, threshold) / resolution, scaledY + 1 / resolution, scaledZ];
                                break;
                            case 3:
                                k = this.convertCoordToKey([2 * x, 2 * y + 1, 2 * z]);
                                position = [scaledX, scaledY + this.interpolate(v0, v2, threshold) / resolution, scaledZ];
                                break;
                            case 4:
                                k = this.convertCoordToKey([2 * x, 2 * y, 2 * z + 2]);
                                position = [scaledX + this.interpolate(v4, v5, threshold) / resolution, scaledY, scaledZ + 1 / resolution];
                                break;
                            case 5:
                                k = this.convertCoordToKey([2 * x + 2, 2 * y + 1, 2 * z + 2]);
                                position = [scaledX + 1 / resolution, scaledY + this.interpolate(v5, v7, threshold) / resolution, scaledZ + 1 / resolution];
                                break;
                            case 6:
                                k = this.convertCoordToKey([2 * x + 1, 2 * y + 2, 2 * z + 2]);
                                position = [scaledX + this.interpolate(v6, v7, threshold) / resolution, scaledY + 1 / resolution, scaledZ + 1 / resolution];
                                break;
                            case 7:
                                k = this.convertCoordToKey([2 * x, 2 * y + 1, 2 * z + 2]);
                                position = [scaledX, scaledY + this.interpolate(v4, v6, threshold) / resolution, scaledZ + 1 / resolution];
                                break;
                            case 8:
                                k = this.convertCoordToKey([2 * x, 2 * y, 2 * z + 1]);
                                position = [scaledX, scaledY, scaledZ + this.interpolate(v0, v4, threshold) / resolution];
                                break;
                            case 9:
                                k = this.convertCoordToKey([2 * x + 2, 2 * y, 2 * z + 1]);
                                position = [scaledX + 1 / resolution, scaledY, scaledZ + this.interpolate(v1, v5, threshold) / resolution];
                                break;
                            case 10:
                                k = this.convertCoordToKey([2 * x + 2, 2 * y + 2, 2 * z + 1]);
                                position = [scaledX + 1 / resolution, scaledY + 1 / resolution, scaledZ + this.interpolate(v3, v7, threshold) / resolution];
                                break;
                            case 11:
                                k = this.convertCoordToKey([2 * x, 2 * y + 2, 2 * z + 1]);
                                position = [scaledX, scaledY + 1 / resolution, scaledZ + this.interpolate(v2, v6, threshold) / resolution];
                                break;
                        }

                        if (this.verticesMap.has(k!)) {
                            indices.push(this.verticesMap.get(k!)!);
                        }
                        else {
                            this.verticesMap.set(k!, positions.length);
                            indices.push(positions.length);
                            positions.push(position!);
                        }
                    }

                }
            }
        }

        const geometry = new BufferGeometry();
        const vertexBuffer = new BufferAttribute(new Float32Array(positions.flatMap(p => p)), 3);
        geometry.setAttribute('position', vertexBuffer);
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        // return new ExtendedBufferGeometry(geometry);
        return geometry;
    }

    private getVerticesConfiguration(threshold: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number): number {
        const m0 = v0 < threshold ? 1 : 0;
        const m1 = v1 < threshold ? 1 : 0;
        const m2 = v2 < threshold ? 1 : 0;
        const m3 = v3 < threshold ? 1 : 0;
        const m4 = v4 < threshold ? 1 : 0;
        const m5 = v5 < threshold ? 1 : 0;
        const m6 = v6 < threshold ? 1 : 0;
        const m7 = v7 < threshold ? 1 : 0;

        return (m7 << 7) | (m6 << 6) | (m5 << 5) | (m4 << 4) | (m3 << 3) | (m2 << 2) | (m1 << 1) | m0;
    }

    private convertCoordToKey(coord: Vector3Tuple): BigInt {
        const x = coord[0];
        const y = coord[1];
        const z = coord[2];
        const shift = BigInt(2 << 15);
        return BigInt(x) * shift * shift + BigInt(y) * shift + BigInt(z);
    }

    private interpolate(a: number, b: number, t: number) {
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return a < b ? ((t - min) / (max - min)) : (1 - (t - min) / (max - min)) ;
    }
}
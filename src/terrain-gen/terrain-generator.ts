import { BufferGeometry, Vector3Tuple } from "three";
import { MarchingCubes } from "./marching-cubes";
import { terrain } from "./fill-functions";
import { Grid } from "./types";


/** MAX CHUNK SIZE (dim * resolution) < 256 *256 *256 (2^24)
 * This limitation is due to ES2016 Map max size
 */
export function generateChunk(id: Vector3Tuple, chunkSize: Vector3Tuple = [25, 25, 25], resolution: number = 1/*, params: PerlimParams| object = {}*/): BufferGeometry {
    const grid: Grid = [];
    const dimX = Math.ceil((chunkSize[0] + 1) * resolution);
    const dimY = Math.ceil((chunkSize[1] + 1) * resolution);
    const dimZ = Math.ceil((chunkSize[2] + 1) * resolution);
    for (let y = 0; y < dimY; y++) {
        grid.push([]);
        for (let z = 0; z < dimZ; z++) {
            grid[y].push([...Array(dimX).fill(NaN)]);
        }
    }

    // simplePlane(grid, 0.1);
    // trigSurface(grid, id, 1, 1, 2, resolution);
    // perlin(grid, id, resolution, params as PerlimParams);
    terrain(grid, id, resolution);
    const geometry = (new MarchingCubes()).generateSurface(grid, resolution);

    return geometry;
}

import { DoubleSide, Mesh, MeshStandardMaterial, Vector3Tuple } from "three";
import { MarchingCubes } from "./marching-cubes";
import { perlin } from "./fill-functions";
import { Grid, PerlimParams } from "./types";


/** MAX CHUNK SIZE (dim * resolution) < 256 *256 *256 (2^24)
 * This limitation is due to ES2016 Map max size
 */
export function generateChunk(id: Vector3Tuple, chunkSize: Vector3Tuple = [25, 25, 25], resolution: number = 1, params: PerlimParams| object = {}): Mesh {
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
    perlin(grid, id, resolution, params as PerlimParams);
    const geometry = (new MarchingCubes()).generateSurface(grid, resolution);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: 0x886644 }));
    // mesh.material.wireframe = true;
    // mesh.material.flatShading = true;
    mesh.material.side = DoubleSide;

    mesh.position.set(...id);
    return mesh;
}

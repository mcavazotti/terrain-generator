import { DoubleSide, Mesh, MeshStandardMaterial, Vector3Tuple } from "three";
import { MarchingCubes } from "./marching-cubes";
import { perlin, trigSurface } from "./fill-functions";
import { Grid } from "./types";


/** MAX CHUNK SIZE (dim * resolution) < 256 *256 *256 (2^24)
 * This limitation is due to ES2016 Map max size
 */
export function generateChunk(id: Vector3Tuple, chunkSize: Vector3Tuple = [25, 25, 25], resolution: number = 1): Mesh {
    const grid: Grid = [];
    for (let y = 0; y < chunkSize[1] * resolution; y++) {
        grid.push([]);
        for (let z = 0; z < chunkSize[2] * resolution; z++) {
            grid[y].push([...Array(chunkSize[0] * resolution).fill(NaN)]);
        }
    }

    // simplePlane(grid, 0.1);
    // trigSurface(grid, id, 1, 1, 2, resolution);
    perlin(grid,id,resolution);
    const geometry = (new MarchingCubes()).generateSurface(grid, resolution);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: 0x886644 }));
    // mesh.material.wireframe = true;
    mesh.material.flatShading = true;
    mesh.material.side = DoubleSide;

    mesh.position.set(...id);
    return mesh;
}

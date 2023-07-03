import { Mesh, BufferGeometry, Material } from "three";
import { MeshBVH, acceleratedRaycast } from "three-mesh-bvh";

export class ExtendedMesh<
    TGeometry extends ExtendedBufferGeometry = ExtendedBufferGeometry,
    TMaterial extends Material | Material[] = Material | Material[],
> extends Mesh {
    raycast = acceleratedRaycast;
    constructor(geometry: TGeometry, material: TMaterial) {
        super(geometry, material);
    }
}

export class ExtendedBufferGeometry extends BufferGeometry {
    boundsTree: MeshBVH;
    constructor(bg: BufferGeometry) {
        super();
        this.copy(bg);
        this.boundsTree = new MeshBVH(this as THREE.BufferGeometry);
    };
}
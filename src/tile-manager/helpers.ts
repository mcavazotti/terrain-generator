import { Vector3, Vector3Tuple } from "three";

export function getIdealLOD(referencePosition: Vector3, tilePosition: Vector3, tileDim: Vector3Tuple): number {
    const normalizedReferencePos = referencePosition.clone().divide(new Vector3(...tileDim));
    const normalizedTilePos = tilePosition.clone().divide(new Vector3(...tileDim));

    const manhattanDist = Math.abs(normalizedReferencePos.x - normalizedTilePos.x) + Math.abs(normalizedReferencePos.z - normalizedTilePos.z);
    // if (manhattanDist <= 1.5) return 2;
    if (manhattanDist <= 3) return 1;
    return 0;

}

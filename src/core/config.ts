import { Color, Vector3Tuple } from "three";

interface Config {
    tileDim: Vector3Tuple,
    numTiles: number,
    shaderUniforms: {
        grassColor: Color,
        rockColor: Color,
        snowColor: Color,
        limitSlope: number,
        heightTransition: number,
        skyColor: Color,
        nightSkyColor: Color
    },
    light: {
        position: Vector3Tuple,
        directionalColor: number,
        ambientColor: number,
        ambientIntensity: number
    }
}

export const CONFIG: Config = {
    tileDim: [100, 512, 100], // values multiples of 4
    numTiles: 21,
    shaderUniforms: {
        grassColor: new Color(0.17, 0.3, 0.05),
        rockColor: new Color(0.2, 0.2, 0.15),
        snowColor: new Color(0.9, 0.9, 0.9),
        skyColor: new Color(0.7, 0.7, 0.85),
        nightSkyColor: new Color(0.25, 0.25, 0.75),
        limitSlope: 60,
        heightTransition: 300,
    },
    light: {
        position: [10, 4, -10],
        directionalColor: 0xffcc99,
        ambientColor: 0xb3b3d9,
        ambientIntensity: 0.6,
    }

}
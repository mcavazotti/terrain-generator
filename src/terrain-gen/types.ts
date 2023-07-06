export type Grid = Array<Array<Array<number>>>;

export interface PerlimParams {
    seed: number;
    frequency: number;
    octaves: number;
    amplitude: number;
    height: number;
    type: "Perlin" | "OpenSimplex2" | "OpenSimplex2S" | "Cellular" | "ValueCubic" | "Value"
}
import { AmbientLight, BackSide, BufferAttribute, BufferGeometry, CameraHelper, Color, DirectionalLight, DirectionalLightHelper, FrontSide, GLSL3, GridHelper, Material, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderMaterial, SphereGeometry, UniformsLib, Vector2Tuple, Vector3, Vector3Tuple, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { generateChunk } from "../terrain-gen/terrain-generator";
import { PointerLockControls } from "../third_party/PointerLockControls"
import GUI from "lil-gui";
import { Tile, TileRequest } from "./interfaces";
import { TileManager } from "../tile-manager/tile-manager";
import { terrainFragmentShader } from "../auxiliary/shaders/terrain.frag.glsl";
import { terrainVertexShader } from "../auxiliary/shaders/terrain.vert.glsl";
import { skyFragmentShader } from "../auxiliary/shaders/sky.frag.glsl";
import { skyVertexShader } from "../auxiliary/shaders/sky.vert.glsl";

import { CONFIG } from './config'
import { getIdealLOD } from "../tile-manager/helpers";


export class Runner {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private auxCamera: PerspectiveCamera;
    private cameraControl: PointerLockControls;
    private auxCameraControl: OrbitControls;
    private tileManager: TileManager = new TileManager((navigator.hardwareConcurrency ?? 4) - 1);
    private useAux = true;
    private wireframe = false;
    private prevTimestamp!: number;
    private movement: Vector3 = new Vector3();
    // private tileDim: Vector3Tuple = [256, 512, 256];
    private tiles: (Tile | null)[][] = [];

    private material: ShaderMaterial;


    private _prevReferencePos: Vector3 = new Vector3();
    private get cameraReferencePos() {
        const newRefPos = new Vector3(Math.floor(this.camera.position.x / CONFIG.tileDim[0]) * CONFIG.tileDim[0], 0, Math.floor(this.camera.position.z / CONFIG.tileDim[2]) * CONFIG.tileDim[2]);

        if (newRefPos.x != this._prevReferencePos.x || newRefPos.z != this._prevReferencePos.z) {
            this.tileManager.updatePosition(newRefPos);
            this._prevReferencePos = newRefPos;
        }

        return newRefPos;
    }

    // private referencePosHelper: AxesHelper;

    private skyDome: Mesh<BufferGeometry, ShaderMaterial>;




    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.tabIndex = -1;
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0xaaaaff);
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 6000);
        this.scene.add(this.camera);

        this.camera.position.y = 100;
        this.camera.position.x = CONFIG.tileDim[0] / 2;
        this.camera.position.z = CONFIG.tileDim[2] / 2;
        this.camera.matrixWorldNeedsUpdate = true;

        this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement);


        this.auxCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.auxCamera.position.x = 10;
        this.auxCamera.position.y = 50;



        this.auxCameraControl = new OrbitControls(this.auxCamera, this.renderer.domElement);

        // initialize map slots
        for (let z = 0; z < CONFIG.numTiles; z++) {
            this.tiles.push([]);
            for (let x = 0; x < CONFIG.numTiles; x++) {
                this.tiles[z].push(null);
            }
        }

        const ambient = new AmbientLight(CONFIG.light.ambientColor, CONFIG.light.ambientIntensity);
        this.scene.add(ambient);
        const light = new DirectionalLight(CONFIG.light.directionalColor);
        light.position.set(...CONFIG.light.position);
        this.scene.add(new DirectionalLightHelper(light))
        this.scene.add(light);
        this.scene.add(new GridHelper(10, 11));


        this.material = new ShaderMaterial({
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragmentShader,
            lights: true,
            glslVersion: GLSL3,
            uniforms: {
                ...UniformsLib.lights,
                grassColor: { value: CONFIG.shaderUniforms.grassColor },
                rockColor: { value: CONFIG.shaderUniforms.rockColor },
                snowColor: { value: CONFIG.shaderUniforms.snowColor },
                limitSlope: { value: CONFIG.shaderUniforms.limitSlope },
                heightTransition: { value: CONFIG.shaderUniforms.heightTransition },
                lightDir: { value: light.getWorldDirection(new Vector3()) },
                nearPlane: { value: this.camera.near },
                farPlane: { value: this.camera.far / 2 },
            }
        });

        this.skyDome = new Mesh(new SphereGeometry(3000, 120, 80), new ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            lights: true,
            glslVersion: GLSL3,
            uniforms: {
                ...UniformsLib.lights,
                skyColor: { value: CONFIG.shaderUniforms.skyColor },
                nightSkyColor: { value: CONFIG.shaderUniforms.nightSkyColor },
                lightDir: { value: light.position }
            }
        }));

        this.skyDome.material.side = BackSide
        this.scene.add(this.skyDome)

        const cameraHelper = new CameraHelper(this.camera);
        this.scene.add(cameraHelper);

        // this.referencePosHelper = new AxesHelper(5);
        // this.referencePosHelper.position.set(...this.cameraReferencePos.toArray());
        // this.scene.add(this.referencePosHelper);

        const guiControls = {
            switchCamera: () => {
                this.useAux = !this.useAux
                this.auxCameraControl.enabled = this.useAux;
                cameraHelper.visible = true;
            },
            wireframe: () => {
                this.wireframe = !this.wireframe;
                this.tiles.flat().forEach(t => t ? (t.mesh.material as MeshStandardMaterial).wireframe = this.wireframe : null)
            },
            firstPerson: () => {
                this.cameraControl.lock();
                this.renderer.domElement.focus();
                this.useAux = false;
                this.auxCameraControl.enabled = false;
                cameraHelper.visible = false;
            }
        }
        const gui = new GUI();
        gui.add(guiControls, 'firstPerson')
        gui.add(guiControls, 'switchCamera')
        gui.add(guiControls, 'wireframe')

        this.tileManager.tileReady$.subscribe(this.workerOnMessage.bind(this));
    }

    start() {
        this.prevTimestamp = performance.now();
        this.renderer.domElement.addEventListener('keydown', (event) => {
            // if (this.useAux) return;
            switch (event.code) {

                case 'Space':
                    this.movement.add(new Vector3(0, 1, 0));
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.movement.add(new Vector3(0, 0, -1));
                    break;

                case 'ArrowLeft':
                case 'KeyA':
                    this.movement.add(new Vector3(-1));
                    break;

                case 'ArrowDown':
                case 'KeyS':
                    this.movement.add(new Vector3(0, 0, 1));
                    break;

                case 'ArrowRight':
                case 'KeyD':
                    this.movement.add(new Vector3(1));
                    break;

            }

        });
        this.renderer.domElement.addEventListener('keyup', () => {
            this.movement.set(0, 0, 0);
        })
        requestAnimationFrame(this.loop.bind(this));

    }

    loop(timestamp: number) {
        const deltaTime = (timestamp - this.prevTimestamp) / 1000;
        this.prevTimestamp = timestamp;

        if (/*!this.useAux &&*/ this.movement.lengthSq()) {

            this.movement.clone().applyQuaternion(this.camera.quaternion);
            this.camera.position.addScaledVector(this.movement.clone().applyQuaternion(this.camera.quaternion).normalize().multiplyScalar(25), deltaTime);
        }
        this.manageTiles();

        // this.referencePosHelper.position.set(...this.cameraReferencePos.toArray());
        this.skyDome.position.set(...this.camera.position.toArray());
        this.renderer.render(this.scene, this.useAux ? this.auxCamera : this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    private manageTiles() {
        if (!this.tiles[Math.floor(CONFIG.numTiles / 2)][Math.floor(CONFIG.numTiles / 2)]) {
            const geometry = generateChunk([this.cameraReferencePos.x, -CONFIG.tileDim[1] / 2, this.cameraReferencePos.z], CONFIG.tileDim, 1);
            const mesh = new Mesh(geometry, this.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.material.side = FrontSide;
            mesh.position.set(...(new Vector3(this.cameraReferencePos.x, -CONFIG.tileDim[1] / 2, this.cameraReferencePos.z)).toArray());
            this.tiles[Math.floor(CONFIG.numTiles / 2)][Math.floor(CONFIG.numTiles / 2)] = {
                lod: 2,
                mesh: mesh,
                position: new Vector3(this.cameraReferencePos.x, -CONFIG.tileDim[1] / 2, this.cameraReferencePos.z)
            };
            this.scene.add(this.tiles[Math.floor(CONFIG.numTiles / 2)][Math.floor(CONFIG.numTiles / 2)]!.mesh);
        }
        const relativePos = this.tileRelativePos(this.tiles[Math.floor(CONFIG.numTiles / 2)][Math.floor(CONFIG.numTiles / 2)]!.position);
        // console.log(relativePos);

        //move tiles relative to camera
        if (relativePos[0] == -1) {
            for (let x = CONFIG.numTiles - 1; x > 0; x--) {
                for (let z = 0; z < CONFIG.numTiles; z++) {
                    if (x == CONFIG.numTiles - 1) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x - 1];
                    if (x == 1) this.tiles[z][x - 1] = null;
                }
            }
        }

        if (relativePos[0] == 1) {
            for (let x = 0; x < CONFIG.numTiles - 1; x++) {
                for (let z = 0; z < CONFIG.numTiles; z++) {
                    if (x == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x + 1];
                    if (x == CONFIG.numTiles - 2) this.tiles[z][x + 1] = null;
                }
            }
        }

        if (relativePos[1] == -1) {
            for (let z = CONFIG.numTiles - 1; z > 0; z--) {
                for (let x = 0; x < CONFIG.numTiles; x++) {
                    if (z == CONFIG.numTiles - 1) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z - 1][x];
                    if (z == 1) this.tiles[z - 1][x] = null;
                }
            }
        }

        if (relativePos[1] == 1) {
            for (let z = 0; z < CONFIG.numTiles - 1; z++) {
                for (let x = 0; x < CONFIG.numTiles; x++) {
                    if (z == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z + 1][x];
                    if (z == CONFIG.numTiles - 2) this.tiles[z + 1][x] = null;
                }
            }
        }

        for (let z = 0; z < CONFIG.numTiles; z++) {
            for (let x = 0; x < CONFIG.numTiles; x++) {
                const tilePos: Vector3Tuple = [this.cameraReferencePos.x + CONFIG.tileDim[0] * (x - Math.floor(CONFIG.numTiles / 2)), -CONFIG.tileDim[1] / 2, this.cameraReferencePos.z + CONFIG.tileDim[2] * (z - Math.floor(CONFIG.numTiles / 2))];
                const lod = getIdealLOD(this.cameraReferencePos, new Vector3(...tilePos), CONFIG.tileDim);
                if (!this.tiles[z][x] || this.tiles[z][x]!.lod < lod) {
                    this.tileManager.requestTile({
                        position: tilePos,
                        lod: lod,
                        relativePosition: [x, z],
                        dimention: CONFIG.tileDim
                    })
                }
            }
        }

    }

    private disposeTile(x: number, z: number) {
        if (!this.tiles[z][x]) return;
        this.scene.remove(this.tiles[z][x]!.mesh);
        this.tiles[z][x]!.mesh.geometry.dispose();
        (this.tiles[z][x]!.mesh.material as Material).dispose();
        this.tiles[z][x] = null;
    }

    private tileRelativePos(tilePos: Vector3): Vector2Tuple {
        const relPos: Vector2Tuple = [0, 0];
        if (this.camera.position.x >= tilePos.x && this.camera.position.x < tilePos.x + CONFIG.tileDim[0] &&
            this.camera.position.z >= tilePos.z && this.camera.position.z < tilePos.z + CONFIG.tileDim[2]) return relPos;

        if (this.camera.position.x < tilePos.x) relPos[0] = -1;
        if (this.camera.position.x > tilePos.x + CONFIG.tileDim[0]) relPos[0] = 1;
        if (this.camera.position.z < tilePos.z) relPos[1] = -1;
        if (this.camera.position.z > tilePos.z + CONFIG.tileDim[2]) relPos[1] = 1;

        return relPos;
    }




    private workerOnMessage(data: [BufferGeometry, TileRequest]) {


        const request = data[1];
        // console.log('completed: ', requestId);


        const x = (request.position[0] - this.cameraReferencePos.x) / CONFIG.tileDim[0] + Math.floor(CONFIG.numTiles / 2);
        const z = (request.position[2] - this.cameraReferencePos.z) / CONFIG.tileDim[2] + Math.floor(CONFIG.numTiles / 2);

        if ((x >= 0 && x < CONFIG.numTiles && z >= 0 && z < CONFIG.numTiles) && (!this.tiles[z][x] || this.tiles[z][x]!.lod < request.lod)) {
            const shallowGeometry = data[0];

            const geometry = new BufferGeometry();

            for (let attributeName of Object.keys(shallowGeometry.attributes)) {
                const shallowAttribute = shallowGeometry.attributes[attributeName];
                const attribute = new BufferAttribute(
                    shallowAttribute.array,
                    shallowAttribute.itemSize,
                    false
                );
                geometry.setAttribute(attributeName, attribute);

            }
            geometry.setIndex([...shallowGeometry.index!.array as number[]]);
            geometry.groups = shallowGeometry.groups;


            const mesh = new Mesh(geometry, this.material);
            // mesh.castShadow = true;
            // mesh.receiveShadow=true;
            mesh.material.side = FrontSide;
            mesh.position.set(...request.position);
            this.disposeTile(x, z);
            this.tiles[z][x] = {
                lod: request.lod,
                mesh: mesh,
                position: new Vector3(...request.position)
            };
            this.scene.add(this.tiles[z][x]!.mesh);
        }
    }
}
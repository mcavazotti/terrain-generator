import { AmbientLight, AxesHelper, BackSide, BufferAttribute, BufferGeometry, CameraHelper, Color, DirectionalLight, DirectionalLightHelper, DoubleSide, FrontSide, GLSL3, GridHelper, HemisphereLight, HemisphereLightHelper, Material, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderMaterial, SphereGeometry, UniformsLib, Vector2Tuple, Vector3, Vector3Tuple, WebGLRenderer } from "three";
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



export class Runner {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private auxCamera: PerspectiveCamera;
    private cameraControl: PointerLockControls;
    private auxCameraControl: OrbitControls;
    private tileManager: TileManager = new TileManager();
    private useAux = true;
    private wireframe = false;
    private prevTimestamp!: number;
    private movement: Vector3 = new Vector3();
    // private tileDim: Vector3Tuple = [256, 512, 256];
    private tileDim: Vector3Tuple = [56, 512, 56];

    private numTiles: number = 51;
    private tiles: (Tile | null)[][] = [];

    private material: ShaderMaterial;

    private get cameraReferencePos() {
        return new Vector3(Math.floor(this.camera.position.x / this.tileDim[0]) * this.tileDim[0], 0, Math.floor(this.camera.position.z / this.tileDim[2]) * this.tileDim[2]);
    }

    private referencePosHelper: AxesHelper;

    private skyDome: Mesh<BufferGeometry, ShaderMaterial>;




    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // this.renderer.shadowMap.enabled = true;
        this.renderer.domElement.tabIndex = -1;
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0xaaaaff);
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 6000);
        this.scene.add(this.camera);

        this.camera.position.y = 5;
        this.camera.position.x = this.tileDim[0] / 2;
        this.camera.position.z = this.tileDim[2] / 2;
        this.camera.matrixWorldNeedsUpdate = true;

        this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement);


        this.auxCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.auxCamera.position.x = 10;
        this.auxCamera.position.y = 50;



        this.auxCameraControl = new OrbitControls(this.auxCamera, this.renderer.domElement);

        // initialize map slots
        for (let z = 0; z < this.numTiles; z++) {
            this.tiles.push([]);
            for (let x = 0; x < this.numTiles; x++) {
                this.tiles[z].push(null);
            }
        }

        const ambient = new AmbientLight(0xaaaaff, 0.6);
        this.scene.add(ambient);
        const light = new DirectionalLight(0xffffbb);
        light.position.set(10, 10, -10);
        // light.castShadow = true;
        // light.shadow.mapSize.width = 2048;
        // light.shadow.mapSize.height = 2048;
        // light.target =this.camera;
        this.camera.add(new DirectionalLightHelper(light))
        // this.scene.add(new HemisphereLightHelper(light, 10));
        this.scene.add(light);
        this.scene.add(new GridHelper(10, 11));


        this.material = new ShaderMaterial({
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragmentShader,
            lights: true,
            glslVersion: GLSL3,
            uniforms: {
                ...UniformsLib.lights,
                grassColor: { value: new Color(0.17, 0.3, 0.05) },
                rockColor: { value: new Color(0.2, 0.2, 0.15) },
                snowColor: { value: new Color(0.9, 0.9, 0.9) },
                limitSlope: { value: 60 },
                heightTransition: { value: 300 },
                lightDir: { value: light.getWorldDirection(new Vector3()) }
            }
        });

        this.skyDome = new Mesh(new SphereGeometry(3000, 120, 80), new ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            lights: true,
            glslVersion: GLSL3,
            uniforms: {
                ...UniformsLib.lights,
                skyColor: { value: new Color(0.666, 0.666, 1.0) },
                nightSkyColor: { value: new Color(0.25, 0.25, 0.75) },
                lightDir: { value: light.getWorldDirection(new Vector3()) }
            }
        }));

        this.skyDome.material.side = BackSide
        this.scene.add(this.skyDome)

        const cameraHelper = new CameraHelper(this.camera);
        this.scene.add(cameraHelper);

        this.referencePosHelper = new AxesHelper(5);
        this.referencePosHelper.position.set(...this.cameraReferencePos.toArray());
        this.scene.add(this.referencePosHelper);

        const guiControls = {
            switchCamera: () => {
                this.useAux = !this.useAux
                this.auxCameraControl.enabled = this.useAux;
                cameraHelper.visible = true;
            },
            focus: () => {
                this.renderer.domElement.focus();

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
        gui.add(guiControls, 'focus')

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

        this.referencePosHelper.position.set(...this.cameraReferencePos.toArray());
        this.skyDome.position.set(...this.camera.position.toArray());
        this.renderer.render(this.scene, this.useAux ? this.auxCamera : this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    private manageTiles() {
        if (!this.tiles[Math.floor(this.numTiles / 2)][Math.floor(this.numTiles / 2)]) {
            const geometry = generateChunk([this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z], this.tileDim, 1, { octaves: 7, type: "Perlin" });
            const mesh = new Mesh(geometry, this.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.material.side = FrontSide;
            mesh.position.set(...(new Vector3(this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z)).toArray());
            this.tiles[Math.floor(this.numTiles / 2)][Math.floor(this.numTiles / 2)] = {
                lod: 2,
                mesh: mesh,
                position: new Vector3(this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z)
            };
            this.scene.add(this.tiles[Math.floor(this.numTiles / 2)][Math.floor(this.numTiles / 2)]!.mesh);
        }
        const relativePos = this.tileRelativePos(this.tiles[Math.floor(this.numTiles / 2)][Math.floor(this.numTiles / 2)]!.position);
        // console.log(relativePos);

        //move tiles relative to camera
        if (relativePos[0] == -1) {
            for (let x = this.numTiles - 1; x > 0; x--) {
                for (let z = 0; z < this.numTiles; z++) {
                    if (x == this.numTiles - 1) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x - 1];
                    if (x == 1) this.tiles[z][x - 1] = null;
                }
            }
        }

        if (relativePos[0] == 1) {
            for (let x = 0; x < this.numTiles - 1; x++) {
                for (let z = 0; z < this.numTiles; z++) {
                    if (x == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x + 1];
                    if (x == this.numTiles - 2) this.tiles[z][x + 1] = null;
                }
            }
        }

        if (relativePos[1] == -1) {
            for (let z = this.numTiles - 1; z > 0; z--) {
                for (let x = 0; x < this.numTiles; x++) {
                    if (z == this.numTiles - 1) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z - 1][x];
                    if (z == 1) this.tiles[z - 1][x] = null;
                }
            }
        }

        if (relativePos[1] == 1) {
            for (let z = 0; z < this.numTiles - 1; z++) {
                for (let x = 0; x < this.numTiles; x++) {
                    if (z == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z + 1][x];
                    if (z == this.numTiles - 2) this.tiles[z + 1][x] = null;
                }
            }
        }

        for (let z = 0; z < this.numTiles; z++) {
            for (let x = 0; x < this.numTiles; x++) {
                const lod = this.getIdealLOD(x, z);
                if (!this.tiles[z][x] || this.tiles[z][x]!.lod < lod) {
                    const tilePos: Vector3Tuple = [this.cameraReferencePos.x + this.tileDim[0] * (x - Math.floor(this.numTiles / 2)), -this.tileDim[1] / 2, this.cameraReferencePos.z + this.tileDim[2] * (z - Math.floor(this.numTiles / 2))];
                    this.tileManager.requestTile({
                        position: tilePos,
                        lod: lod,
                        relativePosition: [x, z],
                        dimention: this.tileDim
                    })
                }
                // if (!this.tiles[z][x]) {
                //     const tilePos: Vector3Tuple = [this.cameraReferencePos.x + this.tileDim[0] * (x - 2), -this.tileDim[1] / 2, this.cameraReferencePos.z + this.tileDim[2] * (z - 2)];
                //     this.tiles[z][x] = {
                //         lod: lod,
                //         mesh: generateChunk(tilePos, this.tileDim, 1 / (1 << (2 - lod)), { octaves: 5 + lod, type: "OpenSimplex2" }),
                //         position: new Vector3(...tilePos)
                //     };
                //     (this.tiles[z][x]!.mesh.material as MeshStandardMaterial).wireframe = this.wireframe;
                //     this.scene.add(this.tiles[z][x]!.mesh);
                // }
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

    private getIdealLOD(x: number, z: number) {
        if (!this.tiles[z][x]) {
            if (x == Math.floor(this.numTiles / 2) && z == Math.floor(this.numTiles / 2)) return 2;
            if (Math.abs(this.numTiles - x) + Math.abs(this.numTiles - z) > 3) return 0;
            return 1;
        }
        const tileCenter: Vector2Tuple = [this.tiles[z][x]!.position.x + this.tileDim[0] / 2, this.tiles[z][x]!.position.z + this.tileDim[2] / 2];
        const manhattanDist = Math.abs(tileCenter[0] - this.camera.position.x) + Math.abs(tileCenter[1] - this.camera.position.z);
        const meanHorizontalDim = (this.tileDim[0] + this.tileDim[2]) / 2;
        if (manhattanDist < 1.5 * meanHorizontalDim) return 2;
        if (manhattanDist < 4 * meanHorizontalDim) return 1;
        return 0;
    }

    private tileRelativePos(tilePos: Vector3): Vector2Tuple {
        const relPos: Vector2Tuple = [0, 0];
        if (this.camera.position.x >= tilePos.x && this.camera.position.x < tilePos.x + this.tileDim[0] &&
            this.camera.position.z >= tilePos.z && this.camera.position.z < tilePos.z + this.tileDim[2]) return relPos;

        if (this.camera.position.x < tilePos.x) relPos[0] = -1;
        if (this.camera.position.x > tilePos.x + this.tileDim[0]) relPos[0] = 1;
        if (this.camera.position.z < tilePos.z) relPos[1] = -1;
        if (this.camera.position.z > tilePos.z + this.tileDim[2]) relPos[1] = 1;

        return relPos;
    }




    private workerOnMessage(data: [BufferGeometry, TileRequest]) {


        const request = data[1];
        const requestId = `${request.lod}-${request.position}`;
        console.log('completed: ', requestId);


        const x = (request.position[0] - this.cameraReferencePos.x) / this.tileDim[0] + Math.floor(this.numTiles / 2);
        const z = (request.position[2] - this.cameraReferencePos.z) / this.tileDim[2] + Math.floor(this.numTiles / 2);

        if ((x >= 0 && x < this.numTiles && z >= 0 && z < this.numTiles) && (!this.tiles[z][x] || this.tiles[z][x]!.lod < request.lod)) {
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
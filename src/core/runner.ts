import { BufferAttribute, BufferGeometry, CameraHelper, Color, DoubleSide, GridHelper, HemisphereLight, Material, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector2Tuple, Vector3, Vector3Tuple, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { generateChunk } from "../terrain-gen/terrain-generator";
import { PointerLockControls } from "../third_party/PointerLockControls"
import GUI from "lil-gui";
import { Tile, TileRequest } from "./interfaces";



export class Runner {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private auxCamera: PerspectiveCamera;
    private cameraControl: PointerLockControls;
    private auxCameraControl: OrbitControls;
    private useAux = true;
    private wireframe = false;
    private prevTimestamp!: number;
    private movement: Vector3 = new Vector3();
    private tileDim: Vector3Tuple = [80, 512, 80];
    private tiles: (Tile | null)[][] = [];

    private get cameraReferencePos() {
        return new Vector3(Math.floor(this.camera.position.x / this.tileDim[0]) * this.tileDim[0], 0, Math.floor(this.camera.position.z / this.tileDim[2]) * this.tileDim[2]);
    }

    private workerLod0 = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    private workerLod1 = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    private workerLod2 = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    private tilesQueue: Set<string> = new Set();

    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.tabIndex = -1;
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0x444444);
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.scene.add(this.camera);

        this.camera.position.y = 5;
        this.camera.position.x = 5;
        this.camera.matrixWorldNeedsUpdate = true;

        this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement);


        this.auxCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.auxCamera.position.x = 10;
        this.auxCamera.position.y = 50;

        this.auxCameraControl = new OrbitControls(this.auxCamera, this.renderer.domElement);

        // initialize map slots
        for (let z = 0; z < 5; z++) {
            this.tiles.push([]);
            for (let x = 0; x < 5; x++) {
                this.tiles[z].push(null);
            }
        }

        const light = new HemisphereLight(0x004444);
        light.position.set(5, -5, 0);
        this.scene.add(light);
        this.scene.add(new GridHelper(10, 11));

        const cameraHelper = new CameraHelper(this.camera);
        this.scene.add(cameraHelper);
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

        this.workerLod0.onmessage = this.workerOnMessage.bind(this);
        this.workerLod1.onmessage = this.workerOnMessage.bind(this);
        this.workerLod2.onmessage = this.workerOnMessage.bind(this);
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
            this.camera.position.addScaledVector(this.movement.clone().applyQuaternion(this.camera.quaternion).normalize().multiplyScalar(10), deltaTime);
        }
        this.manageTiles();

        this.renderer.render(this.scene, this.useAux ? this.auxCamera : this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    private manageTiles() {
        if (!this.tiles[2][2]) {
            const geometry = generateChunk([this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z], this.tileDim, 1, { octaves: 7, type: "OpenSimplex2" });
            const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: 0x886644 }));
            mesh.material.side = DoubleSide;
            mesh.position.set(...(new Vector3(this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z)).toArray());
            this.tiles[2][2] = {
                lod: 2,
                mesh: mesh,
                position: new Vector3(this.cameraReferencePos.x, -this.tileDim[1] / 2, this.cameraReferencePos.z)
            };
            this.scene.add(this.tiles[2][2].mesh);
        }
        const relativePos = this.tileRelativePos(this.tiles[2][2].position);
        // console.log(relativePos);

        //move tiles relative to camera
        if (relativePos[0] == -1) {
            for (let x = 4; x > 0; x--) {
                for (let z = 0; z < 5; z++) {
                    if (x == 4) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x - 1];
                    if (x == 1) this.tiles[z][x - 1] = null;
                }
            }
        }

        if (relativePos[0] == 1) {
            for (let x = 0; x < 4; x++) {
                for (let z = 0; z < 5; z++) {
                    if (x == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z][x + 1];
                    if (x == 3) this.tiles[z][x + 1] = null;
                }
            }
        }

        if (relativePos[1] == -1) {
            for (let z = 4; z > 0; z--) {
                for (let x = 0; x < 5; x++) {
                    if (z == 4) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z - 1][x];
                    if (z == 1) this.tiles[z - 1][x] = null;
                }
            }
        }

        if (relativePos[1] == 1) {
            for (let z = 0; z < 4; z++) {
                for (let x = 0; x < 5; x++) {
                    if (z == 0) this.disposeTile(x, z);
                    this.tiles[z][x] = this.tiles[z + 1][x];
                    if (z == 3) this.tiles[z + 1][x] = null;
                }
            }
        }

        for (let z = 0; z < 5; z++) {
            for (let x = 0; x < 5; x++) {
                const lod = this.getIdealLOD(x, z);
                if (!this.tiles[z][x] || this.tiles[z][x]!.lod < lod) {
                    const tilePos: Vector3Tuple = [this.cameraReferencePos.x + this.tileDim[0] * (x - 2), -this.tileDim[1] / 2, this.cameraReferencePos.z + this.tileDim[2] * (z - 2)];
                    this.requestTile({
                        position: new Vector3(...tilePos),
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
            if (x == 0 || x == 4 || z == 0 || z == 4) return 0;
            if (x == 2 && z == 2) return 2;
            return 1;
        }
        const tileCenter: Vector2Tuple = [this.tiles[z][x]!.position.x + this.tileDim[0] / 2, this.tiles[z][x]!.position.z + this.tileDim[2] / 2];
        const manhattanDist = Math.abs(tileCenter[0] - this.camera.position.x) + Math.abs(tileCenter[1] - this.camera.position.z);
        const meanHorizontalDim = (this.tileDim[0] + this.tileDim[2]) / 2;
        if (manhattanDist < 1.5 * meanHorizontalDim) return 2;
        if (manhattanDist < 2 * meanHorizontalDim) return 1;
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

    private requestTile(tileRequest: TileRequest) {
        const requestId = `${tileRequest.lod}-${tileRequest.relativePosition}-${tileRequest.position.toArray()}`;
        if (this.tilesQueue.has(requestId)) return;
        console.log("requesting: ", requestId)
        this.tilesQueue.add(requestId);
        switch (tileRequest.lod) {
            case 0:
                this.workerLod0.postMessage(tileRequest)
                break;
                case 1:
                this.workerLod1.postMessage(tileRequest)
                break;
                case 2:
                this.workerLod2.postMessage(tileRequest)
                break;
        }
    }


    private workerOnMessage(e: MessageEvent<[BufferGeometry, TileRequest]>) {


        const request = e.data[1];
        const requestId = `${request.lod}-${request.relativePosition}-${request.position.x},${request.position.y},${request.position.z}`;
        console.log('completed: ', requestId)
        this.tilesQueue.delete(requestId);


        const x = (request.position.x - this.cameraReferencePos.x) / this.tileDim[0] + 2;
        const z = (request.position.z - this.cameraReferencePos.z) / this.tileDim[2] + 2;

        if ((x >= 0 && x < 5 && z >= 0 && z < 5) && (!this.tiles[z][x] || this.tiles[z][x]!.lod < request.lod)) {
            const shallowGeometry = e.data[0];

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


            const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: 0x886644 }));
            mesh.material.side = DoubleSide;
            mesh.position.set(request.position.x, request.position.y, request.position.z);
            this.disposeTile(x, z);
            this.tiles[z][x] = {
                lod: request.lod,
                mesh: mesh,
                position: request.position
            };
            this.scene.add(this.tiles[z][x]!.mesh);
        }
    }
}
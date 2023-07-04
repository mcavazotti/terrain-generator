import { CameraHelper, Color, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { generateChunk } from "../terrain-gen/terrain-generator";
import { PointerLockControls } from "../third_party/PointerLockControls"
import GUI from "lil-gui";

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
    private landChunks: Mesh[] = []

    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.tabIndex = -1;
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0x444444);
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.camera.position.y = 5;
        this.camera.position.x = 5;
        this.camera.matrixWorldNeedsUpdate = true;

        this.cameraControl = new PointerLockControls(this.camera, this.renderer.domElement);


        this.auxCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.auxCamera.position.x = 10;
        this.auxCamera.position.y = 50;

        this.auxCameraControl = new OrbitControls(this.auxCamera, this.renderer.domElement);
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    const land = generateChunk([-1.5 * 100 + x * 100, (y - 1) * 100, -1.5 * 100 + z * 100], [100, 100, 100], 0.25);
                    this.landChunks.push(land);
                    this.scene.add(land);
                }
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
            wireframe: () => {
                this.wireframe = !this.wireframe;
                this.landChunks.forEach(l => (l.material as MeshStandardMaterial).wireframe = this.wireframe)
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
    }

    start() {
        this.prevTimestamp = performance.now();
        this.renderer.domElement.addEventListener('keydown', (event) => {
            if (this.useAux) return;
            switch (event.code) {

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

        if (!this.useAux && this.movement.lengthSq()) {

            this.movement.clone().applyQuaternion(this.camera.quaternion);
            this.camera.position.addScaledVector(this.movement.clone().applyQuaternion(this.camera.quaternion).normalize().multiplyScalar(10), deltaTime);
        }

        this.renderer.render(this.scene, this.useAux ? this.auxCamera : this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }
}
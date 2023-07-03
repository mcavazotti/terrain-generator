import { Color, GridHelper, HemisphereLight,PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "../third_party/OrbitControls";
import { generateChunk } from "../terrain-gen/terrain-generator";

export class Runner {
    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private cameraControl: OrbitControls;

    constructor() {
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new Scene();
        this.scene.background = new Color(0x444444);
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        this.camera.position.y = 15;

        this.cameraControl = new OrbitControls(this.camera, this.renderer.domElement);
        this.cameraControl = new OrbitControls(this.camera, this.renderer.domElement);

        const land1 = generateChunk([0, 0, 0], [10,10,10],1)
        const land2 = generateChunk([-9.5, 0, 0], [10,10,10],2)
        const land3 = generateChunk([-9.5, 0, -9.5], [10,10,10],4)
        const land4 = generateChunk([0, 0, -9.5], [10,10,10],8)
        this.scene.add(land1);
        this.scene.add(land2);
        this.scene.add(land3);
        this.scene.add(land4);
        const light = new HemisphereLight(0x004444);
        light.position.set(5,-5,0);
        this.scene.add(light);
        this.scene.add(new GridHelper(10, 11));
        // this.scene.add(new Mesh(new SphereGeometry(), new MeshStandardMaterial({ color: 0x006644 }) ))

    }

    start() {
        requestAnimationFrame(this.loop.bind(this));
    }

    loop() {
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }
}
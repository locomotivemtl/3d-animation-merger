import * as THREE from 'three';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'; 
import { GLTFExporter } from './GLTFExporter.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

class App {
    constructor(m) {
    	// Get elements
        this.$canvas = document.querySelector('canvas')
        this.$source = document.getElementById('source')
        this.$animation = document.getElementById('source-animations')
        this.$export = document.getElementById('export-btn')
        this.$ui = document.getElementById('animations-ui')
        this.$transformBtn = document.getElementById('transform-mode-btn')

        // Events
        this.$source.addEventListener('change', this.onSourceChange.bind(this))
        this.$animation.addEventListener('change', this.onAnimationChange.bind(this))

        this.$export.addEventListener('click', this.exportGLB.bind(this))
        this.$transformBtn.addEventListener('click', this.changeTransformMode.bind(this));			        
        
        this.resize();
        this.resizeBind = this.resize.bind(this);
        window.addEventListener('resize', this.resizeBind); 
    }			    

    init() {    
        this.initRenderer();  
        this.initScene();     
        this.initLoaders();

        this.render();   
    }

    initRenderer() {        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.$canvas,
            preserveDrawingBuffer: true // for screenshots
        })
        this.renderer.shadowMap.enabled = true 
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.setClearColor("#15151a");

        this.renderer.outputEncoding = THREE.sRGBEncoding;
        // renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // renderer.toneMappingExposure = 1;

        this.renderer.setSize(this.sizes.width, this.sizes.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        this.clock = new THREE.Clock()
        this.previousTime = 0
    }

    initScene() {
        this.scene = new THREE.Scene();

        const gridHelper = new THREE.GridHelper(10,10,"#969fbf","#2a2a35");
        gridHelper.position.y = 0;
        gridHelper.position.x = 0;
        console.log(gridHelper.material);
        gridHelper.material.opacity = 0.25
        gridHelper.material.transparent = true
        this.scene.add( gridHelper );

        const axesHelper = new THREE.AxesHelper( .5 );
        this.scene.add( axesHelper );        

        /**
         * Lights
         */
        const ambientLight = new THREE.AmbientLight(0xffffff, 1)
        this.scene.add(ambientLight)        

        // Base camera
        this.camera = new THREE.PerspectiveCamera(30, this.sizes.width / this.sizes.height, 0.01,100)
        this.camera.position.set(3,1,3)
        this.scene.add(this.camera)

        // Controls
        this.controls = new OrbitControls(this.camera, this.$canvas)
        this.controls.target.set(0, 0.75, 0)
        this.controls.enableDamping = true

        // Wrapper
        this.wrapper = new THREE.Group();
        this.wrapper.position.set(0,0,0); 
        this.scene.add(this.wrapper) 

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener( 'dragging-changed', (event) => {
            this.controls.enabled = ! event.value;
        } );
        this.scene.add(this.transformControl)

        this.scene.fog = new THREE.Fog("#15151a", 10, 30);
    }

    initLoaders() {
        this.fbxLoader = new FBXLoader();
    }

    resize() {
        console.log('resize');
        this.BCR = this.$canvas.getBoundingClientRect()

        this.sizes = {
            width: this.BCR.width,
            height: this.BCR.height
        }

        this.renderer && this.renderer.setSize(this.sizes.width, this.sizes.height);

        this.renderer && console.log(this.renderer);

        if(this.camera) {
            // Update camera        
            this.camera.aspect = this.sizes.width / this.sizes.height
            this.camera.updateProjectionMatrix()
        }

        // Update renderer
        if(this.renderer) {
            this.renderer.setSize(this.sizes.width, this.sizes.height)
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }
    }

    render() {        
        const elapsedTime = this.clock.getElapsedTime()
        const deltaTime = elapsedTime - this.previousTime
        this.previousTime = elapsedTime

        // Update controls
        this.controls.update()

        // Render
        this.renderer.render(this.scene, this.camera)

        if(this.mixer) this.mixer.setTime(elapsedTime)

        // Call tick again on the next frame
        this.raf = window.requestAnimationFrame(this.render.bind(this))
    }

    async onSourceChange(e) {
        return new Promise(resolve => {
            const file = e.currentTarget.files[0];      

            const filename = file.name;
            const extension = filename.split( '.' ).pop().toLowerCase();  

            const reader = new FileReader();
            reader.addEventListener( 'load', ( event ) => {
                const contents = event.target.result;

                if(this.object) this.scene.remove(this.object);

                this.object = this.fbxLoader.parse( contents );
                this.object.scale.set(0.01,0.01,0.01)

                if(this.object.animations.length) {
                    this.mixer = new THREE.AnimationMixer( this.object );
                    this.object.traverse(function(obj) { obj.frustumCulled = false; });                   

                    // this.object.animations.forEach( ( clip ) => {                          
                    //     this.mixer.clipAction( clip ).play();                                      
                    // } );                
                }

                this.updateUI()
                
                this.scene.add(this.object)

                console.log(this.object); 

                this.transformControl.attach(this.object)

                resolve()

            }, { once: true } );
            reader.readAsArrayBuffer( file );
        })
    }

    async onAnimationChange(e) {
        const files = e.currentTarget.files;        

        if(!files) return;

        for(let file of files) {
            if(!this.object) {
                await this.onSourceChange(e)
            } else {                
                const reader = new FileReader();
                reader.addEventListener( 'load', ( event ) => {
                    const contents = event.target.result;

                    let object = this.fbxLoader.parse( contents );

                    if(object.animations.length) {
                        for(let animation of object.animations) {
                            animation.name = file.name.split('.')[0]
                            this.object.animations.push(animation)
                        }                        
                    }

                    this.updateUI()    
                }, { once: true } );
                reader.readAsArrayBuffer( file );
            }        
        }

        e.currentTarget.value = ''
    }

    updateUI() {
        while(this.$ui.children.length) {
            this.$ui.children[0].remove()
        }

        console.log(JSON.parse(JSON.stringify(this.object.animations)));
        if(this.object.animations.length) {
            for(let animation of this.object.animations) {
                console.log(animation.name);
                let input = document.createElement('input')
                input.type = "text"
                input.value = animation.name;
                input.addEventListener('blur', () => {
                    if(this.animation) this.animation.stop();
                })
                input.addEventListener('focus', () => {
                    this.animation = this.mixer.clipAction(animation);
                    this.animation.play()
                })
                input.addEventListener('change', () => {
                    animation.name = input.value
                })
                input.addEventListener('contextmenu', (e) => {
                    e.preventDefault();            

                    console.log(this.object.animations, this.object.animations.indexOf(animation));
                    this.object.animations.splice(this.object.animations.indexOf(animation), 1)
                    console.log(this.object.animations);
                    this.updateUI();

                    return false;
                }, false);
                this.$ui.appendChild(input)
            }
        }
    }

    changeTransformMode() {
        const modes = ['translate','rotate','scale'];
        const currentMode = this.transformControl.getMode()
        const index = modes.indexOf(currentMode)
        const newMode = index < modes.length-1 ? modes[index+1] : modes[0];
        this.transformControl.setMode(newMode);
    }

    exportGLB() {
        console.log('export requested');

        const gltfExporter = new GLTFExporter();

        function save( blob, filename ) {
            const link = document.createElement( 'a' );
            link.style.display = 'none';
            document.body.appendChild( link ); // Firefox workaround, see #6594
            link.href = URL.createObjectURL( blob );
            link.download = filename;
            link.click();
            link.remove()
        }

        function saveString( text, filename ) {
            save( new Blob( [ text ], { type: 'text/plain' } ), filename );
        }

        function saveArrayBuffer( buffer, filename ) {
            save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
        }

        gltfExporter.parse(
            this.object,
            function ( result ) {

                if ( result instanceof ArrayBuffer ) {

                    saveArrayBuffer( result, 'scene.glb' );

                } else {

                    const output = JSON.stringify( result, null, 2 );
                    console.log( output );
                    saveString( output, 'scene.gltf' );

                }

            },
            function ( error ) {

                console.log( 'An error happened during parsing', error );

            },
            {
                binary: true,
                animations: this.object.animations
            }
        );
    }
    
    destroy() {
        window.removeEventListener('resize', this.resizeBind);
        window.cancelAnimationFrame(this.raf)
        this.scene = this.renderer = null    
        console.log(this.scene, this.renderer);
    }
}

const app = new App();
app.init();
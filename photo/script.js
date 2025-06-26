// 3D Environment Setup
let scene, camera, renderer, controls;
let loadingManager, textureLoader, gltfLoader, dracoLoader;
let clock = new THREE.Clock();
let mixer;
let canvasContainer;
let loadedModels = [];
let photoPlanes = [];
let particleSystem;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let cameraTarget = new THREE.Vector3(0, 0, 0);
let currentIntersect = null;
let loadingTimeout;
let initializationComplete = false;

// Define photo textures and positions
const photos = [
    {
        url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80',
        position: { x: -3, y: 1.5, z: -5 },
        rotation: { x: 0, y: Math.PI * 0.1, z: 0 },
        scale: { x: 2, y: 1.5, z: 1 }
    },
    {
        url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
        position: { x: 2, y: 0, z: -4 },
        rotation: { x: 0, y: -Math.PI * 0.15, z: 0 },
        scale: { x: 1.5, y: 2, z: 1 }
    },
    {
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80',
        position: { x: -2, y: -1, z: -3 },
        rotation: { x: 0, y: Math.PI * 0.08, z: 0 },
        scale: { x: 1.5, y: 2, z: 1 }
    },
    {
        url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
        position: { x: 3, y: -0.5, z: -6 },
        rotation: { x: 0, y: -Math.PI * 0.1, z: 0 },
        scale: { x: 1.3, y: 1.7, z: 1 }
    },
    {
        url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
        position: { x: 0, y: 1, z: -7 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1.8, y: 2.4, z: 1 }
    }
];

// Initialize Three.js scene
function init() {
    try {
        // Check if Three.js and required libraries are available
        if (typeof THREE === 'undefined') {
            console.error('THREE is not defined');
            hideLoadingScreen();
            return;
        }

        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        scene.fog = new THREE.FogExp2(0x111111, 0.05);

        // Set up camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);
        
        // Initialize renderer
        canvasContainer = document.getElementById('3d-container');
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        canvasContainer.appendChild(renderer.domElement);
        
        // Set up orbit controls - check if OrbitControls is available
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 1;
            controls.maxDistance = 15;
            controls.maxPolarAngle = Math.PI / 1.5;
            controls.target.set(0, 0, -3);
        } else {
            console.warn('OrbitControls not available, using basic controls');
            // Create a minimal controls replacement
            controls = {
                update: function() {}
            };
        }
        
        // Set up lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0xff9000, 2, 10);
        pointLight1.position.set(2, 1, 2);
        scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x0078ff, 2, 10);
        pointLight2.position.set(-2, 1, 2);
        scene.add(pointLight2);
        
        // Initialize loaders
        loadingManager = new THREE.LoadingManager(
            // Loaded
            () => {
                console.log("All assets loaded successfully");
                hideLoadingScreen();
            },
            // Progress
            (itemUrl, itemsLoaded, itemsTotal) => {
                const progressRatio = itemsLoaded / itemsTotal;
                console.log(`Loading: ${Math.round(progressRatio * 100)}%`);
            },
            // Error
            (url) => {
                console.error('Error loading: ' + url);
                // Continue with the 3D experience even if some assets fail to load
                hideLoadingScreen();
            }
        );
        
        // Set a maximum loading time to prevent infinite loading
        loadingTimeout = setTimeout(() => {
            console.warn("Loading timeout reached, showing 3D experience anyway");
            hideLoadingScreen();
        }, 10000); // 10 seconds max loading time
        
        textureLoader = new THREE.TextureLoader(loadingManager);
        
        // Check if GLTFLoader is available
        if (typeof THREE.GLTFLoader !== 'undefined') {
            gltfLoader = new THREE.GLTFLoader(loadingManager);
            
            // Check if DRACOLoader is available
            if (typeof THREE.DRACOLoader !== 'undefined') {
                dracoLoader = new THREE.DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                gltfLoader.setDRACOLoader(dracoLoader);
            }
            
            // Load 3D model with error handling
            loadRifleModel();
        } else {
            console.warn('GLTFLoader not available, skipping model loading');
        }
        
        // Create environment
        createEnvironment();
        
        // Create photo planes
        createPhotoPlanes();
        
        // Create particle system
        createParticles();
        
        // Event listeners
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);
        document.querySelectorAll('.three-d-placeholder').forEach((placeholder, index) => {
            placeholder.addEventListener('click', (e) => {
                e.preventDefault();
                focusOnPhotoPlane(index);
            });
        });
        
        // Mark initialization as complete
        initializationComplete = true;
        
        // Start animation loop
        animate();
    } catch (error) {
        console.error("Error during initialization:", error);
        hideLoadingScreen();
    }
}

// Create particles
function createParticles() {
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    const particlesPositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        particlesPositions[i] = (Math.random() - 0.5) * 20;
        particlesPositions[i + 1] = (Math.random() - 0.5) * 20;
        particlesPositions[i + 2] = (Math.random() - 0.5) * 20;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    particleSystem = new THREE.Points(particleGeometry, particlesMaterial);
    scene.add(particleSystem);
}

// Create environment
function createEnvironment() {
    // Add a ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create photo planes
function createPhotoPlanes() {
    photos.forEach((photo, index) => {
        textureLoader.load(photo.url, (texture) => {
            const aspectRatio = texture.image.width / texture.image.height;
            const planeGeometry = new THREE.PlaneGeometry(1 * aspectRatio, 1);
            
            // Create frame
            const frameBorderSize = 0.05;
            const frameGeometry = new THREE.BoxGeometry(
                1 * aspectRatio + frameBorderSize * 2,
                1 + frameBorderSize * 2,
                0.1
            );
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                roughness: 0.2,
                metalness: 0.8
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.z = -0.05;
            frame.castShadow = true;
            
            // Create photo
            const planeMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.castShadow = true;
            
            // Create group to hold frame and photo
            const photoGroup = new THREE.Group();
            photoGroup.add(frame);
            photoGroup.add(plane);
            
            // Set position, rotation and scale
            photoGroup.position.set(
                photo.position.x,
                photo.position.y,
                photo.position.z
            );
            photoGroup.rotation.set(
                photo.rotation.x,
                photo.rotation.y,
                photo.rotation.z
            );
            photoGroup.scale.set(
                photo.scale.x,
                photo.scale.y,
                photo.scale.z
            );
            
            // Add to scene
            scene.add(photoGroup);
            photoPlanes.push({
                group: photoGroup,
                plane: plane,
                index: index
            });
        });
    });
}

// Function to hide loading screen
function hideLoadingScreen() {
    clearTimeout(loadingTimeout);
    setTimeout(() => {
        const loadingScreen = document.querySelector('#loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1000);
}

// Load rifle model
function loadRifleModel() {
    try {
        // Check if the model file exists first
        fetch('sci-fi_sniper_rifle.glb', { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    // Model file exists, proceed with loading
                    loadModelFile();
                } else {
                    console.warn('Model file not found, creating a fallback object');
                    createFallbackModel();
                }
            })
            .catch(error => {
                console.error('Error checking model file:', error);
                createFallbackModel();
            });
    } catch (error) {
        console.error('Error in loadRifleModel:', error);
        createFallbackModel();
    }
}

// Function to load the actual model file
function loadModelFile() {
    gltfLoader.load(
        'sci-fi_sniper_rifle.glb', 
        (gltf) => {
            const model = gltf.scene;
            
            // Scale and position the model
            model.scale.set(0.3, 0.3, 0.3);
            model.position.set(1.5, -1.5, 0);
            model.rotation.set(0, Math.PI * 0.75, 0);
            
            // Set up shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.6;
                        child.material.metalness = 0.8;
                    }
                }
            });
            
            // Add to scene
            scene.add(model);
            loadedModels.push(model);
            
            // Set up animation if available
            if (gltf.animations && gltf.animations.length) {
                mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
        },
        // Progress callback
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Error callback
        (error) => {
            console.error('Error loading model:', error);
            createFallbackModel();
        }
    );
}

// Create a simple fallback model if the rifle model fails to load
function createFallbackModel() {
    // Create a simple camera object as fallback
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.7
    });
    
    // Create camera body
    const body = new THREE.Mesh(geometry, material);
    
    // Create camera lens
    const lensGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 32);
    const lens = new THREE.Mesh(lensGeometry, material);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.75;
    
    // Create group
    const cameraModel = new THREE.Group();
    cameraModel.add(body);
    cameraModel.add(lens);
    
    // Position the camera model
    cameraModel.position.set(1.5, -1.5, 0);
    cameraModel.rotation.y = Math.PI * 0.25;
    
    // Add shadows
    body.castShadow = true;
    body.receiveShadow = true;
    lens.castShadow = true;
    lens.receiveShadow = true;
    
    // Add to scene
    scene.add(cameraModel);
    loadedModels.push(cameraModel);
    
    console.log('Fallback camera model created');
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse move
function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handle click events
function onClick() {
    // Check if we clicked on a photo
    if (currentIntersect) {
        const photoIndex = currentIntersect.index;
        focusOnPhotoPlane(photoIndex);
    }
}

// Focus on a specific photo plane
function focusOnPhotoPlane(index) {
    const targetPhoto = photoPlanes.find(p => p.index === index);
    if (!targetPhoto) return;
    
    // Mark placeholder as active
    document.querySelectorAll('.three-d-placeholder').forEach((el) => {
        el.classList.remove('active');
    });
    document.querySelector(`.three-d-placeholder[data-index="${index}"]`).classList.add('active');
    
    // Animate camera to focus on the photo
    const targetPosition = new THREE.Vector3().copy(targetPhoto.group.position);
    targetPosition.z += 2; // Position camera in front of photo
    
    // Adjust for photo rotation
    const offsetX = Math.sin(targetPhoto.group.rotation.y) * 2;
    targetPosition.x -= offsetX;
    
    // Update controls target
    const endTarget = new THREE.Vector3().copy(targetPhoto.group.position);
    
    // Animate camera position
    gsap.to(camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: 'power2.inOut'
    });
    
    // Animate controls target
    gsap.to(controls.target, {
        x: endTarget.x,
        y: endTarget.y,
        z: endTarget.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: function() {
            controls.update();
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update animations
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    
    // Update particles
    if (particleSystem) {
        particleSystem.rotation.y += 0.0003;
    }
    
    // Move loaded models
    loadedModels.forEach(model => {
        model.rotation.y += 0.002;
    });
    
    // Rotate photo planes slightly
    photoPlanes.forEach(photo => {
        photo.group.rotation.y += Math.sin(clock.getElapsedTime() * 0.5) * 0.0005;
    });
    
    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
        photoPlanes.map(photo => photo.plane)
    );
    
    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const photoObj = photoPlanes.find(p => p.plane === intersectedObject);
        
        if (!currentIntersect) {
            document.body.style.cursor = 'pointer';
        }
        
        currentIntersect = photoObj;
    } else {
        if (currentIntersect) {
            document.body.style.cursor = 'auto';
        }
        
        currentIntersect = null;
    }
    
    // Render
    renderer.render(scene, camera);
}

// Original Website JS
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Continue button should immediately hide loading screen
        document.getElementById('continue-anyway')?.addEventListener('click', function() {
            hideLoadingScreen();
        });
        
        // Wait a bit for dynamic imports to complete before initializing
        setTimeout(() => {
            // Initialize 3D scene
            init();
            
            // Fallback in case the 3D initialization has issues
            setTimeout(() => {
                if (document.querySelector('#loading-screen').style.display !== 'none') {
                    console.warn('Forcing loading screen to close after timeout');
                    hideLoadingScreen();
                }
            }, 15000); // 15 seconds fallback
        }, 1000);
        
        // Original website functionality
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Sticky Navigation
        const header = document.querySelector('header');
        const navHeight = header.offsetHeight;
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        // Back to top button
        const backToTopButton = document.querySelector('.back-to-top');
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });
        
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // Lightbox functionality - now targeting ALL relevant images
        const allImages = document.querySelectorAll('.gallery-item img, .hero-image img, .feature-image img');
        const lightbox = document.querySelector('.lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.querySelector('.lightbox-caption');
        const lightboxClose = document.querySelector('.lightbox-close');
        const lightboxDownload = document.querySelector('.lightbox-download');
        
        // Open lightbox when any targeted image is clicked
        allImages.forEach(item => {
            item.addEventListener('click', function(e) {
                // Prevent opening lightbox if in 3D mode
                if (document.querySelector('.three-d-placeholder.active')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                lightbox.style.display = 'flex';
                lightboxImg.src = this.src;
                lightboxCaption.innerHTML = this.alt;
                
                // Set the download link to the current image
                lightboxDownload.href = this.src;
                
                // Set the filename for download
                const filename = this.alt || 'photo';
                lightboxDownload.setAttribute('download', filename + '.jpg');
                
                // Prevent scrolling on the body
                document.body.style.overflow = 'hidden';
            });
        });
        
        // Close lightbox when the close button is clicked
        lightboxClose.addEventListener('click', function() {
            lightbox.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
        
        // Close lightbox when clicking outside the image
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        
        // Close lightbox with escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightbox.style.display === 'flex') {
                lightbox.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        
        // Dark mode toggle
        const darkModeToggle = document.querySelector('.dark-mode-toggle');
        const body = document.body;
        
        // Check for saved dark mode preference
        if (localStorage.getItem('dark-mode') === 'enabled') {
            enableDarkMode();
        }
        
        darkModeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
        
        function enableDarkMode() {
            body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('dark-mode', 'enabled');
            
            // Update scene background for 3D
            if (scene) {
                scene.background = new THREE.Color(0x050505);
                scene.fog = new THREE.FogExp2(0x050505, 0.05);
            }
        }
        
        function disableDarkMode() {
            body.classList.remove('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('dark-mode', null);
            
            // Update scene background for 3D
            if (scene) {
                scene.background = new THREE.Color(0x111111);
                scene.fog = new THREE.FogExp2(0x111111, 0.05);
            }
        }
        
        // Gallery filtering
        const filterBtns = document.querySelectorAll('.filter-btn');
        const galleryItems = document.querySelectorAll('.gallery-item');

        // Add data attributes to gallery items for demo
        galleryItems.forEach((item, index) => {
            if (!item.getAttribute('data-category')) {
                const categories = ['portrait', 'landscape', 'wedding'];
                item.setAttribute('data-category', categories[index % categories.length]);
            }
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Toggle active class
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                galleryItems.forEach(item => {
                    if (filter === 'all' || item.getAttribute('data-category') === filter) {
                        item.style.display = 'block';
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'scale(1)';
                        }, 50);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        hideLoadingScreen();
    }
}); 
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

async function init() {
  // Gaussian Splat Viewer Initialization
  // We disable advanced features like shared memory and GPU sorting for maximum browser compatibility (e.g. avoiding COOP/COEP headers requirements)
  const viewer = new GaussianSplats3D.Viewer({
    'cameraUp': [0, 1, 0],
    'initialCameraPosition': [0, 1, 4],
    'initialCameraLookAt': [0, 0, 0],
    'sharedMemoryForWorkers': false, // DISABLE to avoid Cross-Origin isolation requirements
    'gpuAcceleratedSort': false,     // DISABLE to run on standard WebGL without high-end GPU requirements
    'integerBasedSort': false,       // DISABLE for compatibility
    'sceneRevealMode': GaussianSplats3D.SceneRevealMode.Instant, // Show scene immediately when loaded
  });

  // The path is relative to the public folder (or root of served files)
  const scenePath = './data/cactus_splat3_30kSteps_142k_splats.ply';

  const debug = setupDebugConsole();

  const loadingContainer = document.getElementById('loading-container');
  const loadingText = document.getElementById('loading-text');

  try {
    // Load the scene with specific adjustments
    await viewer.addSplatScene(scenePath, {
      'splatAlphaRemovalThreshold': 5, // Ignore very transparent splats to clean up noise
      'showLoadingUI': false,
      'rotation': [1, 0, 0, 0], // Quaternion [w, x, y, z] - Rotating 180 degrees around X-axis
      'position': [0, -0.5, 0],      // translating model to center it better
      'onProgress': (percent, percentLabel, loaderStatus) => {
        if (!loadingText) return;
        let statusText = 'Loading';
        if (loaderStatus === 1) statusText = 'Processing';
        else if (loaderStatus === 2) statusText = 'Done';

        loadingText.innerHTML = `${statusText}...<br>${percent.toFixed(1)}%<br>${percentLabel}`;
      }
    });

    // Hide loading UI when finished
    if (loadingContainer) {
      loadingContainer.style.display = 'none';
    }

    // --- Gaussian Splat Debug Information ---
    if (viewer.getSplatMesh) {
      // splatMesh is the actual Three.js object rendering the splats
      const count = viewer.splatMesh.getSplatCount ? viewer.splatMesh.getSplatCount() : 'unknown';
      debug.log(`Splat count: ${count}`, false);

      const mesh = viewer.getSplatMesh();
      if (mesh) {
        // Calculate Bounding Box of the point cloud
        if (mesh.geometry && !mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;

        if (box) {
          debug.log(`BBox Min: [${box.min.x.toFixed(2)}, ${box.min.y.toFixed(2)}, ${box.min.z.toFixed(2)}]`, false);
          debug.log(`BBox Max: [${box.max.x.toFixed(2)}, ${box.max.y.toFixed(2)}, ${box.max.z.toFixed(2)}]`, false);
        }
      }
    } else {
      debug.log("No splatMesh found on viewer.", true);
    }

    viewer.start();
    console.log('Viewer started');

    // Start Camera Info Loop
    const updateCameraInfo = () => {
      requestAnimationFrame(updateCameraInfo);
      if (viewer.camera) {
        const p = viewer.camera.position;
        const r = viewer.camera.rotation; // Euler
        debug.updateStatus(`Camera Pos: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]\nCamera Rot: [${r.x.toFixed(2)}, ${r.y.toFixed(2)}, ${r.z.toFixed(2)}]`);
      }
    };
    updateCameraInfo();

    // Setup Geometries Group
    const geomGroup = new THREE.Group();

    // Normal Material
    const material = new THREE.MeshNormalMaterial();

    // Cone
    const coneGeom = new THREE.ConeGeometry(0.5, 1, 32);
    const cone = new THREE.Mesh(coneGeom, material);
    cone.position.set(-0.6, 0.2, 0);
    geomGroup.add(cone);

    // Sphere
    const sphereGeom = new THREE.SphereGeometry(0.5, 32, 16);
    const sphere = new THREE.Mesh(sphereGeom, material);
    sphere.position.set(0.6, 0.2, 0);
    geomGroup.add(sphere);

    // UI Toggle Logic
    const toggle = document.getElementById('geometry-toggle');
    const splatMesh = viewer.getSplatMesh();
    // Use splatMesh.parent to reliably get the scene/container object
    const sceneObj = splatMesh && splatMesh.parent ? splatMesh.parent : viewer.getSplatMesh();

    if (toggle && sceneObj) {
      toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          sceneObj.add(geomGroup);
        } else {
          sceneObj.remove(geomGroup);
        }
      });
    }

  } catch (error) {
    console.error('Error loading splat scene:', error);
    debug.log('Error loading scene: ' + error.message, true);
  }
}

function setupDebugConsole() {
  const container = document.createElement('div');
  container.className = 'debug-console';
  document.body.appendChild(container);

  const statusDiv = document.createElement('div');
  container.appendChild(statusDiv);

  const logDiv = document.createElement('div');
  logDiv.style.marginTop = '10px';
  logDiv.style.borderTop = '1px solid rgba(255,255,255,0.3)';
  logDiv.style.paddingTop = '10px';
  container.appendChild(logDiv);

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  function logToScreen(msg, isError) {
    const line = document.createElement('div');
    line.textContent = msg;
    if (isError) line.style.color = 'red';
    logDiv.appendChild(line);
    // Keep only last 10 lines
    while (logDiv.children.length > 10) {
      logDiv.removeChild(logDiv.firstChild);
    }
  }

  function updateStatus(text) {
    statusDiv.textContent = text;
  }

  // Hook into console to show logs on screen
  console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    logToScreen(args.join(' '), false);
  };

  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    logToScreen(args.join(' '), true);
  };

  window.addEventListener('error', (event) => {
    console.error('Global Error:', event.message || 'Unknown error', 'at', event.filename, ':', event.lineno);
  });

  return { log: logToScreen, updateStatus };
}

init();

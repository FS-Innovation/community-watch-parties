"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const MOVE_SPEED = 0.12;
const SEAT_ROWS = 6;
const SEATS_PER_ROW = 10;
const SEAT_SPACING_X = 2.2;
const SEAT_SPACING_Z = 2.5;
const SEAT_START_Z = 2;
const ROW_ELEVATION = 0.5; // each row rises by this much

interface SeatData {
  mesh: THREE.Group;
  position: THREE.Vector3;
  occupied: boolean;
  row: number;
  col: number;
}

interface AuditoriumProps {
  onSit?: (seated: boolean) => void;
  videoElement?: HTMLVideoElement | null;
  youtubeUrl?: string;
}

export default function Auditorium3D({
  onSit,
  videoElement,
  youtubeUrl,
}: AuditoriumProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    avatar: THREE.Group;
    seats: SeatData[];
    screenMesh: THREE.Mesh;
    keys: Record<string, boolean>;
    isSeated: boolean;
    seatedIn: SeatData | null;
    nearestSeat: SeatData | null;
    raycaster: THREE.Raycaster;
    clock: THREE.Clock;
  } | null>(null);
  const [isSeated, setIsSeated] = useState(false);
  const [nearSeat, setNearSeat] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const animFrameRef = useRef<number>(0);

  // ──────────────────────────────────────────────
  // BUILD THE SCENE
  // ──────────────────────────────────────────────
  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    containerRef.current.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.018);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 3, SEAT_START_Z + SEAT_ROWS * SEAT_SPACING_Z + 2);

    // ──────── LIGHTING ────────
    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.6);
    scene.add(ambientLight);

    // Main stage spotlight
    const stageSpot = new THREE.SpotLight(0xe8734a, 40, 40, Math.PI / 4, 0.5);
    stageSpot.position.set(0, 15, -5);
    stageSpot.target.position.set(0, 4, -8);
    stageSpot.castShadow = true;
    scene.add(stageSpot);
    scene.add(stageSpot.target);

    // Side accent lights (purple/blue like Spatial)
    const leftLight = new THREE.PointLight(0x7b2fff, 15, 30);
    leftLight.position.set(-15, 6, -2);
    scene.add(leftLight);

    const rightLight = new THREE.PointLight(0x7b2fff, 15, 30);
    rightLight.position.set(15, 6, -2);
    scene.add(rightLight);

    // Overhead fill
    const topLight = new THREE.PointLight(0x3344aa, 8, 50);
    topLight.position.set(0, 14, 5);
    scene.add(topLight);

    // Screen backlight glow
    const screenGlow = new THREE.PointLight(0xe8734a, 20, 15);
    screenGlow.position.set(0, 6, -9);
    scene.add(screenGlow);

    // ──────── FLOOR ────────
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c22,
      roughness: 0.3,
      metalness: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ──────── TIERED FLOOR (auditorium rise) ────────
    for (let r = 0; r < SEAT_ROWS; r++) {
      const tierGeo = new THREE.BoxGeometry(
        SEATS_PER_ROW * SEAT_SPACING_X + 4,
        r * ROW_ELEVATION + 0.2,
        SEAT_SPACING_Z * 0.9
      );
      const tierMat = new THREE.MeshStandardMaterial({
        color: 0x12122a,
        roughness: 0.6,
        metalness: 0.3,
      });
      const tier = new THREE.Mesh(tierGeo, tierMat);
      tier.position.set(
        0,
        (r * ROW_ELEVATION) / 2,
        SEAT_START_Z + r * SEAT_SPACING_Z
      );
      tier.receiveShadow = true;
      scene.add(tier);
    }

    // ──────── WALLS ────────
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e28,
      roughness: 0.7,
      metalness: 0.2,
    });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(50, 18, 0.5), wallMat);
    backWall.position.set(0, 9, -12);
    scene.add(backWall);

    // Side walls
    const sideWallGeo = new THREE.BoxGeometry(0.5, 18, 50);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-18, 9, 5);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(18, 9, 5);
    scene.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x080818, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 18;
    scene.add(ceiling);

    // ──────── DECORATIVE BLOCKS (like Spatial) ────────
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a44,
      roughness: 0.4,
      metalness: 0.6,
    });
    for (let i = 0; i < 30; i++) {
      const size = 0.5 + Math.random() * 1.5;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        blockMat
      );
      const side = Math.random() > 0.5 ? -1 : 1;
      block.position.set(
        side * (14 + Math.random() * 3),
        Math.random() * 12,
        -10 + Math.random() * 25
      );
      block.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI,
        Math.random() * 0.3
      );
      scene.add(block);
    }

    // ──────── MAIN SCREEN ────────
    const screenWidth = 14;
    const screenHeight = 8;
    const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 7, -11.5);
    scene.add(screenMesh);

    // Screen frame / bezel
    const bezelGeo = new THREE.BoxGeometry(
      screenWidth + 0.6,
      screenHeight + 0.6,
      0.3
    );
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      roughness: 0.3,
      metalness: 0.7,
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 7, -11.65);
    scene.add(bezel);

    // Neon strip under screen
    const neonGeo = new THREE.BoxGeometry(screenWidth + 2, 0.1, 0.1);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xe8734a });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.set(0, 2.85, -11.3);
    scene.add(neon);

    // ──────── SIDE SCREENS ────────
    const sideScreenGeo = new THREE.PlaneGeometry(4, 3);
    const sideScreenMat = new THREE.MeshBasicMaterial({ color: 0x1a1a3e });

    const leftScreen = new THREE.Mesh(sideScreenGeo, sideScreenMat);
    leftScreen.position.set(-12, 6, -10);
    leftScreen.rotation.y = 0.4;
    scene.add(leftScreen);

    const rightScreen = new THREE.Mesh(sideScreenGeo, sideScreenMat.clone());
    rightScreen.position.set(12, 6, -10);
    rightScreen.rotation.y = -0.4;
    scene.add(rightScreen);

    // ──────── SEATS ────────
    const seats: SeatData[] = [];

    for (let row = 0; row < SEAT_ROWS; row++) {
      for (let col = 0; col < SEATS_PER_ROW; col++) {
        const seatGroup = new THREE.Group();

        const x =
          (col - (SEATS_PER_ROW - 1) / 2) * SEAT_SPACING_X;
        const z = SEAT_START_Z + row * SEAT_SPACING_Z;
        const y = row * ROW_ELEVATION + 0.3;

        // Seat base
        const baseMat = new THREE.MeshStandardMaterial({
          color: 0x1e1e44,
          roughness: 0.5,
          metalness: 0.4,
        });
        const seatBase = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.6, 1.0),
          baseMat
        );
        seatBase.position.y = 0.3;
        seatBase.castShadow = true;
        seatGroup.add(seatBase);

        // Seat back
        const backMat = new THREE.MeshStandardMaterial({
          color: 0x2a2a55,
          roughness: 0.5,
          metalness: 0.3,
        });
        const seatBack = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.2, 0.2),
          backMat
        );
        seatBack.position.set(0, 0.9, -0.4);
        seatGroup.add(seatBack);

        // Armrests
        const armMat = new THREE.MeshStandardMaterial({
          color: 0x333366,
          roughness: 0.3,
          metalness: 0.6,
        });
        const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.8);
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.65, 0.55, -0.05);
        seatGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.65, 0.55, -0.05);
        seatGroup.add(rightArm);

        seatGroup.position.set(x, y, z);
        scene.add(seatGroup);

        seats.push({
          mesh: seatGroup,
          position: new THREE.Vector3(x, y, z),
          occupied: false,
          row,
          col,
        });
      }
    }

    // ──────── AVATAR ────────
    const avatar = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.8, 8, 16),
      bodyMat
    );
    body.position.y = 1.0;
    body.castShadow = true;
    avatar.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      bodyMat
    );
    head.position.y = 1.75;
    head.castShadow = true;
    avatar.add(head);

    // Avatar glow ring
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe8734a,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.05;
    avatar.add(glowRing);

    avatar.position.set(
      0,
      0,
      SEAT_START_Z + SEAT_ROWS * SEAT_SPACING_Z + 3
    );
    scene.add(avatar);

    // ──────── STATE ────────
    const state = {
      scene,
      camera,
      renderer,
      avatar,
      seats,
      screenMesh,
      keys: {} as Record<string, boolean>,
      isSeated: false,
      seatedIn: null as SeatData | null,
      nearestSeat: null as SeatData | null,
      raycaster: new THREE.Raycaster(),
      clock: new THREE.Clock(),
    };

    sceneRef.current = state;
    return state;
  }, []);

  // ──────────────────────────────────────────────
  // ANIMATION LOOP
  // ──────────────────────────────────────────────
  const animate = useCallback(() => {
    const state = sceneRef.current;
    if (!state) return;

    const { scene, camera, renderer, avatar, seats, keys, clock } = state;
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // ── Movement (only when not seated) ──
    if (!state.isSeated) {
      const direction = new THREE.Vector3();
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();

      const right = new THREE.Vector3()
        .crossVectors(cameraDir, new THREE.Vector3(0, 1, 0))
        .normalize();

      if (keys["w"] || keys["arrowup"]) direction.add(cameraDir);
      if (keys["s"] || keys["arrowdown"])
        direction.add(cameraDir.clone().negate());
      if (keys["a"] || keys["arrowleft"]) direction.add(right.clone().negate());
      if (keys["d"] || keys["arrowright"]) direction.add(right);

      if (direction.length() > 0) {
        direction.normalize().multiplyScalar(MOVE_SPEED);
        avatar.position.add(direction);

        // Clamp position to room bounds
        avatar.position.x = Math.max(-16, Math.min(16, avatar.position.x));
        avatar.position.z = Math.max(-8, Math.min(22, avatar.position.z));

        // Face movement direction
        const angle = Math.atan2(direction.x, direction.z);
        avatar.rotation.y = angle;
      }

      // Terrain follow — avatar y matches row elevation
      let groundY = 0;
      for (let r = SEAT_ROWS - 1; r >= 0; r--) {
        const rowZ = SEAT_START_Z + r * SEAT_SPACING_Z;
        if (avatar.position.z < rowZ + SEAT_SPACING_Z / 2 && avatar.position.z > rowZ - SEAT_SPACING_Z / 2) {
          groundY = r * ROW_ELEVATION;
          break;
        }
      }
      avatar.position.y = groundY;

      // Camera follows avatar (third person)
      const camOffset = new THREE.Vector3(0, 4, 6);
      const targetCamPos = avatar.position.clone().add(camOffset);
      camera.position.lerp(targetCamPos, 0.05);
      const lookTarget = avatar.position.clone().add(new THREE.Vector3(0, 2, -4));
      camera.lookAt(lookTarget);
    } else if (state.seatedIn) {
      // Seated camera: look at screen from seat position
      const seatPos = state.seatedIn.position;
      const camPos = new THREE.Vector3(seatPos.x, seatPos.y + 2.5, seatPos.z + 1.5);
      camera.position.lerp(camPos, 0.05);
      camera.lookAt(0, 7, -11.5);
    }

    // ── Find nearest seat ──
    if (!state.isSeated) {
      let nearest: SeatData | null = null;
      let minDist = 2.5;
      for (const seat of seats) {
        const dist = avatar.position.distanceTo(seat.position);
        if (dist < minDist && !seat.occupied) {
          minDist = dist;
          nearest = seat;
        }
      }
      state.nearestSeat = nearest;
      setNearSeat(!!nearest);

      // Highlight nearest seat
      for (const seat of seats) {
        const baseMesh = seat.mesh.children[0] as THREE.Mesh;
        const mat = baseMesh.material as THREE.MeshStandardMaterial;
        if (seat === nearest) {
          mat.emissive = new THREE.Color(0xe8734a);
          mat.emissiveIntensity = 0.4 + Math.sin(time * 3) * 0.2;
        } else {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }

    // Subtle avatar bob
    if (!state.isSeated) {
      const body = avatar.children[0];
      body.position.y = 1.0 + Math.sin(time * 2) * 0.03;
    }

    // Floating blocks animation
    let blockIndex = 0;
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.BoxGeometry
      ) {
        const geo = child.geometry as THREE.BoxGeometry;
        if (geo.parameters.width < 2.1 && geo.parameters.width > 0.4) {
          if (
            Math.abs(child.position.x) > 13 &&
            child.position.y > 0.5
          ) {
            child.position.y += Math.sin(time * 0.5 + blockIndex) * 0.003;
            child.rotation.y += delta * 0.1;
            blockIndex++;
          }
        }
      }
    });

    renderer.render(scene, camera);
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // ──────────────────────────────────────────────
  // KEY HANDLERS
  // ──────────────────────────────────────────────
  useEffect(() => {
    const state = sceneRef.current;

    function onKeyDown(e: KeyboardEvent) {
      if (!state) return;
      const key = e.key.toLowerCase();
      state.keys[key] = true;

      // F to sit/stand
      if (key === "f") {
        if (state.isSeated && state.seatedIn) {
          // Stand up
          state.isSeated = false;
          state.seatedIn.occupied = false;
          state.avatar.visible = true;
          state.avatar.position.set(
            state.seatedIn.position.x,
            state.seatedIn.position.y,
            state.seatedIn.position.z + 1.5
          );
          state.seatedIn = null;
          setIsSeated(false);
          onSit?.(false);
        } else if (state.nearestSeat) {
          // Sit down
          state.isSeated = true;
          state.seatedIn = state.nearestSeat;
          state.nearestSeat.occupied = true;
          state.avatar.visible = false;
          state.avatar.position.copy(state.nearestSeat.position);
          setIsSeated(true);
          setNearSeat(false);
          onSit?.(true);
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!state) return;
      state.keys[e.key.toLowerCase()] = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onSit]);

  // ──────────────────────────────────────────────
  // VIDEO TEXTURE ON SCREEN
  // ──────────────────────────────────────────────
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || !videoElement) return;

    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    const mat = state.screenMesh.material as THREE.MeshBasicMaterial;
    mat.map = videoTexture;
    mat.needsUpdate = true;

    return () => {
      videoTexture.dispose();
      mat.map = null;
      mat.needsUpdate = true;
    };
  }, [videoElement]);

  // ──────────────────────────────────────────────
  // INIT + CLEANUP
  // ──────────────────────────────────────────────
  useEffect(() => {
    const state = initScene();
    if (!state) return;

    // Start animation
    animFrameRef.current = requestAnimationFrame(animate);

    // Resize handler
    function onResize() {
      if (!containerRef.current || !state) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      state.camera.aspect = w / h;
      state.camera.updateProjectionMatrix();
      state.renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    // Hide prompt after 5 seconds
    const promptTimer = setTimeout(() => setShowPrompt(false), 6000);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      clearTimeout(promptTimer);
      state.renderer.dispose();
      if (containerRef.current && state.renderer.domElement.parentNode) {
        containerRef.current.removeChild(state.renderer.domElement);
      }
    };
  }, [initScene, animate]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* HUD overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-10">
        {nearSeat && !isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-[var(--doac-orange)]/50 text-white text-sm font-medium animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-[var(--doac-orange)] text-white font-bold">F</kbd> to sit
          </div>
        )}
        {isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-white/20 font-bold">F</kbd> to stand up
          </div>
        )}
        {showPrompt && !isSeated && !nearSeat && (
          <div className="px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 text-sm animate-fade-in">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">D</kbd>
            <span className="ml-2">to move</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─── CONSTANTS ───
const MOVE_SPEED = 0.07;
const MOUSE_SENSITIVITY = 0.002;
const SEAT_ROWS = 15;
const SEATS_PER_ROW = 20;
const SEAT_SPACING_X = 2.0;
const SEAT_SPACING_Z = 2.4;
const SEAT_START_Z = 4;
const ROW_ELEVATION = 0.45;

interface SeatData {
  group: THREE.Group;
  worldPos: THREE.Vector3;
  occupied: boolean;
}

interface AuditoriumProps {
  onSit?: (seated: boolean) => void;
  videoElement?: HTMLVideoElement | null;
  leftSideVideo?: HTMLVideoElement | null;
  rightSideVideo?: HTMLVideoElement | null;
  assignedSeat?: number | null;
  showLive?: boolean;
  onLeaveSeat?: () => void;
}

export default function Auditorium3D({ onSit, videoElement, leftSideVideo, rightSideVideo, assignedSeat, showLive, onLeaveSeat }: AuditoriumProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isSeated, setIsSeated] = useState(false);
  const [nearSeat, setNearSeat] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const isSeatedRef = useRef(false);
  const nearSeatRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // ─── RENDERER ───
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // ─── SCENE ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050514);
    scene.fog = new THREE.FogExp2(0x050514, 0.008);

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 200);
    // Avatar spawns at back of seating area
    const lastRowZ = SEAT_START_Z + (SEAT_ROWS - 1) * SEAT_SPACING_Z;
    const avatarStartZ = lastRowZ + 4; // just behind the last row

    // Start camera behind avatar, elevated, looking toward screen
    camera.position.set(0, 8, avatarStartZ + 6);
    camera.lookAt(0, 4, -10); // look toward the screen

    // ─── MOUSE LOOK STATE ───
    let yaw = 0; // face toward -Z (toward the screen)
    let pitch = -0.1; // slightly looking down
    let isPointerLocked = false;

    // ─── LIGHTING ───
    scene.add(new THREE.AmbientLight(0x111133, 2.0));
    const hemi = new THREE.HemisphereLight(0x2233aa, 0x0a0a20, 0.8);
    scene.add(hemi);

    // Dramatic stage spotlights
    const stageLight = new THREE.SpotLight(0xe8734a, 80, 50, Math.PI / 4, 0.7, 1);
    stageLight.position.set(0, 18, 2);
    stageLight.target.position.set(0, 5, -10);
    stageLight.castShadow = true;
    scene.add(stageLight);
    scene.add(stageLight.target);

    const stageLight2 = new THREE.SpotLight(0xff5533, 40, 40, Math.PI / 5, 0.8, 1);
    stageLight2.position.set(-8, 16, -2);
    stageLight2.target.position.set(0, 3, -8);
    scene.add(stageLight2);
    scene.add(stageLight2.target);

    const stageLight3 = new THREE.SpotLight(0xff5533, 40, 40, Math.PI / 5, 0.8, 1);
    stageLight3.position.set(8, 16, -2);
    stageLight3.target.position.set(0, 3, -8);
    scene.add(stageLight3);
    scene.add(stageLight3.target);

    // Purple side wash
    const purpleL = new THREE.PointLight(0x6633cc, 25, 35);
    purpleL.position.set(-16, 5, 5);
    scene.add(purpleL);
    const purpleR = new THREE.PointLight(0x6633cc, 25, 35);
    purpleR.position.set(16, 5, 5);
    scene.add(purpleR);

    // Blue top fill
    const topFill = new THREE.PointLight(0x3355cc, 12, 50);
    topFill.position.set(0, 18, 10);
    scene.add(topFill);

    // Screen glow
    const screenGlow = new THREE.PointLight(0x4466ff, 20, 20);
    screenGlow.position.set(0, 6, -9);
    scene.add(screenGlow);

    // Aisle runner lights (orange dots along the aisle)
    const aisleLights: THREE.PointLight[] = [];
    for (let z = 2; z < avatarStartZ; z += 3) {
      for (const x of [-1.2, 1.2]) {
        const al = new THREE.PointLight(0xe8734a, 3, 4);
        al.position.set(x, 0.1, z);
        scene.add(al);
        aisleLights.push(al);
        // Tiny glowing dot
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xe8734a })
        );
        dot.position.set(x, 0.08, z);
        scene.add(dot);
      }
    }

    const pinkGlow = new THREE.PointLight(0xff44aa, 25, 20);
    pinkGlow.position.set(0, 6, -12);
    scene.add(pinkGlow);

    // ─── FLOOR ───
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0a0a2a, roughness: 0.12, metalness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Carpet/aisle strip down the center
    const aisleCarpet = new THREE.Mesh(
      new THREE.PlaneGeometry(3, avatarStartZ + 2),
      new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.8, metalness: 0.1 })
    );
    aisleCarpet.rotation.x = -Math.PI / 2;
    aisleCarpet.position.set(0, 0.005, avatarStartZ / 2);
    scene.add(aisleCarpet);

    // ─── STAGE ───
    const stage = new THREE.Mesh(
      new THREE.BoxGeometry(20, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a50, roughness: 0.4, metalness: 0.5 })
    );
    stage.position.set(0, 0.75, -7);
    stage.receiveShadow = true;
    stage.castShadow = true;
    scene.add(stage);

    // Stage neon edge
    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xe8734a })
    );
    neonStrip.position.set(0, 1.52, -3.04);
    scene.add(neonStrip);

    // Stage steps
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.4, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x151545, roughness: 0.5, metalness: 0.4 })
      );
      step.position.set(0, 0.2 + i * 0.4, -2.5 + i * -0.8);
      step.receiveShadow = true;
      scene.add(step);
    }

    // ─── MAIN SCREEN ───
    const screenW = 14, screenH = 8;
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x111122, side: THREE.FrontSide });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
    screenMesh.position.set(0, 6.5, -10.5);
    screenMesh.renderOrder = 1;
    scene.add(screenMesh);

    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(screenW + 0.8, screenH + 0.8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222255, roughness: 0.3, metalness: 0.7 })
    );
    bezel.position.set(0, 6.5, -10.9);
    scene.add(bezel);

    scene.add(new THREE.Mesh(
      new THREE.BoxGeometry(screenW + 2, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x6644ff })
    )).position.set(0, 10.95, -10.5);

    // ─── SIDE SCREENS ───
    const sideScreenMatL = new THREE.MeshBasicMaterial({ color: 0x1a1a44, side: THREE.FrontSide });
    const leftSideScreen = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.5), sideScreenMatL);
    leftSideScreen.position.set(-11.5, 6, -9);
    leftSideScreen.rotation.y = 0.35;
    scene.add(leftSideScreen);

    const lBezel = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 3.9, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222255, roughness: 0.3, metalness: 0.7 })
    );
    lBezel.position.set(-11.5, 6, -9);
    lBezel.rotation.y = 0.35;
    lBezel.position.z -= Math.cos(0.35) * 0.2;
    lBezel.position.x += Math.sin(0.35) * 0.2;
    scene.add(lBezel);

    const sideScreenMatR = new THREE.MeshBasicMaterial({ color: 0x1a1a44, side: THREE.FrontSide });
    const rightSideScreen = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.5), sideScreenMatR);
    rightSideScreen.position.set(11.5, 6, -9);
    rightSideScreen.rotation.y = -0.35;
    scene.add(rightSideScreen);

    const rBezel = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 3.9, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222255, roughness: 0.3, metalness: 0.7 })
    );
    rBezel.position.set(11.5, 6, -9);
    rBezel.rotation.y = -0.35;
    rBezel.position.z -= Math.cos(0.35) * 0.2;
    rBezel.position.x -= Math.sin(0.35) * 0.2;
    scene.add(rBezel);

    // ─── WALLS ───
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e0e30, roughness: 0.7, metalness: 0.3 });
    const roomWidth = 55;
    const roomDepth = 60;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 20, 0.5), wallMat);
    backWall.position.set(0, 10, -11.5);
    scene.add(backWall);

    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, roomDepth), wallMat);
      sw.position.set(side * (roomWidth / 2), 10, 10);
      scene.add(sw);
    }

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, roomDepth),
      new THREE.MeshStandardMaterial({ color: 0x080820, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 20, 10);
    scene.add(ceiling);

    // ─── DECORATIVE BLOCKS ───
    const blockMat1 = new THREE.MeshStandardMaterial({ color: 0x202066, roughness: 0.4, metalness: 0.5 });
    const blockMat2 = new THREE.MeshStandardMaterial({ color: 0x3030aa, roughness: 0.4, metalness: 0.5 });
    const decorBlocks: THREE.Mesh[] = [];

    for (let i = 0; i < 50; i++) {
      const s = 0.4 + Math.random() * 1.8;
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), Math.random() > 0.5 ? blockMat1 : blockMat2);
      const side = Math.random() > 0.5 ? 1 : -1;
      block.position.set(side * (22 + Math.random() * 5), 0.5 + Math.random() * 16, -10 + Math.random() * 50);
      block.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      block.castShadow = true;
      scene.add(block);
      decorBlocks.push(block);
    }
    for (let i = 0; i < 15; i++) {
      const s = 0.5 + Math.random() * 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), Math.random() > 0.5 ? blockMat1 : blockMat2);
      block.position.set(-8 + Math.random() * 16, 8 + Math.random() * 8, -11 + Math.random() * -3);
      block.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(block);
      decorBlocks.push(block);
    }

    // ─── TIERED SEATING ───
    for (let r = 0; r < SEAT_ROWS; r++) {
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(SEATS_PER_ROW * SEAT_SPACING_X + 6, (r + 1) * ROW_ELEVATION, SEAT_SPACING_Z * 0.85),
        new THREE.MeshStandardMaterial({ color: 0x151550, roughness: 0.5, metalness: 0.4 })
      );
      tier.position.set(0, ((r + 1) * ROW_ELEVATION) / 2, SEAT_START_Z + r * SEAT_SPACING_Z);
      tier.receiveShadow = true;
      scene.add(tier);
    }

    // ─── SEATS ───
    const seats: SeatData[] = [];
    const seatBaseMat = new THREE.MeshStandardMaterial({ color: 0x2a2a66, roughness: 0.5, metalness: 0.4 });
    const seatBackMat = new THREE.MeshStandardMaterial({ color: 0x3333aa, roughness: 0.5, metalness: 0.3 });

    for (let row = 0; row < SEAT_ROWS; row++) {
      const y = (row + 1) * ROW_ELEVATION;
      const z = SEAT_START_Z + row * SEAT_SPACING_Z;
      for (let col = 0; col < SEATS_PER_ROW; col++) {
        const x = (col - (SEATS_PER_ROW - 1) / 2) * SEAT_SPACING_X;
        const group = new THREE.Group();

        const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.1), seatBaseMat.clone());
        cushion.position.y = 0.25;
        cushion.castShadow = true;
        group.add(cushion);

        const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.2), seatBackMat.clone());
        back.position.set(0, 1.0, -0.45);
        group.add(back);

        const armGeo = new THREE.BoxGeometry(0.12, 0.55, 0.9);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x444488, roughness: 0.3, metalness: 0.6 });
        const la = new THREE.Mesh(armGeo, armMat);
        la.position.set(-0.75, 0.5, -0.05);
        group.add(la);
        const ra = new THREE.Mesh(armGeo, armMat);
        ra.position.set(0.75, 0.5, -0.05);
        group.add(ra);

        group.position.set(x, y, z);
        scene.add(group);
        seats.push({ group, worldPos: new THREE.Vector3(x, y, z), occupied: false });
      }
    }

    // ─── AVATAR ───
    const avatar = new THREE.Group();
    const avatarBodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 8, 16), avatarBodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    avatar.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), avatarBodyMat);
    head.position.y = 1.9;
    head.castShadow = true;
    avatar.add(head);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    avatar.add(ring);
    avatar.position.set(0, 0, avatarStartZ);
    scene.add(avatar);

    // ─── STATE ───
    const keys: Record<string, boolean> = {};
    let seated = false;
    let seatedIn: SeatData | null = null;
    let nearestSeat: SeatData | null = null;
    let isShowLive = false;
    const clock = new THREE.Clock();

    // ─── AUTO-SEAT (assigned seat) ───
    function seatNumberToIndex(seatNum: number): number {
      // Seat numbers are 1-based: seat 1 = row 0 col 0, seat 21 = row 1 col 0, etc.
      return Math.max(0, Math.min(seatNum - 1, seats.length - 1));
    }

    function autoSeatPlayer(seatNum: number) {
      const idx = seatNumberToIndex(seatNum);
      const seat = seats[idx];
      if (!seat) return;
      seated = true;
      seatedIn = seat;
      seat.occupied = true;
      avatar.visible = false;
      isSeatedRef.current = true;
      setIsSeated(true);
      setNearSeat(false);
      onSit?.(true);
      document.exitPointerLock();
    }

    // Store reference for external control
    const ext2 = mount as HTMLElement & { __autoSeat?: (n: number) => void; __setShowLive?: (v: boolean) => void };
    ext2.__autoSeat = autoSeatPlayer;
    ext2.__setShowLive = (v: boolean) => { isShowLive = v; };

    // ─── POINTER LOCK (click canvas to enable mouse look) ───
    function onCanvasClick() {
      if (!seated) {
        renderer.domElement.requestPointerLock();
      }
    }
    renderer.domElement.addEventListener("click", onCanvasClick);

    function onPointerLockChange() {
      isPointerLocked = document.pointerLockElement === renderer.domElement;
    }
    document.addEventListener("pointerlockchange", onPointerLockChange);

    function onMouseMove(e: MouseEvent) {
      if (!isPointerLocked || seated) return;
      yaw -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 3, Math.PI / 3);
    }
    document.addEventListener("mousemove", onMouseMove);

    // ─── KEYBOARD ───
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      keys[k] = true;

      if (k === "f") {
        if (seated && seatedIn) {
          if (isShowLive) {
            // During live show, leaving seat sends you back to lounge
            seated = false;
            seatedIn.occupied = false;
            seatedIn = null;
            isSeatedRef.current = false;
            setIsSeated(false);
            onSit?.(false);
            onLeaveSeat?.();
            return;
          }
          seated = false;
          seatedIn.occupied = false;
          avatar.visible = true;
          avatar.position.set(seatedIn.worldPos.x, seatedIn.worldPos.y, seatedIn.worldPos.z + 2);
          seatedIn = null;
          isSeatedRef.current = false;
          setIsSeated(false);
          onSit?.(false);
        } else if (!isShowLive && nearestSeat && !nearestSeat.occupied) {
          seated = true;
          seatedIn = nearestSeat;
          nearestSeat.occupied = true;
          avatar.visible = false;
          isSeatedRef.current = true;
          setIsSeated(true);
          setNearSeat(false);
          onSit?.(true);
          // Exit pointer lock when sitting
          document.exitPointerLock();
        }
      }

      if (k === "escape") {
        document.exitPointerLock();
      }
    }
    function onKeyUp(e: KeyboardEvent) { keys[e.key.toLowerCase()] = false; }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ─── ANIMATION ───
    let rafId: number;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.getElapsedTime();

      if (!seated && !isShowLive) {
        // ── WASD movement relative to camera yaw ──
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const dir = new THREE.Vector3();

        if (keys["w"] || keys["arrowup"]) dir.add(forward);
        if (keys["s"] || keys["arrowdown"]) dir.add(forward.clone().negate());
        if (keys["a"] || keys["arrowleft"]) dir.add(right.clone().negate());
        if (keys["d"] || keys["arrowright"]) dir.add(right);

        if (dir.lengthSq() > 0) {
          dir.normalize().multiplyScalar(MOVE_SPEED);
          avatar.position.add(dir);
          avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -25, 25);
          avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -2, avatarStartZ + 2);
          // Face movement direction
          avatar.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Ground height
        let groundY = 0;
        for (let r = SEAT_ROWS - 1; r >= 0; r--) {
          const rowZ = SEAT_START_Z + r * SEAT_SPACING_Z;
          if (avatar.position.z >= rowZ - SEAT_SPACING_Z * 0.5 && avatar.position.z <= rowZ + SEAT_SPACING_Z * 0.5) {
            groundY = (r + 1) * ROW_ELEVATION;
            break;
          }
        }
        avatar.position.y = groundY;

        // ── Camera: third-person with mouse look ──
        // Camera behind avatar (opposite of forward direction)
        const camDist = 5;
        const camHeight = 4;
        const camX = avatar.position.x + Math.sin(yaw) * camDist;
        const camZ = avatar.position.z + Math.cos(yaw) * camDist;
        const camY = Math.max(2, avatar.position.y + camHeight + Math.sin(pitch) * 2);

        const targetCamPos = new THREE.Vector3(camX, camY, camZ);
        camera.position.lerp(targetCamPos, 0.1);

        // Look target: ahead of avatar in the direction they face
        const lookDist = 12;
        const lookX = avatar.position.x - Math.sin(yaw) * lookDist;
        const lookZ = avatar.position.z - Math.cos(yaw) * lookDist;
        const lookY = avatar.position.y + 2 + Math.sin(pitch) * 5;
        camera.lookAt(lookX, lookY, lookZ);

        // ── Nearest seat ──
        let closest: SeatData | null = null;
        let closestDist = 3.0;
        for (const seat of seats) {
          const d = avatar.position.distanceTo(seat.worldPos);
          if (d < closestDist && !seat.occupied) { closestDist = d; closest = seat; }
        }
        nearestSeat = closest;
        const isNear = !!closest;
        if (isNear !== nearSeatRef.current) { nearSeatRef.current = isNear; setNearSeat(isNear); }

        // Highlight
        for (const seat of seats) {
          const cushion = seat.group.children[0] as THREE.Mesh;
          const mat = cushion.material as THREE.MeshStandardMaterial;
          if (seat === closest) {
            mat.emissive.setHex(0xe8734a);
            mat.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.3;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }

        body.position.y = 1.1 + Math.sin(t * 2.5) * 0.03;
      } else if (seatedIn) {
        // Seated: smooth camera to screen view
        const camTarget = new THREE.Vector3(seatedIn.worldPos.x * 0.4, seatedIn.worldPos.y + 3, seatedIn.worldPos.z + 2);
        camera.position.lerp(camTarget, 0.04);
        camera.lookAt(0, 6.5, -10.8);
      }

      // Floating blocks
      for (let i = 0; i < decorBlocks.length; i++) {
        decorBlocks[i].position.y += Math.sin(t * 0.4 + i * 0.7) * 0.002;
        decorBlocks[i].rotation.y += delta * 0.05;
      }
      pinkGlow.intensity = 20 + Math.sin(t * 1.5) * 8;

      // Aisle lights wave effect
      for (let i = 0; i < aisleLights.length; i++) {
        aisleLights[i].intensity = 2 + Math.sin(t * 2 + i * 0.5) * 1.5;
      }

      // Screen glow breathing
      screenGlow.intensity = 15 + Math.sin(t * 1.2) * 5;

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(animate);

    // ─── RESIZE ───
    function onResize() {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    const controlsTimer = setTimeout(() => setShowControls(false), 8000);

    // Store meshes for video textures
    const ext = mount as HTMLElement & { __screenMesh?: THREE.Mesh; __leftSideScreen?: THREE.Mesh; __rightSideScreen?: THREE.Mesh };
    ext.__screenMesh = screenMesh;
    ext.__leftSideScreen = leftSideScreen;
    ext.__rightSideScreen = rightSideScreen;

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      clearTimeout(controlsTimer);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── VIDEO TEXTURES ───
  useEffect(() => {
    const m = mountRef.current;
    if (!m || !videoElement) return;
    const mesh = (m as HTMLElement & { __screenMesh?: THREE.Mesh }).__screenMesh;
    if (!mesh) return;
    const tex = new THREE.VideoTexture(videoElement);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = tex; mat.color.setHex(0xffffff); mat.needsUpdate = true;
    return () => { tex.dispose(); mat.map = null; mat.color.setHex(0x111122); mat.needsUpdate = true; };
  }, [videoElement]);

  useEffect(() => {
    const m = mountRef.current;
    if (!m || !leftSideVideo) return;
    const mesh = (m as HTMLElement & { __leftSideScreen?: THREE.Mesh }).__leftSideScreen;
    if (!mesh) return;
    const tex = new THREE.VideoTexture(leftSideVideo);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = tex; mat.color.setHex(0xffffff); mat.needsUpdate = true;
    return () => { tex.dispose(); mat.map = null; mat.color.setHex(0x1a1a44); mat.needsUpdate = true; };
  }, [leftSideVideo]);

  useEffect(() => {
    const m = mountRef.current;
    if (!m || !rightSideVideo) return;
    const mesh = (m as HTMLElement & { __rightSideScreen?: THREE.Mesh }).__rightSideScreen;
    if (!mesh) return;
    const tex = new THREE.VideoTexture(rightSideVideo);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = tex; mat.color.setHex(0xffffff); mat.needsUpdate = true;
    return () => { tex.dispose(); mat.map = null; mat.color.setHex(0x1a1a44); mat.needsUpdate = true; };
  }, [rightSideVideo]);

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ minHeight: "100vh" }}>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-10">
        {nearSeat && !isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-[#e8734a]/50 text-white text-sm font-medium animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-[#e8734a] text-white font-bold">F</kbd> to sit
          </div>
        )}
        {isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-white/20 font-bold">F</kbd> to {showLive ? "leave (returns to lounge)" : "stand up"}
          </div>
        )}
        {showControls && !isSeated && !nearSeat && (
          <div className="px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 text-sm animate-fade-in">
            Click to look around
            <span className="mx-2 text-white/30">|</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">D</kbd>
            <span className="ml-1">move</span>
            <span className="mx-2 text-white/30">|</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">F</kbd>
            <span className="ml-1">sit</span>
          </div>
        )}
      </div>
    </div>
  );
}

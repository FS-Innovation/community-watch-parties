"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─── CONSTANTS ───
const MOVE_SPEED = 0.12;
const SEAT_ROWS = 5;
const SEATS_PER_ROW = 8;
const SEAT_SPACING_X = 2.4;
const SEAT_SPACING_Z = 2.8;
const SEAT_START_Z = 4;
const ROW_ELEVATION = 0.6;

interface SeatData {
  group: THREE.Group;
  worldPos: THREE.Vector3;
  occupied: boolean;
}

interface AuditoriumProps {
  onSit?: (seated: boolean) => void;
  videoElement?: HTMLVideoElement | null;
}

export default function Auditorium3D({ onSit, videoElement }: AuditoriumProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isSeated, setIsSeated] = useState(false);
  const [nearSeat, setNearSeat] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Keep mutable refs for things the effect closure needs to communicate to React
  const isSeatedRef = useRef(false);
  const nearSeatRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ─── RENDERER ───
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

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
    scene.background = new THREE.Color(0x0a0a1e);
    scene.fog = new THREE.Fog(0x0a0a1e, 20, 60);

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 200);
    const avatarStartZ = SEAT_START_Z + SEAT_ROWS * SEAT_SPACING_Z + 4;
    camera.position.set(0, 5, avatarStartZ + 6);

    // ─── LIGHTING ───
    // Ambient — gives base visibility to everything
    scene.add(new THREE.AmbientLight(0x2222aa, 1.5));

    // Hemisphere — sky/ground colour split like Spatial
    const hemi = new THREE.HemisphereLight(0x4444ff, 0x111133, 1.0);
    scene.add(hemi);

    // Stage front light — orange wash on the screen area
    const stageLight = new THREE.SpotLight(0xe8734a, 60, 50, Math.PI / 3, 0.6, 1);
    stageLight.position.set(0, 14, 2);
    stageLight.target.position.set(0, 5, -10);
    stageLight.castShadow = true;
    scene.add(stageLight);
    scene.add(stageLight.target);

    // Purple accent lights (left & right walls, like Spatial)
    const purpleL = new THREE.PointLight(0x8844ff, 30, 35);
    purpleL.position.set(-14, 5, 0);
    scene.add(purpleL);

    const purpleR = new THREE.PointLight(0x8844ff, 30, 35);
    purpleR.position.set(14, 5, 0);
    scene.add(purpleR);

    // Blue top fill
    const topFill = new THREE.PointLight(0x4466cc, 15, 50);
    topFill.position.set(0, 15, 8);
    scene.add(topFill);

    // Pink accent behind screen
    const pinkGlow = new THREE.PointLight(0xff44aa, 25, 20);
    pinkGlow.position.set(0, 6, -12);
    scene.add(pinkGlow);

    // ─── FLOOR ───
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x12123a,
      roughness: 0.3,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── STAGE PLATFORM ───
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a50,
      roughness: 0.4,
      metalness: 0.5,
    });
    const stage = new THREE.Mesh(new THREE.BoxGeometry(20, 1.5, 8), stageMat);
    stage.position.set(0, 0.75, -7);
    stage.receiveShadow = true;
    stage.castShadow = true;
    scene.add(stage);

    // Stage front edge glow (neon strip)
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
    const screenW = 14;
    const screenH = 8;
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(screenW, screenH),
      screenMat
    );
    screenMesh.position.set(0, 6.5, -10.8);
    scene.add(screenMesh);

    // Screen bezel / frame
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(screenW + 0.8, screenH + 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222255, roughness: 0.3, metalness: 0.7 })
    );
    bezel.position.set(0, 6.5, -10.95);
    scene.add(bezel);

    // Glowing strip above screen
    const topNeon = new THREE.Mesh(
      new THREE.BoxGeometry(screenW + 2, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x6644ff })
    );
    topNeon.position.set(0, 10.95, -10.8);
    scene.add(topNeon);

    // ─── SIDE SCREENS ───
    const sideScreenMat = new THREE.MeshBasicMaterial({ color: 0x1a1a44 });
    const lScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), sideScreenMat);
    lScreen.position.set(-11, 6, -9.5);
    lScreen.rotation.y = 0.35;
    scene.add(lScreen);

    const rScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), sideScreenMat.clone());
    rScreen.position.set(11, 6, -9.5);
    rScreen.rotation.y = -0.35;
    scene.add(rScreen);

    // ─── WALLS ───
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e30,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Back wall (behind screen)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 18, 0.5), wallMat);
    backWall.position.set(0, 9, -11.5);
    scene.add(backWall);

    // Side walls
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 45), wallMat);
      sideWall.position.set(side * 17, 9, 3);
      scene.add(sideWall);
    }

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 45),
      new THREE.MeshStandardMaterial({ color: 0x080820, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 17, 3);
    scene.add(ceiling);

    // ─── DECORATIVE WALL BLOCKS (Spatial-style) ───
    const blockMat1 = new THREE.MeshStandardMaterial({ color: 0x202066, roughness: 0.4, metalness: 0.5 });
    const blockMat2 = new THREE.MeshStandardMaterial({ color: 0x3030aa, roughness: 0.4, metalness: 0.5 });

    const decorBlocks: THREE.Mesh[] = [];
    for (let i = 0; i < 50; i++) {
      const s = 0.4 + Math.random() * 1.8;
      const mat = Math.random() > 0.5 ? blockMat1 : blockMat2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      const side = Math.random() > 0.5 ? 1 : -1;
      block.position.set(
        side * (13 + Math.random() * 4),
        0.5 + Math.random() * 14,
        -10 + Math.random() * 30
      );
      block.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      block.castShadow = true;
      scene.add(block);
      decorBlocks.push(block);
    }

    // Blocks behind screen too
    for (let i = 0; i < 15; i++) {
      const s = 0.5 + Math.random() * 2;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(s, s, s),
        Math.random() > 0.5 ? blockMat1 : blockMat2
      );
      block.position.set(
        -8 + Math.random() * 16,
        8 + Math.random() * 8,
        -11 + Math.random() * -3
      );
      block.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(block);
      decorBlocks.push(block);
    }

    // ─── TIERED SEATING PLATFORMS ───
    for (let r = 0; r < SEAT_ROWS; r++) {
      const tierW = SEATS_PER_ROW * SEAT_SPACING_X + 6;
      const tierH = (r + 1) * ROW_ELEVATION;
      const tierD = SEAT_SPACING_Z * 0.85;
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(tierW, tierH, tierD),
        new THREE.MeshStandardMaterial({ color: 0x151550, roughness: 0.5, metalness: 0.4 })
      );
      tier.position.set(0, tierH / 2, SEAT_START_Z + r * SEAT_SPACING_Z);
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

        // Seat cushion
        const cushion = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.5, 1.1),
          seatBaseMat.clone()
        );
        cushion.position.y = 0.25;
        cushion.castShadow = true;
        group.add(cushion);

        // Seat back
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 0.2),
          seatBackMat.clone()
        );
        back.position.set(0, 1.0, -0.45);
        group.add(back);

        // Armrests
        const armGeo = new THREE.BoxGeometry(0.12, 0.55, 0.9);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x444488, roughness: 0.3, metalness: 0.6 });
        const lArm = new THREE.Mesh(armGeo, armMat);
        lArm.position.set(-0.75, 0.5, -0.05);
        group.add(lArm);
        const rArm = new THREE.Mesh(armGeo, armMat);
        rArm.position.set(0.75, 0.5, -0.05);
        group.add(rArm);

        group.position.set(x, y, z);
        scene.add(group);

        seats.push({
          group,
          worldPos: new THREE.Vector3(x, y, z),
          occupied: false,
        });
      }
    }

    // ─── AVATAR ───
    const avatar = new THREE.Group();
    const avatarBodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.1 });

    // Body capsule
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 8, 16), avatarBodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    avatar.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), avatarBodyMat);
    head.position.y = 1.9;
    head.castShadow = true;
    avatar.add(head);

    // Ground glow ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    avatar.add(ring);

    avatar.position.set(0, 0, avatarStartZ);
    scene.add(avatar);

    // ─── MUTABLE STATE ───
    const keys: Record<string, boolean> = {};
    let seated = false;
    let seatedIn: SeatData | null = null;
    let nearestSeat: SeatData | null = null;
    const clock = new THREE.Clock();

    // ─── INPUT ───
    function onKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      const k = e.key.toLowerCase();
      keys[k] = true;

      if (k === "f") {
        if (seated && seatedIn) {
          // Stand up
          seated = false;
          seatedIn.occupied = false;
          avatar.visible = true;
          avatar.position.set(seatedIn.worldPos.x, seatedIn.worldPos.y, seatedIn.worldPos.z + 2);
          seatedIn = null;
          isSeatedRef.current = false;
          setIsSeated(false);
          onSit?.(false);
        } else if (nearestSeat && !nearestSeat.occupied) {
          // Sit
          seated = true;
          seatedIn = nearestSeat;
          nearestSeat.occupied = true;
          avatar.visible = false;
          isSeatedRef.current = true;
          setIsSeated(true);
          setNearSeat(false);
          onSit?.(true);
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keys[e.key.toLowerCase()] = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ─── ANIMATION LOOP ───
    let rafId: number;

    function animate() {
      rafId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const t = clock.getElapsedTime();

      // ── Avatar movement ──
      if (!seated) {
        const dir = new THREE.Vector3();
        // Camera looks toward -Z (toward screen), so forward = -Z
        if (keys["w"] || keys["arrowup"]) dir.z -= 1;
        if (keys["s"] || keys["arrowdown"]) dir.z += 1;
        if (keys["a"] || keys["arrowleft"]) dir.x -= 1;
        if (keys["d"] || keys["arrowright"]) dir.x += 1;

        if (dir.lengthSq() > 0) {
          dir.normalize().multiplyScalar(MOVE_SPEED);
          avatar.position.add(dir);
          avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -15, 15);
          avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -2, avatarStartZ + 2);

          // Face direction
          avatar.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // Ground height — match tier elevation
        let groundY = 0;
        for (let r = SEAT_ROWS - 1; r >= 0; r--) {
          const rowZ = SEAT_START_Z + r * SEAT_SPACING_Z;
          if (avatar.position.z >= rowZ - SEAT_SPACING_Z * 0.5 && avatar.position.z <= rowZ + SEAT_SPACING_Z * 0.5) {
            groundY = (r + 1) * ROW_ELEVATION;
            break;
          }
        }
        avatar.position.y = groundY;

        // Camera follow (third-person, behind + above)
        const camTarget = new THREE.Vector3(
          avatar.position.x * 0.5,
          avatar.position.y + 5,
          avatar.position.z + 8
        );
        camera.position.lerp(camTarget, 0.04);
        const lookAt = new THREE.Vector3(avatar.position.x * 0.3, avatar.position.y + 3, avatar.position.z - 6);
        camera.lookAt(lookAt);

        // Nearest seat detection
        let closest: SeatData | null = null;
        let closestDist = 3.0;
        for (const seat of seats) {
          const d = avatar.position.distanceTo(seat.worldPos);
          if (d < closestDist && !seat.occupied) {
            closestDist = d;
            closest = seat;
          }
        }
        nearestSeat = closest;

        const isNear = !!closest;
        if (isNear !== nearSeatRef.current) {
          nearSeatRef.current = isNear;
          setNearSeat(isNear);
        }

        // Highlight seats
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

        // Subtle body bob
        body.position.y = 1.1 + Math.sin(t * 2.5) * 0.03;

      } else if (seatedIn) {
        // Seated view — look at screen
        const camTarget = new THREE.Vector3(
          seatedIn.worldPos.x * 0.4,
          seatedIn.worldPos.y + 3,
          seatedIn.worldPos.z + 2
        );
        camera.position.lerp(camTarget, 0.04);
        camera.lookAt(0, 6.5, -10.8);
      }

      // Floating blocks subtle animation
      for (let i = 0; i < decorBlocks.length; i++) {
        const b = decorBlocks[i];
        b.position.y += Math.sin(t * 0.4 + i * 0.7) * 0.002;
        b.rotation.y += delta * 0.05;
      }

      // Screen glow pulse
      pinkGlow.intensity = 20 + Math.sin(t * 1.5) * 8;

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

    // Hide controls hint after 8s
    const controlsTimer = setTimeout(() => setShowControls(false), 8000);

    // ─── VIDEO TEXTURE HANDLER ───
    // We handle this via a MutationObserver-style check in the loop
    // but for now we store a ref to screenMesh for external use
    (mount as HTMLElement & { __screenMesh?: THREE.Mesh }).__screenMesh = screenMesh;

    // ─── CLEANUP ───
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      clearTimeout(controlsTimer);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── VIDEO TEXTURE ───
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !videoElement) return;
    const screenMesh = (mount as HTMLElement & { __screenMesh?: THREE.Mesh }).__screenMesh;
    if (!screenMesh) return;

    const tex = new THREE.VideoTexture(videoElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    (screenMesh.material as THREE.MeshBasicMaterial).map = tex;
    (screenMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;

    return () => {
      tex.dispose();
      (screenMesh.material as THREE.MeshBasicMaterial).map = null;
      (screenMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    };
  }, [videoElement]);

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ minHeight: "100vh" }}>
      {/* HUD prompts */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-10">
        {nearSeat && !isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-[#e8734a]/50 text-white text-sm font-medium animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-[#e8734a] text-white font-bold">F</kbd> to sit
          </div>
        )}
        {isSeated && (
          <div className="px-5 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-sm animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-white/20 font-bold">F</kbd> to stand up
          </div>
        )}
        {showControls && !isSeated && !nearSeat && (
          <div className="px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 text-sm animate-fade-in">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">D</kbd>
            <span className="ml-2">to move</span>
            <span className="mx-2 text-white/30">|</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">F</kbd>
            <span className="ml-1">to sit</span>
          </div>
        )}
      </div>
    </div>
  );
}

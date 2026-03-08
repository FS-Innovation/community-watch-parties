"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const MOVE_SPEED = 0.06;
const MOUSE_SENSITIVITY = 0.002;

interface LobbyProps {
  onEnterCinema: () => void;
}

export default function Lobby3D({ onEnterCinema }: LobbyProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [nearPortal, setNearPortal] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const nearPortalRef = useRef(false);

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
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // ─── SCENE ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06061a);
    scene.fog = new THREE.FogExp2(0x06061a, 0.025);

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 200);
    camera.position.set(0, 3, 14);

    let yaw = 0; // face toward -Z (into the lounge, toward the portal)
    let pitch = -0.05;
    let isPointerLocked = false;

    // ─── LIGHTING ───
    scene.add(new THREE.AmbientLight(0x221133, 2.5));
    const hemi = new THREE.HemisphereLight(0x443366, 0x0a0a20, 0.6);
    scene.add(hemi);

    // Warm overhead lights (like a real lounge)
    const overheadPositions = [
      [-6, 8, -2], [0, 8, -2], [6, 8, -2],
      [-6, 8, 5], [0, 8, 5], [6, 8, 5],
    ];
    for (const [x, y, z] of overheadPositions) {
      const light = new THREE.PointLight(0xe8a060, 8, 12, 2);
      light.position.set(x, y, z);
      scene.add(light);
      // Light fixture
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.3, 0.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xe8a060 })
      );
      fixture.position.set(x, y - 0.1, z);
      scene.add(fixture);
    }

    // Portal dramatic lighting
    const portalGlow = new THREE.PointLight(0xe8734a, 60, 15);
    portalGlow.position.set(0, 3, -14);
    scene.add(portalGlow);
    const portalGlow2 = new THREE.PointLight(0xff5533, 30, 10);
    portalGlow2.position.set(0, 6, -13);
    scene.add(portalGlow2);

    // Purple ambient accents
    const purpleL = new THREE.PointLight(0x6633cc, 12, 18);
    purpleL.position.set(-12, 2, 0);
    scene.add(purpleL);
    const purpleR = new THREE.PointLight(0x6633cc, 12, 18);
    purpleR.position.set(12, 2, 0);
    scene.add(purpleR);

    // Blue accent behind the bar
    const barBackLight = new THREE.PointLight(0x3355ff, 15, 12);
    barBackLight.position.set(-10, 3, -2);
    scene.add(barBackLight);

    // ─── FLOOR ───
    // Reflective dark floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0a25, roughness: 0.15, metalness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor accent lines (neon strips in the floor)
    const floorLineMat = new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.3 });
    for (let z = 8; z >= -12; z -= 4) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(26, 0.02, 0.05), floorLineMat);
      line.position.set(0, 0.01, z);
      scene.add(line);
    }
    // Center aisle guide toward portal
    const guideLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.2 })
    );
    guideLine.position.set(0, 0.01, -1);
    scene.add(guideLine);

    // ─── WALLS ───
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e0e2a, roughness: 0.7, metalness: 0.3 });

    // Back wall (portal wall) — with opening in center
    const bwL = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.5), wallMat);
    bwL.position.set(-9, 6, -15);
    scene.add(bwL);
    const bwR = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.5), wallMat);
    bwR.position.set(9, 6, -15);
    scene.add(bwR);
    const bwTop = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.5), wallMat);
    bwTop.position.set(0, 10.5, -15);
    scene.add(bwTop);

    // Front wall (entrance behind you)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 0.5), wallMat);
    frontWall.position.set(0, 6, 15);
    scene.add(frontWall);

    // Side walls
    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 32), wallMat);
      sw.position.set(s * 15, 6, 0);
      scene.add(sw);

      // Neon accent strips on walls
      const wallNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 28),
        new THREE.MeshBasicMaterial({ color: 0x6633cc })
      );
      wallNeon.position.set(s * 14.7, 3, 0);
      scene.add(wallNeon);
    }

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 32),
      new THREE.MeshStandardMaterial({ color: 0x060618, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 12, 0);
    scene.add(ceiling);

    // ─── BAR AREA (LEFT SIDE) ───
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a1a50, roughness: 0.2, metalness: 0.7 });

    // L-shaped bar counter on the left
    const barMain = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1.5), barMat);
    barMain.position.set(-9, 0.6, 2);
    barMain.castShadow = true;
    scene.add(barMain);

    const barSide = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 6), barMat);
    barSide.position.set(-5.25, 0.6, -1);
    barSide.castShadow = true;
    scene.add(barSide);

    // Counter tops (glossy)
    const counterTopMat = new THREE.MeshStandardMaterial({ color: 0x2a2a6a, roughness: 0.05, metalness: 0.9 });
    const barTopMain = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.08, 1.7), counterTopMat);
    barTopMain.position.set(-9, 1.22, 2);
    scene.add(barTopMain);
    const barTopSide = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 6.3), counterTopMat);
    barTopSide.position.set(-5.25, 1.22, -1);
    scene.add(barTopSide);

    // Neon edge on bar
    const barNeon = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xe8734a })
    );
    barNeon.position.set(-9, 1.25, 2.75);
    scene.add(barNeon);

    // Back bar shelves with "bottles" (glowing blocks)
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x181848, roughness: 0.3, metalness: 0.6 });
    const bottleColors = [0xff4444, 0x44ff44, 0x4488ff, 0xffaa22, 0xff44ff, 0x44ffff];
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.6), shelfMat);
      shelf.position.set(-9, 2 + i * 1.2, -0.3);
      scene.add(shelf);

      // Bottles on shelves
      for (let b = 0; b < 6; b++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6),
          new THREE.MeshBasicMaterial({ color: bottleColors[b], transparent: true, opacity: 0.6 })
        );
        bottle.position.set(-11.5 + b * 1.1, 2.35 + i * 1.2, -0.3);
        scene.add(bottle);
      }
    }

    // Bar stools
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x3333aa, roughness: 0.3, metalness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const x = -12 + i * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), stoolMat);
      pole.position.set(x, 0.38, 3.2);
      scene.add(pole);
      const seatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.12, 16), stoolMat);
      seatTop.position.set(x, 0.78, 3.2);
      scene.add(seatTop);
    }

    // ─── LOUNGE SEATING (RIGHT SIDE) ───
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x2a2a66, roughness: 0.5, metalness: 0.3 });
    const couchAccent = new THREE.MeshStandardMaterial({ color: 0x3a3a88, roughness: 0.5, metalness: 0.3 });

    // Couch group 1 (right side, facing center)
    const couch1Base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 1.5), couchMat);
    couch1Base.position.set(9, 0.35, 3);
    scene.add(couch1Base);
    const couch1Back = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.9, 0.3), couchAccent);
    couch1Back.position.set(9, 0.8, 3.6);
    scene.add(couch1Back);
    const couch1ArmL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.5), couchAccent);
    couch1ArmL.position.set(6.85, 0.65, 3);
    scene.add(couch1ArmL);
    const couch1ArmR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.5), couchAccent);
    couch1ArmR.position.set(11.15, 0.65, 3);
    scene.add(couch1ArmR);

    // Couch group 2 (right side, further back)
    const couch2Base = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 1.5), couchMat);
    couch2Base.position.set(9, 0.35, -3);
    scene.add(couch2Base);
    const couch2Back = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.9, 0.3), couchAccent);
    couch2Back.position.set(9, 0.8, -3.6);
    scene.add(couch2Back);

    // Coffee tables
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e1e55, roughness: 0.1, metalness: 0.8 });
    for (const z of [3, -3]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), tableMat);
      table.position.set(7, 0.2, z);
      scene.add(table);
      // Table glow ring
      const tableRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.55, 32),
        new THREE.MeshBasicMaterial({ color: 0x6633cc, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      tableRing.rotation.x = -Math.PI / 2;
      tableRing.position.set(7, 0.41, z);
      scene.add(tableRing);
    }

    // ─── CINEMA PORTAL (CENTER BACK — directly ahead) ───
    // Grand archway
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222266, roughness: 0.2, metalness: 0.8 });
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), frameMat);
    frameL.position.set(-4.75, 4.5, -14.8);
    scene.add(frameL);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), frameMat);
    frameR.position.set(4.75, 4.5, -14.8);
    scene.add(frameR);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.6, 0.6), frameMat);
    frameTop.position.set(0, 9.3, -14.8);
    scene.add(frameTop);

    // Portal inner glow plane
    const portalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 9),
      new THREE.MeshBasicMaterial({
        color: 0xe8734a,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      })
    );
    portalPlane.position.set(0, 4.5, -14.75);
    scene.add(portalPlane);

    // Neon outline
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xe8734a });
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 9, 0.1), neonMat);
    neonL.position.set(-4.5, 4.5, -14.6);
    scene.add(neonL);
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 9, 0.1), neonMat);
    neonR.position.set(4.5, 4.5, -14.6);
    scene.add(neonR);
    const neonTop = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.1, 0.1), neonMat);
    neonTop.position.set(0, 9, -14.6);
    scene.add(neonTop);

    // Particle-like embers floating in the portal
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0.7 });
    const embers: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) {
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 6, 6),
        emberMat
      );
      ember.position.set(
        -3.5 + Math.random() * 7,
        1 + Math.random() * 7,
        -14.5 + Math.random() * 0.5
      );
      scene.add(ember);
      embers.push(ember);
    }

    // "CINEMA EXPERIENCE" text
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8734a";
    ctx.fillText("CINEMA EXPERIENCE", 256, 60);
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillStyle = "#aaaacc";
    ctx.fillText("Press F to enter", 256, 100);

    const signTex = new THREE.CanvasTexture(canvas);
    const signSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex, transparent: true }));
    signSprite.position.set(0, 10.5, -14.8);
    signSprite.scale.set(8, 2, 1);
    scene.add(signSprite);

    // ─── DOAC BRANDING (on left wall above bar) ───
    const brandCanvas = document.createElement("canvas");
    brandCanvas.width = 512;
    brandCanvas.height = 128;
    const bCtx = brandCanvas.getContext("2d")!;
    bCtx.fillStyle = "transparent";
    bCtx.fillRect(0, 0, 512, 128);
    bCtx.font = "bold 44px system-ui, sans-serif";
    bCtx.textAlign = "center";
    bCtx.fillStyle = "#e8734a";
    bCtx.fillText("DOAC WATCH PARTY", 256, 60);
    bCtx.font = "20px system-ui, sans-serif";
    bCtx.fillStyle = "#6a6a8a";
    bCtx.fillText("The Diary of a CEO", 256, 95);

    const brandTex = new THREE.CanvasTexture(brandCanvas);
    const brandSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: brandTex, transparent: true }));
    brandSprite.position.set(-9, 7, 0);
    brandSprite.scale.set(7, 1.8, 1);
    scene.add(brandSprite);

    // ─── DECORATIVE ELEMENTS ───
    // Floating orbs (subtle ambient particles)
    const orbMat1 = new THREE.MeshBasicMaterial({ color: 0x6633cc, transparent: true, opacity: 0.35 });
    const orbMat2 = new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.25 });
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < 15; i++) {
      const mat = i % 3 === 0 ? orbMat2 : orbMat1;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.12, 10, 10), mat);
      orb.position.set(
        -12 + Math.random() * 24,
        2 + Math.random() * 8,
        -12 + Math.random() * 24
      );
      scene.add(orb);
      orbs.push(orb);
    }

    // ─── AVATAR ───
    const avatar = new THREE.Group();
    const abm = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.1 });
    const abody = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 8, 16), abm);
    abody.position.y = 1.1;
    abody.castShadow = true;
    avatar.add(abody);
    const ahead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), abm);
    ahead.position.y = 1.9;
    avatar.add(ahead);
    const aring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8734a, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    aring.rotation.x = -Math.PI / 2;
    aring.position.y = 0.02;
    avatar.add(aring);
    avatar.position.set(0, 0, 10);
    scene.add(avatar);

    // ─── STATE ───
    const keys: Record<string, boolean> = {};
    const portalPos = new THREE.Vector3(0, 0, -14);
    const clock = new THREE.Clock();

    // ─── POINTER LOCK ───
    function onClick() { renderer.domElement.requestPointerLock(); }
    renderer.domElement.addEventListener("click", onClick);
    function onPLC() { isPointerLocked = document.pointerLockElement === renderer.domElement; }
    document.addEventListener("pointerlockchange", onPLC);
    function onMM(e: MouseEvent) {
      if (!isPointerLocked) return;
      yaw -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 3, Math.PI / 3);
    }
    document.addEventListener("mousemove", onMM);

    function onKD(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === "f" || k === "enter") {
        if (nearPortalRef.current) {
          document.exitPointerLock();
          onEnterCinema();
        }
      }
      if (k === "escape") document.exitPointerLock();
    }
    function onKU(e: KeyboardEvent) { keys[e.key.toLowerCase()] = false; }
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);

    // ─── ANIMATION ───
    let rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.getElapsedTime();

      // Movement (forward = -sin(yaw), -cos(yaw))
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
        avatar.position.x = THREE.MathUtils.clamp(avatar.position.x, -13, 13);
        avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -14, 13);
        avatar.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // Camera (behind avatar, looking forward)
      const camDist = 5;
      const camX = avatar.position.x + Math.sin(yaw) * camDist;
      const camZ = avatar.position.z + Math.cos(yaw) * camDist;
      const camY = avatar.position.y + 2.5 + Math.sin(pitch) * camDist * 0.3;
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
      const lDist = 10;
      camera.lookAt(
        avatar.position.x - Math.sin(yaw) * lDist,
        avatar.position.y + 1.5 - Math.sin(pitch) * lDist * 0.5,
        avatar.position.z - Math.cos(yaw) * lDist
      );

      // Portal proximity
      const portalDist = avatar.position.distanceTo(portalPos);
      const isNear = portalDist < 5;
      if (isNear !== nearPortalRef.current) {
        nearPortalRef.current = isNear;
        setNearPortal(isNear);
      }

      // Portal glow pulse
      portalGlow.intensity = 50 + Math.sin(t * 2) * 20;
      portalGlow2.intensity = 25 + Math.sin(t * 2.5 + 1) * 10;
      const pp = portalPlane.material as THREE.MeshBasicMaterial;
      pp.opacity = 0.1 + Math.sin(t * 2) * 0.06;

      // Ember animation
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.position.y += 0.008 + Math.sin(t + i) * 0.003;
        e.position.x += Math.sin(t * 0.5 + i * 2) * 0.003;
        const eMat = e.material as THREE.MeshBasicMaterial;
        eMat.opacity = 0.4 + Math.sin(t * 3 + i) * 0.3;
        // Reset embers that float too high
        if (e.position.y > 9) {
          e.position.y = 1;
          e.position.x = -3.5 + Math.random() * 7;
        }
      }

      // Orb float
      for (let i = 0; i < orbs.length; i++) {
        orbs[i].position.y += Math.sin(t * 0.4 + i * 1.3) * 0.002;
        orbs[i].position.x += Math.cos(t * 0.3 + i * 0.9) * 0.001;
      }

      // Bar light flicker
      barBackLight.intensity = 12 + Math.sin(t * 4) * 3;

      // Avatar bob
      abody.position.y = 1.1 + Math.sin(t * 2.5) * 0.02;

      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(animate);

    function onResize() {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    const ct = setTimeout(() => setShowControls(false), 10000);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onPLC);
      document.removeEventListener("mousemove", onMM);
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
      window.removeEventListener("resize", onResize);
      clearTimeout(ct);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full relative" style={{ minHeight: "100vh" }}>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-10">
        {nearPortal && (
          <div className="px-6 py-3 rounded-xl bg-black/70 backdrop-blur-md border border-[#e8734a]/60 text-white text-sm font-medium animate-fade-in">
            Press <kbd className="px-2 py-0.5 mx-1 rounded bg-[#e8734a] text-white font-bold">F</kbd> to enter the Cinema
          </div>
        )}
        {showControls && !nearPortal && (
          <div className="px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 text-sm animate-fade-in">
            Click to look around
            <span className="mx-2 text-white/30">|</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold mr-1">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-bold">D</kbd>
            <span className="ml-1">move</span>
          </div>
        )}
      </div>
    </div>
  );
}

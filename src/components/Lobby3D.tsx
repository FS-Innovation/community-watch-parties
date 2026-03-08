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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // ─── SCENE ───
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08081a);
    scene.fog = new THREE.Fog(0x08081a, 15, 50);

    // ─── CAMERA ───
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 200);
    camera.position.set(0, 3, 12);

    let yaw = Math.PI; // Face toward -Z (into the lounge)
    let pitch = -0.05;
    let isPointerLocked = false;

    // ─── LIGHTING ───
    scene.add(new THREE.AmbientLight(0x332244, 2.0));
    const hemi = new THREE.HemisphereLight(0x443366, 0x111122, 0.8);
    scene.add(hemi);

    // Warm bar lights
    const barLight1 = new THREE.PointLight(0xe8734a, 20, 15);
    barLight1.position.set(-6, 4, -4);
    scene.add(barLight1);
    const barLight2 = new THREE.PointLight(0xe8734a, 20, 15);
    barLight2.position.set(6, 4, -4);
    scene.add(barLight2);

    // Purple lounge accents
    const purpleL = new THREE.PointLight(0x8844ff, 15, 20);
    purpleL.position.set(-10, 3, 5);
    scene.add(purpleL);
    const purpleR = new THREE.PointLight(0x8844ff, 15, 20);
    purpleR.position.set(10, 3, 5);
    scene.add(purpleR);

    // Cinema portal glow
    const portalGlow = new THREE.PointLight(0xe8734a, 40, 12);
    portalGlow.position.set(0, 3, -12);
    scene.add(portalGlow);

    const ceilingLight = new THREE.PointLight(0x6644aa, 10, 25);
    ceilingLight.position.set(0, 8, 0);
    scene.add(ceilingLight);

    // ─── FLOOR ───
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0e0e28, roughness: 0.2, metalness: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ─── WALLS ───
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x121236, roughness: 0.6, metalness: 0.3 });

    // Back wall (with portal opening)
    const bwL = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 0.5), wallMat);
    bwL.position.set(-9, 5, -13);
    scene.add(bwL);
    const bwR = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 0.5), wallMat);
    bwR.position.set(9, 5, -13);
    scene.add(bwR);
    const bwTop = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.5), wallMat);
    bwTop.position.set(0, 8.5, -13);
    scene.add(bwTop);

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.5), wallMat);
    frontWall.position.set(0, 5, 15);
    scene.add(frontWall);

    // Side walls
    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 30), wallMat);
      sw.position.set(s * 15, 5, 0);
      scene.add(sw);
    }

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0a0a20, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 10, 0);
    scene.add(ceiling);

    // ─── BAR COUNTER ───
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a1a50, roughness: 0.3, metalness: 0.6 });

    // Main counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 1.5), barMat);
    counter.position.set(0, 0.6, -5);
    counter.castShadow = true;
    scene.add(counter);

    // Counter top (glossy)
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(12.2, 0.1, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x2a2a66, roughness: 0.1, metalness: 0.8 })
    );
    counterTop.position.set(0, 1.22, -5);
    scene.add(counterTop);

    // Back bar shelves
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x181848, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 0.8), shelfMat);
      shelf.position.set(0, 2 + i * 1.5, -7);
      scene.add(shelf);
    }

    // Bar stools
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x3333aa, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 2.2;
      // Stool base
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), stoolMat);
      pole.position.set(x, 0.4, -3.8);
      scene.add(pole);
      // Stool seat
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.15, 16), stoolMat);
      seat.position.set(x, 0.85, -3.8);
      scene.add(seat);
    }

    // ─── LOUNGE SEATING AREAS ───
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x2a2a66, roughness: 0.6, metalness: 0.3 });

    // Left seating area
    const couchL = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.5), couchMat);
    couchL.position.set(-8, 0.4, 3);
    scene.add(couchL);
    const couchLBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.0, 0.3), couchMat);
    couchLBack.position.set(-8, 0.9, 3.6);
    scene.add(couchLBack);

    // Right seating area
    const couchR = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.5), couchMat);
    couchR.position.set(8, 0.4, 3);
    scene.add(couchR);
    const couchRBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.0, 0.3), couchMat);
    couchRBack.position.set(8, 0.9, 3.6);
    scene.add(couchRBack);

    // Coffee tables
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x1e1e55, roughness: 0.2, metalness: 0.7 });
    for (const tx of [-8, 8]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), tableMat);
      table.position.set(tx, 0.25, 1.5);
      scene.add(table);
    }

    // ─── CINEMA PORTAL ───
    // Archway frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2a66, roughness: 0.3, metalness: 0.7 });
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), frameMat);
    frameL.position.set(-4.75, 3.5, -12.8);
    scene.add(frameL);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), frameMat);
    frameR.position.set(4.75, 3.5, -12.8);
    scene.add(frameR);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.5), frameMat);
    frameTop.position.set(0, 7.25, -12.8);
    scene.add(frameTop);

    // Portal glow plane
    const portalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 7),
      new THREE.MeshBasicMaterial({
        color: 0xe8734a,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      })
    );
    portalPlane.position.set(0, 3.5, -12.75);
    scene.add(portalPlane);

    // Neon outline around portal
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xe8734a });
    const neonL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7, 0.08), neonMat);
    neonL.position.set(-4.5, 3.5, -12.6);
    scene.add(neonL);
    const neonR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7, 0.08), neonMat);
    neonR.position.set(4.5, 3.5, -12.6);
    scene.add(neonR);
    const neonTop = new THREE.Mesh(new THREE.BoxGeometry(9.08, 0.08, 0.08), neonMat);
    neonTop.position.set(0, 7, -12.6);
    scene.add(neonTop);

    // "CINEMA" text — floating sign above portal
    // Using simple 3D boxes to spell it out would be complex, so use a sprite
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = "bold 60px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8734a";
    ctx.fillText("CINEMA EXPERIENCE", 256, 75);
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillStyle = "#8a8aaa";
    ctx.fillText("Walk through to enter", 256, 110);

    const signTex = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.SpriteMaterial({ map: signTex, transparent: true });
    const signSprite = new THREE.Sprite(signMat);
    signSprite.position.set(0, 8.5, -12.8);
    signSprite.scale.set(8, 2, 1);
    scene.add(signSprite);

    // ─── DOAC BRANDING SIGN ───
    const brandCanvas = document.createElement("canvas");
    brandCanvas.width = 512;
    brandCanvas.height = 128;
    const bCtx = brandCanvas.getContext("2d")!;
    bCtx.fillStyle = "transparent";
    bCtx.fillRect(0, 0, 512, 128);
    bCtx.font = "bold 48px system-ui, sans-serif";
    bCtx.textAlign = "center";
    bCtx.fillStyle = "#e8734a";
    bCtx.fillText("DOAC WATCH PARTY", 256, 65);
    bCtx.font = "22px system-ui, sans-serif";
    bCtx.fillStyle = "#6a6a8a";
    bCtx.fillText("The Diary of a CEO", 256, 100);

    const brandTex = new THREE.CanvasTexture(brandCanvas);
    const brandSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: brandTex, transparent: true }));
    brandSprite.position.set(0, 6, -7);
    brandSprite.scale.set(7, 1.8, 1);
    scene.add(brandSprite);

    // ─── DECORATIVE ELEMENTS ───
    // Floating orbs (ambient)
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.4 });
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 12, 12), orbMat);
      orb.position.set(
        -12 + Math.random() * 24,
        2 + Math.random() * 6,
        -10 + Math.random() * 22
      );
      scene.add(orb);
      orbs.push(orb);
    }

    // Decorative wall blocks
    const dBlockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a55, roughness: 0.4, metalness: 0.5 });
    const dBlocks: THREE.Mesh[] = [];
    for (let i = 0; i < 20; i++) {
      const s = 0.3 + Math.random() * 1;
      const block = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), dBlockMat);
      const side = Math.random() > 0.5 ? 1 : -1;
      block.position.set(
        side * (12 + Math.random() * 2),
        1 + Math.random() * 7,
        -10 + Math.random() * 22
      );
      block.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      scene.add(block);
      dBlocks.push(block);
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
    avatar.position.set(0, 0, 8);
    scene.add(avatar);

    // ─── STATE ───
    const keys: Record<string, boolean> = {};
    const portalPos = new THREE.Vector3(0, 0, -12);
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

      // Movement
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
        avatar.position.z = THREE.MathUtils.clamp(avatar.position.z, -12, 13);
        avatar.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // Camera
      const camDist = 5;
      const camX = avatar.position.x - Math.sin(yaw) * -camDist;
      const camZ = avatar.position.z - Math.cos(yaw) * -camDist;
      const camY = avatar.position.y + 2.5 - Math.sin(pitch) * camDist * 0.3;
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
      const lDist = 10;
      camera.lookAt(
        avatar.position.x + Math.sin(yaw) * lDist,
        avatar.position.y + 1.5 + Math.sin(pitch) * lDist * 0.5,
        avatar.position.z + Math.cos(yaw) * lDist
      );

      // Portal proximity
      const portalDist = avatar.position.distanceTo(portalPos);
      const isNear = portalDist < 4;
      if (isNear !== nearPortalRef.current) {
        nearPortalRef.current = isNear;
        setNearPortal(isNear);
      }

      // Portal glow pulse
      portalGlow.intensity = 30 + Math.sin(t * 2) * 15;
      portalPlane.material.opacity = 0.1 + Math.sin(t * 2) * 0.08;

      // Orb float
      for (let i = 0; i < orbs.length; i++) {
        orbs[i].position.y += Math.sin(t * 0.5 + i * 1.3) * 0.002;
        orbs[i].position.x += Math.cos(t * 0.3 + i * 0.9) * 0.001;
      }

      // Block float
      for (let i = 0; i < dBlocks.length; i++) {
        dBlocks[i].position.y += Math.sin(t * 0.3 + i) * 0.001;
        dBlocks[i].rotation.y += delta * 0.03;
      }

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

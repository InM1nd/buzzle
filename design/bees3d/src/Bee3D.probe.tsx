import React from "react";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import * as THREE from "three";

/** Real-time 3D bee (size probe for the bees3d study): sphere body + wings, rendered with three.js on expo-gl. */
export function Bee3D({ size = 120 }: { size?: number }) {
  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const canvas = { width: w, height: h, style: {}, addEventListener: () => {}, removeEventListener: () => {}, clientHeight: h, getContext: () => gl } as unknown as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, alpha: true, antialias: true });
    renderer.setSize(w, h, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100); cam.position.set(0, 0.3, 8);
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x8a5a2b, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(-3, 4, 5); scene.add(key);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xffc93c, roughness: 0.3, clearcoat: 0.8 }));
    body.scale.set(0.9, 1, 0.82); scene.add(body);
    const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xeef8ff, transmission: 1, roughness: 0.1, iridescence: 1, transparent: true, opacity: 0.7 });
    const wings = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), wingMat); m.scale.set(0.56, 0.37, 0.035); m.position.set(sx * 0.9, 0.7, -0.3); scene.add(m); return m; });
    let t = 0;
    const loop = () => {
      t += 1 / 60;
      wings.forEach((m, i) => { m.rotation.z = (i ? -1 : 1) * (0.4 + Math.sin(t * 60) * 0.5); });
      body.position.y = Math.sin(t * 3) * 0.08;
      renderer.render(scene, cam); gl.endFrameEXP(); requestAnimationFrame(loop);
    };
    loop();
  };
  return <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />;
}

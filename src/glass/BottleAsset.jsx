import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshBasicMaterial } from "three";

export default function BottleAsset({ variant, material }) {
  const { scene: original } = useGLTF(
    `${import.meta.env.BASE_URL}models/lunar-${variant}.glb`,
  );
  const { scene, glass, lettering } = useMemo(() => {
    const scene = original.clone(true),
      parts = [],
      remove = [];
    const lettering = new MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (object.isMesh && object.userData.role === "label")
        object.material = lettering;
      if (
        !object.isMesh ||
        !(
          object.userData.role === "glass" ||
          (variant.endsWith("-clear") && object.userData.role === "liquid")
        )
      )
        return;
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      for (const key of Object.keys(geometry.attributes))
        if (!["position", "normal"].includes(key))
          geometry.deleteAttribute(key);
      parts.push(geometry);
      remove.push(object);
    });
    remove.forEach((object) => object.removeFromParent());
    const glass = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    glass.scale(0.85, 0.85, 0.85);
    glass.translate(0, -2.04 * 0.85, 0);
    return { scene, glass, lettering };
  }, [original, variant]);
  useEffect(() => () => {
    glass.dispose();
    lettering.dispose();
  }, [glass, lettering]);
  return (
    <>
      <primitive object={scene} scale={0.85} position={[0, -2.04 * 0.85, 0]} />
      <mesh geometry={glass}>{material}</mesh>
    </>
  );
}

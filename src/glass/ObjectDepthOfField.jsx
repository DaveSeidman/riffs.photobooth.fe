import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { BlendFunction, Effect } from "postprocessing";
import { Color, MeshBasicMaterial, PointsMaterial, Uniform, UnsignedByteType } from "three";

const preserveWebcamShader = `
  uniform sampler2D sharpFrame;
  uniform sampler2D objectMask;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 sharp = texture2D(sharpFrame, uv);
    float object = clamp(texture2D(objectMask, uv).r, 0.0, 1.0);
    outputColor = mix(sharp, inputColor, object);
  }`;

function isDofObject(object) {
  for (let node = object; node; node = node.parent)
    if (node.userData.dofObject) return true;
  return false;
}

// DOF is composited through a visibility-aware bottle/shimmer matte. Both the
// video background and relit person layer come from an unblurred scene frame.
export default function ObjectDepthOfField() {
  const { gl, scene, camera } = useThree();
  const sharp = useFBO({samples:0});
  const mask = useFBO({samples:0, type:UnsignedByteType});
  const resources = useMemo(() => ({
    black:new MeshBasicMaterial({color:0x000000,toneMapped:false}),
    blackNoDepth:new MeshBasicMaterial({color:0x000000,toneMapped:false,depthWrite:false}),
    white:new Map(), points:new PointsMaterial({color:0xffffff,transparent:true,depthWrite:false,toneMapped:false}),
    background:new Color(0x000000), clearColor:new Color(),
  }), []);
  const effect = useMemo(() => new Effect("PreserveWebcam", preserveWebcamShader, {
    blendFunction:BlendFunction.NORMAL,
    uniforms:new Map([["sharpFrame",new Uniform(sharp.texture)],["objectMask",new Uniform(mask.texture)]]),
  }), [sharp,mask]);
  useEffect(() => () => {
    resources.black.dispose(); resources.blackNoDepth.dispose(); resources.points.dispose();
    resources.white.forEach(material=>material.dispose());
    effect.dispose();
  }, [resources,effect]);
  useFrame(() => {
    const target = gl.getRenderTarget(), background = scene.background;
    const clearAlpha = gl.getClearAlpha();
    gl.getClearColor(resources.clearColor);
    const originals = [], shaderFlags = [];
    try {
      gl.setRenderTarget(sharp); gl.clear(); gl.render(scene,camera);
      scene.traverse(object => {
        if (!object.isMesh && !object.isPoints) return;
        const material = object.material;
        if (material?.uniforms?.objectMaskPass) {
          shaderFlags.push([material.uniforms.objectMaskPass,material.uniforms.objectMaskPass.value]);
          material.uniforms.objectMaskPass.value = 1;
          return;
        }
        originals.push([object,material]);
        if (!isDofObject(object)) { object.material = material.depthWrite === false ? resources.blackNoDepth : resources.black; return; }
        if (object.isPoints) {
          const points = resources.points;
          points.map = material.map;
          points.size = material.size;
          points.sizeAttenuation = material.sizeAttenuation;
          points.opacity = material.opacity;
          object.material = points;
        } else {
          const side = material.side ?? 0;
          if (!resources.white.has(side)) resources.white.set(side,new MeshBasicMaterial({color:0xffffff,side,toneMapped:false}));
          object.material = resources.white.get(side);
        }
      });
      scene.background = resources.background;
      gl.setClearColor(0x000000,1);
      gl.setRenderTarget(mask); gl.clear(); gl.render(scene,camera);
    } finally {
      originals.forEach(([object,material])=>{ object.material = material; });
      shaderFlags.forEach(([uniform,value])=>{ uniform.value = value; });
      scene.background = background;
      gl.setClearColor(resources.clearColor,clearAlpha);
      gl.setRenderTarget(target);
    }
  }, .5);
  return <primitive object={effect} />;
}

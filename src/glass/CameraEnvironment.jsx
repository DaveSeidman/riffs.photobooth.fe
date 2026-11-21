import { useMemo } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import { BackSide } from 'three';

// A simulated HDR room: the LDR webcam is wrapped around the glass, with a
// restrained highlight lift and studio strips to retain readable bottle edges.
// This isolated scene cannot reflect the bottle into itself or include booth UI.
function CameraRoom({source,strength}) {
  const uniforms=useMemo(()=>({cameraFeed:{value:source.texture},strength:{value:strength},mirror:{value:source.mirror?-1:1}}),[source,strength]);
  return <mesh>
    <sphereGeometry args={[12,24,16]}/>
    <shaderMaterial side={BackSide} depthWrite={false} toneMapped={false} uniforms={uniforms}
      vertexShader={`varying vec3 roomDirection;void main(){roomDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`
        uniform sampler2D cameraFeed;
        uniform float strength,mirror;
        varying vec3 roomDirection;
        void main(){
          vec3 d=normalize(roomDirection);
          vec2 uv=vec2(atan(d.x,d.z)/6.28318530718+.5,asin(clamp(d.y,-1.,1.))/3.14159265359+.5);
          uv.x=mix(uv.x,1.-uv.x,step(mirror,0.));
          vec3 room=sRGBTransferEOTF(texture2D(cameraFeed,uv)).rgb;
          float brightness=dot(room,vec3(.2126,.7152,.0722));
          // The feed is not true HDR; bright windows become modest light sources.
          room*=.55+2.*pow(brightness,4.);
          float horizon=1.-smoothstep(.65,.98,abs(d.y));
          room*=mix(.18,1.,horizon);
          gl_FragColor=vec4(room*strength+vec3(.002,.003,.006),1.);
        }
      `}/>
  </mesh>;
}
export default function CameraEnvironment({source,settings}) {
  const live=settings.cameraEnvironment !== false;
  return <Environment resolution={live?64:256} frames={live?Infinity:1}>
    {live && <CameraRoom source={source} strength={settings.cameraEnvironmentStrength ?? .8}/>}
    <Lightformer form="rect" intensity={live?2:8} color="white" scale={[.65,7,1]} position={[-3,1,3]} rotation={[0,.5,0]}/>
    <Lightformer form="rect" intensity={live?1.5:5} color="#eceaff" scale={[1,6,1]} position={[3,0,2]} rotation={[0,-.6,0]}/>
    <Lightformer form="rect" intensity={live?1.5:5} color="white" scale={[6,.6,1]} position={[0,4,1]} rotation={[Math.PI/2,0,0]}/>
    <Lightformer form="ring" intensity={live ? .7 : 3} color="#ffd6e6" scale={3} position={[0,1,-4]} rotation={[0,Math.PI,0]}/>
  </Environment>;
}

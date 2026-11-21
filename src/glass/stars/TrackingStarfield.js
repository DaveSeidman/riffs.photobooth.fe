import * as THREE from 'three';
import {starVertex,starFragment,atmosphereFragment} from './tracking-shaders.js';
import {seededRandom} from './seededRandom.js';

// Same stable particles, atmosphere and sky rotation as lunar-tracking, rendered
// once into a native-resolution texture for the booth's silhouette compositing.
export class TrackingStarfield {
  constructor(renderer) {
    this.renderer=renderer;
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.output=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false});
    this.viewport=new THREE.Vector4();this.scissor=new THREE.Vector4();
    const count=45000, positions=new Float32Array(count*3),seeds=new Float32Array(count*3);
    const random=seededRandom(711);
    for(let i=0;i<count;i++) {
      const angle=random()*Math.PI*2,radius=Math.sqrt(random());
      positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=Math.sin(angle)*radius;
      seeds[i*3]=random();seeds[i*3+1]=random();seeds[i*3+2]=random();
    }
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
    this.geometry.setAttribute('aOrbit',new THREE.BufferAttribute(new Float32Array(count*3),3));
    const data=new Uint8Array(256*256*4);let state=4127;
    for(let i=0;i<data.length;i++) {state=(Math.imul(state,1664525)+1013904223)>>>0;data[i]=state>>>24;}
    this.noise=new THREE.DataTexture(data,256,256,THREE.RGBAFormat);
    this.noise.wrapS=this.noise.wrapT=THREE.RepeatWrapping;
    this.noise.minFilter=this.noise.magFilter=THREE.LinearFilter;this.noise.needsUpdate=true;
    this.uniforms={
      uSkyAngle:{value:0},uSkyPole:{value:new THREE.Vector2()},uSkyOffset:{value:new THREE.Vector2()},uSkyTile:{value:10},
      uWall:{value:new THREE.Vector2()},uStrength:{value:0},uRadius:{value:.5},uExposure:{value:1.25},
      uCount:{value:0},uOrbitDepth:{value:0},uMoon:{value:new THREE.Vector4()},
      uBottles:{value:[new THREE.Vector4(),new THREE.Vector4()]},
      uA:{value:[new THREE.Vector4()]},uB:{value:[new THREE.Vector4()]},
      uCold:{value:new THREE.Color('#3865ed')},uMid:{value:new THREE.Color('#885bd9')},uHot:{value:new THREE.Color('#e35b80')},
      uNoise:{value:this.noise},uNebula:{value:.7},
    };
    this.starMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:starVertex,fragmentShader:starFragment,
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false});
    const stars=new THREE.Points(this.geometry,this.starMaterial);stars.frustumCulled=false;
    this.plane=new THREE.PlaneGeometry(2,2);
    this.atmosphere=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:atmosphereFragment,depthWrite:false,depthTest:false,toneMapped:false});
    const backdrop=new THREE.Mesh(this.plane,this.atmosphere);backdrop.frustumCulled=false;backdrop.renderOrder=-1;
    this.scene.add(backdrop,stars);
  }
  tick(dt,width,height) {
    const scale=Math.min(1,2048/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    if(this.output.width!==w || this.output.height!==h) this.output.setSize(w,h);
    this.uniforms.uWall.value.set(width/height*2.25,2.25);
    this.uniforms.uSkyAngle.value=(this.uniforms.uSkyAngle.value+Math.min(dt,.1)*.8*Math.PI/600)%(Math.PI*2);
    const gl=this.renderer,target=gl.getRenderTarget(),scissorTest=gl.getScissorTest(),autoClear=gl.autoClear;
    gl.getViewport(this.viewport);gl.getScissor(this.scissor);
    try {gl.setScissorTest(false);gl.autoClear=true;gl.setRenderTarget(this.output);gl.render(this.scene,this.camera);}
    finally {gl.setRenderTarget(target);gl.setViewport(this.viewport);gl.setScissor(this.scissor);gl.setScissorTest(scissorTest);gl.autoClear=autoClear;}
  }
  dispose() {this.output.dispose();this.geometry.dispose();this.plane.dispose();this.noise.dispose();this.starMaterial.dispose();this.atmosphere.dispose();}
}

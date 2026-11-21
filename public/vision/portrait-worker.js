importScripts('./vision_bundle.js');
let detector, stamp=0;
const scratch=new OffscreenCanvas(1,1);
self.onmessage=async ({data})=>{
  if(data.type==='init') {
    try {
      const files=await Vision.FilesetResolver.forVisionTasks(new URL('./wasm',self.location.href).href);
      detector=await Vision.FaceDetector.createFromOptions(files,{
        baseOptions:{modelAssetPath:new URL('./face-detector.tflite',self.location.href).href,delegate:'CPU'},
        runningMode:'VIDEO',minDetectionConfidence:.6,
      });
      self.postMessage({type:'ready'});
    } catch(error) { self.postMessage({type:'error',message:error.message}); }
    return;
  }
  if(data.type!=='frame') return;
  try {
    const image=data.bitmap, width=image.width, height=image.height, boxes=[];
    const detect=(input,left)=>{
      stamp=Math.max(stamp+.01,data.timestamp);
      for(const d of detector.detectForVideo(input,stamp).detections) {
        const b=d.boundingBox, f={x:(left+b.originX)/width,y:b.originY/height,width:b.width/width,height:b.height/height,confidence:d.categories?.[0]?.score??1};
        const duplicate=boxes.some(o=>{
          const overlap=Math.max(0,Math.min(f.x+f.width,o.x+o.width)-Math.max(f.x,o.x))*Math.max(0,Math.min(f.y+f.height,o.y+o.height)-Math.max(f.y,o.y));
          return overlap/Math.min(f.width*f.height,o.width*o.height)>.45;
        });
        if(!duplicate) boxes.push(f);
      }
    };
    detect(image,0);
    if(boxes.length<4) {
      const crop=Math.round(width*.62);
      if(scratch.width!==crop || scratch.height!==height) {scratch.width=crop;scratch.height=height;}
      const context=scratch.getContext('2d');
      for(const left of [0,width-crop]) {context.drawImage(image,left,0,crop,height,0,0,crop,height);detect(scratch,left);}
    }
    self.postMessage({type:'faces',faces:boxes.sort((a,b)=>b.confidence-a.confidence).slice(0,4)});
  } catch(error) {self.postMessage({type:'error',message:error.message});}
  finally {data.bitmap.close();}
};

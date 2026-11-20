importScripts('./vision_bundle.js');
let landmarker;
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    try {
      const files = await Vision.FilesetResolver.forVisionTasks(new URL('./wasm', self.location.href).href);
      landmarker = await Vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: {modelAssetPath: new URL('./face-landmarker.task', self.location.href).href, delegate:'CPU'},
        runningMode:'VIDEO', numFaces:4, outputFaceBlendshapes:true,
        minFaceDetectionConfidence:.5, minFacePresenceConfidence:.5, minTrackingConfidence:.5,
      });
      self.postMessage({type:'ready'});
    } catch(error) { self.postMessage({type:'error', message:error.message}); }
    return;
  }
  if (data.type !== 'frame') return;
  try {
    const result = landmarker.detectForVideo(data.bitmap, data.timestamp);
    const scores = result.faceBlendshapes.map(({categories}) => {
      const score = name => categories.find(c => c.categoryName === name)?.score ?? 0;
      return Math.min(score('mouthSmileLeft'), score('mouthSmileRight'));
    });
    const centers = result.faceLandmarks.map(points => points[1].x);
    self.postMessage({type:'faces', scores, centers, timestamp:data.timestamp});
  } catch(error) { self.postMessage({type:'error', message:error.message}); }
  finally { data.bitmap.close(); }
};

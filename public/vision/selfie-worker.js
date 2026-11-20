/* MediaPipe runs off the UI thread; only the person mask leaves this worker. */
importScripts('./vision_bundle.js');
let segmenter;
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    try {
      const files = await Vision.FilesetResolver.forVisionTasks(new URL('./wasm', self.location.href).href);
      segmenter = await Vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: {modelAssetPath: new URL('./selfie-segmenter.tflite', self.location.href).href, delegate: 'CPU'},
        runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false,
      });
      self.postMessage({type: 'ready', labels: segmenter.getLabels()});
    } catch (error) { self.postMessage({type: 'error', message: error.message}); }
    return;
  }
  if (data.type !== 'frame') return;
  let result;
  try {
    result = segmenter.segmentForVideo(data.bitmap, data.timestamp);
    const masks = result.confidenceMasks;
    const labels = segmenter.getLabels();
    const index = masks.length === 1 ? 0 : Math.max(0, labels.findIndex(label => /person|selfie|foreground/i.test(label)));
    const mask = masks[index];
    const floats = mask.getAsFloat32Array();
    const bytes = new Uint8Array(floats.length);
    for (let i=0; i<bytes.length; i++) bytes[i] = Math.round(Math.max(0, Math.min(1, floats[i])) * 255);
    self.postMessage({type:'mask', data:bytes.buffer, width:mask.width, height:mask.height}, [bytes.buffer]);
  } catch (error) { self.postMessage({type:'error', message:error.message}); }
  finally { result?.close(); data.bitmap.close(); }
};

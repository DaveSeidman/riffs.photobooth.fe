// Overlapping views recover smaller faces in groups without counting a face
// twice. All returned boxes use the original, unmirrored image coordinates.
export function detectPortraitFaces(source, detect, scratch = document.createElement("canvas")) {
  const width = source.videoWidth || source.width;
  const height = source.videoHeight || source.height;
  const boxes = [];
  const add = (detections, left) => {
    for (const detection of detections) {
      const b = detection.boundingBox;
      const f = {
        x:(left+b.originX)/width, y:b.originY/height,
        width:b.width/width, height:b.height/height,
        confidence:detection.categories?.[0]?.score ?? 1,
      };
      const duplicate = boxes.some(other => {
        const intersection = Math.max(0,Math.min(f.x+f.width,other.x+other.width)-Math.max(f.x,other.x)) *
          Math.max(0,Math.min(f.y+f.height,other.y+other.height)-Math.max(f.y,other.y));
        return intersection / Math.min(f.width*f.height,other.width*other.height) > .45;
      });
      if (!duplicate) boxes.push(f);
    }
  };
  add(detect(source).detections,0);
  if (boxes.length < 4) {
    const cropWidth = Math.round(width*.62);
    scratch.width = cropWidth;
    scratch.height = height;
    const context = scratch.getContext("2d");
    for (const left of [0,width-cropWidth]) {
      context.drawImage(source,left,0,cropWidth,height,0,0,cropWidth,height);
      add(detect(scratch).detections,left);
    }
  }
  return boxes.sort((a,b)=>b.confidence-a.confidence).slice(0,4);
}

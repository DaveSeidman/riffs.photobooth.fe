import { detectPortraitFaces } from "./detectPortraitFaces.js";

let detectorPromise;

export async function countPhotoFaces(blob) {
  let bitmap;
  try {
    if (!detectorPromise) detectorPromise = (async () => {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const root = `${import.meta.env.BASE_URL}vision/`;
      const files = await FilesetResolver.forVisionTasks(`${root}wasm`);
      return FaceDetector.createFromOptions(files, {
        baseOptions: {modelAssetPath:`${root}face-detector.tflite`, delegate:"CPU"},
        runningMode:"IMAGE", minDetectionConfidence:.45,
      });
    })().catch(error => { detectorPromise = null; throw error; });
    const detector = await detectorPromise;
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(1,1536/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width*scale);
    canvas.height = Math.round(bitmap.height*scale);
    canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
    return detectPortraitFaces(canvas,input=>detector.detect(input)).length;
  } catch (error) {
    console.warn("[Lunar portrait count]", error.message);
    return null;
  } finally { bitmap?.close(); }
}

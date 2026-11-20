# Local vision assets

The Lunar mirror booth infers one to four guests from the captured photo. Camera frames and smile detection stay in the browser. No manual group selector is shown. Counting makes no inference about gender or fragrance preference.

- `wasm/vision_wasm_internal.{js,wasm}`: classic/SIMD loader used by `usePortraitCamera.js`. The detector's script loader requires the classic build; passing the module build causes an `import.meta` syntax error.
- `wasm/vision_wasm_module_internal.{js,wasm}`: retained for the inherited worker code.
- Both pairs come from the pinned `@mediapipe/tasks-vision@1.1.1` package. Update matching JS/WASM files together when upgrading.
- `face-detector.tflite`: MediaPipe BlazeFace short-range float16, version 1, from https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Integration reference: https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js

The booth samples twice per second and waits for three matching counts. Detection stops during still-photo review and is disposed when leaving the camera view.

Person segmentation uses `selfie-segmenter.tflite`, the pinned float16 v1 [MediaPipe Selfie Segmenter](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite). `selfie-worker.js` loads the classic `vision_bundle.js` copied from the same pinned package and returns a grayscale foreground-confidence mask at up to 15 fps. Camera frames never leave this browser worker. The bundled package and model use Apache 2.0 licensing; see LICENSE. Segmentation retains one frame in flight and stops when its view unmounts or the mask is disabled.


## Hands-free mirror flow

`face-landmarker.task` is the pinned float16 v1 [MediaPipe Face Landmarker](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task), with blendshape output enabled; [API reference](https://developers.google.com/edge/api/mediapipe/js/tasks-vision.facelandmarkeroptions). `smile-worker.js` samples the visible camera crop at up to 8 fps with one frame in flight. Both mouthSmile scores must exceed 0.55 for every detected guest. After 1.8 seconds of stable count and 0.7 seconds of smiles, a three-second countdown starts. A changed count or stale video cancels it. Model failures retain the shutter/keyboard fallback.

After capture, leaning the group center left/right by 9% of the frame for 1.6 seconds selects Blush/Pulse. Smiling is required only for the initial capture, not treatment selection. This uses a fresh center baseline at review, never inferred fragrance preference. Keyboard: Space captures, B/P selects, Escape resets, F1 opens development controls. Results reset after 60 seconds. Tune thresholds at the installation distance; these scores are expression estimates, not guarantees that every person is detected.

Person masks now receive separable Gaussian edge blur and frame-rate-independent temporal interpolation. Small changes blend over 160 ms; larger changes respond faster to limit trails. F1 exposes edge blur, softness and temporal smoothing. All inference remains local until the guest selects a treatment and the captured photo is submitted for generation.

Photo counting has a 2.5-second deadline; live counts provide the fallback. Treatment selection does not require the live and captured counts to match. The optional neon silhouette samples the same smoothed mask at two expanded radii to produce a hot-pink tube and soft halo; F1 controls its colour, strength and width.

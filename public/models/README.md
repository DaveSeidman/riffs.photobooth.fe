# Lunar bottle exports

Exported from the live refined Blender models, including the user's glass exterior geometry.

| File | Finish |
| --- | --- |
| `lunar-pulse.glb` | Coloured interior, clear exterior, labels and internal glitter |
| `lunar-blush.glb` | Coloured interior, clear exterior, labels and internal glitter |
| `lunar-pulse-clear.glb` | Transparent exterior AND interior, labels and glitter preserved |
| `lunar-blush-clear.glb` | Transparent exterior AND interior, labels and glitter preserved |

Standard models are also installed in `../lunar-tracking/public/models/products/`: `product-01.glb` is Pulse; `product-02.glb` is Blush. The wall loader normalizes their size.

All four are self-contained glTF 2.0 binary assets, with baked evaluated geometry, embedded colour textures, mesh lettering, and physical transmission/volume extensions. Named node `extras.role` values identify `glass`, `liquid`, `label` and `shimmer` parts. Source models retain editable text in `models/lunar-bottles-refined.blend`.

The booth defaults to `Lunar Blush / clear`. `BottleAsset.jsx` combines its transparent parts into a MeshTransmissionMaterial so the webcam texture is refracted behind them, while keeping the glitter and lettering meshes separate. R3F adds independently animated trailing sparkles. Switch bottle variants through F1.

F1 also exposes model X/Y/Z position, shader thickness/refraction, movement, tight bloom, vignette and depth of field. Position offsets apply to the live hovering pose; the quadratic capture animation still ends at bottom center. DOF starts disabled. Focus distance/range use scene units (camera at Z=8, bottle initially near Z=0, webcam plane at Z=-2.2). DOF uses a bottle/shimmer visibility matte and a sharp scene buffer, so neither the webcam background nor the segmented foreground is blurred. Start at distance 8 for bottle focus.

Re-export using `scripts/blender/export_bottles.py` in Blender, then run `node scripts/finalize-bottle-exports.mjs` to apply white unlit lettering. Do not rerun the original modeling script over user edits.

Floating shimmer follows the bottle’s full quaternion with damping. Loose helical strands make that rotation visible. F1 camera controls include orbit/pan/zoom toggles and Reset camera; the live video stays camera-facing during inspection. The camera returns to its original framing when capture starts.

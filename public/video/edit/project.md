## Session 1 - 2026-08-14

**Strategy:** Preserve the 13-second 1920x1080 source and create device-specific H.264 versions. Apply stable per-frame noise reduction, local contrast, luminance sharpening, and a feathered lower-right repair without cropping.
**Decisions:** Desktop uses 24 Mbps with a maximum keyframe interval of 8 frames. Mobile uses 12.5 Mbps with a maximum keyframe interval of 12 frames. Both remain 24 fps and 1080p. The website selects the mobile asset for compact/coarse-pointer devices and constrained networks, and opens after a safe initial buffer instead of waiting for the complete file.
**Reasoning log:** Moderate sharpening was chosen after preview inspection to avoid halos, crushed shadows, and frame-to-frame flicker in the dark mechanical scene.
**Outstanding:** None.


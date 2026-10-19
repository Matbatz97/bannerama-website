---
name: scroll-stop-prompter
description: >
  Generates AI image and video prompts for scroll-stopping content. Creates three linked prompts:
  (1) a clean product/object shot on white background at 16:9, (2) an exploded/deconstructed version
  of the same object, and (3) a video transition prompt that animates between assembled and
  deconstructed states. Works with any AI image generator (Higgsfield, Midjourney, etc.) and any
  video model (Runway, Kling, Pika, etc.). Delivers prompts via a gorgeous HTML page with a live 3D
  asset generator on the left (an interactive exploded-view stand-in of the object with explode slider,
  axis/angle controls, transition playback, PNG/GLB export) and the copyable prompts on the right.
  Trigger when the user says "scroll-stop prompt", "deconstruction prompt", "exploded view prompt",
  "product animation prompt", "3D asset generator", or asks for prompts to create scroll-stopping
  video content from object imagery.
---

# Scroll-Stop Prompter Skill

You generate a coordinated set of 3 prompts that work together to produce scroll-stopping
video content: a clean product shot, its deconstructed version, and a video transition between them.

After generating the prompts, you deliver them in a beautiful HTML page with tabbed navigation,
one-click copy buttons, and confetti animation — so the user can instantly copy-paste each prompt.

---

## The Process

### Step 1: Confirm the Object

Ask the user what object they want (if not already specified). Good scroll-stop objects include:
- Laptops, phones, headphones, cameras (tech products)
- Shoes, watches, bags (fashion/luxury)
- Cars, bikes, drones (vehicles)
- Food & beverages (smoothies, cocktails, plated dishes)
- Any product with interesting internal components or ingredients

Default to **laptop** if the user doesn't specify.

### Step 2: Generate Prompt A — The Assembled Shot

This is the clean, hero product image. Generate a detailed prompt optimized for AI image generators.

**Template:**

```
PROMPT A — ASSEMBLED SHOT

Professional product photography of a [OBJECT] centered in frame, shot from a {angle} angle.
Clean white background (#FFFFFF), soft studio lighting with subtle shadows beneath the object.
The [OBJECT] is pristine, brand-new, fully assembled and closed/complete.

Photorealistic rendering, 16:9 aspect ratio, product catalog quality. Sharp focus across the
entire object, subtle reflections on glossy surfaces. Minimal, elegant, Apple-style product
photography. No text, no logos, no other objects in frame.

Shot on Phase One IQ4 150MP, 120mm macro lens, f/8, studio strobe lighting with large softbox
above and white bounce cards on sides. Ultra-sharp detail, 8K quality downsampled to 4K.
```

**Customize for the specific object:**
- Adjust the camera angle (3/4 view works best for most products)
- Add material-specific details (brushed aluminum, matte plastic, leather texture, etc.)
- Specify the state (laptop closed vs open, watch face visible, shoe from side profile, etc.)
- Keep it on white — this is critical for the deconstruction to read well

### Step 3: Generate Prompt B — The Deconstructed Shot

This is the exploded/disassembled version. It should feel like the object has been elegantly
taken apart and each piece is floating in space (or for food/beverage, an explosion of ingredients).

**Template:**

```
PROMPT B — DECONSTRUCTED / EXPLODED VIEW

Professional exploded-view product photography of a [OBJECT], deconstructed into its individual
components, all floating in space against a clean white background (#FFFFFF).

Every internal component is visible and separated: [LIST 8-15 SPECIFIC COMPONENTS FOR THE OBJECT].
Each piece floats with even spacing between them, maintaining the general spatial relationship
of where they sit in the assembled product. The arrangement follows a {axis}
explosion axis.

Soft studio lighting with subtle shadows on each floating piece. Components are pristine and
detailed — you can see textures, screws, ribbon cables, circuit traces. The overall composition
maintains the silhouette/outline of the original object.

Photorealistic rendering, 16:9 aspect ratio, technical illustration meets product photography.
Shot on Phase One IQ4 150MP, focus-stacked for sharpness across all floating elements.
Same lighting setup as the assembled shot for visual continuity.
```

**Component lists by object type:**

For a **laptop**:
- Aluminum unibody shell (top lid)
- LCD display panel with ribbon cable
- Keyboard deck / top case
- Trackpad module with haptic engine
- Battery cells (individual cells visible)
- Logic board / motherboard with chips visible
- SSD / storage module
- Fan assembly with heat pipe
- Speaker modules (left and right)
- Hinge mechanism
- Bottom case panel
- Rubber feet and screws arranged neatly
- WiFi antenna array
- Camera module

For a **phone**:
- Glass back panel, battery, OLED display, logic board, camera module array, SIM tray,
  speaker grille, Taptic engine, Lightning/USB-C port assembly, antenna bands, frame/chassis,
  face ID sensor array, wireless charging coil

For a **shoe**:
- Outer sole, midsole/cushioning layer, insole, upper mesh/leather panels, tongue, laces,
  heel counter, toe cap, eyelets, stitching thread, branding elements

For **food/beverages** (smoothies, cocktails, etc.):
- Use "explosion" instead of "deconstruction" — the glass shatters, liquid erupts, ingredients
  fly outward in a dramatic freeze-frame. List every ingredient, garnish, and element (ice cubes,
  glass shards, liquid splashes, fruit pieces, herbs, etc.). Emphasize high-speed photography
  style (1/10000s freeze) for dramatic effect.

For other objects, research and list 8-15 real internal components.

### Step 4: Generate Prompt C — The Video Transition

This prompt instructs a video model to animate between the two states.

**Template:**

```
PROMPT C — VIDEO TRANSITION (Start Frame → End Frame)

START FRAME: A fully assembled [OBJECT] sitting centered on a white background, product
photography style, soft studio lighting.

END FRAME: The same [OBJECT] elegantly deconstructed into an exploded view — every component
floating in space, separated along a {axis} axis, maintaining spatial relationships.

TRANSITION: Smooth, satisfying mechanical deconstruction animation. The object begins whole
and still. After a brief pause (0.5s), pieces begin to separate — starting from the outer
shell and progressively revealing inner components. Each piece lifts and floats outward along
clean, deliberate paths. Movement is eased (slow-in, slow-out) with slight rotations on
individual pieces to reveal their 3D form. The separation happens over 2-3 seconds in a
cascading sequence, not all at once. Final floating arrangement holds for 1 second.

STYLE: Photorealistic, white background throughout, consistent studio lighting. No camera
movement — locked-off tripod shot. The only motion is the object deconstructing. Satisfying,
ASMR-like mechanical precision. Think Apple product reveal meets engineering visualization.

DURATION: 4-5 seconds total.
ASPECT RATIO: 16:9
QUALITY: High fidelity, smooth 24fps or higher, no artifacts.
```

**Variations to offer:**
- **Reverse version**: Start deconstructed, assemble together (equally compelling)
- **Loop version**: Assemble → pause → deconstruct → pause → repeat
- **Slow-mo version**: Same animation but 8-10 seconds, ultra-smooth

### Step 5: Build and Open the HTML Prompt Page

After generating all 3 prompts, deliver them in a gorgeous HTML page. This is the key deliverable
that makes the skill feel premium and easy to use.

**How to build it:**

1. Read the HTML template from `assets/prompt-page-template.html` (in this skill's directory)

2. Replace these placeholders with the actual content:
   - `{{OBJECT_NAME}}` — the object name for the page title (e.g. "Tropical Smoothie Explosion")
   - `{{HEADING_LINE1}}` — first word(s) of the heading (e.g. "SMOOTHIE")
   - `{{HEADING_LINE2}}` — second word(s), displayed faded (e.g. "EXPLOSION")
   - `{{TAB_A_NAME}}` — name for tab A (e.g. "Assembled Shot")
   - `{{TAB_A_SHORT}}` — short mobile label for tab A (e.g. "Assembled")
   - `{{TAB_B_NAME}}` — name for tab B (e.g. "Explosion Shot" or "Deconstructed")
   - `{{TAB_B_SHORT}}` — short mobile label for tab B (e.g. "Explosion")
   - `{{PROMPT_A}}` — the full text of Prompt A (plain text, no HTML)
   - `{{PROMPT_B}}` — the full text of Prompt B (plain text, no HTML)
   - `{{PROMPT_C}}` — the full text of Prompt C (plain text, no HTML)
   - `{{DEFAULT_AXIS}}` — `vertical`, `diagonal` or `radial` (use `radial` for food/beverage explosions)
   - `{{DEFAULT_ANGLE}}` — `three-quarter`, `straight-on front` or `elevated 45-degree`
   - `{{PARTS_JSON}}` — a JSON array describing the 3D stand-in (see "The 3D asset generator" below)

3. **Important**: When inserting prompt text, escape any `<`, `>`, and `&` characters as HTML
   entities (`&lt;`, `&gt;`, `&amp;`) so they render correctly in the browser. Leave the literal
   `{angle}` and `{axis}` tokens in the prompt text: the page swaps them for the values chosen in
   the left-hand controls and highlights them, so copied prompts always match the 3D preview.
   In `{{PARTS_JSON}}`, write valid JSON and replace any `<` with `<`.

4. Write the completed HTML to a file called `prompts.html` in the user's current working
   directory (or wherever they're working).

5. Open the file in the browser:
   - If a local server is running, open via localhost URL
   - Otherwise, use `open prompts.html` (macOS) or `xdg-open prompts.html` (Linux) to open
     the file directly

**The 3D asset generator (left column):**

A Three.js stand-in of the object, built from simple primitives, on a pure white studio floor.
It is a composition and motion reference for the prompts, not a photoreal model. Build
`{{PARTS_JSON}}` from the same components you listed in Prompt B, in assembled position:

```json
[
  { "name": "Bottom case",   "shape": "box",      "size": [3.1, 0.06, 2.15], "pos": [0, 0.03, 0], "color": "#b9bcc2", "metalness": 0.85, "roughness": 0.35 },
  { "name": "Battery cells", "shape": "box",      "size": [2.4, 0.08, 1.1],  "pos": [0, 0.11, 0.35], "color": "#2a2d33" },
  { "name": "Fan assembly",  "shape": "cylinder", "size": [0.28, 0.28, 0.06], "pos": [0.9, 0.18, -0.6], "color": "#3a3d44" },
  { "name": "Aluminum lid",  "shape": "box",      "size": [3.1, 0.05, 2.15], "pos": [0, 0.37, 0], "color": "#c9ccd1", "metalness": 0.9, "roughness": 0.3 }
]
```

| Field | Meaning |
|---|---|
| `name` | Component name, shown in the parts list and on hover |
| `shape` | `box` (rounded), `cylinder`, `sphere`, `torus`, `cone`, `capsule` |
| `size` | box `[w, h, d]` · cylinder `[rTop, rBottom, h]` · sphere `[r]` · torus `[r, tube]` · cone `[r, h]` · capsule `[r, length]` |
| `pos` | Centre of the part when assembled, Y up. Any units: the page normalizes scale and sits the object on the floor |
| `rot` | Optional `[x, y, z]` radians |
| `color` | Hex matching the material described in Prompt A/B |
| `metalness`, `roughness`, `opacity` | Optional, 0–1 (use `opacity` < 1 for glass and liquids) |

Rules for a good stand-in:
- Use 6–15 parts: the same components as Prompt B, merging tiny ones (screws, feet) into one part.
- Stack parts in their real assembled order along Y. The explode layout keeps that order, so
  a wrong order gives a wrong teardown.
- Keep proportions true to the real object. Colours should match the prompt's materials.
- Food/drink: use spheres, capsules and cylinders for ingredients, a low-opacity cylinder for
  the glass, and set `{{DEFAULT_AXIS}}` to `radial`.

What the controls do:
- **Explode slider / Deconstruct / Assemble / Loop**: preview Prompt C's cascading motion
  (the outer shell leaves first, with eased movement and slight rotations). The camera is
  framed once over the whole motion and stays locked, like the tripod shot in Prompt C.
- **Explosion axis** (vertical / diagonal / radial) rewrites `{axis}` in Prompts B and C.
- **Camera angle** (3/4 / front / elevated) rewrites `{angle}` in Prompt A.
- **PNG reference frame**: a 1920×1080 render of the current state on white. It can be used
  as a composition reference image in the image generator.
- **GLB model**: exports the stand-in for Blender, a website scroll scene, etc.
- Clicking prompt tab A assembles the model, tab B explodes it, and tab C plays the transition.

**The HTML page features:**
- Two columns: 3D asset generator on the left, prompts on the right (stacks on screens < 960px)
- Tabbed A/B/C interface — click a tab, the prompt appears. No scrolling needed.
- One-click Copy button on each prompt
- Confetti animation fires every time you copy
- VoltFlow design: Space Grotesk + Archivo + JetBrains Mono, #BFF549 lime accent, #02040a dark bg
- Glass-morphism cards, floating background orbs, subtle grid
- Keyboard shortcuts: 1/2/3 to switch tabs, Cmd+C to copy active prompt, Space to play the transition
- Fully responsive on mobile

### Step 6: Also Present Prompts in Chat

After building the HTML page, also present the prompts in chat as a fallback, with `{angle}` and
`{axis}` replaced by the default values you chose. Use this format:

```
## Your Scroll-Stop Prompt Set: [OBJECT]

### PROMPT A — Assembled Shot
[paste into your image generator, set to 16:9]

{prompt A}

---

### PROMPT B — Deconstructed Shot
[paste into your image generator, set to 16:9, optionally reference Prompt A's output as input]

{prompt B}

---

### PROMPT C — Video Transition
[paste into your video model, upload Prompt A output as start frame and Prompt B output as end frame]

{prompt C}

---

### Recommended Settings
- **Image generator**: 16:9 aspect ratio, highest quality/resolution available
- **Video model**: 16:9, 4-5 seconds, highest quality
- **Tip**: Generate the assembled shot first, then reference it when generating the deconstructed
  version for visual consistency (same color, lighting, angle)
```

---

## Best Practices

1. **Consistency is key** — The assembled and deconstructed versions must look like the same object.
   Same materials, same colors, same lighting direction, same camera angle.
2. **White background always** — This makes the scroll-stop website build (Skill 2) much easier
   and cleaner. It also makes the video transition cleaner.
3. **Component accuracy matters** — Don't make up parts. Use real components for the object type.
   This sells the realism.
4. **The video prompt is model-agnostic** — Write it descriptively enough that it works in Runway,
   Kling, Pika, Higgsfield, or any other video model. The user just uploads start/end frames.
5. **Offer the reverse** — Sometimes the assembly animation (parts coming together) is even more
   satisfying than the deconstruction.
6. **The HTML page is the primary deliverable** — The chat output is secondary. The page should
   always be generated and opened automatically.

---

## Error Recovery

| Issue | Solution |
|---|---|
| Image gen produces inconsistent lighting | Add "match exact lighting direction and intensity from reference image" to Prompt B |
| Deconstruction looks random, not organized | Emphasize "maintain spatial relationships" and "explosion along single axis" in Prompt B |
| Video transition is too fast/jerky | Increase duration to 6-8 seconds, emphasize "smooth eased motion" and "cascading sequence" |
| Components don't look realistic | Add specific material descriptions (brushed aluminum, matte black plastic, green PCB with gold traces) |
| White background isn't pure white | Add "pure white #FFFFFF background, no gradient, no vignette" explicitly |
| HTML page doesn't open | Fall back to `open <filepath>` command, or tell user the file path to open manually |
| Prompt contains HTML special chars | Always escape `<`, `>`, `&` when inserting into the HTML template |
| 3D preview is blank | Check `{{PARTS_JSON}}` is valid JSON (the console logs "Bad assetConfig JSON"); the viewer needs WebGL and internet access to load three.js from jsDelivr |
| Exploded parts appear in the wrong order | Fix the `pos` Y values so the parts stack in real assembled order |

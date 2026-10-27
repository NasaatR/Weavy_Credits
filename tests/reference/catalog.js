(() => {
  "use strict";

  const fixed = (name, credits, aliases = [], category = "other") => ({
    name,
    aliases,
    category,
    kind: "fixed",
    min: credits,
    max: credits
  });

  const range = (name, min, max, aliases = [], category = "other", note = "") => ({
    name,
    aliases,
    category,
    kind: "range",
    min,
    max,
    note
  });

  const option = (credits, when = {}) => ({ credits, when });

  const dynamic = (name, options, aliases = [], category = "other", extra = {}) => ({
    name,
    aliases,
    category,
    kind: "dynamic",
    options,
    min: Math.min(...options.map((item) => item.credits)),
    max: Math.max(...options.map((item) => item.credits)),
    ...extra
  });

  const formula = (name, formulas, aliases = [], category = "other", extra = {}) => ({
    name,
    aliases,
    category,
    kind: "formula",
    formulas,
    min: null,
    max: null,
    ...extra
  });

  const entries = [
    // Image generation — official comparison table dated 2026-04-26.
    dynamic("ChatGPT Images 2.0", [
      option(9, { quality: "medium" }),
      option(37, { quality: "high" })
    ], [
      "ChatGPT Image 2.0", "ChatGPT Images 2.0", "GPT Image 2", "GPT Images 2",
      "gpt-image-2", "gpt_image_2", "gpt image 2"
    ], "image", {
      preferCatalogPricing: true,
      parameterLabel: "Quality",
      missingParameterReason: "Quality исторического запуска не найден или неоднозначен; показан диапазон Medium–High 9–37 cr."
    }),
    fixed("Reve", 4, [], "image"),
    fixed("Higgsfield Image", 21, [], "image"),
    fixed("GPT Image 1", 8, ["gpt-image-1"], "image"),
    fixed("Imagen 4", 6, [], "image"),
    fixed("Imagen 3", 6, [], "image"),
    fixed("Imagen 3 Fast", 3, [], "image"),
    fixed("Flux 2 Pro", 5, [], "image"),
    fixed("Flux 2 Flex", 14, [], "image"),
    fixed("Flux 2 Dev LoRA", 4, [], "image"),
    fixed("Flux 1.1 Ultra", 7, ["Flux Ultra 1.1", "flux-1.1-ultra"], "image"),
    fixed("Flux Pro 1.1", 5, ["Flux 1.1 Pro", "flux-1.1-pro"], "image"),
    fixed("Flux Fast", 0.4, ["flux-fast"], "image"),
    fixed("Flux Dev LoRA", 4, [], "image"),
    fixed("Recraft V3", 5, [], "image"),
    fixed("Mystic", 12, [], "image"),
    fixed("Ideogram V3", 4, [], "image"),
    fixed("Ideogram V3 Character", 15, [], "image"),
    fixed("Stable Diffusion 3.5", 8, ["SD 3.5", "SD3.5"], "image"),
    fixed("Minimax Image 01", 1, ["MiniMax Image 01"], "image"),
    fixed("Bria", 6, [], "image"),
    fixed("Dalle 3", 5, ["DALL-E 3", "DALL·E 3"], "image"),
    fixed("Luma Photon", 2, [], "image"),
    fixed("Nvidia Sana", 0.2, [], "image"),
    fixed("Nvidia Consistory", 5, [], "image"),

    // Image editing — official comparison table dated 2026-04-26.
    dynamic("ChatGPT Images 2.0 Edit", [
      option(9, { quality: "medium" }),
      option(37, { quality: "high" })
    ], [
      "ChatGPT Image 2.0 Edit", "ChatGPT Images 2.0 Edit", "GPT Image 2 Edit", "GPT Images 2 Edit",
      "gpt-image-2/edit", "openai/gpt-image-2/edit", "gpt_image_2_edit", "gpt image 2 edit",
      "gpt image 2/gpt/image", "gpt-image-2/gpt/image"
    ], "image-edit", {
      preferCatalogPricing: true,
      parameterLabel: "Quality",
      missingParameterReason: "Quality исторического запуска не найден, неоднозначен или имеет неподдерживаемое значение; показан диапазон Medium–High 9–37 cr."
    }),
    dynamic("Gemini 3.1 Flash (Nano Banana 2)", [
      option(6, { resolution: "1k" }),
      option(9, { resolution: "2k" }),
      option(13.5, { resolution: "4k" })
    ], ["Nano Banana 2", "Gemini 3.1 Flash", "fal-ai/nano-banana-2/edit", "fal-ai/nano-banana-2-lite/edit", "nano-banana-2/edit", "nano-banana-2-lite/edit"], "image-edit", {
      preferCatalogPricing: true,
      parameterLabel: "разрешение",
      missingParameterReason: "Разрешение исторического результата не найдено; показан полный диапазон 1K–4K."
    }),
    dynamic("Gemini 3 Pro", [
      option(11, { resolution: "1k" }),
      option(11, { resolution: "2k" }),
      option(23, { resolution: "4k" })
    ], ["Nano Banana Pro", "Gemini 3 (Nano Banana Pro)", "Gemini 3 Pro Image", "fal-ai/nano-banana-pro/edit", "nano-banana-pro/edit"], "image-edit", {
      preferCatalogPricing: true,
      parameterLabel: "разрешение",
      missingParameterReason: "Разрешение исторического результата не найдено; показан диапазон 1K/2K–4K."
    }),
    fixed("Seedream V5 Edit", 4, ["Seedream V5"], "image-edit"),
    fixed("Seedream V4.5 Edit", 4, [], "image-edit"),
    fixed("Reve Edit", 4, [], "image-edit"),
    fixed("Qwen Image Edit 2511", 10, [], "image-edit"),
    fixed("Qwen Edit Image Plus", 3, [], "image-edit"),
    fixed("Flux 2 Inpaint Klein 9B", 10, [], "image-edit"),
    fixed("Runway Gen-4 Image", 6, ["Runway Gen- 4 Image"], "image-edit"),
    fixed("Seedream V4 Edit", 4, [], "image-edit"),
    fixed("Klux Kontext", 3, ["Flux Kontext"], "image-edit"),
    fixed("Flux Kontext Multi Image", 10, [], "image-edit"),
    fixed("Flux Kontext LoRA", 12, [], "image-edit"),
    fixed("GPT Image 1.5 Edit", 7, ["gpt-image-1.5-edit", "GPT Image 1.5", "gpt-image-1.5"], "image-edit"),
    fixed("GPT Image 1 Edit", 8, ["gpt-image-1-edit"], "image-edit"),
    fixed("SeedEdit 3.0", 4, [], "image-edit"),
    fixed("Gemini 2.0 Flash", 0.1, [], "image-edit"),
    fixed("Flux 2 Max", 10, [], "image-edit"),
    fixed("Flux Fill Pro", 6, [], "image-edit"),
    fixed("Flux Dev LoRA Inpaint", 4, [], "image-edit"),
    fixed("Ideogram V3 Inpaint", 11, [], "image-edit"),
    fixed("Ideogram V2 Inpaint", 10, [], "image-edit"),
    fixed("SD3 Inpaint", 4, ["Stable Diffusion 3 Inpaint"], "image-edit"),
    fixed("Bria Inpaint", 5, [], "image-edit"),
    fixed("Flux Pro Outpaint", 6, [], "image-edit"),
    fixed("SD3 Outpaint", 5, ["Stable Diffusion 3 Outpaint"], "image-edit"),
    fixed("SD3 Remove Background", 2, [], "image-edit"),
    fixed("Bria Remove Background", 0.6, [], "image-edit"),
    fixed("SD3 Content-Aware Fill", 4, [], "image-edit"),
    fixed("Kolors Virtual Try On", 8, [], "image-edit"),
    fixed("Replace Background", 4, [], "image-edit"),
    fixed("Bria Content Aware-Fill", 5, ["Bria Content-Aware Fill"], "image-edit"),
    fixed("Bria Replace Background", 2, [], "image-edit"),
    fixed("Relight 2.0", 10, [], "image-edit"),

    // Generate from image — official comparison table dated 2026-03-29.
    fixed("Flux Dev Redux", 3, [], "image-to-image"),
    fixed("Flux ControlNet & LoRA", 10, ["Flux ControlNet LoRA"], "image-to-image"),
    fixed("Flux Canny Pro", 6, [], "image-to-image"),
    fixed("Flux Depth Pro", 6, [], "image-to-image"),
    fixed("Qwen Edit Multiangle", 4, ["Qwen Multiangle"], "image-to-image"),
    fixed("Image to Image", 10, ["image-to-image"], "image-to-image"),
    fixed("Stable Diffusion controlnets", 1, ["Stable Diffusion ControlNet"], "image-to-image"),
    fixed("Sketch To Image", 0.1, ["Sketch-to-Image"], "image-to-image"),

    // Image enhancement — official comparison table dated 2026-03-29.
    fixed("Topaz Upscale", 19, [], "enhance"),
    fixed("Topaz Sharpen", 19, [], "enhance"),
    fixed("Recraft Crisp Upscale", 5, [], "enhance"),
    fixed("Magnific Skin Enhancer", 18, [], "enhance"),
    fixed("Magnific Upscale", 12, [], "enhance"),
    fixed("Magnific Precision Upscale", 18, [], "enhance"),
    fixed("Magnific Precision Upscale V2", 18, [], "enhance"),
    fixed("Enhancor Image Upscale", 36, ["Enhancer Image Upscale"], "enhance"),
    fixed("Enhancor Realistic Skin", 36, ["Enhancer Realistic Skin"], "enhance"),

    // Vector — official comparison table dated 2026-03-29.
    fixed("Vectorizer", 24, [], "vector"),
    fixed("Recraft V3 SVG", 10, [], "vector"),
    fixed("Text To Vector", 6, ["Text-to-Vector"], "vector"),

    // 3D — official comparison table dated 2026-03-29.
    fixed("Sam 3D Objects", 3, ["SAM 3D Objects"], "3d"),
    fixed("Rodin", 48, [], "3d"),
    fixed("Rodin V2", 36, [], "3d"),
    fixed("Trellis 3D V2", 30, [], "3d"),
    fixed("Meshy V6", 96, [], "3d"),
    fixed("Hunyuan 3D V3", 80, [], "3d"),
    fixed("Hunyuan 3D", 18, [], "3d"),
    fixed("Hunyuan 3D V2.1", 25, [], "3d"),
    fixed("Trellis", 2, [], "3d"),

    // Lip sync — official comparison table dated 2026-03-29.
    fixed("Omnihuman V1.5", 352, ["OmniHuman V1.5"], "lip-sync"),
    fixed("Sync 2 Pro", 184, [], "lip-sync"),
    fixed("Pixverse Lipsync", 66, ["PixVerse Lip Sync"], "lip-sync"),
    fixed("Kling AI Avatar Pro", 253, [], "lip-sync"),

    // Video generation — official comparison table dated 2026-04-26.
    dynamic("Seedance 2.0", [
      option(116, { mode: "fast", duration: 4 }),
      option(443, { mode: "fast", duration: 15 }),
      option(145, { mode: "standard", duration: 4 }),
      option(552, { mode: "standard", duration: 15 })
    ], [], "video", { unresolvedIfTextIncludes: ["1080"] }),
    dynamic("Seedance 2.0 Reference", [
      option(116, { mode: "fast", duration: 4 }),
      option(443, { mode: "fast", duration: 15 }),
      option(145, { mode: "standard", duration: 4 }),
      option(552, { mode: "standard", duration: 15 })
    ], [], "video", { unresolvedIfTextIncludes: ["1080"] }),
    dynamic("Kling 3", [
      option(80, { mode: "pro", duration: 3 }),
      option(440, { mode: "pro", duration: 15 }),
      option(60, { mode: "standard", duration: 3 }),
      option(300, { mode: "standard", duration: 15 })
    ], [], "video"),
    range("Seedance V1.5 Pro", 25, 74, [], "video"),
    fixed("Wan 2.5", 55, [], "video"),
    range("Grok Imagine Video", 36, 90, [], "video"),
    dynamic("Sora 2", [
      option(96, { mode: "normal" }),
      option(288, { mode: "pro" })
    ], [], "video"),
    fixed("Wan 2.2", 66, [], "video"),
    dynamic("LTX 2 Video", [
      option(50, { mode: "fast", duration: 6 }),
      option(100, { mode: "fast", duration: 8 }),
      option(200, { mode: "fast", duration: 10 }),
      option(70, { mode: "pro", duration: 6 }),
      option(140, { mode: "pro", duration: 8 }),
      option(280, { mode: "pro", duration: 10 })
    ], [], "video"),
    dynamic("Moonvalley", [
      option(165, { duration: 5 }),
      option(330, { duration: 10 })
    ], [], "video"),
    dynamic("Veo 3.1 Text to Image", [
      option(120, { mode: "fast" }),
      option(320, { mode: "standard" })
    ], ["Veo 3.1 Text to Video"], "video"),
    dynamic("Veo 3.1 Image to Video", [
      option(120, { mode: "fast" }),
      option(320, { mode: "standard" })
    ], [], "video"),
    dynamic("Veo 3 Text to Image", [
      option(120, { mode: "fast" }),
      option(320, { mode: "standard" })
    ], ["Veo 3 Text to Video"], "video"),
    dynamic("Veo 3 Image to Video", [
      option(120, { mode: "fast" }),
      option(320, { mode: "standard" })
    ], [], "video"),
    dynamic("Veo 2", [
      option(300, { duration: 5 }),
      option(400, { duration: 8 })
    ], [], "video"),
    dynamic("Seedance V1.0", [
      option(18, { mode: "lite", duration: 5 }),
      option(36, { mode: "lite", duration: 10 }),
      option(88, { mode: "pro", duration: 5 }),
      option(176, { mode: "pro", duration: 10 })
    ], ["Seedance 1.0"], "video"),
    dynamic("Pixverse V4.5", [
      option(60, { duration: 5 }),
      option(90, { duration: 10 })
    ], ["PixVerse V4.5"], "video"),
    dynamic("Runway Gen-4.5", [
      option(70, { duration: 5 }),
      option(112, { duration: 8 }),
      option(140, { duration: 10 })
    ], [], "video"),
    dynamic("Runway Gen-4 Turbo", [
      option(30, { duration: 5 }),
      option(60, { duration: 10 })
    ], ["Runway Gen-4Turbo"], "video"),
    dynamic("Runway Gen-4", [
      option(28, { duration: 2 }),
      option(56, { duration: 4 }),
      option(70, { duration: 5 }),
      option(84, { duration: 6 }),
      option(98, { duration: 7 }),
      option(112, { duration: 8 }),
      option(126, { duration: 9 }),
      option(140, { duration: 10 })
    ], [], "video"),
    dynamic("Runway Gen-3", [
      option(30, { duration: 5 }),
      option(60, { duration: 10 })
    ], [], "video"),
    dynamic("Kling 1.6", [
      option(18, { mode: "standard", duration: 5 }),
      option(36, { mode: "standard", duration: 10 }),
      option(37.5, { mode: "pro", duration: 5 }),
      option(75, { mode: "pro", duration: 10 })
    ], [], "video"),
    dynamic("Kling Video", [
      option(25, { text: "2.1 standard", duration: 5 }),
      option(50, { text: "2.1 standard", duration: 10 }),
      option(45, { text: "2.1 pro", duration: 5 }),
      option(90, { text: "2.1 pro", duration: 10 }),
      option(90, { text: "2.1 master", duration: 5 }),
      option(280, { text: "2.1 master", duration: 10 }),
      option(35, { text: "2.5 turbo pro", duration: 5 }),
      option(70, { text: "2.5 turbo pro", duration: 10 }),
      option(120, { text: "2.6 pro", duration: 5 }),
      option(180, { text: "2.6 pro", duration: 10 })
    ], ["Kling 2.1 Standard", "Kling 2.1 Pro", "Kling 2.1 Master", "Kling 2.5 Turbo Pro", "Kling 2.6 Pro"], "video"),
    dynamic("Kling O1 First & Last Frame", [
      option(56, { duration: 5 }),
      option(112, { duration: 10 })
    ], [], "video"),
    dynamic("Kling 2.5 First & Last Frame", [
      option(35, { duration: 5 }),
      option(70, { duration: 10 })
    ], [], "video"),
    dynamic("Kling 2.1 First & Last Frame", [
      option(45, { duration: 5 }),
      option(90, { duration: 10 })
    ], [], "video"),
    dynamic("Luma Ray 2", [
      option(108, { duration: 5 }),
      option(194, { duration: 9 })
    ], [], "video"),
    dynamic("Luma Ray 2 Flash", [
      option(36, { duration: 5 }),
      option(65, { duration: 9 })
    ], [], "video"),
    fixed("Minimax Video Director", 60, ["MiniMax Video Director"], "video"),
    fixed("Minimax Video 01", 60, ["MiniMax Video 01"], "video"),
    fixed("Hunyuan", 60, [], "video"),
    fixed("Skyreels", 36, ["SkyReels"], "video"),
    fixed("Wan Video", 24, [], "video"),
    dynamic("Higgsfield Video", [
      option(14, { mode: "lite" }),
      option(45, { mode: "turbo" }),
      option(62, { mode: "preview" })
    ], [], "video"),

    // Generate/edit from video.
    // SwitchX 1080p was calibrated against the Weavy total shown for a saved
    // 5.888-second run: 6 started seconds × 60 credits = 360 credits.
    formula("Beeble SwitchX", [{
      perSecond: 60,
      secondsRounding: "ceil",
      when: { resolution: "1080" }
    }], [
      "Beeble SwitchX", "Beeble Switch X", "beeble_switchx", "beeble-switchx",
      "beeble/switchx", "switchx"
    ], "video-edit", {
      parameterLabel: "разрешение и длительность",
      missingParameterReason: "Для SwitchX нужны сохранённые разрешение и длительность. Для неизвестной комбинации расширение не переносит цену с текущих настроек на старый запуск."
    }),
    // Official comparison table dated 2026-03-29.
    fixed("Kling O1 Edit Video", 147, [], "video-edit"),
    dynamic("Kling O1 Reference Video to Video", [
      option(92, { duration: 5 }),
      option(184, { duration: 10 })
    ], [], "video-edit"),
    dynamic("Kling O3 Edit Video", [
      option(300, { mode: "pro" }),
      option(400, { mode: "standard" })
    ], [], "video-edit"),
    dynamic("Kling Motion Control", [
      option(80, { mode: "pro" }),
      option(50, { mode: "standard" })
    ], [], "video-edit"),
    fixed("LTX 2 Video to Video", 30, [], "video-edit"),
    fixed("Runway Aleph", 66, [], "video-edit"),
    dynamic("Runway Act-Two", [
      option(165, { duration: 5 }),
      option(330, { duration: 10 })
    ], ["Runway Act Two"], "video-edit"),
    dynamic("Luma Reframe", [
      option(320, { mode: "fast" }),
      option(600, { mode: "standard" })
    ], [], "video-edit"),
    dynamic("Luma Modify", [
      option(320, { mode: "fast" }),
      option(600, { mode: "standard" })
    ], [], "video-edit"),
    dynamic("Wan 2.2 Animate - Replace", [
      option(48, { resolution: "480" }),
      option(72, { resolution: "580" }),
      option(100, { resolution: "720" })
    ], [], "video-edit"),
    dynamic("Wan 2.2 Animate - Move", [
      option(48, { resolution: "480" }),
      option(72, { resolution: "580" }),
      option(100, { resolution: "720" })
    ], [], "video-edit"),
    dynamic("Wan Vace Depth", [
      option(300, { duration: 5 }),
      option(400, { duration: 8 })
    ], ["Wan VACE Depth"], "video-edit"),
    dynamic("Wan Vace Pose", [
      option(18, { mode: "lite", duration: 5 }),
      option(36, { mode: "lite", duration: 10 }),
      option(88, { mode: "pro", duration: 5 }),
      option(176, { mode: "pro", duration: 10 })
    ], ["Wan VACE Pose"], "video-edit"),
    dynamic("Wan Vace Reframe", [
      option(60, { duration: 5 }),
      option(90, { duration: 10 })
    ], ["Wan VACE Reframe"], "video-edit"),
    fixed("Wan Vace Outpainting", 120, ["Wan VACE Outpainting"], "video-edit"),
    fixed("Hunyuan Video to Video", 60, [], "video-edit")
  ];

  globalThis.WEAVE_CREDIT_CATALOG = Object.freeze({
    version: "2026.07.28-v9-live-pricing",
    updatedAt: "2026-07-28",
    entries: Object.freeze(entries)
  });
})();

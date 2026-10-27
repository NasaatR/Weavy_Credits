// Public numeric tariff data: all ten official comparison tables. See docs/PRICING-RESEARCH.md.
export const BUILTIN_CATALOG = {
  "version": "2026-10-23",
  "checkedAt": "2026-09-22",
  "variantsUpdatedAt": "2026-10-23",
  "officialCount": 147,
  "variantCount": 40,
  "entries": [
    {
      "name": "ChatGPT Images 2.0",
      "priceText": "1-37",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "ChatGPT Image 2.0",
        "ChatGPT Images 2.0",
        "GPT Image 2",
        "GPT Images 2",
        "gpt-image-2",
        "gpt_image_2",
        "gpt image 2"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "range",
      "min": 1,
      "max": 37,
      "previousPrice": {
        "kind": "dynamic",
        "min": 9,
        "max": 37,
        "note": "Предыдущий каталог отличается; его цены не считаются текущими"
      },
      "parameterRules": {
        "options": [
          {
            "credits": 9,
            "when": {
              "quality": "medium"
            }
          },
          {
            "credits": 37,
            "when": {
              "quality": "high"
            }
          }
        ],
        "source": "Предоставленный анализатор 0.20.0",
        "sourceDate": "2026-07-28",
        "verifiedCurrent": false
      }
    },
    {
      "name": "Reve",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Higgsfield Image",
      "priceText": "21",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 21,
      "max": 21
    },
    {
      "name": "GPT Image 1",
      "priceText": "8",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "gpt-image-1"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 8,
      "max": 8
    },
    {
      "name": "Imagen 4",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Imagen 3",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Imagen 3 Fast",
      "priceText": "3",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 3,
      "max": 3
    },
    {
      "name": "Flux 2 Pro",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Flux 2 Flex",
      "priceText": "14",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 14,
      "max": 14
    },
    {
      "name": "Flux 2 Dev LoRA",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Flux 1.1 Ultra",
      "priceText": "7",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Flux Ultra 1.1",
        "flux-1.1-ultra"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 7,
      "max": 7
    },
    {
      "name": "Flux Pro 1.1",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Flux 1.1 Pro",
        "flux-1.1-pro"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Flux Fast",
      "priceText": "0.4",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "flux-fast"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 0.4,
      "max": 0.4
    },
    {
      "name": "Flux Dev LoRA",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Recraft V3",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Mystic",
      "priceText": "12",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 12,
      "max": 12
    },
    {
      "name": "Ideogram V3",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Ideogram V3 Character",
      "priceText": "15",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 15,
      "max": 15
    },
    {
      "name": "Stable Diffusion 3.5",
      "priceText": "8",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "SD 3.5",
        "SD3.5"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 8,
      "max": 8
    },
    {
      "name": "Minimax Image 01",
      "priceText": "1",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "MiniMax Image 01"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 1,
      "max": 1
    },
    {
      "name": "Bria",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Dalle 3",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "DALL-E 3",
        "DALL·E 3"
      ],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Luma Photon",
      "priceText": "2",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 2,
      "max": 2
    },
    {
      "name": "Nvidia Sana",
      "priceText": "0.2",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 0.2,
      "max": 0.2
    },
    {
      "name": "Nvidia Consistory",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12284752-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "ChatGPT Images 2.0 Edit",
      "priceText": "1-37",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "ChatGPT Image 2.0 Edit",
        "ChatGPT Images 2.0 Edit",
        "GPT Image 2 Edit",
        "GPT Images 2 Edit",
        "gpt-image-2/edit",
        "openai/gpt-image-2/edit",
        "gpt_image_2_edit",
        "gpt image 2 edit",
        "gpt image 2/gpt/image",
        "gpt-image-2/gpt/image"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "range",
      "min": 1,
      "max": 37,
      "previousPrice": {
        "kind": "dynamic",
        "min": 9,
        "max": 37,
        "note": "Предыдущий каталог отличается; его цены не считаются текущими"
      },
      "parameterRules": {
        "options": [
          {
            "credits": 9,
            "when": {
              "quality": "medium"
            }
          },
          {
            "credits": 37,
            "when": {
              "quality": "high"
            }
          }
        ],
        "source": "Предоставленный анализатор 0.20.0",
        "sourceDate": "2026-07-28",
        "verifiedCurrent": false
      }
    },
    {
      "name": "Gemini 3.1 Flash (Nano Banana 2)",
      "priceText": "4-18",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Nano Banana 2",
        "Gemini 3.1 Flash",
        "fal-ai/nano-banana-2/edit",
        "nano-banana-2/edit"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "range",
      "min": 4,
      "max": 18,
      "previousPrice": {
        "kind": "dynamic",
        "min": 6,
        "max": 13.5,
        "note": "Предыдущий каталог отличается; его цены не считаются текущими"
      },
      "parameterRules": {
        "options": [
          {
            "credits": 6,
            "when": {
              "resolution": "1k"
            }
          },
          {
            "credits": 9,
            "when": {
              "resolution": "2k"
            }
          },
          {
            "credits": 13.5,
            "when": {
              "resolution": "4k"
            }
          }
        ],
        "source": "Предоставленный анализатор 0.20.0",
        "sourceDate": "2026-07-28",
        "verifiedCurrent": false
      }
    },
    {
      "name": "Gemini 3 Pro",
      "priceText": "15-30",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Nano Banana Pro",
        "Gemini 3 (Nano Banana Pro)",
        "Gemini 3 Pro Image",
        "fal-ai/nano-banana-pro/edit",
        "nano-banana-pro/edit"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "range",
      "min": 15,
      "max": 30,
      "previousPrice": {
        "kind": "dynamic",
        "min": 11,
        "max": 23,
        "note": "Предыдущий каталог отличается; его цены не считаются текущими"
      },
      "parameterRules": {
        "options": [
          {
            "credits": 11,
            "when": {
              "resolution": "1k"
            }
          },
          {
            "credits": 11,
            "when": {
              "resolution": "2k"
            }
          },
          {
            "credits": 23,
            "when": {
              "resolution": "4k"
            }
          }
        ],
        "source": "Предоставленный анализатор 0.20.0",
        "sourceDate": "2026-07-28",
        "verifiedCurrent": false
      }
    },
    {
      "name": "Seedream V5 Edit",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedream V5",
        "Seedream V5.0 Edit",
        "Seedream 5.0 Edit"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Seedream V4.5 Edit",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Reve Edit",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Qwen Image Edit 2511",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Qwen Edit Image Plus",
      "priceText": "3",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 3,
      "max": 3
    },
    {
      "name": "Flux 2 Inpaint Klein 9B",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Runway Gen-4 Image",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Runway Gen- 4 Image"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Seedream V4 Edit",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Klux Kontext",
      "priceText": "3",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Flux Kontext"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 3,
      "max": 3
    },
    {
      "name": "Flux Kontext Multi Image",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Flux Kontext LoRA",
      "priceText": "12",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 12,
      "max": 12
    },
    {
      "name": "GPT Image 1.5 Edit",
      "priceText": "7",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "gpt-image-1.5-edit",
        "GPT Image 1.5",
        "gpt-image-1.5"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 7,
      "max": 7
    },
    {
      "name": "GPT Image 1 Edit",
      "priceText": "8",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "gpt-image-1-edit"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 8,
      "max": 8
    },
    {
      "name": "SeedEdit 3.0",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Gemini 2.0 Flash",
      "priceText": "0.1",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 0.1,
      "max": 0.1
    },
    {
      "name": "Flux 2 Max",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Flux Fill Pro",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Flux Dev LoRA Inpaint",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Ideogram V3 Inpaint",
      "priceText": "11",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 11,
      "max": 11
    },
    {
      "name": "Ideogram V2 Inpaint",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "SD3 Inpaint",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Stable Diffusion 3 Inpaint"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Bria Inpaint",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Flux Pro Outpaint",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "SD3 Outpaint",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Stable Diffusion 3 Outpaint"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "SD3 Remove Background",
      "priceText": "2",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 2,
      "max": 2
    },
    {
      "name": "Bria Remove Background",
      "priceText": "0.6",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 0.6,
      "max": 0.6
    },
    {
      "name": "SD3 Content-Aware Fill",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Kolors Virtual Try On",
      "priceText": "8",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 8,
      "max": 8
    },
    {
      "name": "Replace Background",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Bria Content Aware-Fill",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Bria Content-Aware Fill"
      ],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Bria Replace Background",
      "priceText": "2",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 2,
      "max": 2
    },
    {
      "name": "Relight 2.0",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343904-edit-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "image-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Seedance 2.0",
      "priceText": "Fast - 4s 116 / 15s 443 Standard - 4s 145 / 15s 552 1080p prices are different",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 116,
          "when": {
            "mode": "fast",
            "duration": 4
          }
        },
        {
          "credits": 443,
          "when": {
            "mode": "fast",
            "duration": 15
          }
        },
        {
          "credits": 145,
          "when": {
            "mode": "standard",
            "duration": 4
          }
        },
        {
          "credits": 552,
          "when": {
            "mode": "standard",
            "duration": 15
          }
        }
      ],
      "min": 116,
      "max": 552,
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ]
    },
    {
      "name": "Seedance 2.0 Reference",
      "priceText": "Fast - 4s 116 / 15s 443 Standard - 4s 145 / 15s 552 1080p prices are different",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 116,
          "when": {
            "mode": "fast",
            "duration": 4
          }
        },
        {
          "credits": 443,
          "when": {
            "mode": "fast",
            "duration": 15
          }
        },
        {
          "credits": 145,
          "when": {
            "mode": "standard",
            "duration": 4
          }
        },
        {
          "credits": 552,
          "when": {
            "mode": "standard",
            "duration": 15
          }
        }
      ],
      "min": 116,
      "max": 552,
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ]
    },
    {
      "name": "Kling 3",
      "priceText": "Pro - 3s 80 / 15s 440 Standard - 3s 60 / 15s 300",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 80,
          "when": {
            "mode": "pro",
            "duration": 3
          }
        },
        {
          "credits": 440,
          "when": {
            "mode": "pro",
            "duration": 15
          }
        },
        {
          "credits": 60,
          "when": {
            "mode": "standard",
            "duration": 3
          }
        },
        {
          "credits": 300,
          "when": {
            "mode": "standard",
            "duration": 15
          }
        }
      ],
      "min": 60,
      "max": 440
    },
    {
      "name": "Seedance V1.5 Pro",
      "priceText": "25-74",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "range",
      "min": 25,
      "max": 74
    },
    {
      "name": "Wan 2.5",
      "priceText": "55",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 55,
      "max": 55
    },
    {
      "name": "Grok Imagine Video",
      "priceText": "36-90",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "range",
      "min": 36,
      "max": 90
    },
    {
      "name": "Sora 2",
      "priceText": "Normal - 96 Pro - 288",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 96,
          "when": {
            "mode": "normal"
          }
        },
        {
          "credits": 288,
          "when": {
            "mode": "pro"
          }
        }
      ],
      "min": 96,
      "max": 288
    },
    {
      "name": "Wan 2.2",
      "priceText": "66",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 66,
      "max": 66
    },
    {
      "name": "LTX 2 Video",
      "priceText": "Fast 6s- 50 Fast 8s- 100 Fast 10s- 200 Pro 6s- 70 Pro 8s- 140 Pro 10s- 280",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 50,
          "when": {
            "mode": "fast",
            "duration": 6
          }
        },
        {
          "credits": 100,
          "when": {
            "mode": "fast",
            "duration": 8
          }
        },
        {
          "credits": 200,
          "when": {
            "mode": "fast",
            "duration": 10
          }
        },
        {
          "credits": 70,
          "when": {
            "mode": "pro",
            "duration": 6
          }
        },
        {
          "credits": 140,
          "when": {
            "mode": "pro",
            "duration": 8
          }
        },
        {
          "credits": 280,
          "when": {
            "mode": "pro",
            "duration": 10
          }
        }
      ],
      "min": 50,
      "max": 280
    },
    {
      "name": "Moonvalley",
      "priceText": "5s -165 10s - 330",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 165,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 330,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 165,
      "max": 330
    },
    {
      "name": "Veo 3.1 Text to Image",
      "priceText": "Fast - 120 Standard - 320",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3.1 Text to Video"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 320,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 120,
      "max": 320
    },
    {
      "name": "Veo 3.1 Image to Video",
      "priceText": "Fast - 120 Standard - 320",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 320,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 120,
      "max": 320
    },
    {
      "name": "Veo 3 Text to Image",
      "priceText": "Fast - 120 Standard - 320",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3 Text to Video"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 320,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 120,
      "max": 320
    },
    {
      "name": "Veo 3 Image to Video",
      "priceText": "Fast - 120 Standard - 320",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 320,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 120,
      "max": 320
    },
    {
      "name": "Veo 2",
      "priceText": "5s - 300 8s - 400",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 300,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 400,
          "when": {
            "duration": 8
          }
        }
      ],
      "min": 300,
      "max": 400
    },
    {
      "name": "Seedance V1.0",
      "priceText": "Lite 5s - 18 Lite 10s - 36 Pro 5s - 88 Pro 10s - 176",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedance 1.0"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "mode": "lite",
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "mode": "lite",
            "duration": 10
          }
        },
        {
          "credits": 88,
          "when": {
            "mode": "pro",
            "duration": 5
          }
        },
        {
          "credits": 176,
          "when": {
            "mode": "pro",
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 176
    },
    {
      "name": "Pixverse V4.5",
      "priceText": "5s - 60 10s - 90",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "PixVerse V4.5"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 60,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 90,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 60,
      "max": 90
    },
    {
      "name": "Runway Gen-4.5",
      "priceText": "5s - 70 8s - 112 10s - 140",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 70,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 112,
          "when": {
            "duration": 8
          }
        },
        {
          "credits": 140,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 70,
      "max": 140
    },
    {
      "name": "Runway Gen-4 Turbo",
      "priceText": "5s - 30 10s - 60",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Runway Gen-4Turbo"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 30,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 60,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 30,
      "max": 60
    },
    {
      "name": "Runway Gen-4",
      "priceText": "2s - 28 4s - 56 5s - 70 6s - 84 7s - 98 8s - 112 9s - 126 10s -140",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 28,
          "when": {
            "duration": 2
          }
        },
        {
          "credits": 56,
          "when": {
            "duration": 4
          }
        },
        {
          "credits": 70,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 84,
          "when": {
            "duration": 6
          }
        },
        {
          "credits": 98,
          "when": {
            "duration": 7
          }
        },
        {
          "credits": 112,
          "when": {
            "duration": 8
          }
        },
        {
          "credits": 126,
          "when": {
            "duration": 9
          }
        },
        {
          "credits": 140,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 28,
      "max": 140
    },
    {
      "name": "Runway Gen-3",
      "priceText": "5s - 30 10s - 60",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 30,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 60,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 30,
      "max": 60
    },
    {
      "name": "Kling 1.6",
      "priceText": "Standard 5s - 18 Standard 10s - 36 Pro 5s - 37.5 Pro 10s - 75",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "mode": "standard",
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "mode": "standard",
            "duration": 10
          }
        },
        {
          "credits": 37.5,
          "when": {
            "mode": "pro",
            "duration": 5
          }
        },
        {
          "credits": 75,
          "when": {
            "mode": "pro",
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 75
    },
    {
      "name": "Kling Video",
      "priceText": "2.1 Standard 5s- 25 2.1 Standard 10s- 50 2.1 Pro 5s - 45 2.1 Pro 10s - 90 2.1 Master 5s - 90 2.1 Master 10s - 280 2.5 Turbo Pro 5s - 35 2.5 Turbo Pro 10s - 70 2.6 Pro 5s - 120 2.6 Pro 5s - 180",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 25,
          "when": {
            "text": "2.1 standard",
            "duration": 5
          }
        },
        {
          "credits": 50,
          "when": {
            "text": "2.1 standard",
            "duration": 10
          }
        },
        {
          "credits": 45,
          "when": {
            "text": "2.1 pro",
            "duration": 5
          }
        },
        {
          "credits": 90,
          "when": {
            "text": "2.1 pro",
            "duration": 10
          }
        },
        {
          "credits": 90,
          "when": {
            "text": "2.1 master",
            "duration": 5
          }
        },
        {
          "credits": 280,
          "when": {
            "text": "2.1 master",
            "duration": 10
          }
        },
        {
          "credits": 35,
          "when": {
            "text": "2.5 turbo pro",
            "duration": 5
          }
        },
        {
          "credits": 70,
          "when": {
            "text": "2.5 turbo pro",
            "duration": 10
          }
        },
        {
          "credits": 120,
          "when": {
            "text": "2.6 pro",
            "duration": 5
          }
        },
        {
          "credits": 180,
          "when": {
            "text": "2.6 pro",
            "duration": 5
          }
        }
      ],
      "min": 25,
      "max": 280
    },
    {
      "name": "Kling O1 First & Last Frame",
      "priceText": "5s - 56 10s - 112",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 56,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 112,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 56,
      "max": 112
    },
    {
      "name": "Kling 2.5 First & Last Frame",
      "priceText": "5s - 35 10s - 70",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 35,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 70,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 35,
      "max": 70
    },
    {
      "name": "Kling 2.1 First & Last Frame",
      "priceText": "5s - 45 10s - 90",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 45,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 90,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 45,
      "max": 90
    },
    {
      "name": "Luma Ray 2",
      "priceText": "5s - 108 9s - 194",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 108,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 194,
          "when": {
            "duration": 9
          }
        }
      ],
      "min": 108,
      "max": 194
    },
    {
      "name": "Luma Ray 2 Flash",
      "priceText": "5s - 36 9s - 65",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 36,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 65,
          "when": {
            "duration": 9
          }
        }
      ],
      "min": 36,
      "max": 65
    },
    {
      "name": "Minimax Video Director",
      "priceText": "60",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "MiniMax Video Director"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 60,
      "max": 60
    },
    {
      "name": "Minimax Video 01",
      "priceText": "60",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "MiniMax Video 01"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 60,
      "max": 60
    },
    {
      "name": "Hunyuan",
      "priceText": "60",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 60,
      "max": 60
    },
    {
      "name": "Skyreels",
      "priceText": "36",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "SkyReels"
      ],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 36,
      "max": 36
    },
    {
      "name": "Wan Video",
      "priceText": "24",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 24,
      "max": 24
    },
    {
      "name": "Higgsfield Video",
      "priceText": "Lite - 14 Turbo - 45 Preview - 62",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 14,
          "when": {
            "mode": "lite"
          }
        },
        {
          "credits": 45,
          "when": {
            "mode": "turbo"
          }
        },
        {
          "credits": 62,
          "when": {
            "mode": "preview"
          }
        }
      ],
      "min": 14,
      "max": 62
    },
    {
      "name": "Kling O1 Edit Video",
      "priceText": "147",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 147,
      "max": 147
    },
    {
      "name": "Kling O1 Reference Video to Video",
      "priceText": "5s -92 10s - 184",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 92,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 184,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 92,
      "max": 184
    },
    {
      "name": "Kling O3 Edit Video",
      "priceText": "Pro - 300 Standard - 400",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 300,
          "when": {
            "mode": "pro"
          }
        },
        {
          "credits": 400,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 300,
      "max": 400
    },
    {
      "name": "Kling Motion Control",
      "priceText": "Pro - 80 Standard - 50",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 80,
          "when": {
            "mode": "pro"
          }
        },
        {
          "credits": 50,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 50,
      "max": 80
    },
    {
      "name": "LTX 2 Video to Video",
      "priceText": "30",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 30,
      "max": 30
    },
    {
      "name": "Runway Aleph",
      "priceText": "66",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 66,
      "max": 66
    },
    {
      "name": "Runway Act-Two",
      "priceText": "5s -165 10s - 330",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Runway Act Two"
      ],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 165,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 330,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 165,
      "max": 330
    },
    {
      "name": "Luma Reframe",
      "priceText": "Fast - 320 Standard - 600",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 600,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 320,
      "max": 600
    },
    {
      "name": "Luma Modify",
      "priceText": "Fast - 320 Standard - 600",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {
            "mode": "fast"
          }
        },
        {
          "credits": 600,
          "when": {
            "mode": "standard"
          }
        }
      ],
      "min": 320,
      "max": 600
    },
    {
      "name": "Wan 2.2 Animate - Replace",
      "priceText": "480p - 48 580p- 72 720p - 100",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 48,
          "when": {
            "resolution": "480"
          }
        },
        {
          "credits": 72,
          "when": {
            "resolution": "580"
          }
        },
        {
          "credits": 100,
          "when": {
            "resolution": "720"
          }
        }
      ],
      "min": 48,
      "max": 100
    },
    {
      "name": "Wan 2.2 Animate - Move",
      "priceText": "480p - 48 580p- 72 720p - 100",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 48,
          "when": {
            "resolution": "480"
          }
        },
        {
          "credits": 72,
          "when": {
            "resolution": "580"
          }
        },
        {
          "credits": 100,
          "when": {
            "resolution": "720"
          }
        }
      ],
      "min": 48,
      "max": 100
    },
    {
      "name": "Wan Vace Depth",
      "priceText": "5s - 300 8s - 400",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Depth"
      ],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 300,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 400,
          "when": {
            "duration": 8
          }
        }
      ],
      "min": 300,
      "max": 400
    },
    {
      "name": "Wan Vace Pose",
      "priceText": "Lite 5s - 18 Lite 10s - 36 Pro 5s - 88 Pro 10s - 176",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Pose"
      ],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "mode": "lite",
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "mode": "lite",
            "duration": 10
          }
        },
        {
          "credits": 88,
          "when": {
            "mode": "pro",
            "duration": 5
          }
        },
        {
          "credits": 176,
          "when": {
            "mode": "pro",
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 176
    },
    {
      "name": "Wan Vace Reframe",
      "priceText": "5s - 60 10s - 90",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Reframe"
      ],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "dynamic",
      "options": [
        {
          "credits": 60,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 90,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 60,
      "max": 90
    },
    {
      "name": "Wan Vace Outpainting",
      "priceText": "120",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Outpainting"
      ],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 120,
      "max": 120
    },
    {
      "name": "Hunyuan Video to Video",
      "priceText": "60",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 60,
      "max": 60
    },
    {
      "name": "Flux Dev Redux",
      "priceText": "3",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 3,
      "max": 3
    },
    {
      "name": "Flux ControlNet & LoRA",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Flux ControlNet LoRA"
      ],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Flux Canny Pro",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Flux Depth Pro",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Qwen Edit Multiangle",
      "priceText": "4",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Qwen Multiangle"
      ],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 4,
      "max": 4
    },
    {
      "name": "Image to Image",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "image-to-image"
      ],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Stable Diffusion controlnets",
      "priceText": "1",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Stable Diffusion ControlNet"
      ],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 1,
      "max": 1
    },
    {
      "name": "Sketch To Image",
      "priceText": "0.1",
      "source": "https://help.weavy.ai/en/articles/12344174-generate-from-image-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Sketch-to-Image"
      ],
      "category": "image-to-image",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 0.1,
      "max": 0.1
    },
    {
      "name": "Bria Video Upscale",
      "priceText": "154",
      "source": "https://help.weavy.ai/en/articles/12344342-enhance-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-15",
      "aliases": [],
      "category": "enhance-video-",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 154,
      "max": 154
    },
    {
      "name": "Topaz Video Upscaler",
      "priceText": "12",
      "source": "https://help.weavy.ai/en/articles/12344342-enhance-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-15",
      "aliases": [],
      "category": "enhance-video-",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 12,
      "max": 12
    },
    {
      "name": "Real-ESRGAN Video Upscaler",
      "priceText": "71",
      "source": "https://help.weavy.ai/en/articles/12344342-enhance-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-15",
      "aliases": [],
      "category": "enhance-video-",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 71,
      "max": 71
    },
    {
      "name": "Video Smoother",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12344342-enhance-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-15",
      "aliases": [],
      "category": "enhance-video-",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Topaz Upscale",
      "priceText": "19",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 19,
      "max": 19
    },
    {
      "name": "Topaz Sharpen",
      "priceText": "19",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 19,
      "max": 19
    },
    {
      "name": "Recraft Crisp Upscale",
      "priceText": "5",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 5,
      "max": 5
    },
    {
      "name": "Magnific Skin Enhancer",
      "priceText": "18",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 18,
      "max": 18
    },
    {
      "name": "Magnific Upscale",
      "priceText": "12",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 12,
      "max": 12
    },
    {
      "name": "Magnific Precision Upscale",
      "priceText": "18",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 18,
      "max": 18
    },
    {
      "name": "Magnific Precision Upscale V2",
      "priceText": "18",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 18,
      "max": 18
    },
    {
      "name": "Enhancor Image Upscale",
      "priceText": "36",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Enhancer Image Upscale"
      ],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 36,
      "max": 36
    },
    {
      "name": "Enhancor Realistic Skin",
      "priceText": "36",
      "source": "https://help.weavy.ai/en/articles/12344205-enhance-images-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Enhancer Realistic Skin"
      ],
      "category": "enhance",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 36,
      "max": 36
    },
    {
      "name": "Omnihuman V1.5",
      "priceText": "352",
      "source": "https://help.weavy.ai/en/articles/12441548-lip-sync-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "OmniHuman V1.5"
      ],
      "category": "lip-sync",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 352,
      "max": 352
    },
    {
      "name": "Sync 2 Pro",
      "priceText": "184",
      "source": "https://help.weavy.ai/en/articles/12441548-lip-sync-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "lip-sync",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 184,
      "max": 184
    },
    {
      "name": "Pixverse Lipsync",
      "priceText": "66",
      "source": "https://help.weavy.ai/en/articles/12441548-lip-sync-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "PixVerse Lip Sync"
      ],
      "category": "lip-sync",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 66,
      "max": 66
    },
    {
      "name": "Kling AI Avatar Pro",
      "priceText": "253",
      "source": "https://help.weavy.ai/en/articles/12441548-lip-sync-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "lip-sync",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 253,
      "max": 253
    },
    {
      "name": "Sam 3D Objects",
      "priceText": "3",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "SAM 3D Objects"
      ],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 3,
      "max": 3
    },
    {
      "name": "Rodin",
      "priceText": "48",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 48,
      "max": 48
    },
    {
      "name": "Rodin V2",
      "priceText": "36",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 36,
      "max": 36
    },
    {
      "name": "Trellis 3D V2",
      "priceText": "30",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 30,
      "max": 30
    },
    {
      "name": "Meshy V6",
      "priceText": "96",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 96,
      "max": 96
    },
    {
      "name": "Hunyuan 3D V3",
      "priceText": "80",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 80,
      "max": 80
    },
    {
      "name": "Hunyuan 3D",
      "priceText": "18",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 18,
      "max": 18
    },
    {
      "name": "Hunyuan 3D V2.1",
      "priceText": "25",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 25,
      "max": 25
    },
    {
      "name": "Trellis",
      "priceText": "2",
      "source": "https://help.weavy.ai/en/articles/12344357-3d-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "3d",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 2,
      "max": 2
    },
    {
      "name": "Vectorizer",
      "priceText": "24",
      "source": "https://help.weavy.ai/en/articles/12343888-vector-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "vector",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 24,
      "max": 24
    },
    {
      "name": "Recraft V3 SVG",
      "priceText": "10",
      "source": "https://help.weavy.ai/en/articles/12343888-vector-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "vector",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 10,
      "max": 10
    },
    {
      "name": "Text To Vector",
      "priceText": "6",
      "source": "https://help.weavy.ai/en/articles/12343888-vector-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Text-to-Vector"
      ],
      "category": "vector",
      "provenance": "official-help",
      "kind": "fixed",
      "min": 6,
      "max": 6
    },
    {
      "name": "Beeble SwitchX",
      "aliases": [
        "Beeble SwitchX",
        "Beeble Switch X",
        "beeble_switchx",
        "beeble-switchx",
        "beeble/switchx",
        "switchx"
      ],
      "category": "video-edit",
      "kind": "formula",
      "formulas": [
        {
          "perSecond": 60,
          "secondsRounding": "ceil",
          "when": {
            "resolution": "1080"
          }
        }
      ],
      "min": null,
      "max": null,
      "parameterLabel": "разрешение и длительность",
      "missingParameterReason": "Для SwitchX нужны сохранённые разрешение и длительность. Для неизвестной комбинации расширение не переносит цену с текущих настроек на старый запуск.",
      "provenance": "reference-only",
      "source": "Предоставленный каталог 0.20.0",
      "publishedAt": "2026-07-28",
      "checkedAt": null,
      "priceText": "Формула из предыдущего каталога"
    },
    {
      "name": "Kling 2.1 Standard",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-10-23",
      "publishedAt": "2026-04-26",
      "derivedFrom": "Kling Video",
      "modelVariant": "2.1 standard",
      "kind": "dynamic",
      "options": [
        {
          "credits": 25,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 50,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 25,
      "max": 50,
      "priceText": "5s — 25 / 10s — 50"
    },
    {
      "name": "Kling 2.1 Pro",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-10-23",
      "publishedAt": "2026-04-26",
      "derivedFrom": "Kling Video",
      "modelVariant": "2.1 pro",
      "kind": "dynamic",
      "options": [
        {
          "credits": 45,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 90,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 45,
      "max": 90,
      "priceText": "5s — 45 / 10s — 90"
    },
    {
      "name": "Kling 2.1 Master",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-10-23",
      "publishedAt": "2026-04-26",
      "derivedFrom": "Kling Video",
      "modelVariant": "2.1 master",
      "kind": "dynamic",
      "options": [
        {
          "credits": 90,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 280,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 90,
      "max": 280,
      "priceText": "5s — 90 / 10s — 280"
    },
    {
      "name": "Kling 2.5 Turbo Pro",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-10-23",
      "publishedAt": "2026-04-26",
      "derivedFrom": "Kling Video",
      "modelVariant": "2.5 turbo pro",
      "kind": "dynamic",
      "options": [
        {
          "credits": 35,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 70,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 35,
      "max": 70,
      "priceText": "5s — 35 / 10s — 70"
    },
    {
      "name": "Kling 2.6 Pro",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-10-23",
      "publishedAt": "2026-04-26",
      "derivedFrom": "Kling Video",
      "modelVariant": "2.6 pro",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 180,
          "when": {
            "duration": 5
          }
        }
      ],
      "min": 120,
      "max": 180,
      "priceText": "5s — 120 / 5s — 180",
      "pricedDurations": [
        5
      ],
      "pricingWarning": "В источнике две разные цены для Kling 2.6 Pro за 5 секунд; точный тариф не подтверждён"
    },
    {
      "name": "Seedance 2.0 Fast",
      "priceText": "Fast · 116 / 443; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 116,
          "when": {
            "duration": 4
          }
        },
        {
          "credits": 443,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 116,
      "max": 443,
      "parameterLabel": "Параметры варианта Fast",
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ],
      "derivedFrom": "Seedance 2.0",
      "modelMode": "fast"
    },
    {
      "name": "Seedance 2.0 Standard",
      "priceText": "Standard · 145 / 552; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 145,
          "when": {
            "duration": 4
          }
        },
        {
          "credits": 552,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 145,
      "max": 552,
      "parameterLabel": "Параметры варианта Standard",
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ],
      "derivedFrom": "Seedance 2.0",
      "modelMode": "standard"
    },
    {
      "name": "Seedance 2.0 Reference Fast",
      "priceText": "Fast · 116 / 443; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedance 2.0 Fast Reference"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 116,
          "when": {
            "duration": 4
          }
        },
        {
          "credits": 443,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 116,
      "max": 443,
      "parameterLabel": "Параметры варианта Fast",
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ],
      "derivedFrom": "Seedance 2.0 Reference",
      "modelMode": "fast"
    },
    {
      "name": "Seedance 2.0 Reference Standard",
      "priceText": "Standard · 145 / 552; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedance 2.0 Standard Reference"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 145,
          "when": {
            "duration": 4
          }
        },
        {
          "credits": 552,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 145,
      "max": 552,
      "parameterLabel": "Параметры варианта Standard",
      "unsupportedResolutions": [
        "1080",
        "1080p"
      ],
      "derivedFrom": "Seedance 2.0 Reference",
      "modelMode": "standard"
    },
    {
      "name": "Kling 3 Pro",
      "priceText": "Pro · 80 / 440; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 80,
          "when": {
            "duration": 3
          }
        },
        {
          "credits": 440,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 80,
      "max": 440,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Kling 3",
      "modelMode": "pro"
    },
    {
      "name": "Kling 3 Standard",
      "priceText": "Standard · 60 / 300; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 60,
          "when": {
            "duration": 3
          }
        },
        {
          "credits": 300,
          "when": {
            "duration": 15
          }
        }
      ],
      "min": 60,
      "max": 300,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Kling 3",
      "modelMode": "standard"
    },
    {
      "name": "Sora 2 Normal",
      "priceText": "Normal · 96; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 96,
          "when": {}
        }
      ],
      "min": 96,
      "max": 96,
      "parameterLabel": "Параметры варианта Normal",
      "derivedFrom": "Sora 2",
      "modelMode": "normal"
    },
    {
      "name": "Sora 2 Pro",
      "priceText": "Pro · 288; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 288,
          "when": {}
        }
      ],
      "min": 288,
      "max": 288,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Sora 2",
      "modelMode": "pro"
    },
    {
      "name": "LTX 2 Video Fast",
      "priceText": "Fast · 50 / 100 / 200; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "LTX 2 Fast Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 50,
          "when": {
            "duration": 6
          }
        },
        {
          "credits": 100,
          "when": {
            "duration": 8
          }
        },
        {
          "credits": 200,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 50,
      "max": 200,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "LTX 2 Video",
      "modelMode": "fast"
    },
    {
      "name": "LTX 2 Video Pro",
      "priceText": "Pro · 70 / 140 / 280; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "LTX 2 Pro Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 70,
          "when": {
            "duration": 6
          }
        },
        {
          "credits": 140,
          "when": {
            "duration": 8
          }
        },
        {
          "credits": 280,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 70,
      "max": 280,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "LTX 2 Video",
      "modelMode": "pro"
    },
    {
      "name": "Veo 3.1 Text to Image Fast",
      "priceText": "Fast · 120; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3.1 Fast Text to Image",
        "Veo 3.1 Text to Video Fast",
        "Veo 3.1 Fast Text to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {}
        }
      ],
      "min": 120,
      "max": 120,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Veo 3.1 Text to Image",
      "modelMode": "fast"
    },
    {
      "name": "Veo 3.1 Text to Image Standard",
      "priceText": "Standard · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3.1 Standard Text to Image",
        "Veo 3.1 Text to Video Standard",
        "Veo 3.1 Standard Text to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Veo 3.1 Text to Image",
      "modelMode": "standard"
    },
    {
      "name": "Veo 3.1 Image to Video Fast",
      "priceText": "Fast · 120; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3.1 Fast Image to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {}
        }
      ],
      "min": 120,
      "max": 120,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Veo 3.1 Image to Video",
      "modelMode": "fast"
    },
    {
      "name": "Veo 3.1 Image to Video Standard",
      "priceText": "Standard · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3.1 Standard Image to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Veo 3.1 Image to Video",
      "modelMode": "standard"
    },
    {
      "name": "Veo 3 Text to Image Fast",
      "priceText": "Fast · 120; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3 Fast Text to Image",
        "Veo 3 Text to Video Fast",
        "Veo 3 Fast Text to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {}
        }
      ],
      "min": 120,
      "max": 120,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Veo 3 Text to Image",
      "modelMode": "fast"
    },
    {
      "name": "Veo 3 Text to Image Standard",
      "priceText": "Standard · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3 Standard Text to Image",
        "Veo 3 Text to Video Standard",
        "Veo 3 Standard Text to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Veo 3 Text to Image",
      "modelMode": "standard"
    },
    {
      "name": "Veo 3 Image to Video Fast",
      "priceText": "Fast · 120; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3 Fast Image to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 120,
          "when": {}
        }
      ],
      "min": 120,
      "max": 120,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Veo 3 Image to Video",
      "modelMode": "fast"
    },
    {
      "name": "Veo 3 Image to Video Standard",
      "priceText": "Standard · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Veo 3 Standard Image to Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Veo 3 Image to Video",
      "modelMode": "standard"
    },
    {
      "name": "Seedance V1.0 Lite",
      "priceText": "Lite · 18 / 36; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedance 1.0 Lite"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 36,
      "parameterLabel": "Параметры варианта Lite",
      "derivedFrom": "Seedance V1.0",
      "modelMode": "lite"
    },
    {
      "name": "Seedance V1.0 Pro",
      "priceText": "Pro · 88 / 176; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Seedance 1.0 Pro"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 88,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 176,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 88,
      "max": 176,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Seedance V1.0",
      "modelMode": "pro"
    },
    {
      "name": "Kling 1.6 Standard",
      "priceText": "Standard · 18 / 36; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 36,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Kling 1.6",
      "modelMode": "standard"
    },
    {
      "name": "Kling 1.6 Pro",
      "priceText": "Pro · 37.5 / 75; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 37.5,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 75,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 37.5,
      "max": 75,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Kling 1.6",
      "modelMode": "pro"
    },
    {
      "name": "Higgsfield Video Lite",
      "priceText": "Lite · 14; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Higgsfield Lite Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 14,
          "when": {}
        }
      ],
      "min": 14,
      "max": 14,
      "parameterLabel": "Параметры варианта Lite",
      "derivedFrom": "Higgsfield Video",
      "modelMode": "lite"
    },
    {
      "name": "Higgsfield Video Turbo",
      "priceText": "Turbo · 45; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Higgsfield Turbo Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 45,
          "when": {}
        }
      ],
      "min": 45,
      "max": 45,
      "parameterLabel": "Параметры варианта Turbo",
      "derivedFrom": "Higgsfield Video",
      "modelMode": "turbo"
    },
    {
      "name": "Higgsfield Video Preview",
      "priceText": "Preview · 62; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344226-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-04-26",
      "aliases": [
        "Higgsfield Preview Video"
      ],
      "category": "video",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 62,
          "when": {}
        }
      ],
      "min": 62,
      "max": 62,
      "parameterLabel": "Параметры варианта Preview",
      "derivedFrom": "Higgsfield Video",
      "modelMode": "preview"
    },
    {
      "name": "Kling O3 Edit Video Pro",
      "priceText": "Pro · 300; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Kling O3 Pro Edit Video"
      ],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 300,
          "when": {}
        }
      ],
      "min": 300,
      "max": 300,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Kling O3 Edit Video",
      "modelMode": "pro"
    },
    {
      "name": "Kling O3 Edit Video Standard",
      "priceText": "Standard · 400; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Kling O3 Standard Edit Video"
      ],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 400,
          "when": {}
        }
      ],
      "min": 400,
      "max": 400,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Kling O3 Edit Video",
      "modelMode": "standard"
    },
    {
      "name": "Kling Motion Control Pro",
      "priceText": "Pro · 80; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 80,
          "when": {}
        }
      ],
      "min": 80,
      "max": 80,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Kling Motion Control",
      "modelMode": "pro"
    },
    {
      "name": "Kling Motion Control Standard",
      "priceText": "Standard · 50; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 50,
          "when": {}
        }
      ],
      "min": 50,
      "max": 50,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Kling Motion Control",
      "modelMode": "standard"
    },
    {
      "name": "Luma Reframe Fast",
      "priceText": "Fast · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Luma Reframe",
      "modelMode": "fast"
    },
    {
      "name": "Luma Reframe Standard",
      "priceText": "Standard · 600; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 600,
          "when": {}
        }
      ],
      "min": 600,
      "max": 600,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Luma Reframe",
      "modelMode": "standard"
    },
    {
      "name": "Luma Modify Fast",
      "priceText": "Fast · 320; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 320,
          "when": {}
        }
      ],
      "min": 320,
      "max": 320,
      "parameterLabel": "Параметры варианта Fast",
      "derivedFrom": "Luma Modify",
      "modelMode": "fast"
    },
    {
      "name": "Luma Modify Standard",
      "priceText": "Standard · 600; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 600,
          "when": {}
        }
      ],
      "min": 600,
      "max": 600,
      "parameterLabel": "Параметры варианта Standard",
      "derivedFrom": "Luma Modify",
      "modelMode": "standard"
    },
    {
      "name": "Wan Vace Pose Lite",
      "priceText": "Lite · 18 / 36; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Pose Lite"
      ],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 18,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 36,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 18,
      "max": 36,
      "parameterLabel": "Параметры варианта Lite",
      "derivedFrom": "Wan Vace Pose",
      "modelMode": "lite"
    },
    {
      "name": "Wan Vace Pose Pro",
      "priceText": "Pro · 88 / 176; остальные условия из исходной таблицы",
      "source": "https://help.weavy.ai/en/articles/12344285-generate-from-video-models-comparison",
      "checkedAt": "2026-09-22",
      "publishedAt": "2026-03-29",
      "aliases": [
        "Wan VACE Pose Pro"
      ],
      "category": "video-edit",
      "provenance": "official-help-variant",
      "kind": "dynamic",
      "options": [
        {
          "credits": 88,
          "when": {
            "duration": 5
          }
        },
        {
          "credits": 176,
          "when": {
            "duration": 10
          }
        }
      ],
      "min": 88,
      "max": 176,
      "parameterLabel": "Параметры варианта Pro",
      "derivedFrom": "Wan Vace Pose",
      "modelMode": "pro"
    }
  ]
};

# Overview

CanvasAI is an infinite whiteboard that turns rough UI sketches into working HTML/Tailwind CSS components.

## Core features
1. **Infinite canvas** – draw shapes, text and freehand sketches ([tldraw](https://tldraw.dev)).
2. **Magic generation** – select a sketch and click Generate; the selection is captured as an image.
3. **AI processing** – the image is sent to a vision model that returns HTML/Tailwind.
4. **Live rendering** – the result appears on the canvas as a draggable, resizable shape and builds up as tokens stream in.

## Stack
- **Frontend:** Vite, React, TypeScript, Tailwind CSS v4
- **Canvas:** tldraw (custom `html-component` shape)
- **AI provider:** Groq (planned default, fast cloud inference) and Ollama (local, currently implemented). See [decisions.md](decisions.md).

## Privacy note
With Ollama, sketches never leave the machine. With a cloud provider (Groq), the exported sketch image is sent to that provider. The UI must say so when a cloud provider is selected.

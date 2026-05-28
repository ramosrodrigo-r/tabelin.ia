"use client";

import type { OcrResponse, UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

import { ToolNav } from "@/components/app/tool-nav";

import { useImageUpload } from "./hooks/use-image-upload";
import { ImageUploadPanel } from "./components/image-upload-panel";
import { OcrResultPanel } from "./components/ocr-result-panel";

type UiState = "idle" | "processing" | "complete" | "error";

type Props = {
  entitlement: UserEntitlement;
};

export function OcrTool({ entitlement: _entitlement }: Props) {
  const [uiState, setUiState] = useState<UiState>("idle");
  const [result, setResult] = useState<OcrResponse | null>(null);

  const imageUploadHook = useImageUpload();

  function handleUpload(file: File) {
    setUiState("processing");
    // State transitions are driven by hook state changes detected in the
    // render-time derived checks below — post-await reads would see stale closure values.
    void imageUploadHook.upload(file);
  }

  // React to hook state changes
  if (imageUploadHook.status === "complete" && imageUploadHook.result && uiState !== "complete") {
    setResult(imageUploadHook.result);
    setUiState("complete");
  }

  if (imageUploadHook.status === "error" && uiState === "processing") {
    setUiState("error");
  }

  function handleNewImage() {
    imageUploadHook.reset();
    setResult(null);
    setUiState("idle");
  }

  return (
    <div className="tool-stack" aria-label="OCR workspace">
      {uiState === "idle" || uiState === "error" ? (
        <ImageUploadPanel
          error={imageUploadHook.error}
          onUpload={handleUpload}
          processing={imageUploadHook.status === "processing"}
          quotaBlocked={imageUploadHook.quotaBlocked}
        />
      ) : null}

      {uiState === "complete" && result ? (
        <OcrResultPanel
          onNewImage={handleNewImage}
          result={result}
        />
      ) : null}

      <ToolNav />
    </div>
  );
}

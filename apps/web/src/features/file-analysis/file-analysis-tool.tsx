"use client";

import type { FileSchema, UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

import { ToolNav } from "@/components/app/tool-nav";

import { useFileUpload } from "./hooks/use-file-upload";
import { ChatPanel } from "./components/chat-panel";
import { FileUploadPanel } from "./components/file-upload-panel";
import { SheetSelector } from "./components/sheet-selector";

type UiState = "idle" | "sheet_selection" | "chat";

type Props = {
  entitlement: UserEntitlement;
};

export function FileAnalysisTool({ entitlement: _entitlement }: Props) {
  const [uiState, setUiState] = useState<UiState>("idle");
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [schema, setSchema] = useState<FileSchema | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const uploadHook = useFileUpload();

  function handleUpload(file: File, sheetName?: string) {
    void (async () => {
      await uploadHook.upload(file, sheetName ?? undefined);
    })();
  }

  // React to upload hook state changes
  const currentStatus = uploadHook.status;

  if (currentStatus === "complete" && uploadHook.uploadedFileId && uploadHook.schema) {
    if (uiState !== "chat") {
      setUploadedFileId(uploadHook.uploadedFileId);
      setSchema(uploadHook.schema);
      setUiState("chat");
    }
  }

  if (currentStatus === "sheet_selection" && uploadHook.sheetNames.length > 0) {
    if (uiState !== "sheet_selection") {
      setUiState("sheet_selection");
    }
  }

  function handleSheetSelect(sheet: string) {
    setSelectedSheet(sheet);
  }

  function handleSheetConfirm() {
    if (selectedSheet && uploadHook.status === "sheet_selection") {
      // Re-upload with selected sheet name
      // We need the pending file — handled via upload hook's selectSheet
      uploadHook.selectSheet(selectedSheet);
    }
  }

  function handleNewFile() {
    uploadHook.reset();
    setUiState("idle");
    setUploadedFileId(null);
    setSchema(null);
    setSelectedSheet(null);
  }

  return (
    <div className="tool-stack" aria-label="File analysis workspace">
      {uiState === "idle" ? (
        <FileUploadPanel
          activeFile={false}
          error={uploadHook.error}
          onUpload={handleUpload}
          uploading={uploadHook.status === "uploading"}
        />
      ) : null}

      {uiState === "sheet_selection" ? (
        <SheetSelector
          onConfirm={handleSheetConfirm}
          onSelect={handleSheetSelect}
          sheetNames={uploadHook.sheetNames}
        />
      ) : null}

      {uiState === "chat" && uploadedFileId && schema ? (
        <ChatPanel
          onNewFile={handleNewFile}
          schema={schema}
          uploadedFileId={uploadedFileId}
        />
      ) : null}

      <ToolNav />
    </div>
  );
}

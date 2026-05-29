"use client";

import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface ChatInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  pending?: boolean;
  disabled?: boolean;
  submitLabel: string;
  options?: React.ReactNode;
  leftAction?: React.ReactNode;
  bottomNav?: React.ReactNode;
}

export function ChatInput({
  id,
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  pending,
  disabled,
  submitLabel,
  options,
  leftAction,
  bottomNav,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "60px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px";
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !pending) {
        onSubmit();
      }
    }
  }

  const hasText = value.trim().length > 0;
  const isActive = hasText && !disabled && !pending;

  return (
    <div className="chat-input-box">
      {options ? <div className="chat-input-options">{options}</div> : null}
      <div className="chat-input-scroll">
        <textarea
          ref={textareaRef}
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Descreva sua tarefa..."}
          className="chat-textarea"
          disabled={disabled}
        />
      </div>
      {bottomNav ? <div className="chat-input-bottom-nav">{bottomNav}</div> : null}
      <div className="chat-input-footer">
        <div className="chat-input-left">{leftAction}</div>
        <button
          className="chat-send-btn"
          type="button"
          onClick={onSubmit}
          disabled={pending}
          data-active={isActive}
          aria-label={pending ? "Gerando..." : submitLabel}
        >
          <ArrowUp size={16} aria-hidden />
          <span className="sr-only">{pending ? "Gerando..." : submitLabel}</span>
        </button>
      </div>
    </div>
  );
}

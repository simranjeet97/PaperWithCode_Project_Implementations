"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PipelineEvent, ResearchLandscape } from "../types/landscape";

interface UseLandscapeStreamOptions {
  onComplete?: (landscape: ResearchLandscape) => void;
  onError?: (errorMsg: string) => void;
}

export function useLandscapeStream(taskId: string | null, options?: UseLandscapeStreamOptions) {
  const [stage, setStage] = useState<string>("IDLE");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<{ stage: string; message: string; timestamp: string }[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStage("IDLE");
    setProgress(0);
    setMessage("");
    setLogs([]);
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    if (!taskId) return;

    reset();
    setIsStreaming(true);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
    const es = new EventSource(`${apiBase}/stream/${taskId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data);
        setStage(data.stage);
        setProgress(data.progress);
        setMessage(data.message);

        const now = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { stage: data.stage, message: data.message, timestamp: now }]);

        if (data.stage === "COMPLETE") {
          setIsStreaming(false);
          es.close();
          if (data.payload && options?.onComplete) {
            options.onComplete(data.payload);
          }
        } else if (data.stage === "ERROR") {
          setIsStreaming(false);
          es.close();
          if (options?.onError) {
            options.onError(data.message);
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = (err) => {
      console.warn("SSE connection error or closed:", err);
      setIsStreaming(false);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [taskId, options, reset]);

  return {
    stage,
    progress,
    message,
    logs,
    isStreaming,
    reset,
  };
}

import { useCallback, useEffect, useState } from "react";

export interface DocRecord {
  id: string;
  name: string;
  uploadedAt: string;
  status: "uploaded" | "processing" | "filled";
  downloadUrl?: string;
}

const STORAGE_KEY = "docfill_doc_ids";
const DOCS_KEY = "docfill_documents";

function loadDocIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function loadDocuments(): DocRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DOCS_KEY) || "[]") as DocRecord[];
  } catch {
    return [];
  }
}

// Simple global state with localStorage persistence
let globalDocIds: string[] = loadDocIds();
let globalDocs: DocRecord[] = loadDocuments();
const listeners: Set<() => void> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function useDocumentStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const addDocument = useCallback((doc: DocRecord) => {
    globalDocs = [doc, ...globalDocs];
    globalDocIds = [doc.id, ...globalDocIds.filter((id) => id !== doc.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalDocIds));
    localStorage.setItem(DOCS_KEY, JSON.stringify(globalDocs));
    notify();
  }, []);

  const updateDocument = useCallback(
    (id: string, updates: Partial<DocRecord>) => {
      globalDocs = globalDocs.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      );
      localStorage.setItem(DOCS_KEY, JSON.stringify(globalDocs));
      notify();
    },
    [],
  );

  const removeDocument = useCallback((id: string) => {
    globalDocs = globalDocs.filter((d) => d.id !== id);
    globalDocIds = globalDocIds.filter((docId) => docId !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalDocIds));
    localStorage.setItem(DOCS_KEY, JSON.stringify(globalDocs));
    notify();
  }, []);

  return {
    docIds: globalDocIds,
    documents: globalDocs,
    addDocument,
    updateDocument,
    removeDocument,
  };
}

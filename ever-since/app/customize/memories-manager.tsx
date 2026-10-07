'use client';

import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { MemoryRecord, MediaRecord } from '@/lib/storage/schema';
import { Skeleton } from '@/components/ui/skeleton';
import Alert from './alert';

interface MemoriesManagerProps {
  initialMemories: MemoryRecord[];
  mediaList: MediaRecord[];
}

export default function MemoriesManager({
  initialMemories,
  mediaList,
}: MemoriesManagerProps) {
  const router = useRouter();
  const [memories, setMemories] = useState<MemoryRecord[]>(initialMemories);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heading, setHeading] = useState('');
  const [text, setText] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [buttonType, setButtonType] = useState(''); // Fun button placeholder

  // Async & feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    setEditingId(null);
    setHeading('');
    setText('');
    setMediaId('');
    setButtonType('');
  }

  function handleStartEdit(memory: MemoryRecord) {
    setEditingId(memory.id);
    setHeading(memory.heading || '');
    setText(memory.text || '');
    setMediaId(memory.mediaId || '');
    setButtonType('');
    setErrorMessage(null);
    setSuccessMessage(null);

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleCancelEdit() {
    resetForm();
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedHeading = heading.trim();
    const trimmedText = text.trim();

    if (!trimmedHeading && !trimmedText && !mediaId) {
      setErrorMessage('Please provide at least a header, text, or select a media file.');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/memories/${editingId}` : '/api/memories';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: trimmedHeading || null,
          text: trimmedText || null,
          mediaId: mediaId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to save memory.');
        return;
      }

      if (editingId) {
        setMemories((prev) =>
          prev.map((m) => (m.id === editingId ? (data.memory as MemoryRecord) : m))
        );
        setSuccessMessage('Memory updated successfully.');
      } else {
        setMemories((prev) => [...prev, data.memory as MemoryRecord]);
        setSuccessMessage('Memory created successfully.');
      }

      resetForm();
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while saving the memory.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to delete memory.');
        return;
      }

      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setSuccessMessage('Memory deleted successfully.');
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while deleting the memory.');
    } finally {
      setDeletingId(null);
    }
  }

  async function persistReorder(newOrder: MemoryRecord[]) {
    const previousOrder = [...memories];
    setMemories(newOrder);
    setIsReordering(true);

    try {
      const response = await fetch('/api/memories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrder.map((m) => m.id) }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMemories(previousOrder);
        setErrorMessage(data.error || 'Failed to reorder memories.');
        return;
      }

      setSuccessMessage('Memories reordered successfully.');
      router.refresh();
    } catch {
      setMemories(previousOrder);
      setErrorMessage('A network error occurred while reordering memories.');
    } finally {
      setIsReordering(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= memories.length || isReordering) return;
    const nextList = [...memories];
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;
    persistReorder(nextList);
  }

  // HTML5 Drag and Drop Handlers
  function onDragStart(e: DragEvent<HTMLLIElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function onDragOver(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function onDragLeave() {
    setDragOverIndex(null);
  }

  function onDrop(e: DragEvent<HTMLLIElement>, targetIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === targetIndex || isReordering) {
      setDraggedIndex(null);
      return;
    }

    const nextList = [...memories];
    const [draggedItem] = nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, draggedItem);

    setDraggedIndex(null);
    persistReorder(nextList);
  }

  function onDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function getMediaFilename(id: string | null): string | null {
    if (!id) return null;
    const item = mediaList.find((m) => m.id === id);
    return item ? item.filename : null;
  }

  return (
    <>
      {/* 3. Create / Edit Memory Form */}
      <section
        aria-labelledby="memory-form-heading"
        className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="memory-form-heading" className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Memory' : 'Add Memory'}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {editingId
                ? 'Update the selected memory card'
                : 'Author a new memory card for your timeline'}
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-medium text-muted hover:text-foreground px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white transition-colors shadow-2xs"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {errorMessage && (
          <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        )}
        {successMessage && (
          <Alert type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="memory-heading" className="text-sm font-medium text-foreground">
              Header
            </label>
            <input
              id="memory-heading"
              type="text"
              name="heading"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="Ever since we met..."
              maxLength={100}
              disabled={isSubmitting}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="memory-text" className="text-sm font-medium text-foreground">
              Text
            </label>
            <textarea
              id="memory-text"
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Memory description..."
              maxLength={100}
              rows={2}
              disabled={isSubmitting}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs resize-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="memory-media" className="text-sm font-medium text-foreground">
                Media
              </label>
              <select
                id="memory-media"
                name="mediaId"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                disabled={isSubmitting}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50"
              >
                <option value="">None</option>
                {mediaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="memory-button" className="text-sm font-medium text-foreground">
                  Fun Button
                </label>
                <span className="text-[10px] text-muted italic">Coming soon</span>
              </div>
              <select
                id="memory-button"
                name="buttonType"
                value={buttonType}
                onChange={(e) => setButtonType(e.target.value)}
                disabled={true}
                className="rounded-lg border border-[#E5E7EB] bg-gray-100 px-3 py-2 text-sm text-muted cursor-not-allowed shadow-2xs"
              >
                <option value="">None</option>
                <option value="seal">Pixel Seal</option>
                <option value="sound">Sound Effect (Ye-he)</option>
                <option value="yes-no">Dodging Yes/No</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cta hover:bg-cta-hover text-white px-6 py-2.5 text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : editingId
                ? 'Update Memory'
                : 'Save Memory'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
                className="text-xs font-medium text-muted hover:text-foreground px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* 4. Memories List & Reordering */}
      <section aria-labelledby="memories-list-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="memories-list-heading" className="text-lg font-semibold text-foreground">
              Memories Timeline
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Drag by the grip (::) or use arrows to reorder story cards
            </p>
          </div>
          <span className="text-xs text-muted font-medium bg-gray-100 px-3 py-1 rounded-full border border-[#E5E7EB]">
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </span>
        </div>

        {memories.length === 0 && !(isSubmitting && !editingId) ? (
          <p className="text-xs text-muted py-6 text-center italic bg-gray-50/50 rounded-xl border border-dashed border-[#E5E7EB]">
            No memories created yet. Use the form above to author your first memory.
          </p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {memories.map((item, index) => {
              const filename = getMediaFilename(item.mediaId);
              const isFirst = index === 0;
              const isLast = index === memories.length - 1;
              const isBeingDragged = draggedIndex === index;
              const isTargetHovered = dragOverIndex === index;

              return (
                <li
                  key={item.id}
                  draggable={!isReordering && !deletingId}
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all ${
                    isBeingDragged
                      ? 'opacity-40 border-dashed border-cta bg-cta/5'
                      : isTargetHovered
                      ? 'border-cta bg-cta/10 scale-[1.01]'
                      : 'border-[#E5E7EB] bg-gray-50/60 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-label="Drag to reorder"
                      className="text-muted cursor-grab active:cursor-grabbing select-none text-base font-mono px-1 hover:text-foreground"
                    >
                      ::
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={isFirst || isReordering}
                        aria-label={`Move "${item.heading || 'memory'}" up`}
                        className="w-7 h-7 rounded-md border border-[#E5E7EB] bg-white hover:bg-gray-100 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={isLast || isReordering}
                        aria-label={`Move "${item.heading || 'memory'}" down`}
                        className="w-7 h-7 rounded-md border border-[#E5E7EB] bg-white hover:bg-gray-100 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        &darr;
                      </button>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-foreground truncate">
                          {item.heading || '(No header)'}
                        </strong>
                        {filename && (
                          <span className="text-[11px] text-muted font-mono shrink-0">
                            ({filename})
                          </span>
                        )}
                      </div>
                      {item.text && (
                        <p className="text-xs text-muted truncate mt-0.5 max-w-md">
                          {item.text}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      disabled={editingId === item.id || isReordering}
                      className="text-xs text-foreground hover:text-cta font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {editingId === item.id ? 'Editing' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id || isReordering}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-rose-50 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              );
            })}
            {isSubmitting && !editingId && (
              <li
                aria-label="Saving memory item"
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-[#E5E7EB] bg-gray-50/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted text-base font-mono px-1">::</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="w-7 h-7 rounded-md" />
                    <Skeleton className="w-7 h-7 rounded-md" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-7 w-12 rounded-lg" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </li>
            )}
          </ol>
        )}
      </section>
    </>
  );
}

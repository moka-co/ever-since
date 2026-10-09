'use client';

import { useState, useEffect, useRef, type FormEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_MEMORIES_COUNT, type MemoryRecord, type MediaRecord } from '@/lib/storage/schema';
import { MAX_MEDIA_COUNT, isVideo, validateMediaConstraints } from '@/lib/media/validation';
import { Skeleton } from '@/components/ui/skeleton';
import Alert from './alert';
import MediaPicker from './media-picker';

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
  const [mediaPositionX, setMediaPositionX] = useState<number>(50);
  const [mediaPositionY, setMediaPositionY] = useState<number>(50);
  const [mediaScale, setMediaScale] = useState<number>(1);
  const [buttonType, setButtonType] = useState(''); // Fun button placeholder

  // Inline media upload state
  const [uploadedInSession, setUploadedInSession] = useState<MediaRecord[]>([]);
  const combinedMediaList = [...mediaList, ...uploadedInSession.filter(m => !mediaList.find(ml => ml.id === m.id))];
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video preview volume state
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const cardPreviewVideoRef = useRef<HTMLVideoElement>(null);

  // Interactive photo framing drag state
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Async & feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const isQuotaFull = !editingId && memories.length >= MAX_MEMORIES_COUNT;

  function updatePositionFromPointer(clientX: number, clientY: number) {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const clampedX = Math.max(0, Math.min(rect.width, rawX));
    const clampedY = Math.max(0, Math.min(rect.height, rawY));
    const percentageX = Math.round((clampedX / rect.width) * 100);
    const percentageY = Math.round((clampedY / rect.height) * 100);
    setMediaPositionX(percentageX);
    setMediaPositionY(percentageY);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingPhoto(true);
    updatePositionFromPointer(e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingPhoto) return;
    updatePositionFromPointer(e.clientX, e.clientY);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isDraggingPhoto) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDraggingPhoto(false);
    }
  }

  const currentSelectedMedia = combinedMediaList.find((m) => m.id === mediaId);
  const isSelectedVideo = currentSelectedMedia ? isVideo(currentSelectedMedia.filename) : false;

  // Attach non-passive wheel listener to allow e.preventDefault() and prevent page scrolling when zooming
  useEffect(() => {
    const el = previewRef.current;
    if (!el || isSelectedVideo) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
      setMediaScale((prev) => {
        const next = Math.round((prev + zoomDelta) * 10) / 10;
        return Math.max(1, Math.min(3, next));
      });
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheelNative);
    };
  }, [isSelectedVideo, mediaId]);

  function handleVolumeChange(newVol: number) {
    const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
    setVideoVolume(clamped);
    if (cardPreviewVideoRef.current) {
      cardPreviewVideoRef.current.volume = clamped;
    }
    if (clamped > 0 && isVideoMuted) {
      setIsVideoMuted(false);
      if (cardPreviewVideoRef.current) {
        cardPreviewVideoRef.current.muted = false;
      }
    }
  }

  function toggleMute() {
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);
    if (cardPreviewVideoRef.current) {
      cardPreviewVideoRef.current.muted = nextMuted;
      if (!nextMuted && videoVolume === 0) {
        setVideoVolume(0.5);
        cardPreviewVideoRef.current.volume = 0.5;
      }
    }
  }

  function resetForm() {
    setEditingId(null);
    setHeading('');
    setText('');
    setMediaId('');
    setMediaPositionX(50);
    setMediaPositionY(50);
    setMediaScale(1);
    setButtonType('');
  }

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  async function handleInlineUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (combinedMediaList.length >= MAX_MEDIA_COUNT) {
       setErrorMessage(`Media quota full. Cannot upload more than ${MAX_MEDIA_COUNT} files.`);
       return;
    }

    const validationError = validateMediaConstraints(
      { name: file.name, size: file.size },
      combinedMediaList.length
    );
    if (validationError) {
      setErrorMessage(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMessage(null);
    setIsUploadingMedia(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to upload media.');
        return;
      }

      const newMedia = data.media as MediaRecord;
      setUploadedInSession((prev) => [...prev, newMedia]);
      setMediaId(newMedia.id); // Auto-select the newly uploaded media
      router.refresh();
    } catch {
      setErrorMessage('Network error during upload.');
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleStartEdit(memory: MemoryRecord) {
    setEditingId(memory.id);
    setHeading(memory.heading || '');
    setText(memory.text || '');
    setMediaId(memory.mediaId || '');
    setMediaPositionX(memory.mediaPositionX ?? 50);
    setMediaPositionY(memory.mediaPositionY ?? 50);
    setMediaScale(memory.mediaScale ?? 1);
    setButtonType('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaved(false);

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleCancelEdit() {
    resetForm();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaved(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaved(false);

    if (isQuotaFull) {
      setErrorMessage(`Memories limit reached. A maximum of ${MAX_MEMORIES_COUNT} memories is allowed. Please delete or edit existing memories.`);
      return;
    }

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
          mediaPositionX,
          mediaPositionY,
          mediaScale,
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
      } else {
        setMemories((prev) => [...prev, data.memory as MemoryRecord]);
      }

      setIsSaved(true);
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
    <div className="flex flex-col gap-8">
      {/* 3. Create / Edit Memory Form */}
      <section
        aria-labelledby="memory-form-heading"
        className={`flex flex-col gap-4 p-5 sm:p-6 rounded-3xl transition-all border ${
          editingId
            ? 'bg-rose-50/50 border-rose-200/60 shadow-sm'
            : 'bg-white border-transparent'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="memory-form-heading" className="text-lg font-semibold text-foreground flex items-center gap-2">
              {editingId && <span className="flex w-2 h-2 rounded-full bg-cta animate-pulse"></span>}
              {editingId ? 'Editing Memory' : 'Add Memory'}
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
              className="text-xs font-semibold text-muted hover:text-foreground px-3.5 py-1.5 rounded-full border border-[#F1E8EC] bg-[#FAF7F8] hover:bg-white transition-colors shadow-2xs"
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
            <label htmlFor="memory-heading" className="text-sm font-semibold text-foreground">
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
              className="rounded-xl border border-[#F1E8EC] bg-[#FAF7F8] px-3.5 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="memory-text" className="text-sm font-semibold text-foreground">
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
              className="rounded-xl border border-[#F1E8EC] bg-[#FAF7F8] px-3.5 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs resize-none disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Media</span>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleInlineUpload}
              />
              <MediaPicker
                mediaList={combinedMediaList}
                value={mediaId}
                onChange={setMediaId}
                onUploadClick={() => fileInputRef.current?.click()}
                isUploading={isUploadingMedia}
                canUpload={combinedMediaList.length < MAX_MEDIA_COUNT}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="memory-button" className="text-sm font-semibold text-foreground">
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
                className="rounded-xl border border-[#F1E8EC] bg-gray-100/70 px-3.5 py-2 text-sm text-muted cursor-not-allowed shadow-2xs"
              >
                <option value="">None</option>
                <option value="seal">Pixel Seal</option>
                <option value="sound">Sound Effect (Ye-he)</option>
                <option value="yes-no">Dodging Yes/No</option>
              </select>
            </div>
          </div>

          {/* Enlarged Card Preview & Interactive Framing */}
          {(() => {
            const selectedMedia = combinedMediaList.find((m) => m.id === mediaId);
            if (!selectedMedia) return null;
            const isSelectedVideo = isVideo(selectedMedia.filename);

            return (
              <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-3xl bg-[#FAF7F8] border border-[#F1E8EC] mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>Card Media Preview</span>
                    {isSelectedVideo ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-white uppercase tracking-wider">
                        Video
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F472B6]/20 text-[#EC4899] uppercase tracking-wider">
                        Photo
                      </span>
                    )}
                  </span>
                </div>

                {/* Enlarged Card Preview Box */}
                <div
                  ref={previewRef}
                  onPointerDown={!isSelectedVideo ? handlePointerDown : undefined}
                  onPointerMove={!isSelectedVideo ? handlePointerMove : undefined}
                  onPointerUp={!isSelectedVideo ? handlePointerUp : undefined}
                  onPointerCancel={!isSelectedVideo ? handlePointerUp : undefined}
                  className={`relative w-full aspect-square max-w-[340px] mx-auto rounded-[28px] overflow-hidden bg-black/5 border border-[#F1E8EC] shadow-sm select-none overscroll-contain ${
                    !isSelectedVideo
                      ? 'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow'
                      : ''
                  }`}
                  title={!isSelectedVideo ? 'Click or drag to move photo framing, use mouse wheel or buttons to zoom' : undefined}
                >
                  {isSelectedVideo ? (
                    <video
                      ref={cardPreviewVideoRef}
                      src={`/api/media/${selectedMedia.filename}`}
                      autoPlay
                      loop
                      muted={isVideoMuted}
                      playsInline
                      onLoadedMetadata={(e) => {
                        e.currentTarget.playbackRate = 1.5;
                        e.currentTarget.volume = videoVolume;
                      }}
                      className="w-full h-full object-cover rounded-[28px]"
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${selectedMedia.filename}`}
                        alt="Preview"
                        draggable={false}
                        style={{
                          objectPosition: `${mediaPositionX}% ${mediaPositionY}%`,
                          transform: `scale(${mediaScale})`,
                        }}
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-75"
                      />

                      {/* Interactive Framing Cue Overlay - only 'Click or drag to move' */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-start p-3">
                        <div>
                          <span className="text-[10px] font-medium bg-black/60 text-white px-2.5 py-1 rounded-full backdrop-blur-xs inline-flex items-center gap-1.5 shadow-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/></svg>
                            Click or drag to move
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Zoom Controls for Photo */}
                {!isSelectedVideo ? (
                  <div className="flex items-center justify-between max-w-[340px] mx-auto w-full pt-1 px-1">
                    <span className="text-xs font-medium text-muted">Zoom</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaScale((s) => Math.max(1, Math.round((s - 0.2) * 10) / 10))}
                        disabled={mediaScale <= 1}
                        aria-label="Zoom out"
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span className="text-xs font-mono font-semibold text-foreground min-w-[36px] text-center">
                        {mediaScale.toFixed(1)}x
                      </span>
                      <button
                        type="button"
                        onClick={() => setMediaScale((s) => Math.min(3, Math.round((s + 0.2) * 10) / 10))}
                        disabled={mediaScale >= 3}
                        aria-label="Zoom in"
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaScale(1);
                          setMediaPositionX(50);
                          setMediaPositionY(50);
                        }}
                        disabled={mediaScale === 1 && mediaPositionX === 50 && mediaPositionY === 50}
                        className="text-xs text-muted hover:text-foreground font-medium px-2 py-1 rounded-lg border border-[#F1E8EC] bg-white hover:bg-[#FAF7F8] transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed ml-1"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Volume Controls for Video Preview */
                  <div className="flex flex-col gap-2 max-w-[340px] mx-auto w-full pt-1 px-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted">Preview Volume</span>
                      <span className="font-mono font-semibold text-foreground">
                        {isVideoMuted ? 'Muted' : `${Math.round(videoVolume * 100)}%`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors shadow-2xs ${
                          isVideoMuted
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-white border-[#F1E8EC] text-foreground hover:bg-[#FAF7F8]'
                        }`}
                      >
                        {isVideoMuted ? '🔇 Unmute' : '🔊 Mute'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVolumeChange(videoVolume - 0.1)}
                        disabled={isVideoMuted || videoVolume <= 0}
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease volume"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isVideoMuted ? 0 : videoVolume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="flex-1 accent-cta cursor-pointer h-2 bg-[#F1E8EC] rounded-lg"
                        aria-label="Adjust video preview volume"
                      />
                      <button
                        type="button"
                        onClick={() => handleVolumeChange(videoVolume + 0.1)}
                        disabled={videoVolume >= 1}
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase volume"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isQuotaFull}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all shadow-md disabled:opacity-50 hover:scale-102 active:scale-98 disabled:shadow-none ${
                isSaved
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white shadow-[0_2px_12px_rgba(244,114,182,0.4)] hover:shadow-[0_4px_16px_rgba(244,114,182,0.55)] disabled:from-gray-300 disabled:to-gray-300'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : isSaved
                ? '✓ Saved!'
                : editingId
                ? 'Update Memory'
                : 'Save Memory'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
                className="text-xs font-semibold text-muted hover:text-foreground px-4 py-2 rounded-full border border-[#F1E8EC] bg-[#FAF7F8] hover:bg-white transition-colors"
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
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              memories.length >= MAX_MEMORIES_COUNT
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-[#FAF7F8] text-foreground border-[#F1E8EC]'
            }`}
          >
            {memories.length} / {MAX_MEMORIES_COUNT} memories used
          </span>
        </div>

        {memories.length === 0 && !(isSubmitting && !editingId) ? (
          <p className="text-xs text-muted py-6 text-center italic bg-[#FAF7F8] rounded-2xl border border-dashed border-[#F1E8EC]">
            No memories created yet. Use the form above to author your first memory.
          </p>
        ) : (
          <ol className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  className={`flex flex-col gap-3 p-4 rounded-3xl border transition-all ${
                    isBeingDragged
                      ? 'opacity-40 border-dashed border-cta bg-cta/5'
                      : isTargetHovered
                      ? 'border-cta bg-cta/10 scale-[1.02]'
                      : 'border-[#F1E8EC] bg-[#FAF7F8]/80 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        aria-label="Drag to reorder"
                        className="text-muted cursor-grab active:cursor-grabbing select-none text-base font-mono px-1 hover:text-foreground"
                      >
                        ::
                      </span>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={isFirst || isReordering}
                        aria-label={`Move "${item.heading || 'memory'}" backward`}
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={isLast || isReordering}
                        aria-label={`Move "${item.heading || 'memory'}" forward`}
                        className="w-7 h-7 rounded-lg border border-[#F1E8EC] bg-white hover:bg-gray-50 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        &rarr;
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        disabled={editingId === item.id || isReordering}
                        className="text-xs text-foreground hover:text-cta font-semibold px-3 py-1.5 rounded-full border border-[#F1E8EC] bg-white hover:bg-[#FAF7F8] transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {editingId === item.id ? 'Editing' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id || isReordering}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-full border border-[#F1E8EC] bg-white hover:bg-rose-50 transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 border border-[#F1E8EC] overflow-hidden shrink-0 flex items-center justify-center">
                      {filename ? (
                        isVideo(filename) ? (
                          <div className="relative w-full h-full">
                            <video
                              src={`/api/media/${filename}`}
                              className="w-full h-full object-cover pointer-events-none"
                              autoPlay
                              loop
                              muted
                              playsInline
                              onLoadedMetadata={(e) => {
                                e.currentTarget.playbackRate = 1.5;
                              }}
                              ref={(el) => {
                                if (el) el.playbackRate = 1.5;
                              }}
                            />
                            <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-[8px] text-white px-1 rounded uppercase font-bold pointer-events-none">
                              Vid
                            </span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/media/${filename}`}
                            alt=""
                            style={{
                              objectPosition: `${item.mediaPositionX ?? 50}% ${item.mediaPositionY ?? 50}%`,
                              transform: `scale(${item.mediaScale ?? 1})`,
                            }}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <span className="text-[10px] text-muted text-center px-1">No media</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <strong className="text-sm font-semibold text-foreground truncate">
                        {item.heading || '(No header)'}
                      </strong>
                      {item.text && (
                        <p className="text-xs text-muted line-clamp-2 mt-0.5 max-w-sm whitespace-pre-wrap">
                          {item.text}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {isSubmitting && !editingId && (
              <li
                aria-label="Saving memory item"
                className="flex flex-col gap-3 p-4 rounded-3xl border border-[#F1E8EC] bg-[#FAF7F8]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted text-base font-mono px-1">::</span>
                    <Skeleton className="w-7 h-7 rounded-lg" />
                    <Skeleton className="w-7 h-7 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-7 w-12 rounded-full" />
                    <Skeleton className="h-7 w-14 rounded-full" />
                  </div>
                </div>
                <div className="flex items-start gap-3 min-w-0">
                  <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
                  <div className="flex flex-col gap-1.5 w-full">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </li>
            )}
          </ol>
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ImageLightbox: React.FC = () => {
  const { lightboxState, closeLightbox, updateLightboxImages } = useApp();
  const [zoom, setZoom] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setZoom(1);
  }, [lightboxState?.index, lightboxState?.images.length]);

  useEffect(() => {
    if (!lightboxState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === '+' || event.key === '=') changeZoom(0.25);
      if (event.key === '-' || event.key === '_') changeZoom(-0.25);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !lightboxState) return;

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStartDistRef.current) return;
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      setZoom(
        Math.max(
          1,
          Math.min(4, (pinchStartZoomRef.current * distance) / pinchStartDistRef.current)
        )
      );
      event.preventDefault();
    };

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [lightboxState]);

  if (!lightboxState || lightboxState.images.length === 0) return null;

  const { images, index } = lightboxState;
  const safeIdx = ((index % images.length) + images.length) % images.length;

  const step = (direction: number) => {
    if (images.length < 2) return;
    const next = (safeIdx + direction + images.length) % images.length;
    setZoom(1);
    updateLightboxImages(images, next);
  };

  const changeZoom = (delta: number) => {
    setZoom((prev) => Math.max(1, Math.min(4, prev + delta)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length && pinchStartDistRef.current) {
      pinchStartDistRef.current = 0;
      return;
    }
    if (!e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) && zoom <= 1.05) {
      step(dx < 0 ? 1 : -1);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      changeZoom(e.deltaY < 0 ? 0.15 : -0.15);
    }
  };

  return (
    <div
      id="site-image-viewer"
      className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Site photo viewer"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800">
        <div className="text-sm font-semibold text-white">
          <i className="fa-solid fa-images text-amber-400 mr-2 ae-icon-polished" />
          <span id="site-image-viewer-counter">
            Photo {safeIdx + 1} of {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="image-viewer-control"
            onClick={() => changeZoom(-0.25)}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <i className="fa-solid fa-minus ae-icon-polished" />
          </button>
          <button
            type="button"
            className="image-viewer-control"
            onClick={() => setZoom(1)}
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <i className="fa-solid fa-magnifying-glass ae-icon-polished" />
          </button>
          <button
            type="button"
            className="image-viewer-control"
            onClick={() => changeZoom(0.25)}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <i className="fa-solid fa-plus ae-icon-polished" />
          </button>
          <button
            type="button"
            className="image-viewer-control"
            onClick={closeLightbox}
            title="Close"
            aria-label="Close photo viewer"
          >
            <i className="fa-solid fa-xmark ae-icon-polished" />
          </button>
        </div>
      </div>

      <div
        id="site-image-viewer-stage"
        ref={stageRef}
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden p-3 sm:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
      >
        <button
          type="button"
          className="image-viewer-control absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10"
          onClick={() => step(-1)}
          disabled={images.length < 2}
          style={{ opacity: images.length < 2 ? 0.35 : 1 }}
          title="Previous photo"
          aria-label="Previous photo"
        >
          <i className="fa-solid fa-chevron-left ae-icon-polished" />
        </button>

        <img
          id="site-image-viewer-image"
          src={images[safeIdx]}
          alt={`Site progress photo ${safeIdx + 1}`}
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ transform: `scale(${zoom})` }}
        />

        <button
          type="button"
          className="image-viewer-control absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10"
          onClick={() => step(1)}
          disabled={images.length < 2}
          style={{ opacity: images.length < 2 ? 0.35 : 1 }}
          title="Next photo"
          aria-label="Next photo"
        >
          <i className="fa-solid fa-chevron-right ae-icon-polished" />
        </button>

        <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-slate-400 pointer-events-none">
          Swipe left/right to change photo · Pinch or use +/− to zoom ·
          Double-click to zoom
        </p>
      </div>
    </div>
  );
};

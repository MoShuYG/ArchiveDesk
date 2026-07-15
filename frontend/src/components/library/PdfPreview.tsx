import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { calculatePdfRenderScales } from '../../utils/pdfPreviewSizing';
import { useI18n } from '../../hooks/useI18n';
import type { MessageKey } from '../../i18n';

export function PdfPreview({ data, title }: { data: ArrayBuffer; title: string }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => setViewportWidth(Math.floor(viewport.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let passwordRequired = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    setDocumentProxy(null);
    setPageNumber(1);
    setError(null);

    async function loadDocument() {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = pdfjs.getDocument({
          data: data.slice(0),
          enableXfa: false,
          maxImageSize: 40_000_000,
        });
        loadingTask.onPassword = () => {
          passwordRequired = true;
          if (!disposed) {
            setError('pdf.passwordProtected');
          }
          void loadingTask?.destroy();
        };

        const loadedDocument = await loadingTask.promise;
        if (disposed) {
          return;
        }
        setDocumentProxy(loadedDocument);
      } catch {
        if (!disposed && !passwordRequired) {
          setError('pdf.parseFailed');
        }
      }
    }

    void loadDocument();
    return () => {
      disposed = true;
      void loadingTask?.destroy();
    };
  }, [data]);

  useEffect(() => {
    if (!documentProxy || viewportWidth <= 0 || !canvasRef.current) return;

    let cancelled = false;
    let page: PDFPageProxy | null = null;
    let renderTask: RenderTask | null = null;
    setIsRendering(true);
    setError(null);

    async function renderPage() {
      try {
        page = await documentProxy!.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(240, viewportWidth - 32);
        const scales = calculatePdfRenderScales({
          pageWidth: baseViewport.width,
          pageHeight: baseViewport.height,
          availableWidth,
          devicePixelRatio: window.devicePixelRatio || 1,
        });
        if (!scales) {
          throw new Error('Invalid PDF page dimensions');
        }

        const renderViewport = page.getViewport({ scale: scales.renderScale });
        const displayViewport = page.getViewport({ scale: scales.displayScale });
        const canvas = canvasRef.current;

        canvas.width = Math.max(1, Math.floor(renderViewport.width));
        canvas.height = Math.max(1, Math.floor(renderViewport.height));
        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        renderTask = page.render({ canvas, viewport: renderViewport });
        await renderTask.promise;
        if (!cancelled) setIsRendering(false);
      } catch (renderError) {
        if (cancelled || (renderError instanceof Error && renderError.name === 'RenderingCancelledException')) return;
        setError('pdf.renderFailed');
        setIsRendering(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      page?.cleanup();
    };
  }, [documentProxy, pageNumber, viewportWidth]);

  if (error) {
    return <PdfState text={t(error)} />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-slate-200" data-preview-interactive>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
        <button
          type="button"
          className="app-icon-button"
          aria-label={t('pdf.previousPage')}
          disabled={!documentProxy || pageNumber <= 1 || isRendering}
          onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold text-foreground" aria-live="polite">
          {documentProxy ? t('pdf.pagePosition', { page: pageNumber, total: documentProxy.numPages }) : t('pdf.loading')}
        </p>
        <button
          type="button"
          className="app-icon-button"
          aria-label={t('pdf.nextPage')}
          disabled={!documentProxy || pageNumber >= documentProxy.numPages || isRendering}
          onClick={() => setPageNumber((current) => Math.min(documentProxy?.numPages ?? current, current + 1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-auto p-4" aria-label={t('pdf.previewLabel', { title })} aria-busy={!documentProxy || isRendering}>
        {!documentProxy ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600">{t('pdf.parsing')}</div>
        ) : null}
        <canvas ref={canvasRef} className="mx-auto block bg-white shadow-sm" />
      </div>
    </div>
  );
}

function PdfState({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-5 text-center text-muted-foreground">
      <DocumentTextIcon className="h-10 w-10 opacity-50" />
      <p className="max-w-md text-sm">{text}</p>
    </div>
  );
}

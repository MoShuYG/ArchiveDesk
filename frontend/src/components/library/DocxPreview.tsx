import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { DOCX_IFRAME_SANDBOX, buildDocxSandboxDocument } from '../../utils/docxPreviewSecurity';
import { useI18n } from '../../hooks/useI18n';
import type { MessageKey } from '../../i18n';

const DOCX_PARSE_TIMEOUT_MS = 15_000;
const SAFE_DOCX_URI = /^(?:#[\w:.-]+|data:image\/(?:png|jpeg|gif|webp|bmp);base64,[a-z0-9+/=\s]+)$/i;

type DocxWorkerResponse =
  | { ok: true; html: string; warningCount: number }
  | { ok: false; code: 'OUTPUT_TOO_LARGE' | 'PARSE_FAILED' };

type DocxPreviewState =
  | { data: ArrayBuffer; status: 'ready'; srcDoc: string; warningCount: number }
  | { data: ArrayBuffer; status: 'error'; messageKey: MessageKey };

function sanitizeDocxHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'del',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'img',
      'li',
      'ol',
      'p',
      's',
      'strong',
      'sub',
      'sup',
      'table',
      'tbody',
      'td',
      'tfoot',
      'th',
      'thead',
      'tr',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: ['alt', 'colspan', 'href', 'id', 'rowspan', 'src', 'title'],
    ALLOWED_URI_REGEXP: SAFE_DOCX_URI,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
  });
}

function getWorkerErrorKey(code: 'OUTPUT_TOO_LARGE' | 'PARSE_FAILED'): MessageKey {
  if (code === 'OUTPUT_TOO_LARGE') {
    return 'docx.outputTooLarge';
  }
  return 'docx.parseFailed';
}

export function DocxPreview({ data, title }: { data: ArrayBuffer; title: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<DocxPreviewState | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/docxPreviewWorker.ts', import.meta.url), { type: 'module' });
    let settled = false;

    const finishWithError = (messageKey: MessageKey) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      setState({ data, status: 'error', messageKey });
    };

    const timeout = window.setTimeout(() => {
      finishWithError('docx.timeout');
    }, DOCX_PARSE_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<DocxWorkerResponse>) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      worker.terminate();

      const response = event.data;
      if (!response.ok) {
        setState({ data, status: 'error', messageKey: getWorkerErrorKey(response.code) });
        return;
      }

      const sanitizedHtml = sanitizeDocxHtml(response.html);
      setState({
        data,
        status: 'ready',
        srcDoc: buildDocxSandboxDocument(sanitizedHtml),
        warningCount: response.warningCount,
      });
    };

    worker.onerror = () => {
      window.clearTimeout(timeout);
      finishWithError('docx.workerFailed');
    };

    const workerData = data.slice(0);
    worker.postMessage(workerData, [workerData]);

    return () => {
      settled = true;
      window.clearTimeout(timeout);
      worker.terminate();
    };
  }, [data]);

  const currentState = state?.data === data ? state : null;

  if (!currentState) {
    return <DocumentState text={t('docx.parsing')} busy />;
  }

  if (currentState.status === 'error') {
    return <DocumentState text={t(currentState.messageKey)} />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {currentState.warningCount > 0 ? (
        <p className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700" role="status">
          {t('docx.layoutWarning')}
        </p>
      ) : null}
      <iframe
        className="min-h-0 flex-1 bg-white"
        title={t('docx.previewLabel', { title })}
        sandbox={DOCX_IFRAME_SANDBOX}
        referrerPolicy="no-referrer"
        srcDoc={currentState.srcDoc}
      />
    </div>
  );
}

function DocumentState({ text, busy = false }: { text: string; busy?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-5 text-center text-muted-foreground" aria-busy={busy}>
      <DocumentTextIcon className="h-10 w-10 opacity-50" />
      <p className="max-w-md text-sm">{text}</p>
    </div>
  );
}

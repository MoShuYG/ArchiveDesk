import mammoth from 'mammoth';

const MAX_OUTPUT_CHARACTERS = 2_000_000;

type DocxWorkerResponse =
  | { ok: true; html: string; warningCount: number }
  | { ok: false; code: 'OUTPUT_TOO_LARGE' | 'PARSE_FAILED' };

const workerContext = self as unknown as {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null;
  postMessage: (message: DocxWorkerResponse) => void;
};

workerContext.onmessage = (event) => {
  void convertDocument(event.data);
};

async function convertDocument(data: ArrayBuffer): Promise<void> {
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: data },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => p.subtitle:fresh",
        ],
      },
    );

    if (result.value.length > MAX_OUTPUT_CHARACTERS) {
      workerContext.postMessage({ ok: false, code: 'OUTPUT_TOO_LARGE' });
      return;
    }

    workerContext.postMessage({
      ok: true,
      html: result.value,
      warningCount: result.messages.length,
    });
  } catch {
    workerContext.postMessage({ ok: false, code: 'PARSE_FAILED' });
  }
}

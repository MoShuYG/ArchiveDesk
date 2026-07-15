import {
  DOCX_IFRAME_SANDBOX,
  buildDocxSandboxDocument,
} from "../../frontend/src/utils/docxPreviewSecurity";

describe("DOCX preview isolation", () => {
  test("builds a document with a deny-by-default content security policy", () => {
    const document = buildDocxSandboxDocument("<h1>安全预览</h1>");

    expect(document).toContain("default-src 'none'");
    expect(document).toContain("connect-src 'none'");
    expect(document).toContain("object-src 'none'");
    expect(document).toContain("form-action 'none'");
    expect(document.indexOf("Content-Security-Policy")).toBeLessThan(document.indexOf("<h1>安全预览</h1>"));
  });

  test("does not grant scripts or same-origin privileges to the preview frame", () => {
    expect(DOCX_IFRAME_SANDBOX).toBe("");
  });
});

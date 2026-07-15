import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {
  getLocale,
  messages,
  normalizeLanguage,
  translate,
  translateError,
  translateExternalMessage,
} from "../../frontend/src/i18n";

describe("frontend internationalization", () => {
  test("keeps the Chinese and English catalogs in exact key parity", () => {
    expect(Object.keys(messages["en-US"]).sort()).toEqual(Object.keys(messages["zh-CN"]).sort());
  });

  test("falls back to Chinese for missing or unsupported saved languages", () => {
    expect(normalizeLanguage(undefined)).toBe("zh-CN");
    expect(normalizeLanguage("fr-FR")).toBe("zh-CN");
    expect(normalizeLanguage("en-US")).toBe("en-US");
  });

  test("translates typed messages and interpolates dynamic values", () => {
    expect(translate("zh-CN", "history.total", { count: 12 })).toBe("共 12 条");
    expect(translate("en-US", "history.total", { count: 12 })).toBe("12 entries");
  });

  test("exposes the matching locale for dates and numbers", () => {
    expect(getLocale("zh-CN")).toBe("zh-CN");
    expect(getLocale("en-US")).toBe("en-US");
  });

  test("translates known server warnings and hides unknown Chinese errors in English mode", () => {
    expect(
      translateExternalMessage("en-US", "ffprobe 不可用，媒体元数据提取已降级。", "errors.generic"),
    ).toBe("ffprobe is unavailable. Media metadata extraction is running in reduced mode.");
    expect(translateExternalMessage("en-US", "无法识别的服务端错误。", "errors.generic")).toBe(
      "Something went wrong. Please try again.",
    );
  });

  test("uses API error codes in English while preserving specific Chinese server details", () => {
    expect(
      translateError(
        "en-US",
        { code: "INVALID_CREDENTIALS", message: "用户名或密码错误。" },
        "errors.loginFailed",
      ),
    ).toBe("The username or password is incorrect.");
    expect(
      translateError(
        "zh-CN",
        { code: "VALIDATION_ERROR", message: "路径不存在。" },
        "errors.validation",
      ),
    ).toBe("路径不存在。");
  });

  test("does not leave hard-coded Han text in frontend source outside the message catalog", () => {
    const sourceRoot = path.resolve(process.cwd(), "frontend", "src");
    const catalogPath = path.resolve(sourceRoot, "i18n", "messages.ts");
    const failures: string[] = [];

    for (const filePath of walkSourceFiles(sourceRoot)) {
      if (path.resolve(filePath) === catalogPath) continue;

      const sourceText = fs.readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );

      const visit = (node: ts.Node): void => {
        const text = getUserFacingLiteral(node);
        if (text && /[\u3400-\u9fff]/u.test(text)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          failures.push(`${path.relative(process.cwd(), filePath)}:${line + 1} ${JSON.stringify(text.trim())}`);
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    expect(failures).toEqual([]);
  });
});

function walkSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(entryPath);
    return /\.tsx?$/u.test(entry.name) ? [entryPath] : [];
  });
}

function getUserFacingLiteral(node: ts.Node): string | null {
  if (ts.isJsxText(node)) return node.getText();
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) return node.text;
  return null;
}

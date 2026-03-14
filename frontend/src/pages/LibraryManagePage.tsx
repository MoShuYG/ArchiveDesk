import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal } from '../components/common/Modal';
import { ScanProgress } from '../components/scan/ScanProgress';
import { useLibraryStore } from '../state/libraryStore';
import { useScanStore } from '../state/scanStore';
import type {
  CoverBrowserEntry,
  CoverBrowserSortBy,
  FolderCoverMode,
  FolderNode,
  LibraryRoot,
  RootEntry,
} from '../types/api';
import { libraryService } from '../services/libraryService';
import { validatePath, validateRootName } from '../utils/validation';
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage';

type FolderMap = Record<string, FolderNode[]>;

const COVER_MODE_LABELS: Record<FolderCoverMode, string> = {
  auto: '自动',
  none: '不显示',
  manual_item: '手动指定',
  manual_upload: '上传图片',
};

const COVER_SORT_OPTIONS: Array<{ label: string; value: CoverBrowserSortBy }> = [
  { label: '名称', value: 'name' },
  { label: '修改时间', value: 'updatedAt' },
  { label: '大小', value: 'size' },
];

function getParentRelPath(relPath: string): string {
  if (!relPath) return '';
  const index = relPath.lastIndexOf('/');
  return index === -1 ? '' : relPath.slice(0, index);
}

function CoverThumb({ url, className = 'h-10 w-10' }: { url: string | null | undefined; className?: string }) {
  const { src, isLoading } = useAuthenticatedImage(url ?? null);
  if (!url || !src) {
    return (
      <div className={`flex items-center justify-center rounded border border-border/60 bg-secondary text-muted-foreground ${className}`}>
        {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PhotoIcon className="h-5 w-5" />}
      </div>
    );
  }
  return <img src={src} alt="cover" className={`${className} rounded border border-border/60 object-cover`} />;
}

function RootFolderThumb({ className = 'h-32 w-full' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary ${className}`}>
      <FolderIcon className="h-10 w-10 text-muted-foreground/60" />
    </div>
  );
}

export function LibraryManagePage() {
  const roots = useLibraryStore((s) => s.roots);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const error = useLibraryStore((s) => s.error);
  const fetchRoots = useLibraryStore((s) => s.fetchRoots);
  const addRoot = useLibraryStore((s) => s.addRoot);
  const updateRoot = useLibraryStore((s) => s.updateRoot);
  const removeRoot = useLibraryStore((s) => s.removeRoot);
  const trackTask = useScanStore((s) => s.trackTask);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentRoot, setCurrentRoot] = useState<LibraryRoot | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [validationError, setValidationError] = useState('');

  const [rootEntries, setRootEntries] = useState<RootEntry[]>([]);
  const [rootEntriesLoading, setRootEntriesLoading] = useState(false);
  const [selectedRootId, setSelectedRootId] = useState<string>('');
  const [folderMap, setFolderMap] = useState<FolderMap>({});
  const folderMapRef = useRef<FolderMap>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loadingParents, setLoadingParents] = useState<string[]>([]);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderActionTarget, setFolderActionTarget] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [candidateModalNode, setCandidateModalNode] = useState<FolderNode | null>(null);
  const [candidateRelPath, setCandidateRelPath] = useState('');
  const [coverCandidates, setCoverCandidates] = useState<CoverBrowserEntry[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateSortBy, setCandidateSortBy] = useState<CoverBrowserSortBy>('name');
  const [candidateOrder, setCandidateOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    void fetchRoots();
  }, [fetchRoots]);

  const loadRootEntries = useCallback(async () => {
    setRootEntriesLoading(true);
    try {
      const response = await libraryService.listRootEntries({
        page: 1,
        pageSize: 500,
        sortBy: 'name',
        order: 'asc',
      });
      setRootEntries(response.items);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : '加载根目录卡片失败');
    } finally {
      setRootEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRootEntries();
  }, [loadRootEntries, roots.length]);

  function openAddModal() {
    setCurrentRoot(null);
    setName('');
    setPath('');
    setValidationError('');
    setInfoMessage(null);
    setIsAddModalOpen(true);
  }

  function openEditModal(root: LibraryRoot) {
    setCurrentRoot(root);
    setName(root.name);
    setPath(root.path);
    setValidationError('');
    setIsEditModalOpen(true);
  }

  function openDeleteModal(root: LibraryRoot) {
    setCurrentRoot(root);
    setIsDeleteModalOpen(true);
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError('');
    const nameCheck = validateRootName(name);
    if (!nameCheck.valid) {
      setValidationError(nameCheck.message);
      return;
    }
    const pathCheck = validatePath(path);
    if (!pathCheck.valid) {
      setValidationError(pathCheck.message);
      return;
    }
    try {
      const root = await addRoot(name, path);
      if (root.scanTaskId) {
        await trackTask(root.scanTaskId);
        setInfoMessage(`Library created. Initial scan started for "${root.name}".`);
      } else {
        setInfoMessage(`Library created: "${root.name}".`);
      }
      setIsAddModalOpen(false);
      await loadRootEntries();
    } catch {
      // handled by store
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentRoot) return;
    setValidationError('');
    const nameCheck = validateRootName(name);
    if (!nameCheck.valid) {
      setValidationError(nameCheck.message);
      return;
    }
    const pathCheck = validatePath(path);
    if (!pathCheck.valid) {
      setValidationError(pathCheck.message);
      return;
    }
    try {
      const updated = await updateRoot(currentRoot.id, { name, path });
      if (updated.scanTaskId) {
        await trackTask(updated.scanTaskId);
        setInfoMessage(`Root updated. A full rescan started for "${updated.name}".`);
      } else {
        setInfoMessage(`Root updated: "${updated.name}".`);
      }
      setIsEditModalOpen(false);
      await loadRootEntries();
    } catch {
      // handled by store
    }
  }

  async function handleDeleteConfirm() {
    if (!currentRoot) return;
    try {
      await removeRoot(currentRoot.id);
      setIsDeleteModalOpen(false);
      if (selectedRootId === currentRoot.id) {
        setSelectedRootId('');
      }
      await loadRootEntries();
    } catch {
      // handled by store
    }
  }

  const loadChildren = useCallback(
    async (parentRelPath: string, force = false) => {
      if (!selectedRootId) return;
      if (!force && folderMapRef.current[parentRelPath]) return;
      setLoadingParents((prev) => (prev.includes(parentRelPath) ? prev : [...prev, parentRelPath]));
      setFolderError(null);
      try {
        const response = await libraryService.listFolders({
          rootId: selectedRootId,
          parentRelPath,
          page: 1,
          pageSize: 200,
        });
        setFolderMap((prev) => {
          const next = {
            ...prev,
            [parentRelPath]: response.items,
          };
          folderMapRef.current = next;
          return next;
        });
      } catch (err) {
        setFolderError(err instanceof Error ? err.message : '目录加载失败');
      } finally {
        setLoadingParents((prev) => prev.filter((item) => item !== parentRelPath));
      }
    },
    [selectedRootId]
  );

  useEffect(() => {
    if (!selectedRootId) {
      setFolderMap({});
      folderMapRef.current = {};
      setExpanded([]);
      return;
    }
    setFolderMap({});
    folderMapRef.current = {};
    setExpanded([]);
    void loadChildren('', true);
  }, [loadChildren, selectedRootId]);

  async function refreshNode(relPath: string) {
    const parent = getParentRelPath(relPath);
    await loadChildren(parent, true);
    await loadRootEntries();
  }

  function toggleExpand(node: FolderNode) {
    setExpanded((prev) => {
      if (prev.includes(node.relPath)) {
        return prev.filter((item) => item !== node.relPath);
      }
      return [...prev, node.relPath];
    });
    if (!expanded.includes(node.relPath)) {
      void loadChildren(node.relPath);
    }
  }

  async function setCoverMode(node: FolderNode, mode: Exclude<FolderCoverMode, 'manual_upload' | 'manual_item'>) {
    if (!selectedRootId) return;
    setFolderActionTarget(node.relPath);
    try {
      await libraryService.setFolderCover({
        rootId: selectedRootId,
        relPath: node.relPath,
        mode,
      });
      await refreshNode(node.relPath);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : '封面设置失败');
    } finally {
      setFolderActionTarget(null);
    }
  }

  async function loadCoverBrowser(relPath: string) {
    if (!selectedRootId) return;
    setCandidateLoading(true);
    try {
      const response = await libraryService.listCoverBrowser({
        rootId: selectedRootId,
        relPath,
        page: 1,
        pageSize: 200,
        sortBy: candidateSortBy,
        order: candidateOrder,
        foldersFirst: true,
      });
      setCoverCandidates(response.items);
      setCandidateRelPath(relPath);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : '候选内容加载失败');
    } finally {
      setCandidateLoading(false);
    }
  }

  async function openCandidates(node: FolderNode) {
    setCandidateModalNode(node);
    await loadCoverBrowser(node.relPath);
  }

  useEffect(() => {
    if (!candidateModalNode) return;
    void loadCoverBrowser(candidateRelPath || candidateModalNode.relPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateSortBy, candidateOrder]);

  async function applyCandidate(itemId: string) {
    if (!selectedRootId || !candidateModalNode) return;
    setFolderActionTarget(candidateModalNode.relPath);
    try {
      await libraryService.setFolderCover({
        rootId: selectedRootId,
        relPath: candidateModalNode.relPath,
        mode: 'manual_item',
        itemId,
      });
      await refreshNode(candidateModalNode.relPath);
      setCandidateModalNode(null);
      setCoverCandidates([]);
      setCandidateRelPath('');
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : '设置封面失败');
    } finally {
      setFolderActionTarget(null);
    }
  }

  async function uploadCover(node: FolderNode, file: File | null) {
    if (!selectedRootId || !file) return;
    setFolderActionTarget(node.relPath);
    try {
      await libraryService.uploadFolderCover({
        rootId: selectedRootId,
        relPath: node.relPath,
        file,
      });
      await refreshNode(node.relPath);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : '上传封面失败');
    } finally {
      setFolderActionTarget(null);
    }
  }

  const renderedFolderRows = useMemo(() => {
    function buildRows(parentRelPath: string): FolderNode[] {
      const nodes = folderMap[parentRelPath] ?? [];
      const result: FolderNode[] = [];
      for (const node of nodes) {
        result.push(node);
        if (expanded.includes(node.relPath)) {
          result.push(...buildRows(node.relPath));
        }
      }
      return result;
    }
    return buildRows('');
  }, [expanded, folderMap]);

  const isRootFolderLoading = loadingParents.includes('');
  const selectedRoot = roots.find((root) => root.id === selectedRootId);
  const candidateCrumbs = candidateRelPath ? candidateRelPath.split('/').filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <FolderIcon className="h-7 w-7 text-primary" />
              根目录管理
            </h1>
            <p className="mt-1 text-muted-foreground">管理扫描入口路径。</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
            添加根目录
          </button>
        </header>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}
        {infoMessage ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">{infoMessage}</div> : null}

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/30 px-6 py-3 text-sm font-medium text-muted-foreground sm:grid">
            <div className="col-span-3">名称</div>
            <div className="col-span-6">路径</div>
            <div className="col-span-3 text-right">操作</div>
          </div>
          <div className="divide-y divide-border">
            {isLoading && roots.length === 0 ? <div className="p-8 text-center text-muted-foreground">正在加载根目录...</div> : null}
            {!isLoading && roots.length === 0 ? <div className="p-12 text-center text-muted-foreground">暂无根目录，请先添加。</div> : null}
            {roots.map((root) => (
              <div key={root.id} className="grid grid-cols-1 items-center gap-y-2 gap-x-4 p-4 transition-colors hover:bg-secondary/20 sm:grid-cols-12 sm:px-6 sm:py-4">
                <div className="col-span-12 truncate font-medium text-foreground sm:col-span-3">{root.name}</div>
                <div className="col-span-12 truncate rounded border border-border/50 bg-secondary/50 px-2.5 py-1 font-mono text-xs text-muted-foreground sm:col-span-6">
                  {root.path}
                </div>
                <div className="col-span-12 mt-2 flex justify-end gap-2 sm:col-span-3 sm:mt-0">
                  <button onClick={() => openEditModal(root)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary" title="编辑">
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => openDeleteModal(root)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="删除">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <ScanProgress />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">目录封面管理</h2>
          <p className="text-sm text-muted-foreground">第一层先展示导入的根目录，进入后再管理子目录封面。</p>
        </header>

        {!selectedRootId ? (
          <div className="rounded-lg border border-border/70 p-4">
            {rootEntriesLoading ? <div className="text-sm text-muted-foreground">正在加载根目录...</div> : null}
            {!rootEntriesLoading && rootEntries.length === 0 ? <div className="text-sm text-muted-foreground">暂无根目录可管理。</div> : null}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {rootEntries.map((root) => (
                <button
                  key={root.rootId}
                  type="button"
                  onClick={() => setSelectedRootId(root.rootId)}
                  className="rounded-xl border border-border/70 bg-background p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow"
                >
                  <RootFolderThumb className="h-32 w-full" />
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{root.name}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                当前根目录: <span className="font-medium text-foreground">{selectedRoot?.name ?? selectedRootId}</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-sm text-foreground hover:bg-secondary"
                onClick={() => setSelectedRootId('')}
              >
                <ArrowLeftIcon className="h-4 w-4" />
                返回根目录层
              </button>
            </div>

            {folderError ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {folderError}
              </div>
            ) : null}

            <div className="max-h-[560px] overflow-auto rounded-lg border border-border/70">
              {isRootFolderLoading && renderedFolderRows.length === 0 ? <div className="p-6 text-sm text-muted-foreground">正在加载目录...</div> : null}
              {!isRootFolderLoading && renderedFolderRows.length === 0 ? <div className="p-6 text-sm text-muted-foreground">该根目录下没有子目录。</div> : null}

              {renderedFolderRows.map((node) => {
                const isExpanded = expanded.includes(node.relPath);
                const actionLoading = folderActionTarget === node.relPath;
                return (
                  <div
                    key={node.relPath}
                    className="flex flex-col gap-2 border-b border-border/60 p-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
                    style={{ paddingLeft: `${node.depth * 14}px` }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={!node.hasChildren}
                        onClick={() => toggleExpand(node)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-40"
                        aria-label={isExpanded ? '收起目录' : '展开目录'}
                      >
                        {node.hasChildren ? isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" /> : <span className="inline-block h-4 w-4" />}
                      </button>
                      <CoverThumb url={node.depth <= 1 ? null : node.cover.url} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{node.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{node.relPath}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span className="rounded border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{COVER_MODE_LABELS[node.cover.mode]}</span>
                      <button type="button" disabled={actionLoading} onClick={() => void setCoverMode(node, 'auto')} className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        自动
                      </button>
                      <button type="button" disabled={actionLoading} onClick={() => void setCoverMode(node, 'none')} className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        不显示
                      </button>
                      <button type="button" disabled={actionLoading} onClick={() => void openCandidates(node)} className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        选目录图
                      </button>
                      <label className="cursor-pointer rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary">
                        上传
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            const file = event.target.files?.[0] ?? null;
                            void uploadCover(node, file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={candidateModalNode !== null} onClose={() => setCandidateModalNode(null)} title={candidateModalNode ? `选择封面 - ${candidateModalNode.name}` : '选择封面'}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button type="button" className="rounded px-1 hover:bg-secondary" onClick={() => void loadCoverBrowser(candidateModalNode?.relPath ?? '')}>
              目标目录
            </button>
            {candidateCrumbs.map((crumb, index) => {
              const relPath = candidateCrumbs.slice(0, index + 1).join('/');
              return (
                <span key={relPath} className="flex items-center gap-1">
                  <ChevronRightIcon className="h-3 w-3" />
                  <button type="button" className="rounded px-1 hover:bg-secondary" onClick={() => void loadCoverBrowser(relPath)}>
                    {crumb}
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={candidateSortBy}
              onChange={(event) => {
                setCandidateSortBy(event.target.value as CoverBrowserSortBy);
              }}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            >
              {COVER_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={candidateOrder}
              onChange={(event) => {
                setCandidateOrder(event.target.value as 'asc' | 'desc');
              }}
              className="rounded border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
            <button type="button" className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => void loadCoverBrowser(candidateRelPath)}>
              刷新
            </button>
          </div>
        </div>

        {candidateLoading ? <div className="text-sm text-muted-foreground">正在加载候选内容...</div> : null}
        {!candidateLoading && coverCandidates.length === 0 ? <div className="text-sm text-muted-foreground">当前目录下暂无可选图片，可继续进入子目录。</div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {coverCandidates.map((candidate) => (
            <button
              key={`${candidate.kind}-${candidate.relPath}`}
              type="button"
              onClick={() => {
                if (candidate.kind === 'folder') {
                  void loadCoverBrowser(candidate.relPath);
                  return;
                }
                if (candidate.itemId) {
                  void applyCandidate(candidate.itemId);
                }
              }}
              className="flex items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-secondary"
            >
              {candidate.kind === 'folder' ? <FolderIcon className="h-6 w-6 text-sky-600" /> : <CoverThumb url={candidate.thumbnailUrl} />}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
                <p className="truncate text-xs text-muted-foreground">{candidate.relPath}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="添加根目录">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <InputGroup id="add-name" label="名称" value={name} onChange={setName} placeholder="例如：我的资源库" required maxLength={128} />
          <InputGroup id="add-path" label="目录路径（绝对路径）" value={path} onChange={setPath} placeholder="例如：D:\\Data\\Media" required />
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <ActionButtons confirmLabel="添加" onCancel={() => setIsAddModalOpen(false)} confirmDisabled={isLoading} />
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="编辑根目录">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <InputGroup id="edit-name" label="名称" value={name} onChange={setName} required maxLength={128} />
          <InputGroup id="edit-path" label="目录路径（绝对路径）" value={path} onChange={setPath} required />
          {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
          <ActionButtons confirmLabel="保存" onCancel={() => setIsEditModalOpen(false)} confirmDisabled={isLoading} />
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="删除根目录">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            确认删除根目录 <span className="font-medium text-foreground">{currentRoot?.name}</span> 吗？
          </p>
          <ActionButtons confirmLabel="删除" onCancel={() => setIsDeleteModalOpen(false)} confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90" onConfirm={handleDeleteConfirm} confirmDisabled={isLoading} />
        </div>
      </Modal>
    </div>
  );
}

function InputGroup({
  id,
  label,
  value,
  onChange,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        {...inputProps}
      />
    </div>
  );
}

function ActionButtons({
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled,
  confirmClassName,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmDisabled?: boolean;
  confirmClassName?: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">
        取消
      </button>
      <button
        type={onConfirm ? 'button' : 'submit'}
        onClick={onConfirm ? () => void onConfirm() : undefined}
        disabled={confirmDisabled}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${confirmClassName ?? 'bg-primary text-primary-foreground hover:bg-primary/90'} disabled:opacity-60`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

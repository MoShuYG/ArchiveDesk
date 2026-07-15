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
import { useI18n } from '../hooks/useI18n';
import type { MessageKey, TranslationParams } from '../i18n';

type FolderMap = Record<string, FolderNode[]>;

const COVER_MODE_LABEL_KEYS: Record<FolderCoverMode, MessageKey> = {
  auto: 'library.coverMode.auto',
  none: 'library.coverMode.none',
  manual_item: 'library.coverMode.manualItem',
  manual_upload: 'library.coverMode.manualUpload',
};

const COVER_SORT_OPTIONS: Array<{ labelKey: MessageKey; value: CoverBrowserSortBy }> = [
  { labelKey: 'common.name', value: 'name' },
  { labelKey: 'common.modifiedTime', value: 'updatedAt' },
  { labelKey: 'common.size', value: 'size' },
];

type LocalizedErrorState = { value: unknown; fallbackKey: MessageKey };
type LocalizedMessageState = { key: MessageKey; params?: TranslationParams };

function getParentRelPath(relPath: string): string {
  if (!relPath) return '';
  const index = relPath.lastIndexOf('/');
  return index === -1 ? '' : relPath.slice(0, index);
}

function CoverThumb({ url, className = 'h-10 w-10' }: { url: string | null | undefined; className?: string }) {
  const { src, isLoading } = useAuthenticatedImage(url ?? null);
  const { t } = useI18n();
  if (!url || !src) {
    return (
      <div className={`flex items-center justify-center rounded border border-border/60 bg-secondary text-muted-foreground ${className}`}>
        {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PhotoIcon className="h-5 w-5" />}
      </div>
    );
  }
  return <img src={src} alt={t('library.coverAlt')} className={`${className} rounded border border-border/60 object-cover`} />;
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
  const { t, localizeError } = useI18n();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentRoot, setCurrentRoot] = useState<LibraryRoot | null>(null);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [validationError, setValidationError] = useState<MessageKey | null>(null);

  const [rootEntries, setRootEntries] = useState<RootEntry[]>([]);
  const [rootEntriesLoading, setRootEntriesLoading] = useState(false);
  const [selectedRootId, setSelectedRootId] = useState<string>('');
  const [folderMap, setFolderMap] = useState<FolderMap>({});
  const folderMapRef = useRef<FolderMap>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loadingParents, setLoadingParents] = useState<string[]>([]);
  const [folderError, setFolderError] = useState<LocalizedErrorState | null>(null);
  const [folderActionTarget, setFolderActionTarget] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<LocalizedMessageState | null>(null);

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
      setFolderError({ value: err, fallbackKey: 'errors.loadRootCardsFailed' });
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
    setValidationError(null);
    setInfoMessage(null);
    setIsAddModalOpen(true);
  }

  function openEditModal(root: LibraryRoot) {
    setCurrentRoot(root);
    setName(root.name);
    setPath(root.path);
    setValidationError(null);
    setIsEditModalOpen(true);
  }

  function openDeleteModal(root: LibraryRoot) {
    setCurrentRoot(root);
    setIsDeleteModalOpen(true);
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const nameCheck = validateRootName(name);
    if (!nameCheck.valid) {
      setValidationError(nameCheck.messageKey);
      return;
    }
    const pathCheck = validatePath(path);
    if (!pathCheck.valid) {
      setValidationError(pathCheck.messageKey);
      return;
    }
    try {
      const root = await addRoot(name, path);
      if (root.scanTaskId) {
        await trackTask(root.scanTaskId);
        setInfoMessage({ key: 'library.rootCreatedWithScan', params: { name: root.name } });
      } else {
        setInfoMessage({ key: 'library.rootCreated', params: { name: root.name } });
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
    setValidationError(null);
    const nameCheck = validateRootName(name);
    if (!nameCheck.valid) {
      setValidationError(nameCheck.messageKey);
      return;
    }
    const pathCheck = validatePath(path);
    if (!pathCheck.valid) {
      setValidationError(pathCheck.messageKey);
      return;
    }
    try {
      const updated = await updateRoot(currentRoot.id, { name, path });
      if (updated.scanTaskId) {
        await trackTask(updated.scanTaskId);
        setInfoMessage({ key: 'library.rootUpdatedWithScan', params: { name: updated.name } });
      } else {
        setInfoMessage({ key: 'library.rootUpdated', params: { name: updated.name } });
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
        setFolderError({ value: err, fallbackKey: 'errors.loadFoldersFailed' });
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
      setFolderError({ value: err, fallbackKey: 'errors.setCoverFailed' });
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
      setFolderError({ value: err, fallbackKey: 'errors.loadCoverCandidatesFailed' });
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
      setFolderError({ value: err, fallbackKey: 'errors.setCoverFailed' });
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
      setFolderError({ value: err, fallbackKey: 'errors.uploadCoverFailed' });
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
    <div className="flex flex-col gap-5 pb-10">
      <section className="app-surface flex flex-col gap-4 p-5 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderIcon className="h-5 w-5" />
              </span>
              {t('library.title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('library.description')}</p>
          </div>
          <button
            onClick={openAddModal}
            className="app-button-primary"
          >
            <PlusIcon className="h-5 w-5" />
            {t('library.addRoot')}
          </button>
        </header>

        {error ? (
          <div className="app-alert-error flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{localizeError(error.value, error.fallbackKey)}</p>
          </div>
        ) : null}
        {infoMessage ? <div className="app-alert-success">{t(infoMessage.key, infoMessage.params)}</div> : null}

        <section className="overflow-hidden rounded-lg border border-border">
          <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/35 px-5 py-3 text-xs font-semibold text-muted-foreground sm:grid">
            <div className="col-span-3">{t('common.name')}</div>
            <div className="col-span-6">{t('common.path')}</div>
            <div className="col-span-3 text-right">{t('common.actions')}</div>
          </div>
          <div className="divide-y divide-border">
            {isLoading && roots.length === 0 ? <div className="app-empty-state">{t('library.loadingRoots')}</div> : null}
            {!isLoading && roots.length === 0 ? (
              <div className="app-empty-state">
                <FolderIcon className="h-9 w-9 text-muted-foreground/60" />
                <p className="font-medium text-foreground">{t('library.noRoots')}</p>
                <p>{t('library.noRootsDescription')}</p>
              </div>
            ) : null}
            {roots.map((root) => (
              <div key={root.id} className="grid grid-cols-1 items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-secondary/30 sm:grid-cols-12 sm:px-5">
                <div className="col-span-12 truncate font-medium text-foreground sm:col-span-3">{root.name}</div>
                <div className="col-span-12 truncate rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground sm:col-span-6">
                  {root.path}
                </div>
                <div className="col-span-12 mt-2 flex justify-end gap-2 sm:col-span-3 sm:mt-0">
                  <button onClick={() => openEditModal(root)} className="app-icon-button" title={t('common.edit')} aria-label={t('common.editNamed', { name: root.name })}>
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => openDeleteModal(root)} className="app-icon-button hover:bg-destructive/10 hover:text-destructive" title={t('common.delete')} aria-label={t('common.deleteNamed', { name: root.name })}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <ScanProgress />

      <section className="app-surface flex flex-col gap-4 p-5 sm:p-6">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">{t('library.coverManagement')}</h2>
          <p className="text-sm text-muted-foreground">{t('library.coverDescription')}</p>
        </header>

        {!selectedRootId ? (
          <div className="border-t border-border pt-4">
            {rootEntriesLoading ? <div className="text-sm text-muted-foreground">{t('library.loadingRoots')}</div> : null}
            {!rootEntriesLoading && rootEntries.length === 0 ? <div className="text-sm text-muted-foreground">{t('library.noRootsToManage')}</div> : null}
            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {rootEntries.map((root) => (
                <button
                  key={root.rootId}
                  type="button"
                  onClick={() => setSelectedRootId(root.rootId)}
                  className="rounded-lg border border-border bg-background p-3 text-left shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
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
                {t('library.currentRoot', { name: selectedRoot?.name ?? selectedRootId })}
              </div>
              <button
                type="button"
                className="app-button-secondary min-h-9 px-3"
                onClick={() => setSelectedRootId('')}
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {t('library.backToRootLevel')}
              </button>
            </div>

            {folderError ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {localizeError(folderError.value, folderError.fallbackKey)}
              </div>
            ) : null}

            <div className="max-h-[560px] overflow-auto rounded-lg border border-border bg-background/60">
              {isRootFolderLoading && renderedFolderRows.length === 0 ? <div className="p-6 text-sm text-muted-foreground">{t('library.loadingFolders')}</div> : null}
              {!isRootFolderLoading && renderedFolderRows.length === 0 ? <div className="p-6 text-sm text-muted-foreground">{t('library.noSubfolders')}</div> : null}

              {renderedFolderRows.map((node) => {
                const isExpanded = expanded.includes(node.relPath);
                const actionLoading = folderActionTarget === node.relPath;
                return (
                  <div
                    key={node.relPath}
                    className="flex flex-col gap-3 border-b border-border/60 p-3 transition-colors last:border-b-0 hover:bg-secondary/25 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    style={{ paddingLeft: `${node.depth * 14}px` }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        disabled={!node.hasChildren}
                        onClick={() => toggleExpand(node)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-40"
                        aria-label={isExpanded ? t('library.collapseFolder') : t('library.expandFolder')}
                      >
                        {node.hasChildren ? isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" /> : <span className="inline-block h-4 w-4" />}
                      </button>
                      <CoverThumb url={node.depth <= 1 ? null : node.cover.url} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground" title={node.name}>
                          {node.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground" title={node.relPath}>
                          {node.relPath}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap md:justify-end">
                      <span className="shrink-0 whitespace-nowrap rounded border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{t(COVER_MODE_LABEL_KEYS[node.cover.mode])}</span>
                      <button type="button" disabled={actionLoading} onClick={() => void setCoverMode(node, 'auto')} className="shrink-0 whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        {t('common.automatic')}
                      </button>
                      <button type="button" disabled={actionLoading} onClick={() => void setCoverMode(node, 'none')} className="shrink-0 whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        {t('common.hide')}
                      </button>
                      <button type="button" disabled={actionLoading} onClick={() => void openCandidates(node)} className="shrink-0 whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary disabled:opacity-60">
                        {t('library.selectFolderImage')}
                      </button>
                      <label className="shrink-0 cursor-pointer whitespace-nowrap rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-secondary">
                        {t('common.upload')}
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

      <Modal isOpen={candidateModalNode !== null} onClose={() => setCandidateModalNode(null)} title={candidateModalNode ? t('library.selectCoverFor', { name: candidateModalNode.name }) : t('library.selectCover')}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button type="button" className="rounded px-1 hover:bg-secondary" onClick={() => void loadCoverBrowser(candidateModalNode?.relPath ?? '')}>
              {t('common.targetFolder')}
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
                  {t(option.labelKey)}
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
              <option value="asc">{t('common.ascending')}</option>
              <option value="desc">{t('common.descending')}</option>
            </select>
            <button type="button" className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary" onClick={() => void loadCoverBrowser(candidateRelPath)}>
              {t('common.refresh')}
            </button>
          </div>
        </div>

        {candidateLoading ? <div className="text-sm text-muted-foreground">{t('library.loadingCandidates')}</div> : null}
        {!candidateLoading && coverCandidates.length === 0 ? <div className="text-sm text-muted-foreground">{t('library.noCandidates')}</div> : null}
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('library.addRoot')}>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <InputGroup id="add-name" label={t('common.name')} value={name} onChange={setName} placeholder={t('library.namePlaceholder')} required maxLength={128} />
          <InputGroup id="add-path" label={t('library.pathLabel')} value={path} onChange={setPath} placeholder={t('library.pathPlaceholder')} required />
          {validationError ? <p className="text-sm text-destructive">{t(validationError)}</p> : null}
          <ActionButtons confirmLabel={t('common.add')} onCancel={() => setIsAddModalOpen(false)} confirmDisabled={isLoading} />
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('library.editRoot')}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <InputGroup id="edit-name" label={t('common.name')} value={name} onChange={setName} required maxLength={128} />
          <InputGroup id="edit-path" label={t('library.pathLabel')} value={path} onChange={setPath} required />
          {validationError ? <p className="text-sm text-destructive">{t(validationError)}</p> : null}
          <ActionButtons confirmLabel={t('common.save')} onCancel={() => setIsEditModalOpen(false)} confirmDisabled={isLoading} />
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('library.deleteRoot')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('library.deleteConfirm', { name: currentRoot?.name ?? '' })}
          </p>
          <ActionButtons confirmLabel={t('common.delete')} onCancel={() => setIsDeleteModalOpen(false)} confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90" onConfirm={handleDeleteConfirm} confirmDisabled={isLoading} />
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
  const { t } = useI18n();
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary">
        {t('common.cancel')}
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

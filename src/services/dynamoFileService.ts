// @ts-nocheck
import { queryDdbItems, putDdbItem, getDdbItem, deleteDdbItem } from "./awsService";
import type {
  FileSystemItem,
  FileItemType,
  SortField,
  SortDirection,
  FolderContents,
  BreadcrumbSegment,
  TrashedItem,
  StorageAnalytics,
  Share,
} from "./fileService";

// ── Helpers ──────────────────────────────────────────────────────

function getMimeType(type: string, name: string) {
  if (type === "document") {
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".docx"))
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (name.endsWith(".txt")) return "text/plain";
  }
  if (type === "image") {
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  }
  return "application/octet-stream";
}

async function fetchAll(workspaceId: string): Promise<FileSystemItem[]> {
  const items = await queryDdbItems(workspaceId);
  return items as FileSystemItem[];
}

/** Build breadcrumb trail from a flat list of items, walking up parentId chain. */
function buildBreadcrumb(
  all: FileSystemItem[],
  folderId: string | null
): BreadcrumbSegment[] {
  if (!folderId) return [];
  const chain: BreadcrumbSegment[] = [];
  let current = all.find((i) => i.id === folderId);
  while (current) {
    chain.unshift({ id: current.id, name: current.name });
    current = current.parentId
      ? all.find((i) => i.id === current!.parentId)
      : undefined;
  }
  return chain;
}

// ── CRUD Operations ──────────────────────────────────────────────

export async function getFiles(
  workspaceId: string,
  folderId: string | null = null,
  sortBy: SortField = "name",
  sortDir: SortDirection = "asc",
  filterType?: FileItemType
): Promise<FolderContents> {
  const all = await fetchAll(workspaceId);

  // Filter to children of the current folder, excluding trashed items
  let items = all.filter(
    (i) => i.parentId === folderId && !(i as any).trashed
  );

  if (filterType) {
    items = items.filter((i) => i.type === filterType);
  }

  // Sort — folders always first, then by the chosen field
  items.sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;

    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "size":
        cmp = (a.size || 0) - (b.size || 0);
        break;
      case "modifiedAt":
        cmp =
          new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const currentFolder = folderId
    ? all.find((i) => i.id === folderId) ?? null
    : null;
  const breadcrumb = buildBreadcrumb(all, folderId);

  return { items, breadcrumb, currentFolder };
}

export async function getFolder(
  workspaceId: string,
  folderId: string
): Promise<FileSystemItem | null> {
  return (await getDdbItem(workspaceId, folderId)) as FileSystemItem;
}

export async function createFolder(
  workspaceId: string,
  name: string,
  parentId: string | null
): Promise<FileSystemItem> {
  // Check for duplicate names within the same parent
  const all = await fetchAll(workspaceId);
  const exists = all.find(
    (i) =>
      i.parentId === parentId &&
      i.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    throw new Error("A file with this name already exists here");
  }

  const newFolder: FileSystemItem = {
    id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: "folder",
    parentId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    owner: "You",
    isStarred: false,
    size: 0,
    mimeType: "",
  };
  await putDdbItem(workspaceId, newFolder.id, newFolder);
  return newFolder;
}

export async function renameItem(
  workspaceId: string,
  itemId: string,
  newName: string
): Promise<void> {
  const item = (await getDdbItem(workspaceId, itemId)) as FileSystemItem;
  if (item) {
    item.name = newName;
    item.modifiedAt = new Date().toISOString();
    await putDdbItem(workspaceId, itemId, item);
  }
}

export async function moveItems(
  workspaceId: string,
  itemIds: string[],
  targetFolderId: string | null
): Promise<void> {
  for (const id of itemIds) {
    const item = (await getDdbItem(workspaceId, id)) as FileSystemItem;
    if (item) {
      item.parentId = targetFolderId;
      item.modifiedAt = new Date().toISOString();
      await putDdbItem(workspaceId, id, item);
    }
  }
}

export async function copyItems(
  workspaceId: string,
  itemIds: string[],
  targetFolderId: string | null
): Promise<void> {
  for (const id of itemIds) {
    const item = (await getDdbItem(workspaceId, id)) as FileSystemItem;
    if (item) {
      const newItem = {
        ...item,
        id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        parentId: targetFolderId,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      await putDdbItem(workspaceId, newItem.id, newItem);
    }
  }
}

export async function deleteItems(
  workspaceId: string,
  itemIds: string[]
): Promise<{ deletedCount: number; childrenCount: number }> {
  const all = await fetchAll(workspaceId);

  // Recursively collect children
  function collectChildren(parentId: string): string[] {
    const children = all.filter((i) => i.parentId === parentId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(collectChildren(child.id));
    }
    return ids;
  }

  let allIdsToDelete: string[] = [];
  for (const id of itemIds) {
    allIdsToDelete.push(id);
    allIdsToDelete = allIdsToDelete.concat(collectChildren(id));
  }

  for (const id of allIdsToDelete) {
    await deleteDdbItem(workspaceId, id);
  }

  return {
    deletedCount: itemIds.length,
    childrenCount: allIdsToDelete.length - itemIds.length,
  };
}

export async function countChildren(
  workspaceId: string,
  itemIds: string[]
): Promise<number> {
  const all = await fetchAll(workspaceId);
  let count = 0;
  for (const id of itemIds) {
    count += all.filter((i) => i.parentId === id).length;
  }
  return count;
}

export async function starItem(
  workspaceId: string,
  itemId: string,
  isStarred: boolean
): Promise<void> {
  const item = (await getDdbItem(workspaceId, itemId)) as FileSystemItem;
  if (item) {
    item.isStarred = isStarred;
    await putDdbItem(workspaceId, itemId, item);
  }
}

export async function getStorageUsed(workspaceId: string): Promise<number> {
  const all = await fetchAll(workspaceId);
  return all.reduce((sum, item) => sum + (item.size || 0), 0);
}

export async function addUploadedFile(
  workspaceId: string,
  folderId: string | null,
  fileName: string,
  fileSize: number,
  previewDataUrl?: string,
  s3Key?: string
): Promise<FileSystemItem> {
  const type = fileName.match(/\.(jpg|jpeg|png|gif)$/i)
    ? "image"
    : fileName.match(/\.(mp4|mov)$/i)
      ? "video"
      : "document";
  const newFile: FileSystemItem = {
    id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: fileName,
    type: type as FileItemType,
    parentId: folderId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    owner: "You",
    size: fileSize,
    mimeType: getMimeType(type, fileName),
    isStarred: false,
    previewDataUrl: s3Key || previewDataUrl,
  };
  await putDdbItem(workspaceId, newFile.id, newFile);
  return newFile;
}

export async function checkDuplicate(
  workspaceId: string,
  folderId: string | null,
  fileName: string
): Promise<boolean> {
  const all = await fetchAll(workspaceId);
  return all.some((i) => i.parentId === folderId && i.name === fileName);
}

// ── Trash Operations (stubs — items are hard-deleted for now) ─────

export async function getTrashedItems(
  workspaceId: string
): Promise<TrashedItem[]> {
  return [];
}

export async function verifyParentFolderExists(
  workspaceId: string,
  itemId: string
): Promise<boolean> {
  return true;
}

export async function checkRestoreConflict(
  workspaceId: string,
  itemId: string,
  restoreToRoot?: boolean
): Promise<FileSystemItem | null> {
  return null;
}

export async function restoreTrashedItem(
  workspaceId: string,
  itemId: string,
  newParentId?: string | null
): Promise<void> {}

export async function restoreTrashedItems(
  workspaceId: string,
  itemIds: string[]
): Promise<{ restoredCount: number; conflictCount: number }> {
  return { restoredCount: 0, conflictCount: 0 };
}

export async function permanentlyDeleteItems(
  workspaceId: string,
  itemIds: string[]
): Promise<void> {}

export async function emptyTrash(workspaceId: string): Promise<void> {}

// ── Analytics ────────────────────────────────────────────────────

export async function getStorageAnalytics(
  workspaceId: string
): Promise<StorageAnalytics> {
  const all = await fetchAll(workspaceId);
  const used = all.reduce((sum, item) => sum + (item.size || 0), 0);
  const total = 15 * 1024 * 1024 * 1024; // 15 GB

  // Build file-by-format breakdown
  const formatMap: Record<string, { count: number; size: number }> = {};
  for (const item of all) {
    if (item.type === "folder") continue;
    const ext = item.name.split(".").pop()?.toLowerCase() || "other";
    if (!formatMap[ext]) formatMap[ext] = { count: 0, size: 0 };
    formatMap[ext].count++;
    formatMap[ext].size += item.size || 0;
  }
  const filesByFormat = Object.entries(formatMap).map(([format, data]) => ({
    format,
    ...data,
  }));

  // Top large files
  const topLargeFiles = all
    .filter((i) => i.type !== "folder")
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, 5)
    .map((i) => ({ name: i.name, size: i.size || 0, type: i.type }));

  return { used, total, filesByFormat, topLargeFiles } as any;
}

export async function getAllFiles(
  workspaceId: string
): Promise<FileSystemItem[]> {
  return await fetchAll(workspaceId);
}

// ── Sharing (stubs — not yet backed by DynamoDB) ─────────────────

export async function getShareSettings(
  workspaceId: string,
  fileId: string
): Promise<Share | null> {
  return null;
}

export async function updateShareSettings(
  workspaceId: string,
  fileId: string,
  updates: Partial<Share>
): Promise<Share> {
  return null as any;
}

export async function addPersonToShare(
  workspaceId: string,
  fileId: string,
  email: string,
  role: any
): Promise<Share> {
  return null as any;
}

export async function removePersonFromShare(
  workspaceId: string,
  fileId: string,
  email: string
): Promise<Share> {
  return null as any;
}

export async function generatePublicLink(
  workspaceId: string,
  fileId: string,
  role: any,
  expiryDays: number | null,
  customPassword?: string
): Promise<Share> {
  return null as any;
}

export async function revokePublicLink(
  workspaceId: string,
  fileId: string
): Promise<Share> {
  return null as any;
}

export async function getFileByShareToken(
  token: string
): Promise<{ file: FileSystemItem; share: Share; workspaceId: string } | null> {
  return null;
}

// @ts-nocheck
import { queryDdbItems, putDdbItem, getDdbItem, deleteDdbItem } from "./awsService";
import type { FileSystemItem, FileItemType, SortField, SortDirection, FolderContents, TrashedItem, StorageAnalytics, Share } from "./fileService";

function getMimeType(type: string, name: string) {
  if (type === "document") {
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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

export async function getFiles(
  workspaceId: string,
  folderId: string | null = null,
  sortBy: SortField = "name",
  sortDir: SortDirection = "asc",
  filterType?: FileItemType
): Promise<FolderContents> {
  const all = await fetchAll(workspaceId);
  let items = all.filter(i => i.parentId === folderId && !(i as any).trashed);
  
  if (filterType) {
    items = items.filter((i) => i.type === filterType);
  }

  items.sort((a, b) => {
    let valA = a[sortBy] ?? "";
    let valB = b[sortBy] ?? "";
    if (typeof valA === "string" && typeof valB === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type !== "folder");
  return { folders, files, breadcrumbs: [] } as any;
}

export async function getFolder(workspaceId: string, folderId: string): Promise<FileSystemItem | null> {
  return await getDdbItem(workspaceId, folderId) as FileSystemItem;
}

export async function createFolder(workspaceId: string, name: string, parentId: string | null): Promise<FileSystemItem> {
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

export async function renameItem(workspaceId: string, itemId: string, newName: string): Promise<void> {
  const item = await getDdbItem(workspaceId, itemId) as FileSystemItem;
  if (item) {
    item.name = newName;
    item.modifiedAt = new Date().toISOString();
    await putDdbItem(workspaceId, itemId, item);
  }
}

export async function moveItems(workspaceId: string, itemIds: string[], targetFolderId: string | null): Promise<void> {
  for (const id of itemIds) {
    const item = await getDdbItem(workspaceId, id) as FileSystemItem;
    if (item) {
      item.parentId = targetFolderId;
      item.modifiedAt = new Date().toISOString();
      await putDdbItem(workspaceId, id, item);
    }
  }
}

export async function copyItems(workspaceId: string, itemIds: string[], targetFolderId: string | null): Promise<void> {
  for (const id of itemIds) {
    const item = await getDdbItem(workspaceId, id) as FileSystemItem;
    if (item) {
      const newItem = { ...item, id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, parentId: targetFolderId, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() };
      await putDdbItem(workspaceId, newItem.id, newItem);
    }
  }
}

export async function deleteItems(workspaceId: string, itemIds: string[]): Promise<{ deletedCount: number; childrenCount: number }> {
  for (const id of itemIds) {
    await deleteDdbItem(workspaceId, id);
  }
  return { deletedCount: itemIds.length, childrenCount: 0 };
}

export async function countChildren(workspaceId: string, folderId: string): Promise<number> {
  const all = await fetchAll(workspaceId);
  return all.filter(i => i.parentId === folderId).length;
}

export async function starItem(workspaceId: string, itemId: string, isStarred: boolean): Promise<void> {
  const item = await getDdbItem(workspaceId, itemId) as FileSystemItem;
  if (item) {
    item.isStarred = isStarred;
    await putDdbItem(workspaceId, itemId, item);
  }
}

export async function getStorageUsed(workspaceId: string): Promise<number> {
  const all = await fetchAll(workspaceId);
  return all.reduce((sum, item) => sum + (item.size || 0), 0);
}

export async function addUploadedFile(workspaceId: string, folderId: string | null, fileName: string, fileSize: number, previewDataUrl?: string, s3Key?: string): Promise<FileSystemItem> {
  const type = fileName.match(/\.(jpg|jpeg|png|gif)$/i) ? "image" : fileName.match(/\.(mp4|mov)$/i) ? "video" : "document";
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
    previewDataUrl: s3Key || previewDataUrl, // Store s3 key here for now as a workaround
  };
  await putDdbItem(workspaceId, newFile.id, newFile);
  return newFile;
}

export async function checkDuplicate(workspaceId: string, folderId: string | null, fileName: string): Promise<boolean> {
  const all = await fetchAll(workspaceId);
  return all.some(i => i.parentId === folderId && i.name === fileName);
}

export async function getTrashedItems(workspaceId: string): Promise<TrashedItem[]> {
  return [];
}

export async function verifyParentFolderExists(workspaceId: string, itemId: string): Promise<boolean> {
  return true;
}

export async function checkRestoreConflict(workspaceId: string, itemId: string, originalParentId: string | null): Promise<boolean> {
  return false;
}

export async function restoreTrashedItem(workspaceId: string, itemId: string, newParentId?: string | null): Promise<void> {}

export async function restoreTrashedItems(workspaceId: string, itemIds: string[]): Promise<{ restoredCount: number; conflictCount: number }> {
  return { restoredCount: 0, conflictCount: 0 };
}

export async function permanentlyDeleteItems(workspaceId: string, itemIds: string[]): Promise<void> {}

export async function emptyTrash(workspaceId: string): Promise<void> {}

export async function getStorageAnalytics(workspaceId: string): Promise<StorageAnalytics> {
  return { used: 0, total: 15 * 1024 * 1024 * 1024, filesByFormat: [], topLargeFiles: [] } as any;
}

export async function getAllFiles(workspaceId: string): Promise<FileSystemItem[]> {
  return await fetchAll(workspaceId);
}

export async function getShareSettings(workspaceId: string, fileId: string): Promise<Share | null> {
  return null;
}

export async function updateShareSettings(workspaceId: string, fileId: string, updates: Partial<Share>): Promise<Share> {
  return null as any;
}

export async function addPersonToShare(workspaceId: string, fileId: string, email: string, role: any): Promise<Share> {
  return null as any;
}

export async function removePersonFromShare(workspaceId: string, fileId: string, email: string): Promise<Share> {
  return null as any;
}

export async function generatePublicLink(workspaceId: string, fileId: string, role: any, expiryDays: number | null, customPassword?: string): Promise<Share> {
  return null as any;
}

export async function revokePublicLink(workspaceId: string, fileId: string): Promise<Share> {
  return null as any;
}

export async function getFileByShareToken(token: string): Promise<{ file: FileSystemItem; share: Share; workspaceId: string } | null> {
  return null;
}

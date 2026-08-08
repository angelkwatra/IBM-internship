import * as dynamoFS from "./dynamoFileService";
import { isAWSEnabled } from "./awsService";
/**
 * fileService.ts — Typed mock file service for CloudVault.
 *
 * Operates on an in-memory file tree scoped per workspace.
 * Every method is async with simulated latency (200-500ms).
 */

import { mockStorage } from "../lib/mockPersistence";

// ── Types ────────────────────────────────────────────────────────

export type FileItemType =
  | "folder"
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "video"
  | "archive"
  | "other";

export interface FileSystemItem {
  id: string;
  name: string;
  type: FileItemType;
  /** null for root-level items */
  parentId: string | null;
  createdAt: string;
  modifiedAt: string;
  isStarred: boolean;
  owner: string;
  /** Size in bytes — 0 for folders */
  size: number;
  /** MIME type — empty for folders */
  mimeType: string;

  // Sharing extensions
  sharedWithMe?: boolean;
  sharedBy?: string;
  sharedDate?: string;
  sharedRole?: "viewer" | "commenter" | "editor";

  // Client-side preview data
  previewDataUrl?: string;
}

export interface SharePerson {
  email: string;
  role: "viewer" | "commenter" | "editor";
}

export interface PublicLinkSettings {
  enabled: boolean;
  token: string;
  accessLevel: "viewer" | "commenter" | "editor";
  password?: string;
  expiresAt?: string;
  downloadLimit?: number;
  downloadCount: number;
}

export interface Share {
  fileId: string;
  sharedWith: SharePerson[];
  publicLink: PublicLinkSettings | null;
}

export interface BreadcrumbSegment {
  id: string | null;
  name: string;
}

export interface FolderContents {
  items: FileSystemItem[];
  breadcrumb: BreadcrumbSegment[];
  currentFolder: FileSystemItem | null;
}

export type SortField = "name" | "size" | "modifiedAt" | "type";
export type SortDirection = "asc" | "desc";

export interface DuplicateConflict {
  existingItem: FileSystemItem;
  incomingName: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function delay(min = 200, max = 500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function uid(): string {
  return "item_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function daysAgo(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

function mimeForType(type: FileItemType, name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    mp4: "video/mp4",
    mov: "video/quicktime",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    txt: "text/plain",
    md: "text/markdown",
  };
  if (type === "folder") return "";
  return map[ext] ?? "application/octet-stream";
}

function inferType(name: string): FileItemType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
  const pdfExts = ["pdf"];
  const docExts = ["docx", "doc", "txt", "md", "rtf"];
  const spreadsheetExts = ["xlsx", "xls", "csv"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz"];

  if (imageExts.includes(ext)) return "image";
  if (pdfExts.includes(ext)) return "pdf";
  if (docExts.includes(ext)) return "document";
  if (spreadsheetExts.includes(ext)) return "spreadsheet";
  if (videoExts.includes(ext)) return "video";
  if (archiveExts.includes(ext)) return "archive";
  return "other";
}

// ── Mock Data Factory ────────────────────────────────────────────

function createMockTree(): FileSystemItem[] {
  const owner = "You";

  // ── Folders ──
  const folders: FileSystemItem[] = [
    { id: "folder_design", name: "Design Assets", type: "folder", parentId: null, createdAt: daysAgo(90), modifiedAt: daysAgo(2), isStarred: true, owner, size: 0, mimeType: "" },
    { id: "folder_docs", name: "Documents", type: "folder", parentId: null, createdAt: daysAgo(120), modifiedAt: daysAgo(1), isStarred: false, owner, size: 0, mimeType: "" },
    { id: "folder_photos", name: "Photos", type: "folder", parentId: null, createdAt: daysAgo(60), modifiedAt: daysAgo(5), isStarred: false, owner, size: 0, mimeType: "" },
    { id: "folder_videos", name: "Video Projects", type: "folder", parentId: null, createdAt: daysAgo(45), modifiedAt: daysAgo(3), isStarred: false, owner, size: 0, mimeType: "" },
    { id: "folder_archive", name: "Archive", type: "folder", parentId: null, createdAt: daysAgo(200), modifiedAt: daysAgo(30), isStarred: false, owner, size: 0, mimeType: "" },
    // Nested
    { id: "folder_design_icons", name: "Icons", type: "folder", parentId: "folder_design", createdAt: daysAgo(80), modifiedAt: daysAgo(7), isStarred: false, owner, size: 0, mimeType: "" },
    { id: "folder_design_brand", name: "Brand Guidelines", type: "folder", parentId: "folder_design", createdAt: daysAgo(70), modifiedAt: daysAgo(4), isStarred: true, owner, size: 0, mimeType: "" },
    { id: "folder_docs_contracts", name: "Contracts", type: "folder", parentId: "folder_docs", createdAt: daysAgo(100), modifiedAt: daysAgo(10), isStarred: false, owner, size: 0, mimeType: "" },
    // Deep nesting for breadcrumb collapse testing
    { id: "folder_deep_1", name: "2025 Projects", type: "folder", parentId: "folder_design_brand", createdAt: daysAgo(30), modifiedAt: daysAgo(2), isStarred: false, owner, size: 0, mimeType: "" },
    { id: "folder_deep_2", name: "Q3 Campaign", type: "folder", parentId: "folder_deep_1", createdAt: daysAgo(20), modifiedAt: daysAgo(1), isStarred: false, owner, size: 0, mimeType: "" },
  ];

  // ── Files ──
  const files: FileSystemItem[] = [
    // Root files
    { id: "file_1", name: "Project Roadmap.pdf", type: "pdf", parentId: null, createdAt: daysAgo(30), modifiedAt: daysAgo(1), isStarred: true, owner, size: 2_456_000, mimeType: "" },
    { id: "file_2", name: "Team Photo 2025.jpg", type: "image", parentId: null, createdAt: daysAgo(15), modifiedAt: daysAgo(15), isStarred: false, owner, size: 4_820_000, mimeType: "" },
    { id: "file_3", name: "Q3 Budget Analysis.xlsx", type: "spreadsheet", parentId: null, createdAt: daysAgo(10), modifiedAt: daysAgo(2), isStarred: false, owner, size: 1_230_000, mimeType: "" },
    { id: "file_4", name: "Meeting Notes.docx", type: "document", parentId: null, createdAt: daysAgo(5), modifiedAt: daysAgo(1), isStarred: false, owner, size: 89_000, mimeType: "" },
    { id: "file_5", name: "Product Demo.mp4", type: "video", parentId: null, createdAt: daysAgo(8), modifiedAt: daysAgo(8), isStarred: true, owner, size: 245_000_000, mimeType: "" },
    { id: "file_6", name: "Release Notes v2.1.md", type: "document", parentId: null, createdAt: daysAgo(3), modifiedAt: daysAgo(1), isStarred: false, owner, size: 12_400, mimeType: "" },

    // Design Assets files
    { id: "file_d1", name: "Hero Banner.png", type: "image", parentId: "folder_design", createdAt: daysAgo(20), modifiedAt: daysAgo(3), isStarred: false, owner, size: 3_400_000, mimeType: "" },
    { id: "file_d2", name: "Logo Dark.svg", type: "image", parentId: "folder_design", createdAt: daysAgo(60), modifiedAt: daysAgo(10), isStarred: true, owner, size: 45_000, mimeType: "" },
    { id: "file_d3", name: "Design System v2.pdf", type: "pdf", parentId: "folder_design", createdAt: daysAgo(25), modifiedAt: daysAgo(5), isStarred: false, owner, size: 8_900_000, mimeType: "" },
    { id: "file_d4", name: "Wireframes.pdf", type: "pdf", parentId: "folder_design", createdAt: daysAgo(18), modifiedAt: daysAgo(7), isStarred: false, owner, size: 5_600_000, mimeType: "" },

    // Icons subfolder
    { id: "file_i1", name: "icon-home.svg", type: "image", parentId: "folder_design_icons", createdAt: daysAgo(40), modifiedAt: daysAgo(40), isStarred: false, owner, size: 2_300, mimeType: "" },
    { id: "file_i2", name: "icon-settings.svg", type: "image", parentId: "folder_design_icons", createdAt: daysAgo(40), modifiedAt: daysAgo(40), isStarred: false, owner, size: 3_100, mimeType: "" },
    { id: "file_i3", name: "icon-user.svg", type: "image", parentId: "folder_design_icons", createdAt: daysAgo(40), modifiedAt: daysAgo(40), isStarred: false, owner, size: 2_800, mimeType: "" },

    // Brand Guidelines subfolder
    { id: "file_b1", name: "Brand Colors.pdf", type: "pdf", parentId: "folder_design_brand", createdAt: daysAgo(50), modifiedAt: daysAgo(20), isStarred: false, owner, size: 1_200_000, mimeType: "" },
    { id: "file_b2", name: "Typography Guide.docx", type: "document", parentId: "folder_design_brand", createdAt: daysAgo(50), modifiedAt: daysAgo(15), isStarred: false, owner, size: 340_000, mimeType: "" },

    // Documents files
    { id: "file_doc1", name: "Onboarding Checklist.docx", type: "document", parentId: "folder_docs", createdAt: daysAgo(90), modifiedAt: daysAgo(14), isStarred: false, owner, size: 67_000, mimeType: "" },
    { id: "file_doc2", name: "API Documentation.pdf", type: "pdf", parentId: "folder_docs", createdAt: daysAgo(45), modifiedAt: daysAgo(3), isStarred: true, owner, size: 4_500_000, mimeType: "" },
    { id: "file_doc3", name: "Sprint Retrospective.docx", type: "document", parentId: "folder_docs", createdAt: daysAgo(7), modifiedAt: daysAgo(7), isStarred: false, owner, size: 52_000, mimeType: "" },

    // Contracts subfolder
    { id: "file_c1", name: "NDA - Acme Corp.pdf", type: "pdf", parentId: "folder_docs_contracts", createdAt: daysAgo(180), modifiedAt: daysAgo(180), isStarred: false, owner, size: 890_000, mimeType: "" },
    { id: "file_c2", name: "Service Agreement 2025.pdf", type: "pdf", parentId: "folder_docs_contracts", createdAt: daysAgo(60), modifiedAt: daysAgo(30), isStarred: false, owner, size: 1_100_000, mimeType: "" },

    // Photos
    { id: "file_p1", name: "Office Party.jpg", type: "image", parentId: "folder_photos", createdAt: daysAgo(30), modifiedAt: daysAgo(30), isStarred: false, owner, size: 5_200_000, mimeType: "" },
    { id: "file_p2", name: "Product Shoot - Final.png", type: "image", parentId: "folder_photos", createdAt: daysAgo(12), modifiedAt: daysAgo(10), isStarred: true, owner, size: 12_800_000, mimeType: "" },
    { id: "file_p3", name: "Team Headshots.zip", type: "archive", parentId: "folder_photos", createdAt: daysAgo(25), modifiedAt: daysAgo(25), isStarred: false, owner, size: 45_000_000, mimeType: "" },

    // Videos
    { id: "file_v1", name: "Onboarding Tutorial.mp4", type: "video", parentId: "folder_videos", createdAt: daysAgo(20), modifiedAt: daysAgo(15), isStarred: false, owner, size: 180_000_000, mimeType: "" },
    { id: "file_v2", name: "Product Launch Teaser.mov", type: "video", parentId: "folder_videos", createdAt: daysAgo(10), modifiedAt: daysAgo(8), isStarred: true, owner, size: 320_000_000, mimeType: "" },

    // Archive
    // Archive
    { id: "file_a1", name: "Legacy Designs 2023.zip", type: "archive", parentId: "folder_archive", createdAt: daysAgo(365), modifiedAt: daysAgo(200), isStarred: false, owner, size: 156_000_000, mimeType: "" },
    { id: "file_a2", name: "Old Contracts.zip", type: "archive", parentId: "folder_archive", createdAt: daysAgo(300), modifiedAt: daysAgo(300), isStarred: false, owner, size: 23_000_000, mimeType: "" },

    // Deep nested files for breadcrumb testing
    { id: "file_deep1", name: "Campaign Brief.docx", type: "document", parentId: "folder_deep_2", createdAt: daysAgo(10), modifiedAt: daysAgo(1), isStarred: false, owner, size: 145_000, mimeType: "" },
    { id: "file_deep2", name: "Social Media Assets.zip", type: "archive", parentId: "folder_deep_2", createdAt: daysAgo(8), modifiedAt: daysAgo(3), isStarred: false, owner, size: 67_000_000, mimeType: "" },

    // Shared with me seeded items
    {
      id: "shared_file_1",
      name: "Acme Q4 Strategy.pdf",
      type: "pdf",
      parentId: null,
      createdAt: daysAgo(10),
      modifiedAt: daysAgo(5),
      isStarred: false,
      owner: "Alice Johnson",
      size: 4_500_000,
      mimeType: "application/pdf",
      sharedWithMe: true,
      sharedBy: "Alice Johnson",
      sharedDate: daysAgo(5),
      sharedRole: "viewer",
    },
    {
      id: "shared_file_2",
      name: "Logo Iterations.png",
      type: "image",
      parentId: null,
      createdAt: daysAgo(12),
      modifiedAt: daysAgo(6),
      isStarred: true,
      owner: "Bob Miller",
      size: 1_200_000,
      mimeType: "image/png",
      sharedWithMe: true,
      sharedBy: "Bob Miller",
      sharedDate: daysAgo(4),
      sharedRole: "commenter",
    },
    {
      id: "shared_file_3",
      name: "API Spec Draft.docx",
      type: "document",
      parentId: null,
      createdAt: daysAgo(3),
      modifiedAt: daysAgo(1),
      isStarred: false,
      owner: "Charlie Green",
      size: 78_000,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sharedWithMe: true,
      sharedBy: "Charlie Green",
      sharedDate: daysAgo(1),
      sharedRole: "editor",
    }
  ];

  // Fill in mimeType for all files
  const allItems = [...folders, ...files];
  for (const item of allItems) {
    if (item.type !== "folder" && !item.mimeType) {
      item.mimeType = mimeForType(item.type, item.name);
    }
  }

  return allItems;
}

// ── Per-workspace data store ─────────────────────────────────────

const workspaceData = new Map<string, FileSystemItem[]>();

function getTree(workspaceId: string): FileSystemItem[] {
  if (!workspaceData.has(workspaceId)) {
    const key = `cv_workspace_tree_${workspaceId}`;
    const persisted = mockStorage.getItem<FileSystemItem[] | null>(key, null);
    if (persisted) {
      workspaceData.set(workspaceId, persisted);
    } else {
      const tree = createMockTree();
      workspaceData.set(workspaceId, tree);
      mockStorage.setItem(key, tree);
    }
  }
  return workspaceData.get(workspaceId)!;
}

function saveTree(workspaceId: string) {
  const tree = workspaceData.get(workspaceId);
  if (tree) {
    mockStorage.setItem(`cv_workspace_tree_${workspaceId}`, tree);
  }
}

export function resetPersistence(workspaceId: string) {
  mockStorage.removeItem(`cv_workspace_tree_${workspaceId}`);
  mockStorage.removeItem(`cv_workspace_trash_${workspaceId}`);
  mockStorage.removeItem(`cv_workspace_shares_${workspaceId}`);
  mockStorage.removeItem("cv_user");
  mockStorage.removeItem("cv_notifications");
  // Clear view-mode preference keys stored directly in localStorage
  try {
    window.localStorage.removeItem("cv_default_view");
    window.localStorage.removeItem("cv_shared_view");
  } catch {
    // Silently ignore if localStorage is unavailable
  }
  workspaceData.clear();
  workspaceTrashData.clear();
  workspaceShareData.clear();
}

// ── Public API ───────────────────────────────────────────────────

/** Build the breadcrumb path from root to a given folder. */
function buildBreadcrumb(tree: FileSystemItem[], folderId: string | null): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ id: null, name: "Home" }];
  if (!folderId) return segments;

  const chain: BreadcrumbSegment[] = [];
  let current = folderId;
  while (current) {
    const folder = tree.find((i) => i.id === current);
    if (!folder) break;
    chain.unshift({ id: folder.id, name: folder.name });
    current = folder.parentId!;
  }
  return [...segments, ...chain];
}

/** Get folder contents with sorting and filtering. */
export async function getFiles(
  workspaceId: string,
  folderId: string | null = null,
  sortBy: SortField = "name",
  sortDir: SortDirection = "asc",
  filterType?: FileItemType
): Promise<FolderContents> {
  await delay();
  const tree = getTree(workspaceId);

  let items = tree.filter((i) => i.parentId === folderId);

  // Filter
  if (filterType) {
    items = items.filter((i) => i.type === filterType);
  }

  // Sort — folders always first
  items.sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;

    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "size":
        cmp = a.size - b.size;
        break;
      case "modifiedAt":
        cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const currentFolder = folderId ? tree.find((i) => i.id === folderId) ?? null : null;
  const breadcrumb = buildBreadcrumb(tree, folderId);

  return { items, breadcrumb, currentFolder };
}

/** Get a single folder's metadata + breadcrumb. */
export async function getFolder(
  workspaceId: string,
  folderId: string
): Promise<{ folder: FileSystemItem; breadcrumb: BreadcrumbSegment[]; childrenCount: number }> {
  await delay();
  const tree = getTree(workspaceId);
  const folder = tree.find((i) => i.id === folderId);
  if (!folder) throw new Error("Folder not found");

  const childrenCount = tree.filter((i) => i.parentId === folderId).length;
  const breadcrumb = buildBreadcrumb(tree, folderId);

  return { folder, breadcrumb, childrenCount };
}

/** Create a new folder. */
export async function createFolder(
  workspaceId: string,
  parentId: string | null,
  name: string
): Promise<FileSystemItem> {
  await delay();
  const tree = getTree(workspaceId);

  // Check duplicate
  const exists = tree.find(
    (i) => i.parentId === parentId && i.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    throw new Error("A file with this name already exists here");
  }

  const folder: FileSystemItem = {
    id: uid(),
    name,
    type: "folder",
    parentId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isStarred: false,
    owner: "You",
    size: 0,
    mimeType: "",
  };

  tree.push(folder);
  saveTree(workspaceId);
  return folder;
}

/** Rename an item. Returns the updated item or throws on duplicate. */
export async function renameItem(
  workspaceId: string,
  itemId: string,
  newName: string
): Promise<FileSystemItem> {
  await delay();
  const tree = getTree(workspaceId);
  const item = tree.find((i) => i.id === itemId);
  if (!item) throw new Error("Item not found");

  // Check duplicate in same folder
  const duplicate = tree.find(
    (i) =>
      i.id !== itemId &&
      i.parentId === item.parentId &&
      i.name.toLowerCase() === newName.toLowerCase()
  );
  if (duplicate) {
    throw new Error("A file with this name already exists here");
  }

  item.name = newName;
  item.modifiedAt = new Date().toISOString();
  saveTree(workspaceId);
  return { ...item };
}

/** Move items to a destination folder. Returns list of conflicts. */
export async function moveItems(
  workspaceId: string,
  itemIds: string[],
  destFolderId: string | null
): Promise<{ moved: FileSystemItem[]; conflicts: DuplicateConflict[] }> {
  await delay();
  const tree = getTree(workspaceId);
  const moved: FileSystemItem[] = [];
  const conflicts: DuplicateConflict[] = [];

  for (const id of itemIds) {
    const item = tree.find((i) => i.id === id);
    if (!item) continue;

    const existing = tree.find(
      (i) =>
        i.id !== id &&
        i.parentId === destFolderId &&
        i.name.toLowerCase() === item.name.toLowerCase()
    );

    if (existing) {
      conflicts.push({ existingItem: existing, incomingName: item.name });
    } else {
      item.parentId = destFolderId;
      item.modifiedAt = new Date().toISOString();
      moved.push({ ...item });
    }
  }

  saveTree(workspaceId);
  return { moved, conflicts };
}

/** Copy items to a destination folder. */
export async function copyItems(
  workspaceId: string,
  itemIds: string[],
  destFolderId: string | null
): Promise<FileSystemItem[]> {
  await delay();
  const tree = getTree(workspaceId);
  const copies: FileSystemItem[] = [];

  for (const id of itemIds) {
    const item = tree.find((i) => i.id === id);
    if (!item) continue;

    let name = item.name;
    // Add "(Copy)" suffix if name collides
    const exists = tree.find(
      (i) => i.parentId === destFolderId && i.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      const dot = name.lastIndexOf(".");
      if (dot > 0 && item.type !== "folder") {
        name = name.slice(0, dot) + " (Copy)" + name.slice(dot);
      } else {
        name = name + " (Copy)";
      }
    }

    const copy: FileSystemItem = {
      ...item,
      id: uid(),
      name,
      parentId: destFolderId,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };
    tree.push(copy);
    copies.push(copy);
  }

  saveTree(workspaceId);
  return copies;
}

/** Delete items. Returns count of total items deleted (including children). */
export async function deleteItems(
  workspaceId: string,
  itemIds: string[]
): Promise<{ deletedCount: number; childrenCount: number }> {
  await delay();
  const tree = getTree(workspaceId);

  // Gather all items to delete (including nested children)
  const toDelete = new Set<string>();
  const itemsToDelete: FileSystemItem[] = [];

  function collectChildren(id: string) {
    toDelete.add(id);
    const item = tree.find(i => i.id === id);
    if (item) itemsToDelete.push(item);
    for (const child of tree.filter((i) => i.parentId === id)) {
      collectChildren(child.id);
    }
  }

  for (const id of itemIds) {
    collectChildren(id);
  }

  const childrenCount = toDelete.size - itemIds.length;

  // Move items to trash
  const trashTree = getTrashTree(workspaceId);
  const deletedBy = "Demo User";
  const deletedAt = new Date().toISOString();

  for (const item of itemsToDelete) {
    trashTree.push({
      ...item,
      deletedBy,
      deletedAt,
    });
  }

  // Remove from tree
  const remaining = tree.filter((i) => !toDelete.has(i.id));
  workspaceData.set(workspaceId, remaining);

  saveTree(workspaceId);
  saveTrash(workspaceId);

  return { deletedCount: toDelete.size, childrenCount };
}

/** Count children of items (for delete confirmation). */
export async function countChildren(
  workspaceId: string,
  itemIds: string[]
): Promise<number> {
  await delay(100, 200);
  const tree = getTree(workspaceId);
  let count = 0;

  function countNested(id: string) {
    const children = tree.filter((i) => i.parentId === id);
    count += children.length;
    for (const child of children) {
      if (child.type === "folder") countNested(child.id);
    }
  }

  for (const id of itemIds) {
    const item = tree.find((i) => i.id === id);
    if (item?.type === "folder") countNested(id);
  }

  return count;
}

/** Toggle starred state. */
export async function starItem(
  workspaceId: string,
  itemId: string
): Promise<FileSystemItem> {
  await delay(100, 200);
  const tree = getTree(workspaceId);
  const item = tree.find((i) => i.id === itemId);
  if (!item) throw new Error("Item not found");

  item.isStarred = !item.isStarred;
  saveTree(workspaceId);
  return { ...item };
}

/** Get total storage used in bytes. */
export async function getStorageUsed(workspaceId: string): Promise<number> {
  if (isAWSEnabled()) return dynamoFS.getStorageUsed(workspaceId);
  await delay(100, 200);
  const tree = getTree(workspaceId);
  return tree.reduce((sum, i) => sum + i.size, 0);
}

/** Add a file after upload completes. */
export async function addUploadedFile(
  workspaceId: string,
  folderId: string | null,
  fileName: string,
  fileSize: number,
  previewDataUrl?: string,
  s3Key?: string
): Promise<FileSystemItem> {
  if (isAWSEnabled()) return dynamoFS.addUploadedFile(workspaceId, folderId, fileName, fileSize, previewDataUrl, s3Key);
  await delay(50, 100);
  const tree = getTree(workspaceId);
  const type = inferType(fileName);

  const newFile: FileSystemItem = {
    id: uid(),
    name: fileName,
    type,
    parentId: folderId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    isStarred: false,
    owner: "You",
    size: fileSize,
    mimeType: mimeForType(type, fileName),
    previewDataUrl,
  };

  tree.push(newFile);
  saveTree(workspaceId);
  return newFile;
}

/** Get cumulative character length of all stored data URLs in localStorage */
export function getPreviewStorageSize(): number {
  let size = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("cv_workspace_tree_")) {
        const value = window.localStorage.getItem(key);
        if (value) {
          const items = JSON.parse(value) as FileSystemItem[];
          for (const item of items) {
            if (item.previewDataUrl) {
              size += item.previewDataUrl.length;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error computing preview storage size:", e);
  }
  return size;
}

/** Check if a name already exists in a folder. */
export async function checkDuplicate(
  workspaceId: string,
  folderId: string | null,
  name: string
): Promise<FileSystemItem | null> {
  await delay(50, 100);
  const tree = getTree(workspaceId);
  return (
    tree.find(
      (i) => i.parentId === folderId && i.name.toLowerCase() === name.toLowerCase()
    ) ?? null
  );
}

/** Storage quota in bytes (15 GB). */
export const STORAGE_QUOTA = 15 * 1024 * 1024 * 1024;

/** Format bytes to human-readable string. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

/** Format date to relative or absolute string. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ── Trash & Analytics Additions ───────────────────────────────────

export interface TrashedItem extends FileSystemItem {
  deletedBy: string;
  deletedAt: string;
}

const workspaceTrashData = new Map<string, TrashedItem[]>();

function createMockTrash(): TrashedItem[] {
  const owner = "You";
  const deletedBy = "Demo User";

  // Helper to get relative ISO dates
  const daysAgoDate = (d: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return date.toISOString();
  };

  return [
    {
      id: "trash_file_1",
      name: "Old Draft Proposal.docx",
      type: "document",
      parentId: "folder_docs",
      createdAt: daysAgo(40),
      modifiedAt: daysAgo(30),
      isStarred: false,
      owner,
      size: 45_000,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      deletedBy,
      deletedAt: daysAgoDate(28), // 2 days left
    },
    {
      id: "trash_file_2",
      name: "Bad Logo Design.png",
      type: "image",
      parentId: "folder_design",
      createdAt: daysAgo(35),
      modifiedAt: daysAgo(29),
      isStarred: false,
      owner,
      size: 1_200_000,
      mimeType: "image/png",
      deletedBy,
      deletedAt: daysAgoDate(25), // 5 days left
    },
    {
      id: "trash_file_3",
      name: "Obsolete Video.mp4",
      type: "video",
      parentId: null,
      createdAt: daysAgo(50),
      modifiedAt: daysAgo(45),
      isStarred: false,
      owner,
      size: 98_000_000,
      mimeType: "video/mp4",
      deletedBy,
      deletedAt: daysAgoDate(15), // 15 days left
    },
    {
      id: "trash_folder_1",
      name: "Temporary Assets",
      type: "folder",
      parentId: "folder_design",
      createdAt: daysAgo(60),
      modifiedAt: daysAgo(50),
      isStarred: false,
      owner,
      size: 0,
      mimeType: "",
      deletedBy,
      deletedAt: daysAgoDate(5), // 25 days left
    },
    {
      id: "trash_file_4",
      name: "Duplicate Contact Sheet.xlsx",
      type: "spreadsheet",
      parentId: "folder_nonexistent", // to test original folder no longer exists flow
      createdAt: daysAgo(20),
      modifiedAt: daysAgo(18),
      isStarred: false,
      owner,
      size: 89_000,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      deletedBy,
      deletedAt: daysAgoDate(10), // 20 days left
    },
    {
      id: "trash_file_5",
      name: "Project Roadmap.pdf", // will conflict with the active file Project Roadmap.pdf at root
      type: "pdf",
      parentId: null,
      createdAt: daysAgo(25),
      modifiedAt: daysAgo(20),
      isStarred: false,
      owner,
      size: 1_850_000,
      mimeType: "application/pdf",
      deletedBy,
      deletedAt: daysAgoDate(27), // 3 days left
    }
  ];
}

export function getTrashTree(workspaceId: string): TrashedItem[] {
  if (!workspaceTrashData.has(workspaceId)) {
    const key = `cv_workspace_trash_${workspaceId}`;
    const persisted = mockStorage.getItem<TrashedItem[] | null>(key, null);
    if (persisted) {
      workspaceTrashData.set(workspaceId, persisted);
    } else {
      const trash = createMockTrash();
      workspaceTrashData.set(workspaceId, trash);
      mockStorage.setItem(key, trash);
    }
  }
  return workspaceTrashData.get(workspaceId)!;
}

function saveTrash(workspaceId: string) {
  const trash = workspaceTrashData.get(workspaceId);
  if (trash) {
    mockStorage.setItem(`cv_workspace_trash_${workspaceId}`, trash);
  }
}

export async function getTrashedItems(workspaceId: string): Promise<TrashedItem[]> {
  if (isAWSEnabled()) return dynamoFS.getTrashedItems(workspaceId);
  await delay(150, 300);
  return [...getTrashTree(workspaceId)];
}

export async function verifyParentFolderExists(workspaceId: string, itemId: string): Promise<boolean> {
  if (isAWSEnabled()) return dynamoFS.verifyParentFolderExists(workspaceId, itemId);
  await delay(50, 100);
  const trashTree = getTrashTree(workspaceId);
  const trashed = trashTree.find(t => t.id === itemId);
  if (!trashed) throw new Error("Item not found in trash");
  if (trashed.parentId === null) return true;
  const tree = getTree(workspaceId);
  return tree.some(item => item.id === trashed.parentId && item.type === "folder");
}

export async function checkRestoreConflict(
  workspaceId: string,
  itemId: string,
  restoreToRoot = false
): Promise<FileSystemItem | null> {
  await delay(50, 100);
  const trashTree = getTrashTree(workspaceId);
  const trashed = trashTree.find(t => t.id === itemId);
  if (!trashed) throw new Error("Item not found in trash");

  const tree = getTree(workspaceId);
  const targetParentId = restoreToRoot ? null : trashed.parentId;

  return tree.find(
    item => item.parentId === targetParentId && item.name.toLowerCase() === trashed.name.toLowerCase()
  ) ?? null;
}

export async function restoreTrashedItem(
  workspaceId: string,
  itemId: string,
  options: {
    conflictResolution?: "replace" | "keep_both";
    restoreToRoot?: boolean;
  } = {}
): Promise<FileSystemItem> {
  await delay(200, 400);
  const trashTree = getTrashTree(workspaceId);
  const index = trashTree.findIndex(t => t.id === itemId);
  if (index === -1) throw new Error("Item not found in trash");
  const trashed = trashTree[index];

  const tree = getTree(workspaceId);
  const targetParentId = options.restoreToRoot ? null : trashed.parentId;
  let finalName = trashed.name;

  // Resolve conflicts if any
  const conflict = tree.find(
    item => item.parentId === targetParentId && item.name.toLowerCase() === finalName.toLowerCase()
  );

  if (conflict) {
    if (options.conflictResolution === "replace") {
      const idx = tree.findIndex(item => item.id === conflict.id);
      if (idx !== -1) tree.splice(idx, 1);
    } else if (options.conflictResolution === "keep_both") {
      const dot = finalName.lastIndexOf(".");
      if (dot > 0 && trashed.type !== "folder") {
        finalName = finalName.slice(0, dot) + " (Restored)" + finalName.slice(dot);
      } else {
        finalName = finalName + " (Restored)";
      }
    } else {
      throw new Error("Conflict detected");
    }
  }

  // Restore item (remove from trash, add to tree)
  trashTree.splice(index, 1);

  const restoredItem: FileSystemItem = {
    id: trashed.id,
    name: finalName,
    type: trashed.type,
    parentId: targetParentId,
    createdAt: trashed.createdAt,
    modifiedAt: new Date().toISOString(),
    isStarred: trashed.isStarred,
    owner: trashed.owner,
    size: trashed.size,
    mimeType: trashed.mimeType
  };

  tree.push(restoredItem);
  saveTree(workspaceId);
  saveTrash(workspaceId);
  return restoredItem;
}

export async function restoreTrashedItems(
  workspaceId: string,
  itemIds: string[],
  options: {
    conflictResolution?: "replace" | "keep_both";
    restoreToRoot?: boolean;
  } = {}
): Promise<FileSystemItem[]> {
  const restored: FileSystemItem[] = [];
  for (const id of itemIds) {
    const item = await restoreTrashedItem(workspaceId, id, options);
    restored.push(item);
  }
  return restored;
}

export async function permanentlyDeleteItems(workspaceId: string, itemIds: string[]): Promise<void> {
  if (isAWSEnabled()) return dynamoFS.permanentlyDeleteItems(workspaceId, itemIds);
  await delay(150, 300);
  const trashTree = getTrashTree(workspaceId);
  const idsSet = new Set(itemIds);
  const remaining = trashTree.filter(t => !idsSet.has(t.id));
  workspaceTrashData.set(workspaceId, remaining);
  saveTrash(workspaceId);
}

export async function emptyTrash(workspaceId: string): Promise<void> {
  if (isAWSEnabled()) return dynamoFS.emptyTrash(workspaceId);
  await delay(200, 450);
  workspaceTrashData.set(workspaceId, []);
  saveTrash(workspaceId);
}

// ── Storage Analytics Additions ──────────────────────────────────

export interface StorageAnalyticsBreakdown {
  type: string;
  size: number;
  count: number;
}

export interface StorageHistoryPoint {
  date: string;
  totalGB: number;
}

export interface StorageAnalytics {
  totalUsed: number;
  totalQuota: number;
  planName: string;
  breakdown: StorageAnalyticsBreakdown[];
  usageHistory: StorageHistoryPoint[];
  largestFiles: FileSystemItem[];
}

export async function getStorageAnalytics(workspaceId: string): Promise<StorageAnalytics> {
  if (isAWSEnabled()) return dynamoFS.getStorageAnalytics(workspaceId);
  await delay(300, 600);
  const tree = getTree(workspaceId);
  const totalUsed = tree.reduce((sum, item) => sum + (item.type === "folder" ? 0 : item.size), 0);

  // Categorize files
  const breakdownMap: Record<string, { size: number; count: number }> = {
    Documents: { size: 0, count: 0 },
    Images: { size: 0, count: 0 },
    Videos: { size: 0, count: 0 },
    Audio: { size: 0, count: 0 },
    Other: { size: 0, count: 0 },
  };

  for (const item of tree) {
    if (item.type === "folder") continue;
    let category = "Other";
    if (item.type === "document" || item.type === "pdf" || item.type === "spreadsheet") {
      category = "Documents";
    } else if (item.type === "image") {
      category = "Images";
    } else if (item.type === "video") {
      category = "Videos";
    } else if ((item.type as string) === "audio") {
      category = "Audio";
    } else if (item.type === "archive" || item.type === "other") {
      category = "Other";
    }

    breakdownMap[category].size += item.size;
    breakdownMap[category].count += 1;
  }

  const breakdown: StorageAnalyticsBreakdown[] = Object.entries(breakdownMap).map(([type, val]) => ({
    type,
    size: val.size,
    count: val.count,
  }));

  // Usage history (90 days)
  const usageHistory: StorageHistoryPoint[] = [];
  const currentTotalGB = totalUsed / (1024 * 1024 * 1024);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const baseGB = Math.max(1.0, currentTotalGB * 0.7);
  const increment = (currentTotalGB - baseGB) / 90;

  for (let i = 0; i <= 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    usageHistory.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      totalGB: parseFloat((baseGB + increment * i + (Math.sin(i / 5) * 0.1)).toFixed(2)),
    });
  }

  // Largest files (top 20)
  const largestFiles = tree
    .filter(item => item.type !== "folder")
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);

  return {
    totalUsed,
    totalQuota: STORAGE_QUOTA,
    planName: "Free Plan",
    breakdown,
    usageHistory,
    largestFiles,
  };
}

export async function getAllFiles(workspaceId: string): Promise<FileSystemItem[]> {
  if (isAWSEnabled()) return dynamoFS.getAllFiles(workspaceId);
  await delay(100, 200);
  return [...getTree(workspaceId)];
}

// ── Sharing APIs ─────────────────────────────────────────────────

const workspaceShareData = new Map<string, Share[]>();

export function getShareTree(workspaceId: string): Share[] {
  if (!workspaceShareData.has(workspaceId)) {
    const key = `cv_workspace_shares_${workspaceId}`;
    const persisted = mockStorage.getItem<Share[] | null>(key, null);
    if (persisted) {
      workspaceShareData.set(workspaceId, persisted);
    } else {
      // Seed default shares
      const defaultShares: Share[] = [
        {
          fileId: "file_1", // Project Roadmap.pdf
          sharedWith: [
            { email: "john@acme.com", role: "editor" },
            { email: "sarah@design.io", role: "viewer" }
          ],
          publicLink: {
            enabled: true,
            token: "roadmap_public_token",
            accessLevel: "viewer",
            downloadCount: 0
          }
        }
      ];
      workspaceShareData.set(workspaceId, defaultShares);
      mockStorage.setItem(key, defaultShares);
    }
  }
  return workspaceShareData.get(workspaceId)!;
}

function saveShares(workspaceId: string) {
  const shares = workspaceShareData.get(workspaceId);
  if (shares) {
    mockStorage.setItem(`cv_workspace_shares_${workspaceId}`, shares);
  }
}

export async function getShareSettings(
  arg1: string,
  arg2?: string
): Promise<Share> {
  const { workspaceId, fileId } = resolveArgs(arg1, arg2);
  await delay(100, 200);
  const shares = getShareTree(workspaceId);
  let share = shares.find(s => s.fileId === fileId);
  if (!share) {
    share = {
      fileId,
      sharedWith: [],
      publicLink: null
    };
    shares.push(share);
    saveShares(workspaceId);
  }
  return { ...share };
}

export async function updateShareSettings(
  arg1: string,
  arg2: string | Partial<Share>,
  arg3?: Partial<Share>
): Promise<Share> {
  let workspaceId: string;
  let fileId: string;
  let settings: Partial<Share>;

  if (arg3 !== undefined) {
    workspaceId = arg1;
    fileId = arg2 as string;
    settings = arg3;
  } else {
    workspaceId = "ws_personal";
    fileId = arg1;
    settings = arg2 as Partial<Share>;
  }

  await delay(100, 200);
  const shares = getShareTree(workspaceId);
  let index = shares.findIndex(s => s.fileId === fileId);
  if (index === -1) {
    const newShare = {
      fileId,
      sharedWith: settings.sharedWith || [],
      publicLink: settings.publicLink || null
    };
    shares.push(newShare);
    index = shares.length - 1;
  } else {
    shares[index] = {
      ...shares[index],
      ...settings
    };
  }
  saveShares(workspaceId);
  return { ...shares[index] };
}

export async function addPersonToShare(
  arg1: string,
  arg2: string,
  arg3?: string | ("viewer" | "commenter" | "editor"),
  arg4?: "viewer" | "commenter" | "editor"
): Promise<Share> {
  let workspaceId: string;
  let fileId: string;
  let email: string;
  let role: "viewer" | "commenter" | "editor";

  if (arg4 !== undefined) {
    workspaceId = arg1;
    fileId = arg2;
    email = arg3 as string;
    role = arg4;
  } else {
    workspaceId = "ws_personal";
    fileId = arg1;
    email = arg2;
    role = arg3 as "viewer" | "commenter" | "editor";
  }

  const share = await getShareSettings(workspaceId, fileId);
  const exists = share.sharedWith.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    exists.role = role;
  } else {
    share.sharedWith.push({ email: email.trim(), role });
  }
  return updateShareSettings(workspaceId, fileId, share);
}

export async function removePersonFromShare(
  arg1: string,
  arg2: string,
  arg3?: string
): Promise<Share> {
  let workspaceId: string;
  let fileId: string;
  let email: string;

  if (arg3 !== undefined) {
    workspaceId = arg1;
    fileId = arg2;
    email = arg3;
  } else {
    workspaceId = "ws_personal";
    fileId = arg1;
    email = arg2;
  }

  const share = await getShareSettings(workspaceId, fileId);
  share.sharedWith = share.sharedWith.filter(p => p.email.toLowerCase() !== email.toLowerCase());
  return updateShareSettings(workspaceId, fileId, share);
}

export async function generatePublicLink(
  arg1: string,
  arg2: string | Partial<PublicLinkSettings>,
  arg3?: Partial<PublicLinkSettings>
): Promise<Share> {
  let workspaceId: string;
  let fileId: string;
  let options: Partial<PublicLinkSettings>;

  if (arg3 !== undefined) {
    workspaceId = arg1;
    fileId = arg2 as string;
    options = arg3;
  } else {
    workspaceId = "ws_personal";
    fileId = arg1;
    options = arg2 as Partial<PublicLinkSettings>;
  }

  const share = await getShareSettings(workspaceId, fileId);
  const currentLink = share.publicLink;
  share.publicLink = {
    enabled: true,
    token: currentLink?.token || "share_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    accessLevel: options.accessLevel || "viewer",
    password: options.password !== undefined ? (options.password ?? undefined) : currentLink?.password,
    expiresAt: options.expiresAt !== undefined ? (options.expiresAt ?? undefined) : currentLink?.expiresAt,
    downloadLimit: options.downloadLimit !== undefined ? (options.downloadLimit ?? undefined) : currentLink?.downloadLimit,
    downloadCount: currentLink?.downloadCount || 0
  };
  return updateShareSettings(workspaceId, fileId, share);
}

export async function revokePublicLink(
  arg1: string,
  arg2?: string
): Promise<Share> {
  let workspaceId: string;
  let fileId: string;

  if (arg2 !== undefined) {
    workspaceId = arg1;
    fileId = arg2;
  } else {
    workspaceId = "ws_personal";
    fileId = arg1;
  }

  const share = await getShareSettings(workspaceId, fileId);
  share.publicLink = null;
  return updateShareSettings(workspaceId, fileId, share);
}

export async function getFileByShareToken(token: string): Promise<{ file: FileSystemItem; share: Share; workspaceId: string } | null> {
  if (isAWSEnabled()) return dynamoFS.getFileByShareToken(token);
  await delay(150, 300);
  const workspaces = ["ws_personal", "ws_acme", "ws_design"];
  for (const wsId of workspaces) {
    const shares = getShareTree(wsId);
    const share = shares.find(s => s.publicLink?.enabled && s.publicLink.token === token);
    if (share) {
      const tree = getTree(wsId);
      const file = tree.find(f => f.id === share.fileId);
      if (file) {
        return { file, share, workspaceId: wsId };
      }
    }
  }
  return null;
}

function resolveArgs(arg1: string, arg2?: string): { workspaceId: string; fileId: string } {
  if (arg2) {
    return { workspaceId: arg1, fileId: arg2 };
  }
  return { workspaceId: "ws_personal", fileId: arg1 };
}

export function addMockNotification(title: string, description: string, iconType: "share" | "message" | "file" | "inbox") {
  const notifications = mockStorage.getItem<any[]>("cv_notifications", [
    {
      id: "1",
      title: "New file shared",
      description: "Alex shared 'Q3 Report.pdf' with you",
      time: "2 min ago",
      iconType: "share",
      read: false,
    },
    {
      id: "2",
      title: "Comment added",
      description: "Sarah commented on 'Brand Guidelines'",
      time: "15 min ago",
      iconType: "message",
      read: false,
    },
    {
      id: "3",
      title: "Upload complete",
      description: "3 files uploaded to 'Design Assets'",
      time: "1 hr ago",
      iconType: "file",
      read: true,
    },
  ]);
  const newNotif = {
    id: "notif_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    title,
    description,
    time: "Just now",
    iconType,
    read: false,
  };
  notifications.unshift(newNotif);
  mockStorage.setItem("cv_notifications", notifications);
}

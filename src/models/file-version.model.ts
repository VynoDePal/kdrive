export interface FileVersion {
  id: number;
  fileId: number;
  versionNumber: number;
  createdAt: Date;
}

export interface FileVersionDetail extends FileVersion {
  fileName: string;
  fileType: string;
}

export interface FileVersionContent {
  fileId: number;
  versionNumber: number;
  content: Buffer;
  fileName: string;
  fileType: string;
}

export interface VersionComparisonInfo {
  fileId: number;
  version1Id: number;
  version1Number: number;
  version1Date: Date;
  version2Id: number;
  version2Number: number;
  version2Date: Date;
}

export interface FileVersionListResponse {
  fileId: number;
  fileName: string;
  versions: FileVersion[];
}

export interface FileVersionRestoreResponse {
  fileId: number;
  newVersionId: number;
  newVersionNumber: number;
  message: string;
}

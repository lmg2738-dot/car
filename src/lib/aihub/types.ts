/** AI Hub aihubshell 모드 */
export type AihubListMode = "l" | "pl";
export type AihubDownloadMode = "d" | "pd";

export type AihubDatasetItem = {
  key: number;
  name: string;
};

export type AihubPackageItem = {
  key: number;
  name: string;
};

export type AihubListDatasetsResponse = {
  items: AihubDatasetItem[];
  raw: string;
};

export type AihubListPackagesResponse = {
  items: AihubPackageItem[];
  raw: string;
};

export type AihubFileTreeResponse = {
  raw: string;
};

export type AihubDownloadRequest = {
  type: "dataset" | "package";
  key: number;
  filekeys?: number[];
  /** 서버 내 다운로드 경로 (기본: data/aihub) */
  outputDir?: string;
};

export type AihubDownloadResponse = {
  success: boolean;
  output: string;
  outputDir: string;
};

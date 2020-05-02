// defines the assetStatus from "the local app" perspective
export enum LocalAssetStatus {
  preview = 0, // asset cannot be installed, but provides info for a future release
  installable = 1, // asset can be installed
  beingInstalled = 2, // asset is being installed (not yet completed)
  ready = 3, // asset has be installed, but user has not activated the installation
  active = 4, // for a give asset id, only one asset can be active
  // deactive, // same as ready, but used for assets that will be uninstalled later (maybe after testing a new version)
  // TODO: this status is currently not used - decide whether this overcomplicate matters
  beingUninstalled = 5,
  installationFailed = 6, // status is assigned, if the installation was failed, an error report should have been published
  installationAborted = 7 // temporary status when installation is aborted
}

export type ResourceInfo = {
  id: string; // id aka filename of resource
  size: number; // size in bytes
  prio: number; // prio for downloading
};

export type AssetPackageInventory = {
  resources: ResourceInfo[];
  size: number; // total size of all resources in bytes
};

export type PaymentInfo = {
  storeId: string; // The store id which is used within apple / google
  price: string; // price of Item
};

export type AssetPackage = {
  id: string;
  version: string;
  inventory: AssetPackageInventory; // see above
  info: IdLogicsInfo | any; // TODO: make info type injectable and remove any
  status?: LocalAssetStatus; // see LocalAssetStatus
  sortId?: string; // optional, when presented to used, the package families are sorted by sortId - fallback is id
  baseUrl?: string; // base url including trailing '/' for accessing all assets, calculated and managed by client
  useFileSystem?: boolean; // if true, the asset is loaded from the filesystem (baseURL is overwritten wenn loaded
  payment?: PaymentInfo; // If the property exists we verify the purchase
};

export type IdLogicsInfo = {
  name: string;
  description: string;
  imageUrl: string;
  dbUrl: string;
  impress: IdLogicsImpress;
  author: string;
};

export type IdLogicsImpress = {
  publisher: string;
  images: string;
  legal: string;
};

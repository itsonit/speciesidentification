export enum SpeciesProfileContentBlockType {
  file,
  html,
  table
}

export type SpeciesProfileContentBlock = {
  rang: number;
  type: SpeciesProfileContentBlockType;
  file?: string;
  html?: string;
  table?: string[][];
};

export type SpeciesProfileContent = {
  id: string;
  key: number;
  keySeq: number;
  content: SpeciesProfileContentBlock[];
};

export type SpeciesProfile = {
  id: string;
  detailUrl: string;
  name: string;
  scientific: string;
  family: string;
  familyScientifc: string;
  synon: string;
  url: string;
  content?: SpeciesProfileContent[];
  similar?: SpeciesProfile[];
  sightingsCount?: number;
  occurrences: number;
};

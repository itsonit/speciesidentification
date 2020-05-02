
import cloneDeep from 'lodash/cloneDeep';

import { SpeciesProfile } from './raw-data-service';
import { Plugins } from '@capacitor/core';

const { File } = Plugins;


type IdLogicsDBJSON = {
  config: SpeciesGroupConfiguration;
  glossary: GlossaryEntry[];
  similarSpecies: object[];
  questions: any;
  dependingAttributes: any;
  similarities: any;
  dayOfYear: any;
  matchList: any;
  matchListAdaptedToDate: any;
  species: SpeciesProfile[];
  receivability: any;
};

// TODO: needs to be revised
export type SpeciesGroupConfiguration = {
  id: string;
  version: string;
  name: string;
  intro: string;
  ownQuestionStartingAt: number;
  dateSupported: boolean;
  manualSelectionFrom: number;
  supportsOccurences: boolean;
  ratio: number;
  similarityFrom: number;
  firstQuestionId: number;
  description: string;
  downloadUrl: string;
  onlineUrl: string;
  useDatabase: boolean;
  imageUrl: string;
  localImageUrl?: string;
  // assetStatus?: AssetStatus;
  update?: SpeciesGroupConfiguration;
  deletedOnline?: boolean;
  status: string;
};

export type GlossaryEntry = {
  name: string;
  id: string;
  content?: string;
};

export type SpeciesProfileContent = {
  id: string;
  key: number;
  keySeq: number;
  content: SpeciesProfileContentBlock[];
};

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

export type AnswerOption = {
  text: string;
  value1: string;
  value2: string;
  url?: string;
  id: string;
  unit?: string;
  color?: string;
  rang?: number;
};

export type Question = {
  id: string;
  question: string;
  questionShort: string;
  image: string;
  video: string;
  categoryID: string;
  category: string;
  options: AnswerOption[];
  typeId: number;
};

export const DEFAULT_CONFIG: SpeciesGroupConfiguration = {
  id: '',
  version: '0.0',
  name: 'undefined',
  dateSupported: false,
  intro: '',
  ownQuestionStartingAt: 0,
  manualSelectionFrom: 3,
  supportsOccurences: false,
  ratio: 0.5,
  similarityFrom: 3,
  firstQuestionId: 0,
  description: '',
  downloadUrl: '',
  onlineUrl: '',
  imageUrl: '',
  useDatabase: false,
  status: ''
};

class DatabaseServiceController {
  db: IdLogicsDBJSON;
  speciesUrlMap: object;
  variableBase: string = '';
  assetBaseUrl: string = '';
  initialized: boolean = false;
  useFileSystem: boolean;
  fileSystemBase: string;
  constructor() {
    console.log('Hello DatabaseProvider Provider');
  }

  /**
   * Initializes the base on a database json
   * @param {string} filename
   * @param {string} assetBaseUrl
   * @returns {Promise<void>}
   */
  initialize(filename: string, baseUrl: string, fileSystemBase?: string): Promise<void> {
console.log(baseUrl + filename);

    this.assetBaseUrl = baseUrl;
    this.useFileSystem = Boolean(fileSystemBase);
    this.fileSystemBase = this.useFileSystem ? fileSystemBase : '';

console.log("this.useFileSystem", this.useFileSystem);

    const retrievedFilePromise = this.useFileSystem
      ? File.readAsText(File.dataDirectory, this.fileSystemBase + filename).then(text => JSON.parse(text))
      : fetch(baseUrl + filename);


    return retrievedFilePromise
    .then((response: Response) => response.json())
    .then(responseJSON => (this.db = responseJSON))
      .then(() => {
        console.log('db: ', this.db);
        // health check for species
        let test = this.db.species
          .filter(species => !species.name)
          .map(species => species.id)
          .reduce((prev, value) => prev.concat(value), []);
        if (test.length > 0) {
          console.error('invalid species: ', test);
          this.db.species = this.db.species.filter(species => Boolean(species.name));
        }
        this.speciesUrlMap = {};
        this.db.species.forEach(species => {
          this.speciesUrlMap[species.id] = species.detailUrl;
          species.url = this.assetBaseUrl + species.url;
        });
        return;
      });
    // pass error upwards
  }

  saveAllData() {
    // dummy function for interface compatibility
  }

  getReceivability(remainigAttributeIds?: string[], remainingSpeciesIds?: string[]): any {
    let rawReceivablity = cloneDeep(this.db.receivability);
    return Object.keys(rawReceivablity)
      .filter(id => remainigAttributeIds.find(remainingId => remainingId + '' === id))
      .map(id => {
        let onlyRemaining = rawReceivablity[id]
          .filter(speciesEntry => remainingSpeciesIds.find(remainingId => speciesEntry.speciesId + '' === remainingId))
          .map(speciesEntry => speciesEntry.perceptibility);
        return {
          id: parseInt(id, 10),
          receivability: Math.round(onlyRemaining.reduce((p, c, _i, a) => p + c / a.length, 0) * 10000000) / 10000000
        };
      });
  }

  setInitialMatchList(dayOfYear: number | undefined) {
    let matchList = cloneDeep(this.db.matchList);
    // parse list and adapt to day if required

    if (Number.isInteger(dayOfYear)) {
      dayOfYear = dayOfYear - 1;
    }

    matchList.forEach(match => {
      //needed for later part of match validation
      match.charSpeciesMapFull = match.charSpeciesMap;

      match.charSpeciesMap = match.charSpeciesMap.filter(characteristic => {
        if (Number.isInteger(dayOfYear)) {
          characteristic.speciesIdsBasedOnDate = characteristic.speciesDetail
            .filter(mapping => {
              mapping.begin = !Number.isInteger(mapping.begin) ? -1 : mapping.begin;
              mapping.end = !Number.isInteger(mapping.end) ? 366 : mapping.end;
              if (mapping.begin < mapping.end) {
                return mapping.begin <= dayOfYear && dayOfYear <= mapping.end;
              } else {
                return (
                  (dayOfYear >= mapping.begin && dayOfYear > mapping.end) ||
                  (dayOfYear <= mapping.begin && dayOfYear < mapping.begin)
                );
              }
            })
            .map(mapping => mapping.id);

          // if no day matching ist used, speciesIds is set already!
          characteristic.speciesDetail = null;

          if (characteristic.speciesIdsBasedOnDate.length > 0) {
            return true;
          } else {
            return false;
          }
        } else {
          // if no day matching ist used, speciesIds is set already!
          characteristic.speciesDetail = null;
          // copy for filter
          characteristic.speciesIdsBasedOnDate = characteristic.speciesIds;

          return true;
        }
      });
    });

    this.db.matchListAdaptedToDate = matchList;
  }

  getMatchList(remainingSpeciesIds?: string[], remainingQuestionIDs?: number[]) {
    let matchList = cloneDeep(this.db.matchListAdaptedToDate);
    if (!remainingQuestionIDs) {
      return matchList;
    }
    return matchList
      .filter(match => remainingQuestionIDs.find(id => match.attributeId === id)) //
      .map(match => {
        match.charSpeciesMap = match.charSpeciesMap
          .map(answer => {
            let newAnswer = Object.assign({}, answer);
            newAnswer.speciesIds = newAnswer.speciesIds.filter(id =>
              remainingSpeciesIds.find(remainingSpeciesId => remainingSpeciesId === id)
            );

            //filter based on day matching
            newAnswer.speciesIdsBasedOnDate = newAnswer.speciesIdsBasedOnDate.filter(id =>
              remainingSpeciesIds.find(remainingSpeciesId => remainingSpeciesId === id)
            );

            if (newAnswer.speciesIdsBasedOnDate.length > 0) {
              return newAnswer;
            } else {
              return null;
            }
          })
          .filter(Boolean); // removes null values
        return match;
      });
  }

  getSimilarities() {
    return cloneDeep(this.db.similarities);
  }

  getDependingAttributes() {
    return cloneDeep(this.db.dependingAttributes);
  }

  getQuestions() {
    return cloneDeep(this.db.questions);
  }

  getSpeciesOverview(): SpeciesProfile[] {
    return cloneDeep(this.db.species);
  }

  getSpecies(ids: string[]): Promise<SpeciesProfile[]> {
    // TODO: there is probably an enrichment of similarSpecies missing
    // use =>
    // this._similarSpeciesById = this.db.similarSpecies

    // retrieve detail files
    return Promise.all(
      ids.map(id => {
        // need to retrieve detailUrl
        const filename = this.speciesUrlMap[id];
        if (!filename) {
          console.error('Species id cannot be mapped to url: ', id);
          return;
        }
        let url = this.assetBaseUrl + '/' + filename;

        const retrievedFilePromise = this.useFileSystem
          ? File.readAsText(File.dataDirectory, this.fileSystemBase + filename).then(text => JSON.parse(text))
          : fetch(url);

        return retrievedFilePromise
          .then(data => {
            data.url = this.assetBaseUrl + '/' + data.url;
            return data;
          })
          .catch(err => {
            console.error(err);
            return undefined;
          });
      })
    );
  }

  getSimilarSpeciesData() {
    return cloneDeep(this.db.similarSpecies);
  }

  getGlossaryData(): GlossaryEntry[] {
    return cloneDeep(this.db.glossary);
  }

  getConfigurationData(): SpeciesGroupConfiguration {
    return cloneDeep(this.db.config);
  }
}


export const DatabaseService = new DatabaseServiceController();

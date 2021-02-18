
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import { ReplaySubject, Subject } from 'rxjs';

import moment from 'moment/moment';

import {
  GlossaryEntry,
  SpeciesGroupConfiguration,
  SpeciesProfileContentBlockType,
  Question,
  AnswerOption,
  DatabaseService
} from './database-service';
import { SpeciesProfile } from './raw-data-service';
import StorageService from './storage-service';
import { AssetPackage } from './assetmanager-service';

export enum QuestionStatus {
  notStarted = 0,
  calculating,
  resetting, // alternative to calculating, when settings new question from history, next or custom
  inProgress,
  manualSelection,
  manualSelectionForced,
  noMoreInThisCategory
}

export enum CustomQuestionStatus {
  notStarted = 0,
  answersRequiredFirst,
  manualSelection,
  available
}

export enum QuestionSkipStatus {
  enabled,
  disabled
}

export type QuestionHistoryEntry = {
  question: Question;
  answer: AnswerOption;
  remainingSpeciesID: string[];
  index: number;
  skipped: boolean;
  fromHereOnAllowedAttributesIds?: null | number[];
};

export type CustomQuestionInfo = {
  status: CustomQuestionStatus;
  missingAnswers?: number;
};

class DataServiceController {
  httpheader: any;
  assetBaseUrl: string;
  jsonBaseUrl: string;

  _glossary: GlossaryEntry[];
  _species: SpeciesProfile[];
  _remainingSpecies: SpeciesProfile[];
  _remainingSpeciesIds: string[];
  allSpecies: ReplaySubject<any> = new ReplaySubject(1);
  remainingSpecies: ReplaySubject<any> = new ReplaySubject(1);
  allGlossaryEntries: ReplaySubject<any> = new ReplaySubject(1);
  speciesGroup: ReplaySubject<any> = new ReplaySubject(1);
  speciesGroups: ReplaySubject<SpeciesGroupConfiguration[]> = new ReplaySubject(1);
  _questionsById = {};
  allQuestionsById: ReplaySubject<any> = new ReplaySubject(1);
  nextQuestion: ReplaySubject<Question> = new ReplaySubject(1);
  customQuestions: ReplaySubject<any> = new ReplaySubject(1);
  configuration: ReplaySubject<SpeciesGroupConfiguration> = new ReplaySubject(1);
  currentQuestion: Question;
  questionHistory: ReplaySubject<QuestionHistoryEntry[]> = new ReplaySubject(1);
  preparingSpecies: ReplaySubject<boolean> = new ReplaySubject(1);
  questionStatus: ReplaySubject<QuestionStatus> = new ReplaySubject(1);
  skipStatus: ReplaySubject<QuestionSkipStatus> = new ReplaySubject(1);
  customQuestionInfo: ReplaySubject<CustomQuestionInfo> = new ReplaySubject(1);
  fixedCategory: ReplaySubject<string> = new ReplaySubject(1);
  speciesUpdateNotification: Subject<string> = new Subject();
  newIdentification: Subject<boolean> = new Subject();
  showHint: Subject<any> = new Subject();
  viewSizeChanged: Subject<void> = new Subject();
  useDate: boolean = false;
  dayOfYear: number | undefined;
  sightings: ReplaySubject<any> = new ReplaySubject(1);
  _sightings = [];
  _sightingsKey = '';

  _questionHistory: QuestionHistoryEntry[] = [];
  _similarSpeciesById = {};
  _speciesGroup: AssetPackage | undefined = undefined;
  _config: SpeciesGroupConfiguration;
  _dependingAttributes = {};
  _similarities = {};
  _allAttributeIds = [];
  _fromHereOnAllowedAttributesIds = [];
  _nextQuestions = [];
  _nextQuestionIndex: number = 0;
  _isFakeMode = false;
  _speciesGroups: AssetPackage[];
  _isInitialized: boolean = false;
  _readyPromiseResolves: any[] = [];
  _categories: string[] = [];
  _fixedCategoryName: string = '';
  _simulatedJsonIndex = 1;
  _hintStatus = {};
  _hintStack = '';

  viewState: ReplaySubject<string> = new ReplaySubject(1);

  constructor(
    //TODO id-logics app
    /*public http: HttpClient,*/
    /*private storage: Storage,*/
    //private events: Events, + footer methods
    //private assetMger: AssetManagerProvider,
    /*private database: DatabaseProvider,*/
    //private platform: Platform,
    //private screenOrientation: ScreenOrientation
  ) {
    console.log('DataProvider Provider');
    this.preparingSpecies.next(false);
    this.skipStatus.next(QuestionSkipStatus.disabled);
    this.init();
    this._fixedCategoryName = '';
    this.fixedCategory.next(this._fixedCategoryName);
    // the timeout tries to catch a corner in case which StorageService.ready does not seem to be fired properly
    //setTimeout(() => this.init(), 1000);
  }

  init(): Promise<void> {
    // assure we only run once;
    if (this._isInitialized) return Promise.resolve();
    this._simulatedJsonIndex = 1;
    this.questionStatus.next(QuestionStatus.notStarted);
    this.customQuestionInfo.next({ status: CustomQuestionStatus.notStarted, missingAnswers: 0 });

    this.loadHintStatus();
      // resolve any pending Ready Promises
    this._readyPromiseResolves.forEach(aResolveFunction => {
        console.log('resolving ready resolves');

        aResolveFunction();
      });
      this._readyPromiseResolves = [];

      this._isInitialized = true;
      return;
  }

  /* TODO stencil
  updateViewSize() {
    // TODO refactor into Utility provider
    this.platform.ready().then(() => {
      console.log('resetting html font-size (platform resize)');
      window.document.querySelector('html').style.fontSize =
        this.platform.width() < 768 ? '2.22222vw!important' : '1.11111vw!important';
      this.viewSizeChanged.next();
    });
  }


  /* TODO stencil
  /**
   * checks if screenorientation change is allowed and and enables if appropriate
   * @param {Boolean} forceLock optional, default false, forces Screen orientation to be locked to current state
   * e.g. to prevent changes when a popup dialog is being shown
   * @returns {Promise<void>} after lock is enacted

  enactScreenOrientationLocking(forceLock?: Boolean): Promise<void> {
    const defaultOrientation = this.screenOrientation.ORIENTATIONS.PORTRAIT;
    if (this.platform.is('cordova')) {
      if (!this.platform.is('tablet')) {
        console.log('locking screen to portrait mode for small screens');
        return this.screenOrientation.lock(defaultOrientation);
      } else {
        if (forceLock) {
          console.log('locking screen due to forceLock');
          return this.screenOrientation.lock(this.screenOrientation.type);
        } else {
          console.log('unlocking screen');
          this.screenOrientation.unlock();
          return Promise.resolve();
        }
      }
    }
    return Promise.resolve();
  }
  */

  ready(): Promise<any> {
    if (this._isInitialized) {
      return Promise.resolve();
    }
    let unresolvedPromise = new Promise(resolve => {
      this._readyPromiseResolves.push(resolve);
      // to be resolved after init/(
    });
    return unresolvedPromise;
  }

  loadHintStatus(): void {
      let value = StorageService.get('hintStatus');
      this._hintStatus = Object.assign(this._hintStatus, value);
  }

  resetHintStatus(): void {
    this._hintStatus = {};
    StorageService.set('hintStatus', this._hintStatus);
  }

  checkHint(hintId) {
    if (!this._hintStatus[hintId]) {
      let src = './assets/hint/' + hintId + '.jpg';
      let leftPane = false;
      switch (hintId) {
        case 'willkommen':
          leftPane = true;
          this.showHint.next({
            hintId,
            src,
            leftPane: true
          });
          break;
        case 'artenliste':
          if (!this._hintStatus['willkommen']) {
            this._hintStack = hintId;
            break; // willkomen needs to be handled first
          }
          this.showHint.next({ hintId, src, leftPane: true });
          /* svg version
                    this.showHint.next ( {
                        hintId ,
                        src: '/assets/hint/artenliste.svg' ,
                        textSrc: '/assets/hint/DyBAn_02-Artenliste.svg' ,
                        top: '5.9' ,
                        leftPane: true ,
                    } );
                    */
          break;
        case 'tooltip':
          if (!this._hintStatus['naechste']) {
            // skip and wait for next occurance
            break;
          }
          this.showHint.next({ hintId, src, leftPane });
          break;
        case 'steckbrief':
          this.showHint.next({ hintId, src, leftPane: true });
          break;
        case 'naechste':
        case 'verlauf':
        case 'eigene':
          this.showHint.next({ hintId, src, leftPane });
          break;
        default:
          console.log('hint not yet handled: ', hintId);
      }
    }
  }

  hintDelivered(hintId) {
    this._hintStatus[hintId] = true;
    StorageService.set('hintStatus', this._hintStatus); // no need to wait
    setTimeout(() => {
      if (this._hintStack) {
        let nextHint = this._hintStack;
        this._hintStack = '';
        this.checkHint(nextHint);
      }
    });
  }

  setSpecies(species: SpeciesProfile[]) {
    // rewrite urls
    this._species = species;
    this.allSpecies.next(this._species);
  }

  /**
   * resets data to use the AssetPackage passed in
   * @returns {Promise<boolean>} success of operation (no exceptions thrown !)
   */
  async setSpeciesGroup(speciesGroup: AssetPackage | null): Promise<boolean> {
    if (speciesGroup && this._speciesGroup && this._speciesGroup.id === speciesGroup.id) {
      // currently used species group is not changed;
      return Promise.resolve(true);
    }
    StorageService.set('speciesGroup', speciesGroup);

    if (!speciesGroup) {
      console.log('resetting species group');
      this._speciesGroup = undefined;
      this.questionStatus.next(QuestionStatus.notStarted);
      this.customQuestionInfo.next({ status: CustomQuestionStatus.notStarted, missingAnswers: 0 });
      this.speciesGroup.next(this._speciesGroup);
      this.resetAllIdentificationSettings();
      return Promise.resolve(true);
    }

    let fileSystemBase = '';
    /* TODO stencil: app
    if (speciesGroup.useFileSystem) {
      this.assetBaseUrl = this.assetMger.getNormalizedBaseUrl();
      fileSystemBase = this.assetMger.getFilesystemBaseUrl();
    } else {
      this.assetBaseUrl = speciesGroup.baseUrl;
    }*/

    this.preparingSpecies.next(true);
    let dbFileName = speciesGroup.info.dbUrl;
    console.log('### speciesGroup.id', speciesGroup.id);
    console.log('db file:', dbFileName);
    console.log('jsonBaseUrl:', this.jsonBaseUrl);
    console.log('assetBaseUrl:', this.assetBaseUrl);
    // load database and settings
    try {
      await DatabaseService.initialize(dbFileName, this.jsonBaseUrl, fileSystemBase, this.httpheader);

      // get syncronous data
      this._config = DatabaseService.getConfigurationData();
      this.configuration.next(this._config);
      this._glossary = DatabaseService.getGlossaryData();
      this.allGlossaryEntries.next(this._glossary);
      this._similarSpeciesById = DatabaseService.getSimilarSpeciesData();
      const questionsById = DatabaseService.getQuestions();
      let categories = new Set();
      Object.keys(questionsById).forEach(id => {
        let question = questionsById[id];
        question.image = question.image;
        question.image = question.image ? this.assetBaseUrl + question.image : question.image;
        question.video = question.video ? this.assetBaseUrl + question.video : question.video;
        question.options.forEach(answerOption => {
          answerOption.url = answerOption.url;
          answerOption.url = answerOption.url ? this.assetBaseUrl + answerOption.url : answerOption.url;
        });
        categories.add(question.category);
      });
      this._questionsById = questionsById;
      this.allQuestionsById.next(this._questionsById);
      this._allAttributeIds = Object.keys(questionsById).map(id => parseInt(id, 10));
      this._categories = Array.from(categories).sort() as string[];
      const species = DatabaseService.getSpeciesOverview();
      this._species = species;
      // retrieve sightings (it will update speices with sigthtings..)
      // TODO run in parallel
      // TODO id-logics app await this.sightingsLoad(dbId);
      this.allSpecies.next(this._species);
      this._remainingSpecies = this._species;
      this._remainingSpeciesIds = this._remainingSpecies.map(aSpecies => aSpecies.id);
      this.remainingSpecies.next(this._remainingSpecies);
      this._dependingAttributes = DatabaseService.getDependingAttributes();
      this._similarities = DatabaseService.getSimilarities();
      this._speciesGroup = speciesGroup;
      this.speciesGroup.next(this._speciesGroup);
      this.preparingSpecies.next(false);
      this.resetAllIdentificationSettings();
      return true;
    } catch (err) {
      this.preparingSpecies.next(false);
      console.error('Error in initialization', err);
      return false;
    }
  }

  getCurrentSpeciesID() {
    return this._config.id;
  }

  selectCustomQuestion(question: Question) {
    this.currentQuestion = question;
    this.nextQuestion.next(this.currentQuestion);
    // need to reenable questions in case we are already in "manual" mode
    this.questionStatus.next(QuestionStatus.resetting);
    this.questionStatus.next(QuestionStatus.inProgress);
    this._resetFixedCustomCategory();
    this.updateSkipStatus();
  }

  resetToQuestionFromHistory(entry: QuestionHistoryEntry) {
    // remove all history elements from stack until we have removed the entry that is selected
    while (entry.question.id !== this._questionHistory.pop().question.id && this._questionHistory.length > 0) {}
    this.questionHistory.next(this._questionHistory);

    this._fromHereOnAllowedAttributesIds = entry.fromHereOnAllowedAttributesIds;
    this._remainingSpeciesIds = entry.remainingSpeciesID;
    this._remainingSpecies = entry.remainingSpeciesID.map(id => this._species.find(species => species.id === id));
    this.remainingSpecies.next(this._remainingSpecies);

    this.currentQuestion = entry.question;
    this.nextQuestion.next(this.currentQuestion);
    // reset question status in case it was already set to manual selection
    this.questionStatus.next(QuestionStatus.resetting);
    this.questionStatus.next(QuestionStatus.inProgress);
    // this will pop species stack so the species list is shown
    this.newIdentification.next(true);
    this.updateSkipStatus();
  }

  selectAnswer(answer?: AnswerOption): Promise<void> {
    if (!answer) {
      return;
    }
    
    let remainingSpecies = answer['remainingSpecies'];

    if("fromHereOnAllowedAttributes" in answer && answer.fromHereOnAllowedAttributes !== null) {
      this._fromHereOnAllowedAttributesIds = answer.fromHereOnAllowedAttributes;
    } else {
      // add speciesNotHandledByQuestion to selected specied
      remainingSpecies = remainingSpecies.concat(this.currentQuestion['speciesNotHandledByQuestion']);
    }

    // this will pop species stack so the species list is shown TODO: renname subject
    this.newIdentification.next(true);
    this._questionHistory.push({
      question: this.currentQuestion,
      answer,
      remainingSpeciesID: this._remainingSpeciesIds, // status before question is answered!
      index: this._questionHistory.length + 1,
      skipped: false,
      fromHereOnAllowedAttributesIds: this._fromHereOnAllowedAttributesIds
    });
    this.questionHistory.next(this._questionHistory.sort((a, b) => (a.index > b.index ? 1 : -1)));



    let remainingSpeciesUnique = Array.from(new Set(remainingSpecies));
    this._remainingSpecies = remainingSpeciesUnique.map(id => this._species.find(species => species.id === id));
    console.log("this._remainingSpecies: ", this._remainingSpecies);
    this._remainingSpeciesIds = this._remainingSpecies.map(aSpecies => aSpecies.id);
    this.remainingSpecies.next(this._remainingSpecies);
    if (this._config && this._remainingSpecies.length <= this._config.manualSelectionFrom) {
      this.questionStatus.next(QuestionStatus.manualSelection);
      return this.getNextQuestion(true); // only update next Questions..
      // this.customQuestionInfo.next({ status: CustomQuestionStatus.manualSelection, missingAnswers: 0 });
    } else {
      return this.getNextQuestion();
    }
  }

  resetAllIdentificationSettings() {
    this._remainingSpecies = this._species || [];
    this._remainingSpeciesIds = this._remainingSpecies.map(aSpecies => aSpecies.id);
    this.remainingSpecies.next(this._remainingSpecies);
    this._questionHistory = [];
    this._fromHereOnAllowedAttributesIds = [];
    this.questionHistory.next(this._questionHistory);
    this.customQuestionInfo.next({ status: CustomQuestionStatus.notStarted, missingAnswers: 0 });
    this.customQuestions.next(null);
    this.questionStatus.next(QuestionStatus.resetting);
    this.questionStatus.next(QuestionStatus.notStarted);
    this.nextQuestion.next(null);
    this._resetFixedCustomCategory();
  }

  startNewIdentification(useDate: boolean): Promise<void> {
    // TODO: integrate with resetAllIdentificationSettings
    this._remainingSpecies = this._species;

    if(this._remainingSpecies === undefined) {
      return;
    }

    this._remainingSpeciesIds = this._remainingSpecies.map(aSpecies => aSpecies.id);
    this.remainingSpecies.next(this._remainingSpecies);
    this._questionHistory = [];
    this._fromHereOnAllowedAttributesIds = [];
    this.questionHistory.next(this._questionHistory);
    this.customQuestionInfo.next({ status: CustomQuestionStatus.notStarted, missingAnswers: 0 });
    this.customQuestions.next(null);
    this.questionStatus.next(QuestionStatus.calculating);
    // when the data setting is activated for this identification, we need to set initialize the matchlist based on date
    this.useDate = useDate;
    if (this.useDate) {
      this.dayOfYear = moment().dayOfYear();
    } else {
      this.dayOfYear = undefined;
    }
    DatabaseService.setInitialMatchList(this.dayOfYear);
    this._resetFixedCustomCategory();
    this.newIdentification.next(true);
    return this.getNextQuestion();
  }

  async getNextQuestion(onlyCustomQuestions?: boolean): Promise<void> {
    if (!onlyCustomQuestions) {
      this.questionStatus.next(QuestionStatus.calculating);
    }

    // prerequisites:
    // _config set with global values for algorighm (retrieved from databae
    // _questionHistory => contains all questions and answeres provided so far
    // _allAttributeIds => list of all questionIDs
    let remainingSpeciesIds = this._remainingSpecies.map(species => species.id);
    let similarAnswers = this._similarities;
    let remainingAttributes = new Set(this._allAttributeIds);
    let dependingAttributes = this._dependingAttributes; // dependend questions

    // 1) remove answers (attributes) which have been answered
    let knownQuestions = this._questionHistory
      .filter(historyEntry => !historyEntry.skipped)
      .map(historyEntry => historyEntry.question.id);
    knownQuestions.forEach(attributeId => remainingAttributes.delete(attributeId));


    /*
        // 2) remove questions already asked
        let remainingQuestions = new Set ( Object.keys ( this._questionsById ) );
        let questionsAsked = this._questionHistory.map ( historyEntry => historyEntry.question.id );
        questionsAsked.forEach ( questionId => remainingQuestions.delete ( questionId.toString() ) ); // TODO: fix string/number issue for ids
        */

    // 2) remove questions (attributes) for whom a child was answered
    Object.keys(dependingAttributes).forEach(key => {
      knownQuestions.forEach(attributeID => {
        if (dependingAttributes[key].find(dependingID => dependingID + '' === attributeID + '')) {
          remainingAttributes.delete(attributeID);
        }
      }); // TODO: can probably be optimized
    });

    // 3) remove skipped questions
    let skippedQuestions = this._questionHistory
      .filter(historyEntry => historyEntry.skipped)
      .map(historyEntry => historyEntry.question.id);
    skippedQuestions.forEach(attributeId => {
      remainingAttributes.delete(attributeId);

      //remove questions (attributes) for whom the parent was ignored / skipped
      if (attributeId in dependingAttributes) {
        dependingAttributes[attributeId].forEach(value => {
          remainingAttributes.delete(parseInt(value, 10));
        });
      }
    });

    // remainingAttributes does now contain the list of all questions (aka Attributes) still relevant
    let remainingAttributesIds = Array.from(remainingAttributes.values());

    // new 02-2021: rm questions based on fromHereOnAllowedAttributes
    if(this._fromHereOnAllowedAttributesIds.length > 0) {
      console.log("filter _fromHereOnAllowedAttributesIds (question whitelist): ", this._fromHereOnAllowedAttributesIds);
      remainingAttributesIds = remainingAttributesIds.filter(attributeID => this._fromHereOnAllowedAttributesIds.find(allowedID => allowedID + '' === attributeID + ''));
    } else {
      console.log("no filter _fromHereOnAllowedAttributesIds");
    }

    // 4) calculate matchList -> attributes to characteristics to species; this includes reduction weights (taking similar into account)
    let matchList = DatabaseService.getMatchList(remainingSpeciesIds, remainingAttributesIds);
    // TODO: it would be nicer to do this map /immutable
    matchList.forEach(question => {
      // check for similar charactersitics

      // we create a copy of the original speciesIds values so preserve access to the original values
      let originalSpeciesIdsByAnswer = {},
        originalSpeciesIdsByAnswer2 = {};
      question.charSpeciesMap.forEach(anAnswer => {
        originalSpeciesIdsByAnswer[anAnswer.charId] = anAnswer.speciesIds.map(id => id);
      });
      question.charSpeciesMap.forEach(anAnswer => {
        originalSpeciesIdsByAnswer2[anAnswer.charId] = anAnswer.speciesIdsBasedOnDate.map(id => id);
      });

      question.charSpeciesMap = question.charSpeciesMap.map(answer => {
        // experimental !answer._similar
        if (!similarAnswers.hasOwnProperty(answer.charId) || answer._similar) {
          // there are no similar answers
          return answer;
        }

        // now we process all similar answers
        similarAnswers[answer.charId].forEach(similarAttribute => {
          let similarAnswerInSameQuestion = question.charSpeciesMap.find(
            anotherAnswer => anotherAnswer.charId === similarAttribute + ''
          );
          if (!similarAnswerInSameQuestion) {
            // similar answer is not relevant to question
            return;
          }
          // at this point we know, we have found answer (characateristic) that is similar to another answer of the question
          // we merge the species list of "similar" answers - to prevent mistakes
          let mergedSpecies = Array.from(
            new Set([...originalSpeciesIdsByAnswer[similarAnswerInSameQuestion.charId], ...answer.speciesIds])
          );
          answer.speciesIds = mergedSpecies;

          let mergedSpecies2 = Array.from(
            new Set([
              ...originalSpeciesIdsByAnswer2[similarAnswerInSameQuestion.charId],
              ...answer.speciesIdsBasedOnDate
            ])
          );
          answer.speciesIdsBasedOnDate = mergedSpecies2;

          answer._similar = true;
        });
        return answer;
      });

      // calculate reduction weight
      let allSpeciesAfterQuestion = [].concat(...question.charSpeciesMapFull.map(char => char.speciesIds));
      let allSpeciesAfterQuestionUnique = Array.from(new Set(allSpeciesAfterQuestion));

      let allSpeciesAfterQuestionBasedOnDate = [].concat(
        ...question.charSpeciesMap.map(char => char.speciesIdsBasedOnDate)
      );
      let allSpeciesAfterQuestionUniqueBasedOnDate = Array.from(new Set(allSpeciesAfterQuestionBasedOnDate));

      // calculate set of species "not handled by question - Restmenge" - they are later added to the set of available species
      let speciesNotHandledByQuestion = remainingSpeciesIds.filter(
        id => !allSpeciesAfterQuestionUnique.find(idTouchedByQuestion => idTouchedByQuestion === id)
      );

      let speciesNotHandledByQuestionBasedOnDate = remainingSpeciesIds.filter(
        id => !allSpeciesAfterQuestionUniqueBasedOnDate.find(idTouchedByQuestion => idTouchedByQuestion === id)
      );

      //console.log("###### speciesNotHandledByQuestion: " + question.attributeId + ' - '+ allSpeciesAfterQuestionUnique.length +  '.' + JSON.stringify(allSpeciesAfterQuestionUnique) + '\n' + speciesNotHandledByQuestion.length +  '.' + JSON.stringify(speciesNotHandledByQuestion));
      //console.log("###### speciesNotHandledByQuestionBasedOnDate: " + question.attributeId + ' - '+ allSpeciesAfterQuestionUniqueBasedOnDate.length +  '.' + JSON.stringify(allSpeciesAfterQuestionUniqueBasedOnDate) + '\n' + speciesNotHandledByQuestionBasedOnDate.length +  '.' + JSON.stringify(speciesNotHandledByQuestionBasedOnDate));

      let allSpeciesCountAfterQuestion = allSpeciesAfterQuestionUniqueBasedOnDate.length;
      /*
        This calculation seems be more reasonable, but hast been replaced to follow the "master script in php"
        let sumSpecies = question.charSpeciesMap
        .map(answer => answer.speciesIds.length + speciesNotHandledByQuestionCount)
        .reduce((acc, val) => acc + val, 0);
      */

      // this calculation follows the logic provided by php script
      let allSpeciesSelectableByOneOfTheAnswers = question.charSpeciesMap
        .map(answer => [...answer.speciesIdsBasedOnDate, ...speciesNotHandledByQuestionBasedOnDate])
        .reduce((acc, val) => [...acc, ...val], []);
      const allSpeciesSelectableByOneOfTheAnswersUniqueCount = new Set(allSpeciesSelectableByOneOfTheAnswers).size;

      //avg_weight_reduct = (1-(($iTidsTotal2/$iCidsTotal)/count($aRest)))*$fRatio; //  => allSpeciesSelectableByOneOfTheAnswersUniqueCount / question.charSpeciesMap.length;
      let averageRemaingSpeciesCountAfterQuestion =
        allSpeciesSelectableByOneOfTheAnswersUniqueCount / question.charSpeciesMap.length;

      //console.log("averageRemaingSpeciesCountAfterQuestion: " + averageRemaingSpeciesCountAfterQuestion);
      //console.log("remainingSpeciesIds.length: " + remainingSpeciesIds.length);
      //console.log("allSpeciesCountAfterQuestion: " + allSpeciesCountAfterQuestion);

      let reductionWeight = 1 - averageRemaingSpeciesCountAfterQuestion / remainingSpeciesIds.length;
      question.reductionWeight = reductionWeight;
      question.speciesCount = allSpeciesCountAfterQuestion;
      question.speciesNotHandledByQuestion = speciesNotHandledByQuestion;
      question.speciesNotHandledByQuestionBasedOnDate = speciesNotHandledByQuestionBasedOnDate;
    }); // similarAnswers

    // 5) add attributes to ignore list, where question only has one answer
    matchList
      .filter(match => {
        return match.charSpeciesMap.length < 2;
      })
      .forEach(match => {
        remainingAttributes.delete(match.attributeId);
      });
    matchList = matchList.filter(match => match.charSpeciesMap.length > 1);

    // 6) Check that at least one answer reduces the number of species left
    matchList = matchList.filter(match => {
      let filterResult =
        match.charSpeciesMap.filter(answer => {
          let relvantSpeciesIds = answer.speciesIdsBasedOnDate.filter(a => remainingSpeciesIds.includes(a));
          return (
            relvantSpeciesIds.concat(match.speciesNotHandledByQuestionBasedOnDate).length < remainingSpeciesIds.length
          );
        }).length > 0;
      if (!filterResult) {
        remainingAttributes.delete(match.attributeId);
        console.log('ignoring (does not reduce): ', match);
      }
      return filterResult;
    });

    // 6a) Special check - Exclude questions where all answers deliver the same list of results
    // This is the same as in simular - it should be checked whether it is delivering the indetend results
    let sameAnswers = 0;
    matchList = matchList.filter(match => {
      // flat map allSpecies and turn them into a set
      let allSpeciesOfAllAnswersArray = match.charSpeciesMap
        .map(answer => answer.speciesIds) //2?
        .reduce((acc, value) => [...acc, ...value], []);
      let allSpeciesSet = new Set(allSpeciesOfAllAnswersArray);
      let allSpeciesSetLength = allSpeciesSet.size;
      let atLeastOneAnswerIsDifferent = match.charSpeciesMap.find(answer => {
        return answer.speciesIds.length < allSpeciesSetLength; //2?
      });
      let filterResult = Boolean(atLeastOneAnswerIsDifferent);
      if (!filterResult) {
        sameAnswers += 1;
        remainingAttributes.delete(match.attributeId);
        console.log('ignoring (answers are the same): ', match, sameAnswers);
      }
      return filterResult;
    });

    // 7) average receivability level ( in the original code, the query
    let receivability = await DatabaseService.getReceivability(
      Array.from(remainingAttributes.values()),
      remainingSpeciesIds
    );

    // ø Mengenreduktion der Fragen auf Restmenge der Arten
    matchList.forEach((match: any) => {
      let id = match.attributeId;
      match.children = dependingAttributes[id];
      match.avgWeightReduction = Math.round(match.reductionWeight * this._config.ratio * 1000000000000) / 1000000000000;
      let receivabilityValue = receivability.find(attribute => attribute.id === id);
      match.avgWeightPerception =
        Math.round((receivabilityValue.receivability / 10) * (1 - this._config.ratio) * 1000000000) / 1000000000;
      match.totalWeight =
        Math.round((match.avgWeightReduction + match.avgWeightPerception) * 1000000000000) / 1000000000000;
      match.answering = match.charSpeciesMap.length;
    });
    matchList = matchList.sort((a: any, b: any) => b.totalWeight - a.totalWeight);

    // Parent questions before Child questions
    let matchListWithoutParentSwop = matchList.map(x => Object.assign({}, x));
    matchList.forEach((match: any) => {
      if (!match.children) {
        return;
      }

      let delta = 0.00000000001;
      let noOfResortedChildren = 0;
      // traverse the list of children, will preseve sorting by weight, i.e. highest weight first
      matchList
        .filter(potentialChild =>
          match.children.find(childAttributeId => childAttributeId === potentialChild.attributeId + '')
        )
        .forEach(child => {
          if (child.totalWeight < match.totalWeight) {
            return; // nothing to do, Parent is ranked higher in list
          }
          // parentWeight is equal or less => child ranked higher than parent =>
          // add child just below parent (if there are several chilreen - preseve the sorting)
          noOfResortedChildren += 1;
          child.totalWeight = match.totalWeight - noOfResortedChildren * delta;
        });
    });

    // sort again to incorporate changes
    matchList = matchList.sort((a: any, b: any) => b.totalWeight - a.totalWeight);

    // Create list of question and remaining options and resulting species
    this._nextQuestions = matchList.map(match => {
      let questionCopy = Object.assign({}, this._questionsById[match.attributeId]);
      questionCopy.avgWeightReduction = match.avgWeightReduction;
      questionCopy.avgWeightPerception = match.avgWeightPerception;
      questionCopy.totalWeight = match.totalWeight;
      questionCopy.speciesNotHandledByQuestion = match.speciesNotHandledByQuestion;
      questionCopy.options = questionCopy.options
        .map(option => {
          // TODO: resolve problem with id being either string or number !
          let resultMatch = match.charSpeciesMap.find(remainingOption => remainingOption.charId === option.id + '');
          if (!resultMatch) {
            return null;
          }
          let revisedOption = Object.assign({}, option);
          revisedOption.remainingSpecies = resultMatch.speciesIds;
          return revisedOption;
        })
        .filter(Boolean);
      return questionCopy;
    });

    let nextQuestionsWithoutParentSwop = matchListWithoutParentSwop.map(match => {
      let questionCopy = Object.assign({}, this._questionsById[match.attributeId]);
      questionCopy.avgWeightReduction = match.avgWeightReduction;
      questionCopy.avgWeightPerception = match.avgWeightPerception;
      questionCopy.totalWeight = match.totalWeight;
      questionCopy.speciesNotHandledByQuestion = match.speciesNotHandledByQuestion;
      questionCopy.options = questionCopy.options
        .map(option => {
          // TODO: resolve problem with id being either string or number !
          let resultMatch = match.charSpeciesMap.find(remainingOption => remainingOption.charId === option.id + '');
          if (!resultMatch) {
            return null;
          }
          let revisedOption = Object.assign({}, option);
          revisedOption.remainingSpecies = resultMatch.speciesIds;
          return revisedOption;
        })
        .filter(Boolean);
      return questionCopy;
    });

    // get next question
    if (!onlyCustomQuestions && this._nextQuestions && this._nextQuestions[0]) {
      this._nextQuestionIndex = this.getNextQuestionId();
    } else {
      this._nextQuestionIndex = -1;
    }

    this.updateCustomQuestions(this._nextQuestions);
    // console.log('nextQuestions; ', this._nextQuestions);

    if (this._nextQuestionIndex > -1) {
      this.currentQuestion = this._nextQuestions[this._nextQuestionIndex];
      this.nextQuestion.next(this.currentQuestion);
      this.questionStatus.next(QuestionStatus.inProgress);
    } else if (this._fixedCategoryName !== '') {
      this.questionStatus.next(QuestionStatus.noMoreInThisCategory);
    } else if (onlyCustomQuestions) {
      // this flag means we are only updating cutom questions - no need to update question status
    } else {
      this.questionStatus.next(QuestionStatus.manualSelectionForced);
    }

    this.updateSkipStatus();

    // output evaluation statistics to console when in webbrowser
    //TODOO id-logics app if (!this.platform.is('cordova')) {
      this.formatAsInSimulator_Fragensortierung_A(matchListWithoutParentSwop, nextQuestionsWithoutParentSwop);
      this.formatAsInSimulator_Fragensortierung_B(matchList, this._nextQuestions);
    //}

    return;
  }

  getNextQuestionId(): number {
    let nextQuestionIndex = 0;
    if (this._config.firstQuestionId && this._config.firstQuestionId > 0 && this._questionHistory.length === 0) {
      console.log('using predefined first question');
      for (nextQuestionIndex = 0; nextQuestionIndex < this._nextQuestions.length; nextQuestionIndex++) {
        if (this._nextQuestions[nextQuestionIndex].id === this._config.firstQuestionId) {
          break;
        }
      }
      if (nextQuestionIndex >= this._nextQuestions.length) {
        console.error('predefined question id is not available! using first');
        nextQuestionIndex = 0;
      }
    } else if (this._fixedCategoryName === '') {
      nextQuestionIndex = 0;
    } else {
      // special handling for fixed categoryName
      nextQuestionIndex = this._nextQuestions.findIndex(question => question.category === this._fixedCategoryName);
    }

    return nextQuestionIndex;
  }

  formatAsInSimulator_Fragensortierung_A(matchList, questions) {
    let counter = 1;
    let text = '';
    console.log('ratio: ', this._config.ratio);
    questions.forEach(question => {
      let match = matchList.find(aMatch => question.id === aMatch.attributeId);
      text += `${counter}. id:${question.id} - ${question.question}
${match.avgWeightReduction} + ${match.avgWeightPerception}
= ${match.totalWeight}
`;
      /*
            hasSimilar:${match.charSpeciesMap.map ( answer => answer._similar ).join ( ',' )}
            WeightBeforeParentSwitch: ${match._totalWeightBeforeParentSwop}
            `;
            */
      counter++;
    });
    console.log('Fragensortierung A: ', text);
  }

  formatAsInSimulator_Fragensortierung_B(matchList, questions) {
    let counter = 1;
    let text = '';

    questions.forEach(question => {
      let match = matchList.find(aMatch => question.id === aMatch.attributeId);
      text += `${counter}. id:${question.id} - ${question.question}
${match.avgWeightReduction} + ${match.avgWeightPerception}
= ${match.totalWeight}
`;
      counter++;
    });
    console.log('Fragensortierung B: ', text);
  }

  skipQuestion() {
    // add to history
    this._questionHistory.push({
      question: this.currentQuestion,
      answer: undefined,
      remainingSpeciesID: this._remainingSpeciesIds, // status before question is answered!
      index: this._questionHistory.length + 1,
      skipped: true
    });
    this.questionHistory.next(this._questionHistory.sort((a, b) => (a.index > b.index ? 1 : -1)));

    if (!this._fixedCategoryName) {
      // standard case, we can use the next question from the stack
      this._nextQuestionIndex++;
    } else {
      // we can only choose a next question from the given category
      const nextIndex = this._nextQuestions.findIndex(
        (question, index) => index > this._nextQuestionIndex && question.category === this._fixedCategoryName
      );
      if (nextIndex < 0) {
        this.questionStatus.next(QuestionStatus.noMoreInThisCategory);
        return;
      } else {
        this._nextQuestionIndex = nextIndex;
      }
    }

    if (this._nextQuestions.length <= this._nextQuestionIndex + 1) {
      this.skipStatus.next(QuestionSkipStatus.disabled);
    }
    if (this._nextQuestions.length <= this._nextQuestionIndex) {
      console.error('cannot skip - no more questions left - skip should have been disabled in the first place');
      return;
    }

    //this.currentQuestion = this._nextQuestions[this._nextQuestionIndex];
    //this.nextQuestion.next(this.currentQuestion);
    //this.questionStatus.next(QuestionStatus.resetting);
    //this.questionStatus.next(QuestionStatus.inProgress);
    // this will pop species stack so the species list is shown TODO: renname subject
    //this.newIdentification.next(true);
    return this.getNextQuestion();
  }

  updateCustomQuestions(nextQuestions) {
    // update custom questions if treshold is reached
    if (this._config.ownQuestionStartingAt > this._questionHistory.length + 1) {
      this.customQuestions.next(undefined);
      this.customQuestionInfo.next({
        status: CustomQuestionStatus.answersRequiredFirst,
        missingAnswers: this._config.ownQuestionStartingAt - this._questionHistory.length - 1
      });
    } else {
      let questionsByType = groupBy(sortBy(nextQuestions, 'questionShort'), 'category');
      // we are use an array with all categegories as a base reference
      let customQuestionsByType = this._categories.map(category => {
        if (questionsByType.hasOwnProperty(category)) {
          let questions = questionsByType[category];
          return {
            questions,
            length: questions.length,
            text: category
          };
        } else {
          // empty category
          return {
            questions: [],
            length: 0,
            text: category
          };
        }
      });
      this.customQuestions.next(customQuestionsByType);
      this.customQuestionInfo.next({ status: CustomQuestionStatus.available, missingAnswers: 0 });
    }
  }

  updateSkipStatus() {
    if (
      this._nextQuestionIndex > -1 &&
      this._nextQuestions.hasOwnProperty(this._nextQuestionIndex) &&
      // this._nextQuestions[this._nextQuestionIndex].id !== this._config.firstQuestionId
      '' + this.currentQuestion.id !== '' + this._config.firstQuestionId
    ) {
      this.skipStatus.next(QuestionSkipStatus.enabled);
    } else {
      this.skipStatus.next(QuestionSkipStatus.disabled);
    }
  }

  fixCustomCategory(category) {
    // will be set until unset by user
    if (!category || category.text === '') {
      this._fixedCategoryName = '';
    } else {
      this._fixedCategoryName = category.text;
    }
    this.fixedCategory.next(this._fixedCategoryName);

    this._nextQuestionIndex = this.getNextQuestionId();
    if (this._nextQuestionIndex > -1) {
      this.currentQuestion = this._nextQuestions[this._nextQuestionIndex];
      this.nextQuestion.next(this.currentQuestion);
      this.questionStatus.next(QuestionStatus.inProgress);
    } else {
      this.questionStatus.next(QuestionStatus.noMoreInThisCategory);
    }
  }

  _resetFixedCustomCategory() {
    if (this._fixedCategoryName !== '') {
      this._fixedCategoryName = '';
      this.fixedCategory.next(this._fixedCategoryName);
    }
  }

  getGlossaryEntryByKey(key: string) {
    return this._glossary.find(entry => entry['key'] === key);
  }

  getSpeciesById(id) {
    return this._species.find(sp => sp.id === id + '');
  }

  getSpeciesDetail(ids: string[]): Promise<SpeciesProfile[]> {
    console.log('getting species detail');
    return DatabaseService.getSpecies(ids).then(species => {
      species.forEach(aSpecies => {
        aSpecies.url = aSpecies.url;
        aSpecies.content.forEach(content =>
          content.content.forEach(contentBlock => {
            if (contentBlock.type === SpeciesProfileContentBlockType.file) {
              contentBlock.file = this.assetBaseUrl + contentBlock.file;
            }
          })
        );
        return aSpecies;
      });
      return species;
    });
  }
}

export const DataService = new DataServiceController();

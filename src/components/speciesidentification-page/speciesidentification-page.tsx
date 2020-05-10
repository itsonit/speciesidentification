import {
  Component,
  ComponentInterface,
  h,
  State,
  Element,
} from "@stencil/core";
import { alertController, loadingController } from "@ionic/core";

import "@ionic/core";

//import {
//  Slides
//} from 'ionic-angular';
import { Subscription } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import { Question } from "../../services/database-service";
import {
  DataService,
  QuestionStatus,
  CustomQuestionStatus,
  QuestionSkipStatus,
} from "../../services/data-service";

@Component({
  tag: "speciesidentification-page",
  styleUrl: "speciesidentification-page.css",
  shadow: true,
})
export class SpeciesidentificationPage implements ComponentInterface {
  @Element() el: HTMLElement;

  /*
   * TODO stencil
   * - loading / looadingController: id-logics app
   */

  @State() view: string = "";
  @State() fixedCategory: string = "";
  @State() showRuler: boolean = false;
  @State() loading; //TODO
  @State() manualSelection: boolean = false;
  @State() manualSelectionForced: boolean = false;
  @State() nextQuestion: Question = null;
  @State() noMoreInThisCategory = false;
  @State() sliderIndex: number = 0;
  @State() showSkipOption: boolean = false;

  date = new Date().toISOString();
  history = [];
  @State() customQuestions = [];
  dateSupported: boolean = false;
  ownQuestionStartingAt: number = 1;
  @State() customQuestionStatus: CustomQuestionStatus =
    CustomQuestionStatus.notStarted;
  @State() CustomQuestionStatus = CustomQuestionStatus;
  missingAnswers = 0;
  private loadingFlag = false;

  //observables
  private _nextQuestion: Subscription = null;
  private _skipStatus: Subscription = null;
  private _questionHistory: Subscription = null;
  private _customQuestions: Subscription = null;
  private _questionStatus: Subscription = null;
  private _configuration: Subscription = null;
  private _customQuestionInfo: Subscription = null;
  private _fixedCategory: Subscription = null;
  private _viewSizeChanged: Subscription = null;

  private _viewState: Subscription = null;

  componentWillLoad() {
    //mock, TODO rm  productive
    fetch("./data/index.json")
      .then((response: Response) => response.json())
      .then((responseJSON) => {
        console.log(responseJSON);
        DataService.setSpeciesGroup(responseJSON[0]);
      });

    this._nextQuestion = DataService.nextQuestion.subscribe((question) => {
      this.nextQuestion = question;
      if (!question) {
        // special occuring when no answers are left
        this.showRuler = false;
        return;
      }
      if (this.nextQuestion.typeId === 4) {
        // sort by size attributes
        this.nextQuestion.options.sort((a, b) =>
          parseFloat(a.value1) < parseFloat(b.value1) ? -1 : 1
        );
        this.showRuler = true;
      } else {
        // sort by rang
        this.nextQuestion.options.sort((a, b) => (a.rang < b.rang ? -1 : 1)); // sort ascending by rang
        this.showRuler = false;
      }
      if (question.video) {
        DataService.checkHint("tooltip");
      }
    });
    this._skipStatus = DataService.skipStatus
      .pipe(distinctUntilChanged())
      .subscribe((skipStatus) => {
        this.showSkipOption = skipStatus === QuestionSkipStatus.enabled;
        if (this.showSkipOption) {
          DataService.checkHint("naechste");
        }
      });
    this._questionHistory = DataService.questionHistory.subscribe((history) => {
      this.history = history;
      if (history.length > 2) {
        DataService.checkHint("verlauf");
      }
    });
    this._customQuestions = DataService.customQuestions.subscribe((custom) => {
      this.customQuestions = !custom
        ? custom
        : custom.filter((cat) => cat.length > 0);
    });
    this._questionStatus = DataService.questionStatus
      .pipe(distinctUntilChanged())
      .subscribe((status) => {
        console.log("new status:" + status);
        switch (status) {
          case QuestionStatus.notStarted:
            this.setView("new");
            this.noMoreInThisCategory = false;
            this.hideLoading();
            break;
          case QuestionStatus.calculating:
            console.log("calculating");
            this.manualSelection = false;
            this.manualSelectionForced = false;
            this.noMoreInThisCategory = false;
            this.presentLoading();
            this.setView("question");
            break;
          case QuestionStatus.resetting:
            console.log("resetting");
            this.manualSelection = false;
            this.manualSelectionForced = false;
            this.noMoreInThisCategory = false;
            this.setView("question");
            break;
          case QuestionStatus.inProgress:
            this.hideLoading();
            this.manualSelection = false;
            this.manualSelectionForced = false;
            this.noMoreInThisCategory = false;
            this.setView("question");
            break;
          case QuestionStatus.manualSelection:
            this.hideLoading();
            this.manualSelection = true;
            this.manualSelectionForced = false;
            this.noMoreInThisCategory = false;
            // switch to species Tab
            break;
          case QuestionStatus.manualSelectionForced:
            this.hideLoading();
            this.manualSelection = true;
            this.manualSelectionForced = true;
            this.noMoreInThisCategory = false;
            // switch to species Tab
            break;
          case QuestionStatus.noMoreInThisCategory:
            this.hideLoading();
            this.manualSelection = false;
            this.manualSelectionForced = false;
            this.noMoreInThisCategory = true;
            break;
          default:
            console.error("unhandled question Status: ", status);
            this.hideLoading();
        }
      });
    this._configuration = DataService.configuration.subscribe((config) => {
      this.dateSupported = config.dateSupported;
      this.ownQuestionStartingAt = config.ownQuestionStartingAt;
    });
    this._customQuestionInfo = DataService.customQuestionInfo
      .pipe(distinctUntilChanged())
      .subscribe((info) => {
        this.missingAnswers = info.missingAnswers;
        this.customQuestionStatus = info.status;
        if (
          this.customQuestionStatus === this.CustomQuestionStatus.available &&
          this.customQuestions.length > 0
        ) {
          DataService.checkHint("eigene");
        }
      });
    this._fixedCategory = DataService.fixedCategory
      .pipe(distinctUntilChanged())
      .subscribe((fixedCategory) => (this.fixedCategory = fixedCategory));

    this._viewSizeChanged = DataService.viewSizeChanged.subscribe(() => {
      //TODO this.content.resize();
    });

    this._viewState = DataService.viewState.subscribe((view) => {
      console.log("view changed page: ", view);
      this.view = view;
    });
  }

  presentLoading() {
    this.loadingFlag = true;
    if (this.loadingFlag || this.loading) {
      console.log("already loading");
      return;
    }
    console.log("show loading");
    this.loadingFlag = true;
    this.loading = loadingController.create({
      message: "berechne die nächste Frage ...",
    });

    this.loading.onDidDismiss(() => {
      this.loading = undefined;
      this.loadingFlag = false;
    });
    this.loading.present({
      showBackdrop: false,
    });
  }

  hideLoading() {
    console.log("hide loading");
    if (!this.loading) {
      return;
    }
    //TODO this.loading.dismiss();
    this.loadingFlag = false;
  }

  async new() {
    //TODO
    console.log("new");
    // this.presentLoading();
    if (!this.dateSupported) {
      await DataService.startNewIdentification(false);
      return;
    }
    let alert = alertController.create({
      header: "Datum berücksichtigen?",
      message: `Möchtest Du bei der Bestimmung die Jahreszeit berücksichtigen? Dadurch werden bei der Bestimmung nur Merkmale ausgewählt, die in der aktuellen Jahreszeit sichtbar sind.`,
      buttons: [
        {
          text: "Nein",
          cssClass: "idl-alert-cancel",
          handler: () => {
            DataService.startNewIdentification(false);
          },
        },
        {
          text: "Ja",
          cssClass: "idl-alert-confirm",
          handler: () => {
            DataService.startNewIdentification(true);
          },
        },
      ],
    });
    (await alert).present();
  }

  setView(view: string) {
    this.view = view;
    DataService.viewState.next(view);
  }

  startFrom(historyItem) {
    DataService.resetToQuestionFromHistory(historyItem);
    this.setView("question");
  }

  openVideo(videoUrl: string) {
    console.log("show vid: " + videoUrl);
    /* TODO
    if (this.platform.width() >= 768) {
      // pane view - open as regular page
      this.navCtrl.push('VideoPage', { videoUrl });
    } else {
      // when using popover, prevent user from switching to pane view:
      DataService.enactScreenOrientationLocking(true).then(() => {
        let popover = this.modalCtrl.create('VideoPage', { videoUrl });
        popover.onDidDismiss(() => DataService.enactScreenOrientationLocking());
        popover.present();
      });
    }*/
  }

  selectCustomQuestion(question) {
    DataService.selectCustomQuestion(question);
    this.setView("question");
  }

  selectCustomQuestionCategory(category) {
    if (this.fixedCategory === category.text) {
      // deselect
      DataService.fixCustomCategory(undefined);
    } else {
      DataService.fixCustomCategory(category);
      this.setView("question");
    }
  }

  selectOption(answer: any) {
    console.log("answer: ", answer);
    this.presentLoading();
    this.showRuler = false;
    DataService.selectAnswer(answer);
  }

  pickerSelectOption() {
    let slides = this.el.shadowRoot.querySelector("ion-slides");
    slides.getActiveIndex().then((activePickerIndex) => {
      const answer = this.nextQuestion.options[activePickerIndex];
      if (!answer) {
        console.log(
          "Picker has selected invalid answer. slideIndex is ",
          activePickerIndex
        );
        return;
      }
      this.selectOption(answer);
    });
  }

  skip() {
    this.showRuler = false;
    DataService.skipQuestion();
  }

  disableEventPropagation($event) {
    $event.stopPropagation();
  }

  componentDidUnload() {
    this._nextQuestion.unsubscribe();
    this._skipStatus.unsubscribe();
    this._questionHistory.unsubscribe();
    this._customQuestions.unsubscribe();
    this._questionStatus.unsubscribe();
    this._configuration.unsubscribe();
    this._customQuestionInfo.unsubscribe();
    this._fixedCategory.unsubscribe();
    this._viewSizeChanged.unsubscribe();

    this._viewState.unsubscribe();
  }

  render() {
    return (
      <ion-list
        class={{
          nghide: this.loading,
          ngshow: !this.loading,
        }}
      >
        <div>
          <div
            class={{
              nghide: this.view !== "new",
              ngshow: this.view === "new",
            }}
          >
            <ion-item-divider class="idl-answer-heading idl-top">
              Neue Bestimmung beginnen
            </ion-item-divider>
            <ion-item class="idl-item-info" text-wrap>
              <b>Achtung:</b> Wenn Du eine neue Bestimmung startest, wird die
              aktuelle Bestimmung verworfen!
            </ion-item>
            <button
              ion-item
              class="idl-item-info"
              text-center
              detail-none
              onClick={() => {
                console.log("new clicked");
                this.new();
              }}
            >
              Neue Bestimmung starten
            </button>
          </div>
          <div
            class={{
              nghide: this.view !== "question",
              ngshow: this.view === "question",
            }}
          >
            <ion-item
              class={{
                "idl-item-info": true,
                "idl-top": true,
                nghide: !(this.manualSelection && !this.manualSelectionForced),
                ngshow: this.manualSelection && !this.manualSelectionForced,
              }}
            >
              <b>Die Bestimmung ist beendet!</b>
              <br />
              <br />
              Finde und überprüfe Dein Ergebnis mit Hilfe der Bilder in der
              Artenliste.
              <br />
              <br />
              Um eine neue Bestimmung zu starten, bitte auf NEU drücken.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                "idl-top": true,
                nghide: !(this.manualSelection && this.manualSelectionForced),
                ngshow: this.manualSelection && this.manualSelectionForced,
              }}
            >
              Es stehen keine weiteren Fragen zur Verfügung. Finde Deine Art
              mithilfe der Bilder in der Artenliste oder überdenke Deine
              Antworten im Verlauf. <br />
              <br />
              Um eine neue Bestimmung zu starten, bitte auf NEU drücken.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                "idl-top": true,
                nghide: !(
                  !this.nextQuestion?.question &&
                  !this.manualSelection &&
                  !this.noMoreInThisCategory
                ),
                ngshow:
                  !this.nextQuestion?.question &&
                  !this.manualSelection &&
                  !this.noMoreInThisCategory,
              }}
            >
              Damit eine Frage angezeigt wird, muss erst eine neue Bestimmung
              gestartet werden.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                "idl-top": true,
                nghide: !this.noMoreInThisCategory,
                ngshow: this.noMoreInThisCategory,
              }}
            >
              In der Kategorie <i>{this.fixedCategory}</i> gibt es keine
              weiteren möglichen Fragen.
            </ion-item>
            <div
              class={{
                nghide: !(
                  this.nextQuestion?.question &&
                  !this.manualSelection &&
                  !this.noMoreInThisCategory
                ),
                ngshow:
                  this.nextQuestion?.question &&
                  !this.manualSelection &&
                  !this.noMoreInThisCategory,
              }}
            >
              <ion-item
                class={{
                  "idl-question": true,
                  "with-button": !!this.nextQuestion?.video,
                }}
                text-wrap
              >
                {this.nextQuestion?.question}
                <button
                  ion-button
                  item-end
                  icon-only
                  class={{
                    "idl-questionmark": true,
                    nghide: !this.nextQuestion?.video,
                    ngshow: !!this.nextQuestion?.video,
                  }}
                  onClick={() => this.openVideo(this.nextQuestion?.video)}
                >
                  <ion-icon name="idlogic-question-mark"></ion-icon>
                </button>
                <img
                  src={this.nextQuestion?.image}
                  class={{
                    nghide: !this.nextQuestion?.image,
                    ngshow: !!this.nextQuestion?.image,
                  }}
                />
              </ion-item>
              <ion-item-divider class="idl-answer-heading">
                Antwort auswählen
              </ion-item-divider>
              <div
                class={{
                  "idl-answer": true,
                  nghide: this.nextQuestion?.typeId !== 0,
                  ngshow: this.nextQuestion?.typeId === 0,
                }}
              >
                <ion-item class="idl-slider-option">
                  <ion-label>
                    <img
                      src={this.nextQuestion?.options[this.sliderIndex].url}
                    />
                  </ion-label>
                  <button
                    ion-buttom
                    item-right
                    onClick={() => this.nextQuestion?.options[this.sliderIndex]}
                  >
                    <ion-icon name="idlogic-arrow-right"></ion-icon>
                  </button>
                  <ion-range
                    min={0}
                    max={this.nextQuestion?.options.length - 1}
                    snaps={false}
                    //TODO [(ngModel)]="sliderIndex"
                    color="primary"
                    pin={false}
                  ></ion-range>
                </ion-item>
              </div>
              <div
                class={{
                  "idl-answer": true,
                  nghide: this.nextQuestion?.typeId !== 1,
                  ngshow: this.nextQuestion?.typeId === 1,
                }}
              >
                <ion-grid>
                  <ion-row>
                    {this.nextQuestion?.options.map((option) => (
                      <ion-col col-4>
                        <button
                          class="idl-image-option"
                          ion-button
                          //TODO clear
                          onClick={() => this.selectOption(option)}
                        >
                          <img
                            class={{
                              nghide: !option.url,
                              ngshow: !!option.url,
                            }}
                            src={option.url}
                          />
                          <h2
                            class={{
                              nghide: !option.url,
                              ngshow: !!option.url,
                            }}
                          >
                            {option.text}
                          </h2>
                        </button>
                      </ion-col>
                    ))}
                  </ion-row>
                </ion-grid>
              </div>
              <div
                class={{
                  "idl-answer": true,
                  nghide: this.nextQuestion?.typeId !== 2,
                  ngshow: this.nextQuestion?.typeId === 2,
                }}
              >
                <ion-grid>
                  <ion-row>
                    {this.nextQuestion?.options.map((option) => (
                      <ion-col
                        class="idl-color-option-col"
                        col-4
                        onClick={() => this.selectOption(option)}
                      >
                        <button
                          class="idl-color-option"
                          ion-button
                          //TODO clear
                          onClick={() => this.selectOption(option)}
                          style={{
                            "background-color": option.color,
                          }}
                        ></button>
                      </ion-col>
                    ))}
                  </ion-row>
                </ion-grid>
              </div>
              <div
                class={{
                  "idl-answer": true,
                  nghide: this.nextQuestion?.typeId !== 3,
                  ngshow: this.nextQuestion?.typeId === 3,
                }}
              >
                <ion-grid>
                  <ion-row>
                    {this.nextQuestion?.options.map((option) => (
                      <ion-col
                        col-6
                        style={{
                          "background-color": option.color,
                        }}
                        onClick={() => this.selectOption(option)}
                      >
                        <button
                          class="idl-answer-button"
                          ion-button
                          onClick={() => this.selectOption(option)}
                        >
                          {option.text}
                        </button>
                      </ion-col>
                    ))}
                  </ion-row>
                </ion-grid>
              </div>
              <div
                class={{
                  "idl-answer": true,
                  nghide: !(
                    this.nextQuestion?.typeId === 4 ||
                    this.nextQuestion?.typeId === 5
                  ),
                  ngshow:
                    this.nextQuestion?.typeId === 4 ||
                    this.nextQuestion?.typeId === 5,
                }}
              >
                <div class="idl-picker-wrapper">
                  <ion-icon
                    id="idlPickerArrowForward"
                    name="arrow-forward"
                    class="arrow-forward ion-ios-arrow-forward"
                    onClick={() => this.pickerSelectOption()}
                  ></ion-icon>
                  <div
                    class="idl-picker-container"
                    /*onTouchMove={(event) =>
                          this.disableEventPropagation(event)
                        }
                        onTouchStart={(event) =>
                          this.disableEventPropagation(event)
                        }
                        onMouseMove={(event) =>
                          this.disableEventPropagation(event)
                        }*/
                  >
                    <div class="wheel-rectangle"></div>
                    <ion-slides
                      id="idlPicker"
                      options={{
                        direction: "vertical",
                        slidesPerView: "5",
                        centeredSlides: "true",
                        initialSlide: "3",
                        effect: "slide",
                      }}
                      //TODO (ionSlideDidChange)="idlPickerChanged()"
                    >
                      {this.nextQuestion?.options.map((option) => (
                        <ion-slide class="idl-picker-item">
                          {option.text} {option.unit}
                        </ion-slide>
                      ))}
                    </ion-slides>
                  </div>
                </div>
              </div>
              <div
                class={{
                  "idl-answer": true,
                  nghide: this.nextQuestion?.typeId <= 5,
                  ngshow: this.nextQuestion?.typeId > 5,
                }}
              >
                <ion-grid>
                  <ion-row>
                    {this.nextQuestion?.options.map((option) => (
                      <ion-col col-4>
                        <button
                          class="idl-image-option"
                          ion-button
                          //TODO clear
                          onClick={() => this.selectOption(option)}
                        >
                          <img
                            class={{
                              nghide: !option.url,
                              ngshow: !!option.url,
                            }}
                            src={option.url}
                          />
                        </button>
                      </ion-col>
                    ))}
                  </ion-row>
                </ion-grid>
              </div>

              <ion-item-divider
                class={{
                  "idl-answer-heading": true,
                  "idl-skip": true,
                  nghide: !this.showSkipOption,
                  ngshow: this.showSkipOption,
                }}
              >
                Keine Antwort
              </ion-item-divider>
              <button
                ion-item
                class={{
                  "idl-item-info": true,
                  "idl-wrap-button": true,
                  nghide: !this.showSkipOption,
                  ngshow: this.showSkipOption,
                }}
                text-wrap
                detail-none
                onClick={() => this.skip()}
              >
                Nächste Frage
              </button>
            </div>
          </div>
          <div
            class={{
              nghide: this.view !== "history",
              ngshow: this.view === "history",
            }}
          >
            <ion-item-divider class="idl-answer-heading idl-top">
              Fragen Historie
            </ion-item-divider>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: this.history?.length !== 0,
                ngshow: this.history?.length === 0,
              }}
            >
              Es wurden noch keine Fragen beantwortet!
            </ion-item>

            {this.history?.map((historyItem) => (
              <ion-card class="idl-history" ion-item>
                <ion-item>
                  <h2>
                    {historyItem.index}.{historyItem.question.questionShort}
                  </h2>
                </ion-item>
                <ion-item text-wrap>
                  <h1>
                    <b>Frage:</b> {historyItem.question.question}
                  </h1>
                  <h1
                    class={{
                      nghide: historyItem.skipped,
                      ngshow: !historyItem.skipped,
                    }}
                  >
                    <b>Antwort:</b> {historyItem.answer?.text}
                    {historyItem.answer?.unit}
                  </h1>
                  <h1
                    class={{
                      nghide: !historyItem.skipped,
                      ngshow: historyItem.skipped,
                    }}
                  >
                    <b>Antwort:</b> übersprungen
                  </h1>
                </ion-item>
                <button
                  ion-item
                  icon-left
                  //TODO clear
                  //TODO small
                  onClick={() => this.startFrom(historyItem)}
                >
                  <label>Von hier aus neu starten?</label>
                  <ion-icon item-right name="idlogic-arrow-right"></ion-icon>
                </button>
              </ion-card>
            ))}
          </div>

          <div
            class={{
              nghide: this.view !== "custom",
              ngshow: this.view === "custom",
            }}
          >
            <ion-item-divider class="idl-answer-heading idl-top">
              Zur Verfügung stehende Fragen
            </ion-item-divider>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: !(
                  !this.nextQuestion?.question && !this.manualSelection
                ),
                ngshow: !this.nextQuestion?.question && !this.manualSelection,
              }}
              text-wrap
            >
              Damit Fragen angezeigt werden, muss erst eine neue Bestimmung
              gestartet werden.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: !(
                  this.customQuestionStatus ===
                  this.CustomQuestionStatus.manualSelection
                ),
                ngshow:
                  this.customQuestionStatus ===
                  this.CustomQuestionStatus.manualSelection,
              }}
              text-wrap
            >
              <b>Die Bestimmung ist beendet!</b>
              <br />
              <br />
              Finde und überprüfe Dein Ergebnis mit Hilfe der Bilder in der
              Artenliste.
              <br />
              <br />
              Um eine neue Bestimmung zu starten, bitte auf NEU drücken.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: !(
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.answersRequiredFirst &&
                  this.missingAnswers === 1
                ),
                ngshow:
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.answersRequiredFirst &&
                  this.missingAnswers === 1,
              }}
              text-wrap
            >
              Eigene Fragen können erst ausgewählt werden, wenn noch eine
              weitere Frage beantwortet wird.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: !(
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.answersRequiredFirst &&
                  this.missingAnswers > 1
                ),
                ngshow:
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.answersRequiredFirst &&
                  this.missingAnswers > 1,
              }}
              text-wrap
            >
              Eigene Fragen können erst ausgewählt werden, wenn zunächst
              {this.missingAnswers} Fragen beantwortet werden.
            </ion-item>
            <ion-item
              class={{
                "idl-item-info": true,
                nghide: !(
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.available &&
                  this.customQuestions.length === 0
                ),
                ngshow:
                  this.customQuestionStatus ===
                    this.CustomQuestionStatus.available &&
                  this.customQuestions.length === 0,
              }}
              text-wrap
            >
              Es stehen keine weiteren Fragen zur Verfügung.
            </ion-item>
            <div
              class={{
                nghide: !(
                  this.customQuestionStatus ===
                  this.CustomQuestionStatus.available
                ),
                ngshow:
                  this.customQuestionStatus ===
                  this.CustomQuestionStatus.available,
              }}
            >
              {this.customQuestions?.map((category) => (
                <collapsible-content label={category.text} count={category.length}>
                  <ion-item
                    class={{
                      "idl-custom-question": true,
                      "idl-custom-category-selected":
                        this.fixedCategory === category.text,
                    }}
                    text-wrap
                    onClick={() => this.selectCustomQuestionCategory(category)}
                  >
                    Nur Fragen aus dieser Kategorie
                  </ion-item>
                  {category.questions?.map((question) => (
                    <ion-item
                      class="idl-custom-question"
                      text-wrap
                      onClick={() => this.selectCustomQuestion(question)}
                    >
                      {question.questionShort}
                    </ion-item>
                  ))}
                </collapsible-content>
              ))}
            </div>
          </div>
        </div>
      </ion-list>
    );
  }
}

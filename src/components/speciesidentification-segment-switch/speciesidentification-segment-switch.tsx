import { Component, State, h } from '@stencil/core';

import '@ionic/core';

import { Subscription } from "rxjs";

import {
  DataService
} from "../../services/data-service";

@Component({
  tag: 'speciesidentification-segment-switch',
  styleUrl: 'speciesidentification-segment-switch.css',
  shadow: true,
})
export class SpeciesidentificationSegmentSwitch {

  @State() view:string = "";

  private _viewState: Subscription = null;


  componentWillLoad() {
    this._viewState = DataService.viewState.subscribe((view) => {
      console.log("view changed switch: " + view);
      this.view = view;
    });
  }

  chooseSegment(view: string) {
    this.view = view;
    DataService.viewState.next(view);
  }

  componentDidUnload() {
    this._viewState.unsubscribe();
  }

  render() {
    return (
          <ion-header
            class={{
              //TODO "idl-ruler-margin": this.showRuler,
              "ion-header": true,
            }}
          >
            <ion-navbar class="idl-navbar">
              <ion-title>Bestimmung</ion-title>
            </ion-navbar>
            <div
              class={{
                "idl-segment-wrapper": true,
                //TODO "idl-ruler-margin": this.showRuler,
              }}
            >
              <ion-segment value={this.view}>
                <ion-segment-button onClick={() => this.chooseSegment("question")}>
                  Frage
                </ion-segment-button>
                <ion-segment-button onClick={() => this.chooseSegment("history")}>
                  Verlauf
                </ion-segment-button>
                <ion-segment-button onClick={() => this.chooseSegment("custom")}>
                  Eigene
                </ion-segment-button>
                <ion-segment-button onClick={() => this.chooseSegment("new")}>
                  Neu
                </ion-segment-button>
              </ion-segment>
            </div>
          </ion-header>
    );
  }

}

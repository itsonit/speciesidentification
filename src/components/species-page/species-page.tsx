import { Component, h, State } from '@stencil/core';

import { Subscription } from "rxjs";

import {
  DataService
} from "../../services/data-service";

import { SpeciesProfile } from '../../services/raw-data-service';

@Component({
  tag: 'species-page',
  styleUrl: 'species-page.css',
  shadow: true,
})
export class SpeciesPage {

  @State() allSpeciesByName: SpeciesProfile[] = [];

  //observables
  private _remainingSpecies: Subscription = null;

  constructor() {
    this._remainingSpecies = DataService.remainingSpecies.subscribe(species => {
      this.allSpeciesByName = species.sort((a, b) => (a.name > b.name ? 1 : -1));
    });
  }

  componentDidUnload() {
    this._remainingSpecies.unsubscribe();
  }


  render() {
    return (
      <div>
        <p>SpeciesPage</p>
        <ul>
        {this.allSpeciesByName?.map((species) => (
          <li>{species.name}</li>
        ))}
        </ul>
      </div>
    );
  }

}

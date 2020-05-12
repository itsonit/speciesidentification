import { Component, h, Prop, State } from "@stencil/core";

@Component({
  tag: "collapsible-content",
  styleUrl: "collapsible-content.css",
  shadow: true,
})
export class CollapsibleContent {
  @Prop() label: string;
  @Prop() count: string;
  @State() collapsed: boolean = false;

  toggle() {
    console.log("toggle");
    this.collapsed = !this.collapsed;
  }

  render() {
    return (
      <div>
        <ion-item
          class="idl-custom-category"
          //TODO tappable
          onClick={() => {
            this.toggle();
          }}
          mode="ios"
          lines="none"
        >

            <ion-icon
              name="idlogic-caret-right-b"
              class={{
                'ion-ios-idlogic-caret-right-b': true,
                'ion-ios-icon': true,
                nghide: !!this.collapsed,
                ngshow: !this.collapsed,
              }}
            ></ion-icon>
            <ion-icon
              name="idlogic-caret-down-b"
              class={{
                'ion-ios-idlogic-caret-down-b': true,
                'ion-ios-icon': true,
                nghide: !this.collapsed,
                ngshow: !!this.collapsed,
              }}
            ></ion-icon>

          <div class="input-wrapper">
            <ion-label mode="ios">{this.label}</ion-label>
          </div>
          <ion-badge class="badge badge-ios" item-end>{this.count}</ion-badge>
        </ion-item>
        <div hidden={!this.collapsed}>
          <slot />
        </div>
      </div>
    );
  }
}

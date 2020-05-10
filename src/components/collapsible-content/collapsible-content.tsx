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
        >
          <button item-start icon-only>
            <ion-icon
              name="idlogic-caret-right-b"
              class={{
                nghide: !!this.collapsed,
                ngshow: !this.collapsed,
              }}
            ></ion-icon>
            <ion-icon
              name="idlogic-caret-down-b"
              class={{
                nghide: !this.collapsed,
                ngshow: !!this.collapsed,
              }}
            ></ion-icon>
          </button>
          <ion-label>{this.label}</ion-label>
          <ion-badge item-end>{this.count}</ion-badge>
        </ion-item>
        <div hidden={!this.collapsed}>
          <slot />
        </div>
      </div>
    );
  }
}

import { newSpecPage } from '@stencil/core/testing';
import { CollapsibleContent } from './collapsible-content';

describe('collapsible-content', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [CollapsibleContent],
      html: `<collapsible-content></collapsible-content>`,
    });
    expect(page.root).toEqualHtml(`
      <collapsible-content>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </collapsible-content>
    `);
  });
});

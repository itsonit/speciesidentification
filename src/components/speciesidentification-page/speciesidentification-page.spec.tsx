import { newSpecPage } from '@stencil/core/testing';
import { SpeciesidentificationPage } from './speciesidentification-page';

describe('speciesidentification-page', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SpeciesidentificationPage],
      html: `<speciesidentification-page></speciesidentification-page>`,
    });
    expect(page.root).toEqualHtml(`
      <speciesidentification-page>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </speciesidentification-page>
    `);
  });
});

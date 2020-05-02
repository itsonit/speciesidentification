import { newSpecPage } from '@stencil/core/testing';
import { SpeciesPage } from './species-page';

describe('species-page', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SpeciesPage],
      html: `<species-page></species-page>`,
    });
    expect(page.root).toEqualHtml(`
      <species-page>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </species-page>
    `);
  });
});

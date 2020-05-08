import { newSpecPage } from '@stencil/core/testing';
import { SpeciesidentificationSegmentSwitch } from './speciesidentification-segment-switch';

describe('speciesidentification-segment-switch', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SpeciesidentificationSegmentSwitch],
      html: `<speciesidentification-segment-switch></speciesidentification-segment-switch>`,
    });
    expect(page.root).toEqualHtml(`
      <speciesidentification-segment-switch>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </speciesidentification-segment-switch>
    `);
  });
});

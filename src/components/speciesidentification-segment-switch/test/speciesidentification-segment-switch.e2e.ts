import { newE2EPage } from '@stencil/core/testing';

describe('speciesidentification-segment-switch', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<speciesidentification-segment-switch></speciesidentification-segment-switch>');

    const element = await page.find('speciesidentification-segment-switch');
    expect(element).toHaveClass('hydrated');
  });
});

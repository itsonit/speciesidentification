import { newE2EPage } from '@stencil/core/testing';

describe('speciesidentification-page', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<speciesidentification-page></speciesidentification-page>');

    const element = await page.find('speciesidentification-page');
    expect(element).toHaveClass('hydrated');
  });
});

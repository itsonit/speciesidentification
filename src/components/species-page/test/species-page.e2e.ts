import { newE2EPage } from '@stencil/core/testing';

describe('species-page', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<species-page></species-page>');

    const element = await page.find('species-page');
    expect(element).toHaveClass('hydrated');
  });
});

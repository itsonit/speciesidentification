import { newE2EPage } from '@stencil/core/testing';

describe('collapsible-content', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<collapsible-content></collapsible-content>');

    const element = await page.find('collapsible-content');
    expect(element).toHaveClass('hydrated');
  });
});

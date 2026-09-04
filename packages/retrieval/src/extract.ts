import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ExtractedLink {
  href: string;
  text: string;
}

export interface ExtractedPage {
  title: string;
  textContent: string;
  links: ExtractedLink[];
}

export function extractContent(html: string, baseUrl: string): ExtractedPage {
  const $ = cheerio.load(html);

  // Extract links specifically from body before removing nav/header
  const links: ExtractedLink[] = [];
  $('body a').each((_, el) => {
    const a = $(el);
    let href = a.attr('href');
    const text = a.text().trim();
    if (href && text && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      try {
        const absolute = new URL(href, baseUrl).toString();
        links.push({ href: absolute, text });
      } catch {
        // ignore invalid URLs
      }
    }
  });

  // Remove useless elements before extracting text
  $('script, style, noscript, nav, footer, header, iframe, svg, img, form, button').remove();


  // Use Readability for high-quality text extraction
  const dom = new JSDOM(html, { url: baseUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  // If Readability fails, fallback to simple cheerio extraction
  let textContent = article?.textContent?.trim() || $('body').text().replace(/\s+/g, ' ').trim();
  const title = article?.title || $('title').text().trim();

  return { title, textContent, links };
}

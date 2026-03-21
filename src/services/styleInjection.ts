import { CONFIG } from '../config';

export function injectStyles(iframe: HTMLIFrameElement, issueNumber: number, isReadingView: boolean): void {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const isOldFormat = issueNumber <= CONFIG.FORMAT_THRESHOLD;
    const isNewFormat = issueNumber > CONFIG.FORMAT_THRESHOLD;

    if (isNewFormat && isReadingView) {
        injectNewReadingViewStyles(doc);
    } else if (isOldFormat && !isReadingView) {
        injectOldArchivalViewStyles(doc);
    } else if (isOldFormat && isReadingView) {
        injectOldReadingViewStyles(doc);
    }
}

function injectNewReadingViewStyles(doc: Document): void {
    const existingStyles = doc.querySelectorAll('link[rel="stylesheet"]');
    existingStyles.forEach((link) => {
        if (link.getAttribute('href')?.includes('Cinefex.css')) {
            link.remove();
        }
    });

    const style = doc.createElement('style');
    style.textContent = `
    ${CONFIG.FONT_FACE_CSS}

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }

    body {
      background-color: #f8f9fa !important;
      color: #1e293b !important;
      padding: 2rem 4rem !important;
      max-width: 1024px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .manuscript, .manuscript01 {
      font-family: "BenguiatStd-Book", Georgia, serif !important;
      font-size: 16px !important;
      line-height: 30px !important;
      text-align: justify !important;
      padding: 20px !important;
      height: auto !important;
      width: auto !important;
    }

    .page {
      font-family: "BenguiatStd-Book", Georgia, serif !important;
      font-size: 16px !important;
      line-height: 30px !important;
      text-align: justify !important;
      margin-bottom: 1.5em !important;
      height: auto !important;
      width: auto !important;
    }

    em, i {
      font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
      font-style: italic !important;
    }

    .dropCap span {
      font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
    }

    .caption, .sideBar, .sideBarBottom {
      font-family: "GillSansStd-Italic", "Gill Sans", sans-serif !important;
    }

    .img-all {
      height: 660px !important;
      display: block !important;
      background-size: contain !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }

    div:not(.img-all)[style*="background"] {
      display: none !important;
    }

    page {
      display: block !important;
      break-inside: avoid !important;
    }
  `;

    if (doc.head.firstChild) {
        doc.head.insertBefore(style, doc.head.firstChild);
    } else {
        doc.head.appendChild(style);
    }

    injectTitle(doc);
}

function injectOldArchivalViewStyles(doc: Document): void {
    const style = doc.createElement('style');
    style.textContent = `
    html {
      margin: 0 !important;
      padding: 0 !important;
      background: #1a1a2e !important;
      overflow: auto !important;
    }

    body {
      margin: 0 !important;
      padding: 20px !important;
      background: #1a1a2e !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }

    page {
      display: block !important;
      margin: 0 auto 20px auto !important;
      width: 864px !important;
      float: none !important;
    }

    .page {
      float: none !important;
      display: block !important;
      margin: 0 auto !important;
      box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
      border-radius: 4px !important;
      background-size: 864px 768px !important;
      position: relative !important;
    }

    .page > div {
      float: none !important;
      display: block !important;
    }

    img {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
    }
  `;
    doc.head.appendChild(style);
}

function injectOldReadingViewStyles(doc: Document): void {
    const style = doc.createElement('style');
    style.textContent = `
    ${CONFIG.FONT_FACE_CSS}

    body {
      font-family: "BenguiatStd-Book", Georgia, serif !important;
    }

    em, i {
      font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
      font-style: italic !important;
    }

    strong, b {
      font-family: "BenguiatStd-Medium", Georgia, serif !important;
      font-weight: normal !important;
    }

    articleTitle {
      font-family: "BenguiatStd-Medium", Georgia, serif !important;
      font-weight: normal !important;
    }

    .dropCap span {
      font-family: "BenguiatStd-BookItalic", Georgia, serif !important;
    }

    page {
      display: block !important;
    }

    .footer {
      clear: both !important;
      margin-top: 2em !important;
    }

    body::after {
      content: "" !important;
      display: block !important;
      clear: both !important;
    }
  `;
    doc.head.appendChild(style);
}

function injectTitle(doc: Document): void {
    const dcTitle = doc.querySelector('meta[name="dc:Title"]');
    const filmMeta = doc.querySelector('meta[name="Film"]');
    const creatorMeta = doc.querySelector('meta[name="Creator"]');

    let titleText: string | null = null;

    if (dcTitle) {
        titleText = dcTitle.getAttribute('content');
    } else if (filmMeta) {
        titleText = filmMeta.getAttribute('content') ?? null;
    } else if (creatorMeta) {
        titleText = `Article by ${creatorMeta.getAttribute('content')}`;
    }

    if (titleText && doc.body) {
        const existingH1 = doc.querySelector('h1.injected-title');
        if (existingH1) existingH1.remove();

        const h1 = doc.createElement('h1');
        h1.className = 'injected-title';
        h1.textContent = titleText;
        h1.style.cssText = `
      font-size: 2.5rem;
      font-weight: bold;
      margin: 1.5rem 0;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 0.5rem;
      text-align: left;
    `;
        doc.body.insertBefore(h1, doc.body.firstChild);
    }
}

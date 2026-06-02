import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { fixMalformedArchivalPageStructure } from '../../services/styleInjection';

/**
 * Build a DOM that reproduces the real-browser behavior on the issue 3 Empire
 * Strikes Back malformed title page. JSDOM's HTML5 parser is spec-strict and
 * silently drops mis-nested siblings rather than trapping them inside the
 * broken wrapper; real browsers (Chrome, Firefox, Safari) follow the
 * "any other end tag" rule and end up nesting later <page> elements inside
 * the first page's clipped div. We model that outcome directly so the test
 * exercises the real bug, not the parser.
 */
function buildIssue3LikeDom(pageCount: number): Document {
    const html = '<!doctype html><html><head></head><body></body></html>';
    const doc = new JSDOM(html).window.document;
    const body = doc.body;

    // Page 4 — the malformed title page
    const page4 = doc.createElement('page');
    page4.setAttribute('page-num', '4');
    const outerPlate = doc.createElement('div');
    outerPlate.className = 'page';
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('style', 'width: 864px; height: 768px;');
    const inner = doc.createElement('div');
    inner.className = 'page';
    inner.setAttribute('style', 'background: url(images/p4.jpg); background-size: 864 768;');
    wrapper.appendChild(inner);
    outerPlate.appendChild(wrapper);
    page4.appendChild(outerPlate);
    body.appendChild(page4);

    // Pages 5..N — well-formed plates (we nest them inside the wrapper to
    // simulate the real-browser parsing outcome for the unclosed divs)
    for (let p = 5; p <= pageCount; p++) {
        const page = doc.createElement('page');
        page.setAttribute('page-num', String(p));
        const plate = doc.createElement('div');
        plate.className = 'page';
        plate.setAttribute('style', `background: url(images/p${p}.png); background-size: 864 768;`);
        page.appendChild(plate);
        wrapper.appendChild(page);
    }

    return doc;
}

describe('fixMalformedArchivalPageStructure', () => {
    it('promotes all pages back to top-level body children', () => {
        const doc = buildIssue3LikeDom(10);
        const totalBefore = doc.querySelectorAll('page').length;
        const bodyLevelBefore = doc.querySelectorAll('body > page').length;

        // The parser (browser) traps most sibling <page> elements inside the broken
        // wrapper, so body-level count is strictly less than the total count.
        // buildIssue3LikeDom creates 7 <page> elements total: 1 body-level + 6 nested.
        expect(bodyLevelBefore).toBe(1);
        expect(totalBefore).toBe(7);
        expect(bodyLevelBefore).toBeLessThan(totalBefore);

        fixMalformedArchivalPageStructure(doc);

        const totalAfter = doc.querySelectorAll('page').length;
        const bodyLevelAfter = doc.querySelectorAll('body > page').length;

        // Critical invariant: after repair, every <page> is a direct child of <body>.
        expect(totalAfter).toBe(7);
        expect(bodyLevelAfter).toBe(7);
    });

    it('collapses the redundant outer .page so the title plate matches well-formed pages', () => {
        const doc = buildIssue3LikeDom(10);
        fixMalformedArchivalPageStructure(doc);

        const firstPage = doc.querySelectorAll('body > page')[0];
        // Should be exactly: <page><div class="page" style="background:..."></div></page>
        const directDivs = firstPage.children;
        expect(directDivs.length).toBe(1);
        const plate = directDivs[0] as HTMLElement;
        expect(plate.className).toBe('page');
        expect(plate.getAttribute('style')).toContain('background: url(images/p4.jpg)');
    });

    it('preserves page-num ordering on the repaired document', () => {
        const doc = buildIssue3LikeDom(10);
        fixMalformedArchivalPageStructure(doc);

        const nums = Array.from(doc.querySelectorAll('body > page')).map(
            (p) => p.getAttribute('page-num'),
        );
        expect(nums).toEqual(['4', '5', '6', '7', '8', '9', '10']);
    });

    it('is a no-op on well-formed documents', () => {
        const html = `
            <!doctype html><html><body>
                <page page-num="1"><div class="page"></div></page>
                <page page-num="2"><div class="page"></div></page>
                <page page-num="3"><div class="page"></div></page>
            </body></html>
        `;
        const doc = new JSDOM(html).window.document;
        const before = doc.body.innerHTML;
        fixMalformedArchivalPageStructure(doc);
        expect(doc.body.innerHTML).toBe(before);
    });

    it('is a no-op on documents that have no <page> elements at all', () => {
        const doc = new JSDOM('<!doctype html><html><body><p>hello</p></body></html>').window.document;
        const before = doc.body.innerHTML;
        expect(() => fixMalformedArchivalPageStructure(doc)).not.toThrow();
        expect(doc.body.innerHTML).toBe(before);
    });

    it('leaves plain-img title pages (no double .page) untouched', () => {
        // The "other" branch of the repair: <page><div class="page"><div 864x768><img/></div></div></page>
        // This is well-formed in shape; the fix should skip it.
        const html = `
            <!doctype html><html><body>
                <page page-num="1">
                    <div class="page">
                        <div style="width: 864px; height: 768px;">
                            <img src="images/p1.jpg"/>
                        </div>
                    </div>
                </page>
            </body></html>
        `;
        const doc = new JSDOM(html).window.document;
        fixMalformedArchivalPageStructure(doc);
        const page = doc.querySelector('body > page')!;
        expect(page.children.length).toBe(1);
        const plate = page.children[0] as HTMLElement;
        expect(plate.className).toBe('page');
        expect(plate.children[0].tagName).toBe('DIV');
    });
});

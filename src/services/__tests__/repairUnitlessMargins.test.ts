import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { repairUnitlessMargins } from '../styleInjection';

function makeDoc(html: string): Document {
    return new JSDOM(html).window.document;
}

describe('repairUnitlessMargins', () => {
    it('appends px to bare numbers in margin shorthand', () => {
        const doc = makeDoc(
            '<body><img src="x.jpg" style="margin: 44 0 0 0;"/></body>',
        );
        repairUnitlessMargins(doc);
        const style = doc.querySelector('img')!.getAttribute('style')!;
        expect(style).toMatch(/margin:\s*44px\s+0px\s+0px\s+0px/);
    });

    it('appends px to negative bare numbers', () => {
        const doc = makeDoc(
            '<body><img src="x.jpg" style="margin: 44 0 0 -20;"/></body>',
        );
        repairUnitlessMargins(doc);
        const style = doc.querySelector('img')!.getAttribute('style')!;
        expect(style).toMatch(/margin:\s*44px\s+0px\s+0px\s*-20px/);
    });

    it('appends px to margin-top, -right, -bottom, -left longhand', () => {
        const doc = makeDoc(
            '<body><div style="margin-top: 44; margin-right: 10; margin-bottom: 5; margin-left: -20;"></div></body>',
        );
        repairUnitlessMargins(doc);
        const style = doc.querySelector('div')!.getAttribute('style')!;
        expect(style).toMatch(/margin-top:\s*44px/);
        expect(style).toMatch(/margin-right:\s*10px/);
        expect(style).toMatch(/margin-bottom:\s*5px/);
        expect(style).toMatch(/margin-left:\s*-20px/);
    });

    it('does not touch non-margin declarations (width, padding, height)', () => {
        const doc = makeDoc(
            '<body><div style="width: 50%; height: auto; padding: 1em;"></div></body>',
        );
        repairUnitlessMargins(doc);
        const style = doc.querySelector('div')!.getAttribute('style')!;
        expect(style).toContain('width: 50%');
        expect(style).toContain('height: auto');
        expect(style).toContain('padding: 1em');
    });

    it('handles multiple declarations separated by semicolons', () => {
        const doc = makeDoc(
            '<body><img src="x.jpg" style="width: 100; margin: 44 0 0 -20;"/></body>',
        );
        repairUnitlessMargins(doc);
        // width is not in the repair list, so it stays bare. Only margin gets px.
        const style = doc.querySelector('img')!.getAttribute('style')!;
        expect(style).toContain('width: 100');
        expect(style).toMatch(/margin:\s*44px\s+0px\s+0px\s+-20px/);
    });

    it('is a no-op on elements with no style attribute', () => {
        const doc = makeDoc('<body><img src="x.jpg"/></body>');
        expect(() => repairUnitlessMargins(doc)).not.toThrow();
        expect(doc.querySelector('img')!.getAttribute('style')).toBeNull();
    });

    it('handles a representative real-world page (issue 5 page 7)', () => {
        const doc = makeDoc(`
            <body>
                <page page-num="7">
                    <div class="page" style="background: url(images/x.png); background-size: 864 768;">
                        <div style="width: 509px; height: 679px; float:right;">
                            <a href="#"><img src="a.jpg" style="margin: 44 0 0 0;"/></a>
                        </div>
                        <div style="width: 301px; height: 334px; float:right;">
                            <a href="#"><img src="b.jpg" style="margin: 44 0 0 -20;"/></a>
                        </div>
                    </div>
                </page>
            </body>
        `);
        repairUnitlessMargins(doc);
        const imgs = doc.querySelectorAll('img');
        expect(imgs[0]!.getAttribute('style')).toMatch(/margin:\s*44px\s+0px\s+0px\s+0px/);
        expect(imgs[1]!.getAttribute('style')).toMatch(/margin:\s*44px\s+0px\s+0px\s*-20px/);
    });
});
